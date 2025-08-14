# Trade Guide - AI Assistant Guide

## 🎯 Project Core (参考 PROJECT_GUIDE.md)
**Mobile-first guild trading tool**: Price entry + single-trip direct destination profit pick (no pathfinding)
- Initially 25 ancient Chinese products, 20 cities, 3-buyable-products-per-city rule (admin may add/remove products & cities)
- Vue3+Vite+TypeScript+Pinia+Supabase stack
- Username+4digit-PIN auth, admin-approval workflow

## 📋 Document Navigation (详情见各文件)
- **Architecture**: `ROADMAP.md` → technical structure, deployment strategy  
- **Tasks**: `TODO.md` → phase-by-phase development checklist
- **Data Models**: `docs/data-models.md` → database schema, relationships
- **Authentication**: `docs/pin-auth.md` → PIN implementation details
- **Technical Details**: `README.md` → algorithms, API, deployment guide

## 🏗 Critical Architecture Patterns

### Core Business Logic (src/core/)
```
core/graph/     # Direct edge distance lookup (no multi-edge shortest path)
core/strategy/  # Single trip: enumerate origin's 3 buyables × directly reachable cities, pick max profit (tie: profit/stamina→distance)
core/pricing/   # Batch updates, dirty tracking
core/audit/     # Log all changes with before/after values
core/city/      # 3-product configuration management
```

### Data Constraints
- **Single Trip Only**: One direct move from origin to a directly connected city (no intermediate routing)
- **Stamina Rule**: City reachable only if edge distance ≤ stamina; stamina assumed fully spent for that trip cycle
- **Refresh Cycle**: Prices & stamina context considered fresh per cycle (e.g. next stamina refill after 3h, prices likely changed)
- **Performance**: <20ms calculation (simple O(3 * degree(origin))), mobile-first <100ms total response ; <90 Lighthouse mobile
- **Composite Keys**: (cityId, productId) for PriceRecord
- **Dynamic Catalog**: Admin can add/remove products & cities; cascading updates required
- **Audit Everything**: AuditLog for all mutations

### State Management (Pinia)
- `userStore`: username+pin+role, localStorage preferences only
- `priceStore`: dirty tracking, batch save, 60s polling
- `cityStore`: current city, buyable products config  
- `graphStore`: topology cache, invalidate on admin changes

## 🔧 Development Workflow
1. Check `TODO.md` for current phase tasks
2. Algorithm changes → write tests first
3. Use mock JSON before API implementation  
4. All data mutations include audit logging
5. Mobile device testing required

## 🎮 Key Business Rules
- Cities buy exactly 3 products (user-configurable)
- All cities can sell all listed products (catalog dynamic)
- Price staleness: warn at >60min, alert at >90min
- Stamina used for a single outbound trip; no chaining
- 熟人环境: trust-based, prioritize usability over security
- Admin: topology (edges, cities), product catalog, prices; User: prices, city product configs

## 💡 Code Conventions
- Chinese UI strings: `错误: 体力不足`
- English code identifiers: `calculateBestTradePlan`  
- TypeScript strict, composition API with `<script setup>`
- Mobile-first: touch-friendly, numeric keyboards for PIN/prices
