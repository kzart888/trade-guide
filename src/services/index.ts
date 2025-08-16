// Service layer with optional Supabase integration (graceful fallback to no-op for local mocks)
import type { City, Product, Edge, PriceRecord } from '@/core/types/domain';
import { supabase } from './supabaseClient';
import { verifyPin, validatePinFormat, hashPin } from '@/core/auth/pin';
import { mockCities, mockEdges, mockProducts, mockPriceMap } from '@/mocks/seed';
import type { PriceMap } from '@/core/types/domain';

export const userService = {
  // register, approve, verifyPin ...
  async login(username: string, pin: string): Promise<{ username: string; approved: boolean; isAdmin: boolean }>{
    if (!validatePinFormat(pin)) throw new Error('PIN_INVALID');
    if (!supabase) {
      // Mock mode: only accept pin '1234'
      if (pin !== '1234') throw new Error('PIN_INVALID');
      // Demo: username 'admin' has admin rights
      return { username, approved: true, isAdmin: username.toLowerCase() === 'admin' };
    }

    // Fetch user (approved users are selectable per RLS). If not found, treat as not approved or not exists.
    const { data, error } = await supabase
      .from('users')
      .select('username, pin_hash, approved, is_admin, failed_attempts, locked_until')
      .eq('username', username)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('USER_NOT_FOUND_OR_NOT_APPROVED');

    const now = new Date();
    if (data.locked_until && new Date(data.locked_until) > now) {
      throw new Error('ACCOUNT_LOCKED');
    }

    const ok = await verifyPin(pin, data.pin_hash);
    if (!ok) {
      const attempts = (data.failed_attempts ?? 0) + 1;
      const lock = attempts >= 3 ? new Date(now.getTime() + 5 * 60 * 1000) : null;
      await supabase
        .from('users')
        .update({ failed_attempts: attempts, locked_until: lock })
        .eq('username', username);
      throw new Error(lock ? 'ACCOUNT_LOCKED' : 'PIN_INVALID');
    }

    // Success: reset counters and set last_login_at
    await supabase
      .from('users')
      .update({ failed_attempts: 0, locked_until: null, last_login_at: now.toISOString() })
      .eq('username', username);

    // Audit (best effort)
    try {
      await auditService.log(username, 'user_login', 'user', username, null, { ok: true });
    } catch {}

    return { username: data.username, approved: !!data.approved, isAdmin: !!data.is_admin };
  },
  async register(username: string, pin: string): Promise<{ ok: true }>{
    if (!validatePinFormat(pin)) throw new Error('PIN_INVALID');
    if (!supabase) {
      // Demo: no-op
      return { ok: true };
    }
    const hashed = await hashPin(pin);
    const { error } = await supabase
      .from('users')
      .insert({ id: username, username, pin_hash: hashed, approved: false, is_admin: false })
      .select('id')
      .maybeSingle();
    if (error) throw error;
    try {
      await auditService.log(username, 'user_register', 'user', username, null, { username }, 'user registration submitted');
    } catch {}
    return { ok: true };
  },
  async listPending(): Promise<Array<{ id: string; username: string; created_at?: string }>> {
    if (!supabase) {
      // Demo data
      return [
        { id: 'user_a', username: 'user_a' },
        { id: 'user_b', username: 'user_b' },
      ];
    }
    const { data, error } = await supabase
      .from('users')
      .select('id, username, created_at, approved')
      .eq('approved', false)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((u: any) => ({ id: u.id, username: u.username, created_at: u.created_at }));
  },
  async approve(targetUserId: string, approved: boolean, opts?: { adminUserId?: string }): Promise<void> {
    if (!supabase) return; // demo mode no-op
    const { error } = await supabase
      .from('users')
      .update({ approved })
      .eq('id', targetUserId);
    if (error) throw error;
    try {
      await auditService.log(
        (opts?.adminUserId ?? null) as any,
        approved ? 'user_approve' : 'user_reject',
        'user',
        targetUserId,
        { approved: !approved },
        { approved }
      );
    } catch {}
  },
};

export const priceService = {
  /**
   * Persist price records for a city. When Supabase credentials are not provided, this is a no-op.
   * Notes:
   * - Upserts into price_records on (city_id, product_id)
   * - Also writes audit logs per record (best-effort)
   */
  async saveBatch(cityId: string, records: PriceRecord[], opts?: { userId?: string }): Promise<void> {
    if (!supabase) {
      // Running with mocks; treat as successful save
      return;
    }

    // Map to DB columns
    const rows = records.map(r => ({
      city_id: r.cityId,
      product_id: r.productId,
      buy_price: r.buyPrice,
      sell_price: r.sellPrice,
      updated_by: r.updatedBy,
    }));

    const { error } = await supabase
      .from('price_records')
      .upsert(rows, { onConflict: 'city_id,product_id' });
    if (error) throw error;

    // Fire-and-forget audit logs (do not block user path)
    try {
      await auditService.log(
        (opts?.userId ?? null) as any,
        'price_update',
        'price',
        cityId,
        null,
        rows,
        `batch ${rows.length} price updates`
      );
    } catch {
      // ignore audit failures on client
    }
  },
  async fetchMap(): Promise<{ priceMap: PriceMap; lastUpdatedAt: Date | null }> {
    if (!supabase) {
      return { priceMap: mockPriceMap as PriceMap, lastUpdatedAt: new Date() };
    }
    const { data, error } = await supabase
      .from('price_records')
      .select('city_id, product_id, buy_price, sell_price, updated_at')
      .limit(10000);
    if (error) throw error;
    const map: PriceMap = new Map();
    let latest: Date | null = null;
    for (const row of data ?? []) {
      const c = row.city_id as string;
      const p = row.product_id as string;
      if (!map.has(c)) map.set(c, new Map());
      map.get(c)!.set(p, { buyPrice: row.buy_price ?? null, sellPrice: row.sell_price ?? null });
      if (row.updated_at) {
        const d = new Date(row.updated_at as string);
        if (!latest || d > latest) latest = d;
      }
    }
    return { priceMap: map, lastUpdatedAt: latest };
  },
};

export const cityService = {
  // get/set city & buyable products configs
  async updateBuyables(
    cityId: string,
    buyableProductIds: [string, string, string],
    opts?: { oldBuyables?: [string, string, string]; userId?: string }
  ): Promise<void> {
    if (!supabase) return; // local mock mode
    const { error } = await supabase
      .from('cities')
      .update({ buyable_product_ids: buyableProductIds })
      .eq('id', cityId);
    if (error) throw error;
    try {
      await auditService.log(
        (opts?.userId ?? null) as any,
        'city_products_update',
        'city',
        cityId,
        opts?.oldBuyables ?? null,
        buyableProductIds,
        'update city buyable products (3)'
      );
    } catch {
      // ignore audit failures on client
    }
  },
  async list(): Promise<Record<string, City>> {
    if (!supabase) return mockCities as any;
    const { data, error } = await supabase
      .from('cities')
      .select('id, name, buyable_product_ids');
    if (error) throw error;
    const out: Record<string, City> = {};
    for (const c of data ?? []) {
      out[c.id] = {
        id: c.id,
        name: c.name,
        buyableProductIds: (c.buyable_product_ids as string[]).slice(0, 3) as [string, string, string],
      };
    }
    return out;
  },
};

export const auditService = {
  // Record an audit log entry; no-op if Supabase not configured
  async log(
    userId: string | null,
    action: string,
    targetType: string,
    targetId: string,
    oldValue: unknown,
    newValue: unknown,
    description?: string
  ): Promise<void> {
    if (!supabase) return;
    const payload = {
      user_id: userId,
      action,
      target_type: targetType,
      target_id: targetId,
      old_value: oldValue as any,
      new_value: newValue as any,
      description: description ?? null,
    };
    const { error } = await supabase.from('audit_logs').insert(payload);
    if (error) throw error;
  },
};

export const graphService = {
  // manage topology: cities, edges, etc.
  async listEdges(): Promise<Edge[]> {
    if (!supabase) return mockEdges as any;
    const { data, error } = await supabase
      .from('edges')
      .select('from_city_id, to_city_id, distance');
    if (error) throw error;
    return (data ?? []).map((e: any) => ({ fromCityId: e.from_city_id, toCityId: e.to_city_id, distance: e.distance }));
  },
};

export const productService = {
  // manage products catalog
  async list(): Promise<Record<string, Product>> {
    if (!supabase) return mockProducts as any;
    const { data, error } = await supabase
      .from('products')
      .select('id, name, weight');
    if (error) throw error;
    const out: Record<string, Product> = {};
    for (const p of data ?? []) {
      out[p.id] = { id: p.id, name: p.name, weight: p.weight };
    }
    return out;
  },
};
