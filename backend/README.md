# Sticker Club local API (development)

This is a **local self-managed** Express + Prisma + PostgreSQL API. No hosted backend is used.

## Requirements
- Node.js 20+ and npm
- PostgreSQL running locally
- A database and PostgreSQL role that you control

## Setup

From the repository root:

```bash
npm install
cp .env.example .env
```

Set `VITE_API_URL=http://localhost:5000` in the root `.env`.

Create a PostgreSQL database named `stickerclub` and an application role with privileges to create tables in its schema. For example, in `psql` as a privileged local user, replacing the sample password with your own:

```sql
CREATE ROLE stickerclub WITH LOGIN PASSWORD 'REPLACE_WITH_PRIVATE_PASSWORD';
CREATE DATABASE stickerclub OWNER stickerclub;
-- Optional: If you intend to author new migrations using 'npm run db:migrate:dev':
-- ALTER ROLE stickerclub CREATEDB;
```

Then:

```bash
cd backend
npm install
cp .env.example .env
```

Set `DATABASE_URL`, `JWT_SECRET` (at least 32 random characters), `FRONTEND_ORIGIN` and `PORT` in `backend/.env`. Do not commit these values.

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`. In a separate terminal at the repository root, run `npm run dev`. Frontend: http://localhost:5173; API: http://localhost:5000; health check: http://localhost:5000/api/health.

The **first** administrator can be bootstrapped only by setting local `ADMIN_EMAIL` and `ADMIN_PASSWORD` (minimum 12 characters) before `npm run db:seed`. Remove those values afterward. Seeding never upgrades an existing customer.

## Important limitations

- **Frontend and database catalogues are initially synchronized by seed, not continuously.** The seed imports the existing products and options without inventing customer orders, revenue or stock.
- **Checkout has two paths:** a legacy preview and an authenticated database-backed unpaid order path for configured catalogue items and variants. No payment collection exists. Never describe a pending order as paid.
- Password reset tokens are printed to the backend console **only when NODE_ENV=development**. Production requires an email delivery integration before password reset can function.
- Access JWTs are held in React memory, refresh tokens in HTTP-only cookies. Refresh endpoints enforce the configured frontend origin. For production, put both frontend and API behind HTTPS, configure a trusted same-site origin, ensure cookie Secure is true, and use a deployment-specific CSRF strategy.
- This backend must be thoroughly tested and audited before accepting real customers. Its frontend account dashboard currently displays server-derived records but now includes address editing and inventory controls, but other workflows still need release testing.
- Run `npm run build` and `npm test` at the repository root; run `npm run build` inside `backend`. Confirm database migrations, registration, authorization, logout, reset, crop export and responsive UI in a real local environment before using it.

## Current endpoints

- `GET /api/health`
- `POST /api/auth/register`, `login`, `refresh`, `logout`, `forgot-password`, `reset-password`
- `GET/PATCH /api/me`; `GET/POST /api/me/addresses`; `DELETE /api/me/addresses/:id`
- `GET /api/me/orders`, `GET /api/products`
- `GET /api/admin/stats`, `GET /api/admin/customers`, `GET /api/admin/products`, `POST /api/admin/products`, `PATCH/DELETE /api/admin/products/:id`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id`

All /api/me routes require a valid bearer access token. All /api/admin routes require backend-verified ADMIN role. Public registration always creates CUSTOMER role.

## Verification status

Source files have been added, but npm install, Prisma generation, migration execution, browser testing and API integration tests have **not** been run in the source-editing environment. These checks are mandatory before production use.

## Clean database initialization order

The committed migrations run in lexical order:

1. `20261030110000_init`: creates all base tables, constraints, and core enums.
2. `20261030120000_cart_checkout`: adds PaymentStatus, order-address snapshots and cart-item uniqueness.\n3. `20261030130000_product_variants`: stores variant prices and selected options on carts/orders.

From the backend directory, after configuring the local PostgreSQL role/database and `.env`, run:

```bash
npm run db:generate
npx prisma migrate deploy
npm run db:seed
npm run build
```

These commands have **not been executed against a clean database here**. If Prisma reports migration drift or a schema mismatch, stop and investigate before editing applied migrations. Do not use `prisma db push` as a substitute for migration history or reset a database containing real data.

The seed loads `../src/data/products.ts` and `../src/data/collections.ts` through `tsx`. Run seed from a checkout containing both the frontend and backend folders. It seeds only new products, never overwrites an existing product's live price, and does not create fictional inventory. The frontend shop still reads its bundled catalogue rather than the database and is **not** safe for real checkout until that gap is resolved.

## Compiled Node server (non-watch mode)

After `npm install`, `npm run db:generate`, migrations, and environment setup in `backend/`:

```bash
npm run build
npm start
```

This builds `backend/dist/index.js` using TypeScript and runs Node directly. `npm run dev` remains the recommended interactive local development command. Do not deploy to production before HTTPS, logging, database backups, credentials, and security reviews are in place.
