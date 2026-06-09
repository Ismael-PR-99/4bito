# 4BITO — Retro Sports E-Commerce

![CI](https://github.com/Ismael-PR-99/4bito/actions/workflows/ci.yml/badge.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6?logo=typescript&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-19-dd0031?logo=angular&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169e1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ed?logo=docker&logoColor=white)

Full-stack e-commerce for vintage and retro sports apparel. Portfolio project demonstrating production-grade patterns across the full stack — auth, search, caching, testing, CI/CD, and more.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 19 · Standalone components · Signals · RxJS |
| Backend | Node.js 20 · Express · TypeScript · tsx |
| Database | PostgreSQL 18 · Full-text search · GIN indexes |
| Auth | JWT (1 h) · Refresh tokens (30 d, httpOnly cookie) · bcrypt |
| Validation | Zod v4 |
| Testing | Vitest · Supertest — 49 tests |
| CI/CD | GitHub Actions |
| Infra | Docker multi-stage · docker-compose |
| Email | Nodemailer |
| Security | Helmet · express-rate-limit · CORS |

---

## Features

### Store
- Product catalog with full-text search (`to_tsvector` + trigram ILIKE fallback)
- Filter by decade, category, novelties; sort by price or date
- Offset pagination with load-more (Angular signals)
- Product detail with size selector, stock display, and customer reviews
- Wishlist and product comparison
- Discount code validation at checkout
- PayPal transaction ID storage

### User account
- Register / login with JWT + silent refresh via httpOnly cookie
- Password reset by email (anti-enumeration pattern, 1 h expiry)
- Order history with state timeline (procesando → enviado → entregado)
- Saved preferred sizes per garment type
- Return requests within 30 days of delivery
- Stock notification subscription (waitlist by product + size)

### Admin dashboard (11 sections)
| Section | Capability |
|---------|-----------|
| Resumen | Daily metrics, revenue KPIs, trend indicators |
| Pedidos | Full order management with status workflow |
| Inventario | Product CRUD, image upload, per-size stock editing |
| Ventas | SVG revenue chart, top products, monthly summary |
| Pieza de la semana | Timed featured product with automatic discount |
| Alertas de stock | Low stock threshold notifications |
| Historial | Stock movement audit log with CSV export |
| Reseñas | Pending review moderation (approve / delete) |
| Lista de espera | Batch notify waitlist subscribers by product + size |
| Devoluciones | Return request workflow (pending → approved → processing → completed) |
| Chat de soporte | Real-time customer support conversations |

---

## Architecture

```
4bito/
├── src/                      # Angular 19 frontend  :4200
│   └── app/
│       ├── pages/            # Route-level components (lazy-loaded)
│       ├── components/       # Shared UI components
│       ├── services/         # HTTP + state services
│       ├── interceptors/     # Auth: JWT attach + automatic 401 refresh
│       └── core/             # GlobalErrorHandler
│
├── api/                      # Express REST API  :3000
│   └── src/
│       ├── routes/           # 17 route modules
│       ├── middleware/       # requireAuth · requireAdmin · optionalAuth
│       ├── __tests__/        # 49 Vitest tests (unit + integration)
│       ├── db.ts             # pg Pool (max 10, idle/connection timeouts)
│       ├── jwt.ts            # sign / verify helpers
│       ├── email.ts          # Nodemailer transactional templates
│       ├── logger.ts         # Structured JSON logger
│       ├── validate.ts       # Zod schemas + middleware factory
│       └── startup.ts        # Env validation — fails fast on boot
│
├── 4bito-api/db/migrations/  # SQL migration files (versioned)
├── Dockerfile                # Multi-stage build
├── docker-compose.yml        # postgres:18-alpine + api
└── .github/workflows/ci.yml  # API tests + frontend type check
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 18 (or Docker)

### Local development

```bash
# 1. Clone
git clone https://github.com/Ismael-PR-99/4bito.git
cd 4bito

# 2. Frontend
npm install
ng serve                        # http://localhost:4200

# 3. API
cp api/.env.example api/.env    # fill in your values
cd api && npm install
npm run dev                     # http://localhost:3000

# 4. Database (run once)
psql -U postgres -f 4bito-api/db/migrations/postgres_schema.sql
psql -U postgres -f 4bito-api/db/migrations/006_performance_indexes.sql
```

### Docker (full stack in one command)

```bash
cp .env.example .env            # JWT_SECRET is required
docker compose up --build
```

Services start at the same ports. PostgreSQL is auto-initialized with schema + indexes via `docker-entrypoint-initdb.d`.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `JWT_SECRET` | ✓ | — | HS256 signing key |
| `JWT_EXPIRES_IN` | | `3600` | Access token TTL (seconds) |
| `DB_HOST` | ✓ | — | PostgreSQL host |
| `DB_NAME` | ✓ | — | Database name |
| `DB_USER` | ✓ | — | Database user |
| `DB_PASS` | | — | Database password |
| `DB_PORT` | | `5432` | Database port |
| `CORS_ORIGIN` | | `http://localhost:4200` | Allowed origin |
| `FRONTEND_URL` | | `http://localhost:4200` | Base URL in email links |
| `SMTP_HOST` | | `localhost` | SMTP server |
| `SMTP_PORT` | | `25` | SMTP port |
| `SMTP_USER` | | — | SMTP username |
| `SMTP_PASS` | | — | SMTP password |
| `SMTP_FROM` | | `noreply@4bito.com` | Sender address |
| `ADMIN_EMAIL` | | `admin@4bito.com` | New order alert recipient |
| `UPLOAD_DIR` | | `../uploads` | File storage directory |
| `UPLOAD_URL` | | `http://localhost:3000/uploads` | Public URL for uploaded files |

---

## Deploy on Railway

The project deploys as a single service: Express serves both the REST API (`/api/*`) and the Angular SPA from the same origin.

### One-click deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

### Manual steps

1. Create a new Railway project
2. Add a **PostgreSQL** plugin — Railway auto-sets `DATABASE_URL`
3. Add a **Web Service** pointing to this repository
4. Railway picks up `railway.toml` automatically (uses root `Dockerfile`)
5. Set environment variables in the Railway dashboard:

```
JWT_SECRET=<strong-random-secret>
CORS_ORIGIN=https://your-app.up.railway.app
FRONTEND_URL=https://your-app.up.railway.app
ADMIN_EMAIL=your@email.com
SMTP_HOST=smtp.example.com
SMTP_USER=...
SMTP_PASS=...
```

> **`DATABASE_URL`** is injected automatically by the Railway PostgreSQL plugin — no manual DB config needed.

> **Migrations** run automatically on every boot (idempotent `IF NOT EXISTS` SQL).

---

## API Reference

```
Auth
  POST  /api/auth/register
  POST  /api/auth/login
  POST  /api/auth/logout
  POST  /api/auth/refresh
  POST  /api/auth/forgot-password
  POST  /api/auth/reset-password

Products
  GET   /api/products?page&limit&search&category&decade&sort&new
  GET   /api/products/:id
  GET   /api/products/:id/frequently-bought
  POST  /api/products          [admin]
  PUT   /api/products/:id      [admin]
  DELETE/api/products/:id      [admin]
  PUT   /api/products/:id/stock[admin]

Orders
  POST  /api/orders
  GET   /api/orders            [admin]
  GET   /api/orders/user       [auth]
  GET   /api/orders/stats      [admin]
  PUT   /api/orders/:id/status [admin]

Returns     GET/POST /api/returns · PUT /api/returns/:id [admin]
Discounts   POST /api/discounts/validate
Wishlist    GET/POST/DELETE /api/wishlist [auth]
Reviews     GET/POST /api/reviews · PUT /api/reviews/:id [admin]
Chat        GET/POST /api/chat
Health      GET /api/health
```

---

## Testing

```bash
cd api
npm test                  # 49 tests across 5 suites
npm run test:coverage     # V8 coverage report
```

| Suite | Tests | Coverage |
|-------|------:|---------|
| Zod schemas + middleware | 12 | Validation layer |
| JWT sign / verify | 4 | Token utilities |
| Auth routes | 10 | login, register, logout, refresh, password reset |
| Orders routes | 7 | Validation, stock check, 201 success path |
| Products routes | 16 | Pagination, search, filters, cache, guards |

---

## Security

- Passwords hashed with bcrypt (cost 10). Legacy PHP `$2y$` hashes migrated transparently on first login.
- Refresh tokens rotate on every use — old token revoked in the same transaction (`FOR UPDATE`).
- All cookies are `httpOnly`, `sameSite: strict`, `secure` in production.
- Rate limits: global 300/15 min · auth 10/15 min (skip successful) · orders 10/10 min · discounts 30/15 min.
- Helmet security headers enabled; Zod v4 validates every request body before handlers run.
- Forgot-password always returns 200 regardless of whether the email exists (anti-enumeration).
- `validateEnv()` fails fast at boot if required env vars are missing.
- Graceful shutdown on `SIGTERM`/`SIGINT` drains the HTTP server then closes the pg pool.

---

## Database

PostgreSQL 18 features used:

- `pg_trgm` extension for fuzzy substring search on product names
- GIN index on `to_tsvector('spanish', name || team || league)` for full-text search with Spanish stemming
- `ts_rank` for relevance-ordered search results
- Composite indexes on hot query paths (`pieza_semana`, `pedidos`, `stock_notifications`)
- `JSONB` for product sizes/stock (flexible per-size inventory)
- `FOR UPDATE` row locking on refresh token rotation and order stock deduction
