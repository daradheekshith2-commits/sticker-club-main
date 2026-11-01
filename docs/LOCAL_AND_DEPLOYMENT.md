# Sticker Club — Local Development & Production Deployment Guide

This guide describes how to configure, develop, test, and deploy the Sticker Club e-commerce platform.

---

## 1. Architecture Overview

- **Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS 4.
  - Port: `5173` (dev) / static file serving (production).
  - State & Routing: React Context (`AuthContext`, `CartContext`, `CatalogueContext`), custom router (`App.tsx`).
- **Backend**: Node.js 24, Express 5, Prisma 6, TypeScript (`tsx` in dev, `tsc` build).
  - Port: `5000` (configurable via `PORT`).
  - Database: PostgreSQL 17.
  - Storage: Modular driver supporting local disk (`backend/uploads/artwork`) or S3-compatible object storage (AWS S3, Cloudflare R2, MinIO).
  - Payments: Native UPI (manual reference / UTR submission and admin verification) and Cash on Delivery (COD).

---

## 2. Prerequisites

- **Operating System**: Windows 10/11, macOS, or Linux (Ubuntu 22.04+ recommended for production).
- **Node.js**: `v24.x` (LTS).
- **npm**: `v10.x` or higher.
- **PostgreSQL**: PostgreSQL 17 server running locally or hosted (e.g., Supabase, Neon, AWS RDS).

---

## 3. Environment Variables Configuration

### Root Storefront (`.env`)

Create or update `.env` in the repository root:

```env
# URL where the Express backend is listening
VITE_API_URL=http://localhost:5000
```

### Backend (`backend/.env`)

Create or update `backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development # 'development' | 'production' | 'test'

# Database
# Note: In development, uses the 'public' schema
DATABASE_URL=postgresql://stickerclub:chintu641@localhost:5432/stickerclub?schema=public

# Security (JWT secrets must be at least 32 characters long)
JWT_SECRET=stickerclub_jwt_secret_must_be_at_least_32_characters_long_for_security
JWT_REFRESH_SECRET=stickerclub_jwt_refresh_secret_must_be_at_least_32_characters_long

# CORS & Cookies
CORS_ORIGIN=http://localhost:5173
COOKIE_SECURE=false # Set to true in production with HTTPS
COOKIE_SAMESITE=lax # 'lax' or 'none' (with COOKIE_SECURE=true for cross-origin setups)
# COOKIE_DOMAIN=.example.com # Set to your apex domain in production if frontend and backend share subdomains
# TRUST_PROXY=1 # Set to 1 behind reverse proxies (Nginx, Cloudflare, Traefik, AWS ALB)

# Store & Payments Configuration
UPI_ID=store@upi # Owner's UPI handle
UPI_NAME=Sticker Club
DELIVERY_FEE=50.00 # Flat delivery fee in INR (set to 0.00 for free shipping)

# File Storage Driver ('local' or 's3')
STORAGE_DRIVER=local
UPLOAD_DIR=./uploads/artwork
MAX_UPLOAD_SIZE_MB=10

# S3 Storage (Required only if STORAGE_DRIVER=s3)
# S3_BUCKET=sticker-club-uploads
# S3_REGION=ap-south-1
# S3_ACCESS_KEY_ID=your_access_key
# S3_SECRET_ACCESS_KEY=your_secret_key
# S3_ENDPOINT=https://s3.ap-south-1.amazonaws.com

# Optional SMTP Email Configuration (Falls back to console logger if omitted)
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=apikey
# SMTP_PASS=your_sendgrid_api_key
# SMTP_FROM="Sticker Club <orders@stickerclub.in>"
```

---

## 4. Local Development Setup

### Step 1: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Step 2: Run Database Migrations

Apply existing additive migrations to your PostgreSQL database:

```bash
cd backend
npx prisma migrate deploy
```

*(Note: Never run `prisma migrate reset` or `db push --force-reset` on databases containing valuable data).*

### Step 3: Seed Catalogue Data

Populate the database with the initial products, variants, and stock:

```bash
cd backend
npm run db:seed
cd ..
```

### Step 4: Build Category Artwork

Generate the transparent WebP category doors (`stickers`, `posters`, `custom`):

```bash
npm run art:build
```

### Step 5: Start Development Servers

Open two terminal sessions:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
# Server listens at http://localhost:5000
```

**Terminal 2 (Frontend):**
```bash
npm run dev
# Vite dev server runs at http://localhost:5173
```

Visit `http://localhost:5173` in your browser.

---

## 5. Verification & Testing

### Frontend Typecheck & Build

```bash
npm run typecheck
npm run build
```

### Frontend Unit & State Tests

```bash
npm test
```
Runs 83+ automated test assertions covering cart reducers, pricing math, checkout form validations, wall layout math, pack configs, and UTR validation.

### Backend Integration Tests

Backend tests execute strictly against an isolated disposable schema (`stickerclub_test`) so your primary database data is never touched or polluted:

```bash
# Windows PowerShell / CMD:
cmd /c "set DATABASE_URL=postgresql://stickerclub:chintu641@localhost:5432/stickerclub?schema=stickerclub_test&& set TEST_DATABASE_IS_DISPOSABLE=yes&& cd backend && npm test"
```
Runs test suites covering:
- E2E registration, login, stock deductions, and cart sync.
- Phase 1: Serializable transaction concurrency (`P2034` conflict retry), cancellation stock restore idempotency, `InventoryMovement` audit logs, rate limiting.
- Phase 2: UPI & COD payment workflows, UTR submission, duplicate prevention, admin verify/reject, COD collection, and shipping guard.
- Phase 3: DB-backed catalogue source of truth, zero client-server price discrepancies, customer cancel request, and admin filters.
- Phase 4: Artwork magic bytes validation, local/S3 storage driver, path traversal guards, server-side pricing for custom stickers/packs/walls, and upload cleanup.
- Phase 6: Auth lifecycle, refresh token rotation, token reuse detection, comprehensive RBAC matrix (verifying customers receive 403 Forbidden across all `/api/admin/*` endpoints), and cross-customer IDOR protection.

### E2E Smoke Tests with Playwright

```bash
npx playwright test
```

---

## 6. Production Deployment

### 1. Production Build

```bash
# Build frontend static files
npm run build
# Output is placed in `dist/`

# Build backend TypeScript
cd backend
npm run build
# Output is compiled into `backend/dist/`
```

### 2. Database Migrations in Production

Always run Prisma migrate deploy prior to launching the new application code:

```bash
cd backend
npx prisma migrate deploy
```

All migrations in `backend/prisma/migrations/` are strictly additive and backward-compatible.

### 3. Running Backend with Process Manager (PM2)

```bash
cd backend
npm install -g pm2
pm2 start dist/index.js --name "sticker-club-api" -i max
pm2 save
pm2 startup
```

### 4. Reverse Proxy Configuration (Nginx)

Example Nginx server block configuring SSL, routing API traffic to Node.js on port 5000, and serving Vite's compiled frontend static files:

```nginx
server {
    listen 80;
    server_name stickerclub.in www.stickerclub.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name stickerclub.in www.stickerclub.in;

    ssl_certificate /etc/letsencrypt/live/stickerclub.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stickerclub.in/privkey.pem;

    # Frontend Static Files
    root /var/www/sticker-club/dist;
    index index.html;

    # Client-side routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Upload size limit for custom artwork (10MB)
        client_max_body_size 12M;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|webp|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 5. Health Check Monitoring

The backend exposes a health check endpoint at `GET /api/health`:

```json
{
  "ok": true,
  "db": true,
  "timestamp": "2026-11-01T01:55:00.000Z",
  "uptimeSeconds": 86400
}
```
If the database connection is lost, it responds with status `503 Service Unavailable`:
```json
{
  "ok": false,
  "db": false,
  "error": "Database ping failed",
  "timestamp": "2026-11-01T01:55:00.000Z"
}
```
Configure your load balancer or uptime monitor (e.g., Uptime Kuma, AWS Route 53, Datadog) to ping `https://stickerclub.in/api/health`.

---

## 7. Operational Runbook

### Artwork Upload Cleanup
Custom artwork uploaded during the sticker customizer process that was never finalized into an order after 24 hours is automatically pruned via:
- Admin endpoint: `POST /api/admin/uploads/cleanup`
- Can be scheduled as a daily cron job or triggered via the admin dashboard.

### Database Backups
Schedule daily automated backups using `pg_dump`:
```bash
pg_dump -Fc -U stickerclub -d stickerclub -f /backups/stickerclub_$(date +%Y%m%d_%H%M%S).dump
```
Keep 30 days of daily backups stored securely off-site.
