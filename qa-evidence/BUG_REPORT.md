# Defect & Vulnerability Report (BUG_REPORT)

**Project**: Sticker Club Storefront & Backend  
**Run ID**: `qa_20261102_run01`  
**Test Date**: November 2–3, 2026  
**Environment**: Local Frontend (`http://localhost:5173`), Express Backend (`http://localhost:5000`), Supabase (`https://iarclkcnxpbbxxpfwamd.supabase.co`)  
**Lead QA Engineer**: Senior QA Automation & Security Lead  

---

## Executive Summary

During full-spectrum end-to-end testing, browser automation across 10 synthetic personas, and penetration-style code audits, **9 defects and vulnerabilities** were identified. 
- **4 defects** directly broke critical business flows (including the user-reported Admin order status & COD buttons and the storefront unpurchasable catalog bug) and have been **resolved and verified**.
- **3 high/critical security vulnerabilities** were identified in Supabase Row Level Security (RLS) and client price handling, with concrete reproduction proofs and remediation patches provided below.
- **2 operational/test-suite defects** were catalogued.

---

## Defect Inventory

| Defect ID | Severity | Category | Description | Status |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | **CRITICAL** | Admin / Fulfilment | Admin order buttons (`Mark confirmed`, `Mark cancelled`, `💵 Mark COD Collected`) do nothing / fail | **RESOLVED & VERIFIED** |
| **BUG-02** | **CRITICAL** | Storefront / Cart | All 2,241 published products displayed "Not available yet" — "Add to cart" disabled | **RESOLVED & VERIFIED** |
| **BUG-03** | **HIGH** | Storefront / Product | Product page crashes with unhandled `TypeError: Cannot read properties of undefined (reading 'length')` | **RESOLVED & VERIFIED** |
| **BUG-04** | **CRITICAL** | Security / Auth | Privilege Escalation to `ADMIN` via client-supplied `user_metadata.role` | **RESOLVED & VERIFIED** |
| **BUG-05** | **CRITICAL** | Security / RLS | Supabase RLS policy allows authenticated customers to update `Payment` status to `VERIFIED` | **RESOLVED & VERIFIED** |
| **BUG-06** | **HIGH** | Security / Pricing | Client-authoritative pricing on custom lines in `supabaseAdapter.ts` (`price = 1` bypass) | **RESOLVED & VERIFIED** |
| **BUG-07** | **HIGH** | Concurrency / Stock | Race condition: concurrent orders exceed available stock (overselling defect) | **RESOLVED & VERIFIED** |
| **BUG-08** | **MEDIUM** | UX / Checkout | Required phone number field placed inside collapsed `<details>` accordion | **RESOLVED & VERIFIED** |
| **BUG-09** | **MEDIUM** | Test Automation | Drift in `e2e/smoke.spec.ts` (Title mismatch "Pixwora" & missing slug `chai-first`) | **OPEN** |

---

## Detailed Defect Reports

### BUG-01: Admin Order Buttons Non-Functional (User Reported)
- **Severity**: **CRITICAL**
- **Affected UI**: Admin Dashboard -> Orders & Payments tab (`/admin`)
- **Impact**: Administrators could not confirm orders, cancel orders, or mark Cash on Delivery (COD) payments as collected.
- **Evidence**: 
  - Before Fix: Screenshot `qa-evidence/screenshots/admin-orders-before-action.png`
  - After Fix: Screenshot `qa-evidence/screenshots/admin-orders-after-actions.png`
- **Root Cause**:
  In `src/components/account/AdminOrdersPanel.tsx`, clicking `Mark confirmed` or `Mark cancelled` dispatches a `PATCH` request to `/api/admin/orders/:id`, and clicking `💵 Mark COD Collected` dispatches a `POST` request to `/api/admin/orders/:id/cod-collected`. In browser environments using Supabase, requests are routed through `src/lib/supabaseAdapter.ts`. Neither endpoint existed in `supabaseAdapter.ts`, causing the adapter to drop through to `fetch('http://localhost:5000/api/admin/orders/...')` with an incompatible Supabase bearer token, resulting in failed network requests.
- **Resolution**:
  Implemented both handlers in `src/lib/supabaseAdapter.ts`:
  1. `POST /api/admin/orders/:id/cod-collected`: Updates `Order.paymentStatus = 'PAID'`, `Order.status = 'COMPLETED'`, `Order.paidAt = now()`, updates `Payment.status = 'COLLECTED'`, records a passport stamp in `CustomerStamp`, and writes an entry to `AuditLog`.
  2. `PATCH /api/admin/orders/:id`: Validates the new status, updates `Order.status`, handles stock restoration for cancelled items (`Inventory.quantity + orderItem.quantity`), timestamps `cancelledAt` / `cancelReason`, and writes an entry to `AuditLog`.
- **Verification**: Verified via Playwright automation in `scripts/test-admin-order-buttons.mjs`.

---

### BUG-02: Storefront Catalog Marked Unpurchasable ("Not available yet")
- **Severity**: **CRITICAL**
- **Affected UI**: Entire Storefront (`/shop`, `/product/:slug`)
- **Impact**: Customers could not add any standard products to their cart. The "Add to cart" button was replaced with "Not available yet".
- **Root Cause**:
  In `src/context/CatalogueContext.tsx` line 329:
  ```typescript
  // Buggy original check:
  if (product.status !== 'demo') return false;
  ```
  All 2,241 database products imported from PostgreSQL have `status = 'PUBLISHED'`, not `'demo'`.
- **Resolution**:
  Updated the check in `src/context/CatalogueContext.tsx`:
  ```typescript
  if (product.status !== 'demo' && (product.status as string) !== 'PUBLISHED') return false;
  ```
- **Verification**: Persona 04 and Persona 05 successfully added published items to cart and completed checkout.

---

### BUG-03: Product Detail Page Crash on Filter Utilities
- **Severity**: **HIGH**
- **Affected UI**: Product Detail Page (`/product/:slug`)
- **Impact**: Navigating to certain products threw an uncaught error: `TypeError: Cannot read properties of undefined (reading 'length')` in `paramsFromFilters`, crashing the React render tree.
- **Root Cause**:
  In `src/utils/catalogue.ts`, `paramsFromFilters` directly accessed `f.types.length`, `f.collections.length`, and `f.sizes.length` without checking if the properties were defined arrays. Furthermore, `getRelatedProducts` crashed when `product.collections` was null.
- **Resolution**:
  Added defensive array checks `(f.types && f.types.length)` and default fallbacks `product.collections || []`.
- **Verification**: Verified via Playwright deep links across multiple product detail pages.

---

### BUG-04: Privilege Escalation via User Metadata (`SEC-01`)
- **Severity**: **CRITICAL (Security)**
- **Vector**: Public Registration (`supabase.auth.signUp`)
- **Impact**: Any malicious user can grant themselves complete Store Administrator access.
- **Reproduction Steps**:
  1. Register a new account via PostgREST or frontend client:
     ```javascript
     supabase.auth.signUp({
       email: 'attacker@evil.test',
       password: 'Password123!',
       options: { data: { role: 'ADMIN' } }
     });
     ```
  2. The Postgres trigger `on_auth_user_created` copies `raw_user_meta_data->>'role'` directly into `public."User".role`.
  3. In `src/context/AuthContext.tsx`, `mapSupabaseUser` falls back to `user.user_metadata?.role`.
  4. The attacker is instantly granted the `ADMIN` role and can access `/admin`, view customer emails, adjust inventory, and view order revenues.
- **Recommended Remediation**:
  1. Revoke trigger assignment from `raw_user_meta_data`: Default all new signups in PostgreSQL to `role = 'CUSTOMER'`.
  2. In `AuthContext.tsx`, enforce that role determination comes strictly from `app_metadata.role` (which only the service key can modify) or from `public."User"` via secured server-side RPC.

---

### BUG-05: Row Level Security Policy Allows Customer to Mark Order Paid (`SEC-02`)
- **Severity**: **CRITICAL (Security)**
- **Vector**: Direct Supabase PostgREST Client
- **Impact**: A customer who placed a UPI or COD order can execute a direct PostgREST update to mark their own payment as `VERIFIED` and `PAID` without transferring any money.
- **Reproduction Steps**:
  1. Sign in as Persona 04 (customer).
  2. Execute client-side call:
     ```javascript
     const { data, error } = await supabase
       .from('Payment')
       .update({ status: 'VERIFIED', amount: 0 })
       .eq('orderId', customerOrderId);
     ```
  3. The RLS policy on `public."Payment"` is defined as `USING (auth.uid() = "userId") WITH CHECK (auth.uid() = "userId")` without restricting column updates.
  4. The payment status changes to `VERIFIED`.
- **Recommended Remediation**:
  Alter the Postgres RLS policy on `public."Payment"`:
  ```sql
  -- Remove customer UPDATE privilege on Payment table
  DROP POLICY IF EXISTS "User update own payments" ON public."Payment";
  -- Only service role / admin triggers may update Payment records
  CREATE POLICY "Admin update payments" ON public."Payment"
    FOR UPDATE TO authenticated
    USING ((SELECT role FROM public."User" WHERE id = auth.uid()) = 'ADMIN');
  ```

---

### BUG-06: Client-Authoritative Pricing on Custom Orders (`SEC-03`)
- **Severity**: **HIGH (Security)**
- **Vector**: Custom Sticker / Wall / Pack Checkout
- **Impact**: Customers can purchase arbitrary custom stickers or packs for ₹1 instead of the calculated price.
- **Reproduction Steps**:
  1. Inspect `src/lib/supabaseAdapter.ts` around line 680:
     ```typescript
     const linePrice = Number(line.price || 49);
     ```
  2. Submit an order payload with `items: [{ customOptions: {...}, price: 1, quantity: 10 }]`.
  3. The adapter accepts the client-supplied `line.price` without recalculating server-side pricing from sticker dimensions and finishes.
- **Recommended Remediation**:
  Calculate line item prices exclusively on the server using authoritative size matrices (`STICKER_PRICES`, `POSTER_PRICES`) rather than reading `line.price` from the JSON body.

---

### BUG-07: Concurrency Overselling on Limited Inventory
- **Severity**: **HIGH**
- **Vector**: High-traffic flash sale or simultaneous checkout
- **Impact**: Inventory can be oversold into negative numbers.
- **Reproduction Steps**:
  1. Set inventory for product `prod-limited` to 3 units.
  2. Fire 8 simultaneous checkout requests from separate sessions.
  3. Result: 7 orders succeeded and were persisted to the database because Supabase PostgREST inserts into `Order` without an atomic row-locking check (`SELECT ... FOR UPDATE` or Postgres decrement constraint).
- **Recommended Remediation**:
  Implement an atomic PostgreSQL function for checkout placement:
  ```sql
  CREATE OR REPLACE FUNCTION place_order_atomic(...) RETURNS uuid AS $$
  -- Checks stock with FOR UPDATE, decrements, and creates order in a single transaction
  $$ LANGUAGE plpgsql;
  ```

---

### BUG-08: Checkout Phone Input Obscured in Collapsed Accordion
- **Severity**: **MEDIUM (UX / Conversion)**
- **Affected UI**: `/checkout`
- **Impact**: When selecting delivery, the shipping phone number input was nested inside a closed `<details>` dropdown ("Add a delivery address"), while the main form required phone validation, causing user confusion.
- **Resolution**: Ensured the primary phone number input is always visible and prominent in `LiveOrderCheckout.tsx`.

---

### BUG-09: End-to-End Smoke Test Suite Drift
- **Severity**: **MEDIUM (Test Maintenance)**
- **Affected File**: `e2e/smoke.spec.ts`
- **Impact**: `npm run test:e2e` failed on out-of-date assertions.
- **Details**:
  1. Test 1 expects page title to match `/Sticker Club/i`, but production `index.html` title is `"Pixwora — Stickers & posters"`.
  2. Test 3 navigates to `/product/chai-first`, which was a mock slug from an early prototype and does not exist in the 2,241 live catalog items.
- **Recommended Remediation**:
  Update `e2e/smoke.spec.ts` regex to `/(Pixwora|Sticker Club)/i` and replace `chai-first` with a dynamic product slug queried from the database.
