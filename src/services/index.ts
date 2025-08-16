// Service layer with optional Supabase integration (graceful fallback to no-op for local mocks)
import type { City, Product, Edge, PriceRecord } from '@/core/types/domain';
import { supabase } from './supabaseClient';
import { verifyPin, validatePinFormat, hashPin } from '@/core/auth/pin';
import { mockCities, mockEdges, mockProducts, mockPriceMap } from '@/mocks/seed';
import type { PriceMap } from '@/core/types/domain';

export const userService = {
  // register, approve, verifyPin ...
  async login(username: string, pin: string): Promise<{ username: string; approved: boolean; isAdmin: boolean; isCreator: boolean }> {
    if (!validatePinFormat(pin)) throw new Error('PIN_INVALID');
    if (!supabase) {
      // Mock mode: only accept pin '1234'
      if (pin !== '1234') throw new Error('PIN_INVALID');
      // Demo: username 'admin' has admin rights
      const isAdmin = username.toLowerCase() === 'admin';
      const isCreator = username.toLowerCase() === 'admin';
      return { username, approved: true, isAdmin, isCreator };
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

    // Must be approved to log in
    if (!data.approved) {
      throw new Error('USER_NOT_FOUND_OR_NOT_APPROVED');
    }

    // Disabled account: no PIN hash stored
    if (!data.pin_hash) {
      throw new Error('ACCOUNT_DISABLED');
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

  const isCreator = data.username === 'admin';
  return { username: data.username, approved: !!data.approved, isAdmin: !!data.is_admin, isCreator };
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
      .insert({ id: username, username, pin_hash: hashed, approved: false, is_admin: false });
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
  async listAll(): Promise<Array<{ id: string; username: string; approved: boolean; is_admin: boolean; created_at?: string }>> {
    if (!supabase) {
      return [
        { id: 'admin', username: 'admin', approved: true, is_admin: true },
        { id: 'user_a', username: 'user_a', approved: true, is_admin: false },
        { id: 'user_b', username: 'user_b', approved: false, is_admin: false },
      ];
    }
    const { data, error } = await supabase
      .from('users')
      .select('id, username, approved, is_admin, created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as any;
  },
  async setAdmin(targetUserId: string, isAdmin: boolean): Promise<void> {
    if (!supabase) return; // no-op in demo
    // Try by id; if no rows affected, try by username
    let q = supabase.from('users').update({ is_admin: isAdmin }).eq('id', targetUserId).select('id');
    let { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) {
      const res2 = await supabase.from('users').update({ is_admin: isAdmin }).eq('username', targetUserId).select('id');
      if (res2.error) throw res2.error;
    }
  },
  async deleteUser(targetUserId: string): Promise<void> {
    if (!supabase) return; // demo no-op
    // Prefer hard delete so the user must re-register
    let { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', targetUserId)
      .select('id');
    if (error) {
      // If FK violation, fall back to disabling
      const msg = String(error.message || '');
      if ((error as any).code === '23503' || msg.includes('foreign key')) {
        const disable = await supabase
          .from('users')
          .update({ approved: false, pin_hash: null, failed_attempts: 0, locked_until: null })
          .eq('id', targetUserId)
          .select('id');
        if (disable.error) throw disable.error;
        return;
      }
      throw error;
    }
    if (!data || data.length === 0) {
      // Try by username
      const res2 = await supabase
        .from('users')
        .delete()
        .eq('username', targetUserId)
        .select('id');
      if (res2.error) {
        const msg = String(res2.error.message || '');
        if ((res2.error as any).code === '23503' || msg.includes('foreign key')) {
          const disable2 = await supabase
            .from('users')
            .update({ approved: false, pin_hash: null, failed_attempts: 0, locked_until: null })
            .eq('username', targetUserId)
            .select('id');
          if (disable2.error) throw disable2.error;
          return;
        }
        throw res2.error;
      }
    }
  },
  async approve(targetUserId: string, approved: boolean, opts?: { adminUserId?: string }): Promise<void> {
    if (!supabase) return; // demo mode no-op
    if (approved) {
      // Approve: mark approved
      let { data, error } = await supabase
        .from('users')
        .update({ approved: true })
        .eq('id', targetUserId)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        const res2 = await supabase
          .from('users')
          .update({ approved: true })
          .eq('username', targetUserId)
          .select('id');
        if (res2.error) throw res2.error;
      }
    } else {
      // Reject: hard delete so user must re-apply
      let del = await supabase.from('users').delete().eq('id', targetUserId).select('id');
      if (del.error) {
        const msg = String(del.error.message || '');
        if ((del.error as any).code === '23503' || msg.includes('foreign key')) {
          // Fallback: disable
          const dis = await supabase
            .from('users')
            .update({ approved: false, pin_hash: null, failed_attempts: 0, locked_until: null })
            .eq('id', targetUserId)
            .select('id');
          if (dis.error) throw dis.error;
        } else {
          throw del.error;
        }
      } else if (!del.data || del.data.length === 0) {
        const del2 = await supabase.from('users').delete().eq('username', targetUserId).select('id');
        if (del2.error) {
          const msg = String(del2.error.message || '');
          if ((del2.error as any).code === '23503' || msg.includes('foreign key')) {
            const dis2 = await supabase
              .from('users')
              .update({ approved: false, pin_hash: null, failed_attempts: 0, locked_until: null })
              .eq('username', targetUserId)
              .select('id');
            if (dis2.error) throw dis2.error;
          } else {
            throw del2.error;
          }
        }
      }
    }
    try {
      await auditService.log(
        (opts?.adminUserId ?? null) as any,
        approved ? 'user_approve' : 'user_reject',
        'user',
        targetUserId,
        { approved: !approved },
        approved ? { approved: true } : null,
        approved ? undefined : 'user rejected and removed'
      );
    } catch {}
  },
  async resetPin(targetUserId: string, newPin: string, opts?: { operatorId?: string }): Promise<void> {
    if (!validatePinFormat(newPin)) throw new Error('PIN_INVALID');
    if (!supabase) return; // demo no-op
    // Prevent non-creator admins from resetting the creator's PIN
    if ((opts?.operatorId || '').toLowerCase() !== 'admin') {
      // resolve username for target
      const target = await supabase.from('users').select('username').eq('id', targetUserId).maybeSingle();
      if (target.error) throw target.error;
      const targetUsername = target.data?.username ?? targetUserId;
      if ((targetUsername || '').toLowerCase() === 'admin') {
        throw new Error('FORBIDDEN_RESET_CREATOR');
      }
    }
    const hashed = await hashPin(newPin);
    let { data, error } = await supabase
      .from('users')
      .update({ pin_hash: hashed, failed_attempts: 0, locked_until: null })
      .eq('id', targetUserId)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      const res2 = await supabase
        .from('users')
        .update({ pin_hash: hashed, failed_attempts: 0, locked_until: null })
        .eq('username', targetUserId)
        .select('id');
      if (res2.error) throw res2.error;
    }
    try {
      await auditService.log((opts?.operatorId ?? null) as any, 'user_reset_pin', 'user', targetUserId, null, null, 'reset user pin');
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
      updated_by: opts?.userId ?? r.updatedBy ?? null,
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
  map.get(c)!.set(p, { buyPrice: row.buy_price ?? null, sellPrice: row.sell_price ?? null, updatedAt: row.updated_at ? new Date(row.updated_at as string) : null });
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
  async add(city: { id: string; name: string; buyableProductIds: [string, string, string]; createdBy?: string }): Promise<void> {
    if (!supabase) {
      (mockCities as any)[city.id] = { id: city.id, name: city.name, buyableProductIds: city.buyableProductIds } as any;
      return;
    }
    const { error } = await supabase
      .from('cities')
      .insert({ id: city.id, name: city.name, buyable_product_ids: city.buyableProductIds, created_by: city.createdBy ?? null });
    if (error) throw error;
  },
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
  async rename(cityId: string, newName: string): Promise<void> {
    if (!supabase) {
      if ((mockCities as any)[cityId]) (mockCities as any)[cityId].name = newName;
      return;
    }
    const { error } = await supabase.from('cities').update({ name: newName }).eq('id', cityId);
    if (error) throw error;
  },
  async remove(cityId: string): Promise<void> {
    if (!supabase) {
      delete (mockCities as any)[cityId];
      // also remove mock edges touching the city
      for (let i = (mockEdges as any).length - 1; i >= 0; i--) {
        const e = (mockEdges as any)[i];
        if (e.fromCityId === cityId || e.toCityId === cityId) (mockEdges as any).splice(i, 1);
      }
      // mock price map omitted here (read-only mock)
      return;
    }
    const { error } = await supabase.from('cities').delete().eq('id', cityId);
    if (error) throw error; // edges & price_records cascade via FK
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
  async upsertEdges(rows: Array<{ fromCityId: string; toCityId: string; distance: number }>): Promise<void> {
    if (!supabase) {
      // demo: update mockEdges in-memory (best-effort)
      for (const r of rows) {
        const i = (mockEdges as any).findIndex((e: any) => e.fromCityId === r.fromCityId && e.toCityId === r.toCityId);
        if (i >= 0) (mockEdges as any)[i].distance = r.distance;
        else (mockEdges as any).push({ fromCityId: r.fromCityId, toCityId: r.toCityId, distance: r.distance });
      }
      return;
    }
    const payload = rows.map(r => ({ from_city_id: r.fromCityId, to_city_id: r.toCityId, distance: r.distance }));
    const { error } = await supabase
      .from('edges')
      .upsert(payload, { onConflict: 'from_city_id,to_city_id' });
    if (error) throw error;
  },
  async deleteEdges(rows: Array<{ fromCityId: string; toCityId: string }>): Promise<void> {
    if (!supabase) {
      for (const r of rows) {
        const i = (mockEdges as any).findIndex((e: any) => e.fromCityId === r.fromCityId && e.toCityId === r.toCityId);
        if (i >= 0) (mockEdges as any).splice(i, 1);
      }
      return;
    }
    for (const r of rows) {
      const { error } = await supabase.from('edges')
        .delete()
        .eq('from_city_id', r.fromCityId)
        .eq('to_city_id', r.toCityId);
      if (error) throw error;
    }
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
  async update(productId: string, patch: Partial<Pick<Product, 'name' | 'weight'>>): Promise<void> {
    if (!supabase) {
      if ((mockProducts as any)[productId]) Object.assign((mockProducts as any)[productId], patch);
      return;
    }
    const { error } = await supabase.from('products').update(patch as any).eq('id', productId);
    if (error) throw error;
  },
  async add(product: { id: string; name: string; weight: number }): Promise<void> {
    if (!supabase) {
      (mockProducts as any)[product.id] = { ...product } as any;
      return;
    }
    const { error } = await supabase.from('products').insert({ id: product.id, name: product.name, weight: product.weight });
    if (error) throw error;
  },
  async rename(productId: string, newName: string): Promise<void> {
    if (!supabase) {
      if ((mockProducts as any)[productId]) (mockProducts as any)[productId].name = newName;
      return;
    }
    const { error } = await supabase.from('products').update({ name: newName }).eq('id', productId);
    if (error) throw error;
  },
  async remove(productId: string, opts?: { force?: boolean }): Promise<void> {
    if (!supabase) {
      // Update mock cities to keep 3 buyables
      const products = Object.keys(mockProducts as any).filter(id => id !== productId);
      if (products.length < 3) throw new Error('删除后商品不足 3 种，无法维持城市配置');
      for (const cid of Object.keys(mockCities as any)) {
        const arr = ((mockCities as any)[cid].buyableProductIds as string[]).slice();
        if (arr.includes(productId)) {
          const idx = arr.indexOf(productId);
          const pool = products.filter(p => !arr.includes(p));
          if (!pool.length) throw new Error('删除将导致某城市可买商品不足');
          arr[idx] = pool[0];
          (mockCities as any)[cid].buyableProductIds = [arr[0], arr[1], arr[2]];
        }
      }
      delete (mockProducts as any)[productId];
      return;
    }
    if (opts?.force) {
      // Ensure cities remain valid after deletion
      const productsMap = await this.list();
      const productIds = Object.keys(productsMap).filter(id => id !== productId);
      if (productIds.length < 3) throw new Error('删除后商品不足 3 种，无法维持城市配置');
      const cities = await cityService.list();
      for (const cid of Object.keys(cities)) {
        const arr = cities[cid].buyableProductIds.slice() as string[];
        if (arr.includes(productId)) {
          const idx = arr.indexOf(productId);
          const pool = productIds.filter(p => !arr.includes(p));
          if (!pool.length) throw new Error('删除将导致某城市可买商品不足');
          arr[idx] = pool[0];
          await cityService.updateBuyables(cid, [arr[0], arr[1], arr[2]] as any);
        }
      }
    } else {
      // soft check: warn if referenced
      const cities = await cityService.list();
      if (Object.values(cities).some(c => c.buyableProductIds.includes(productId as any))) {
        throw new Error('HAS_ASSOCIATIONS');
      }
    }
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) throw error;
  },
};
