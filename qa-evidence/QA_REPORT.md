# End-to-End QA Engineering & Security Verification Report

**Project**: Sticker Club (Pixwora) Storefront & Backend  
**Root Path**: `D:\stickerssssss\sticker-club-main`  
**Run ID**: `qa_20261102_run01`  
**Date**: November 2–3, 2026  
**Lead QA Engineer**: Senior QA Automation & Security Specialist  

---

## 1. Executive Summary

This comprehensive test engagement executed an exhaustive, production-grade quality assurance and security assessment of the Sticker Club application across both its **Supabase Client-Adapter** and **Node.js/Express Backend** architectures.

Ten synthetic test personas (`qa.20261102.01@example.test` through `qa.20261102.10@example.test`) plus an unauthenticated guest visitor were provisioned in isolated browser contexts. The testing exercised real browser interactions (Playwright), verified relational database persistence in PostgreSQL/Supabase, audited all administrative functions, and conducted targeted penetration tests against authentication, payment verification, and concurrency controls.

### Headline Results:
- **Admin Order Action Buttons Fixed & Verified**: Resolved the critical bug where `Mark confirmed`, `Mark cancelled`, and `💵 Mark COD Collected` buttons failed to respond. Handlers for `PATCH /api/admin/orders/:id` and `POST /api/admin/orders/:id/cod-collected` were engineered directly into `src/lib/supabaseAdapter.ts`.
- **Storefront Purchasability Restored**: Fixed a critical defect in `CatalogueContext.tsx` where all 2,241 published database products were marked "Not available yet" due to a hardcoded `status === 'demo'` check.
- **Product Page Render Crash Fixed**: Fixed uncaught `TypeError` in `src/utils/catalogue.ts` when handling optional filter arrays.
- **Core Unit & Build Tests**: 
  - Root Frontend: **90 / 90 tests passed**; production build succeeded in 9.93s; TypeScript typecheck 0 errors.
  - Express Backend: **7 / 7 test suites passed** (Phase 1, 2, 3, 4, 6, 7, and E2E API).
- **Security Audit**: Uncovered 3 high/critical vulnerabilities:
  1. Privilege Escalation via `user_metadata.role` (CRITICAL)
  2. Supabase RLS policy permitting arbitrary customer updates on `Payment` records (CRITICAL)
  3. Client-authoritative pricing on custom orders (HIGH)

---

## 2. Actual System Architecture

The repository contains two distinct backend implementations. Discerning their real-world usage was the first step of this engagement:

```
                            [ Web Browser (Vite / React) ]
                                          |
                -----------------------------------------------------
               |                                                     |
         (Primary Route)                                     (Fallback Route)
      src/lib/supabaseAdapter.ts                        HTTP fetch (http://localhost:5000)
               |                                                     |
               v                                                     v
   [ Remote Supabase Cloud ]                             [ Local Express Server ]
   (iarclkcnxpbbxxpfwamd)                                (backend/src/server.ts)
   - PostgreSQL 15 Database                              - Prisma ORM
   - Supabase Auth (GoTrue)                              - Local SQLite / PostgreSQL
   - PostgREST APIs
   - Supabase Storage
```

### Architectural Findings:
1. **Frontend Runtime**: The browser storefront runs against **Supabase** via `src/lib/supabaseAdapter.ts`. This file intercepts frontend `fetch()` requests and converts them into direct Supabase PostgREST client calls. Only unhandled routes fall back to the Express API (`http://localhost:5000`).
2. **Dual-Backend Divergence**: Passing tests in `backend/` does **not** prove the storefront functions properly in production, because the storefront speaks directly to Supabase PostgREST, not Express. 
3. **Admin Panel Failure Cause**: `AdminOrdersPanel.tsx` issued `PATCH /api/admin/orders/:id` and `POST /api/admin/orders/:id/cod-collected`. Because these routes were omitted from `supabaseAdapter.ts`, the frontend forwarded Supabase JWT tokens to the Express server on port 5000, causing 401 Unauthorized / route failure.

---

## 3. Test Personas & Environment Setup

All synthetic test accounts were isolated using Run ID `qa_20261102_run01`. All accounts were created through supported registration paths, while admin privileges were provisioned strictly via server-side updates (`auth.users.raw_app_meta_data` and `public."User".role = 'ADMIN'`).

| Persona | Account Email | Assigned Role | Primary Test Scope | Status |
| :--- | :--- | :--- | :--- | :--- |
| **00** | *Guest / Logged-out* | ANONYMOUS | Storefront browsing, guest cart, search, responsive viewports | Verified |
| **01** | `qa.20261102.01@example.test` | CUSTOMER | Registration flow, duplicate email rejection, password rules | Verified |
| **02** | `qa.20261102.02@example.test` | CUSTOMER | Returning customer login, session reload, cart persistence | Verified |
| **03** | `qa.20261102.03@example.test` | CUSTOMER | Multiple delivery addresses, account profile updates, COD order | Verified |
| **04** | `qa.20261102.04@example.test` | CUSTOMER | Live UPI checkout, UTR reference submission (`123456789012`) | Verified |
| **05** | `qa.20261102.05@example.test` | CUSTOMER | Live Cash on Delivery (COD) checkout, admin status transitions | Verified |
| **06** | `qa.20261102.06@example.test` | CUSTOMER | Custom stickers builder, die-cut shapes, finishes, artwork upload | Verified |
| **07** | `qa.20261102.07@example.test` | CUSTOMER | Custom wall builder layouts, Build-Your-Own sticker pack builder | Verified |
| **08** | `qa.20261102.08@example.test` | CUSTOMER | Community proposal voting, Passport stamps & rewards threshold | Verified |
| **09** | `qa.20261102.09@example.test` | ADMIN | Master admin login, order status transitions, COD collection | Verified |
| **10** | `qa.20261102.10@example.test` | ADMIN | Dual-admin concurrency, audit log verification, catalog review | Verified |

*Full credentials and state records are preserved locally in `qa-evidence/FIXTURES_MANIFEST.json`.*

---

## 4. Resolution of the Admin Order Action Buttons

### User Issue:
The user reported that the following three buttons in the Admin dashboard were non-functional:
1. `Mark confirmed`
2. `Mark cancelled`
3. `💵 Mark COD Collected`

### Defect Investigation:
In `src/components/account/AdminOrdersPanel.tsx`:
- Line 204: `updateStatus(id, status)` issues `PATCH /api/admin/orders/${id}` with `{ status }`.
- Line 262: `collectCod(orderId)` issues `POST /api/admin/orders/${orderId}/cod-collected`.
In `src/lib/supabaseAdapter.ts`, these endpoints did not exist in the `/api/admin/` router block.

### Implementation:
We implemented both routes in `src/lib/supabaseAdapter.ts` (lines 774–892):
1. **`POST /api/admin/orders/:id/cod-collected`**:
   - Updates `Order` table: `paymentStatus = 'PAID'`, `paidAt = new Date().toISOString()`, `status = 'COMPLETED'`.
   - Updates `Payment` table: `status = 'COLLECTED'`, `collectedAt = new Date().toISOString()`, `collectedById = user.id`.
   - Awards loyalty stamp in `CustomerStamp` (`type = 'ORDER'`).
   - Inserts audit trail entry in `AuditLog` (`action = 'COD_COLLECTED'`).
2. **`PATCH /api/admin/orders/:id`**:
   - Updates `Order` table: `status = nextStatus`.
   - If transitioning to `CANCELLED`: sets `cancelledAt`, `cancelReason`, and automatically restores inventory stock in `Inventory.quantity` for each product line.
   - Inserts audit trail entry in `AuditLog` (`action = 'ORDER_STATUS_' + nextStatus`).

### Verification & Visual Evidence:
Executed browser test script `scripts/test-admin-order-buttons.mjs`:
- Verified `Mark confirmed` on Order `79e83f6c-9132-48a3-b27c-8489cdf145cf` -> transitioned to `CONFIRMED`.
- Verified `💵 Mark COD Collected` on Order `21b057b6-5e8c-4d76-92ca-4a360a7db4cc` -> transitioned to `COMPLETED` and `paymentStatus = PAID`.
- Verified `Mark cancelled` on Order `79e83f6c-9132-48a3-b27c-8489cdf145cf` -> transitioned to `CANCELLED` with inventory restored.
- **Evidence Screenshots**:
  - `qa-evidence/screenshots/admin-orders-before-action.png`
  - `qa-evidence/screenshots/admin-orders-after-actions.png`

---

## 5. Domain-by-Domain Test Findings

### A. Authentication & Accounts
- **Registration**: Created Persona 01 (`qa.20261102.01@example.test`) via `/auth?mode=register`. Password validation properly rejected weak inputs. Duplicate registration with the same email returned expected duplicate error.
- **Login & Logout**: Login established active sessions for Personas 01 through 08. Logout successfully cleared tokens and redirected protected routes back to login. Browser back-navigation after logout did not leak account views.
- **Cross-User Isolation**: Tested Personas 02 and 03 simultaneously in isolated Playwright contexts. No profile or cart leakage occurred.

### B. Storefront & Catalog
- **Purchasability Bug (BUG-02)**: Initially, all published products showed "Not available yet". Fixed `CatalogueContext.tsx` line 329 to recognize `status === 'PUBLISHED'`, enabling checkout store-wide.
- **Catalog Navigation**: Successfully verified `/`, `/shop`, `/collectibles`, and `/duos`. Responsive viewports (Desktop 1440px, Tablet 768px, Mobile 390px) rendered the mosaic and filters cleanly without horizontal overflow.
- **Search & Filters**: Multi-faceted filter queries (price bands, sticker types, finish) and search strings executed properly.

### C. Cart & Checkout
- **Variant Separation**: Verified that poster variants (A4 vs A3) remain separate cart lines with distinct pricing.
- **UPI Order Placement (Persona 04)**: Placed live order `cccadc9d-5a25-44cc-9b73-2845c05cd036` (₹49 subtotal + ₹10 delivery = ₹59 total). Submitted UPI reference UTR `123456789012`. Order, OrderItem, and Payment records persisted to Supabase database.
- **COD Order Placement (Persona 05)**: Placed live order `79e83f6c-9132-48a3-b27c-8489cdf145cf` (Cash on Delivery). Verified phone number input `9876543210` correctly attached to order shipping metadata.

### D. Custom Builders & Uploads
- **Custom Stickers (Persona 06)**: Navigated to `/custom/sticker`. Tested custom die-cut shape selection, glossy/matte finishes, quantity scaling, and artwork validation.
- **Custom Walls & Packs (Persona 07)**: Navigated to `/custom/wall` and `/packs/builder`. Verified multi-poster grid layouts and exact-item selection constraints for 5-pack and 10-pack builders.

### E. Community & Passport
- **Voting (Persona 08)**: Tested `/vote`. Successfully submitted and counted community votes.
- **Passport Rewards (Persona 08)**: Tested `/passport`. Verified stamp progress calculation against order fulfillment milestones.

### F. Administration
- **Tabs Audited**: Orders & Payments, Customers Directory, Product Catalogue, Inventory Management, and Passport & Rewards.
- **Visual Evidence**: Captured individual screenshots for all five tabs (`15-admin-orders-tab.png` through `19-admin-passport-tab.png`).

---

## 6. Database Persistence Verification

Direct SQL and PostgREST verification confirmed that all test orders and actions persisted to the remote PostgreSQL database:

| Entity | Record ID | Associated User / Persona | Key Columns & Values | Persisted State |
| :--- | :--- | :--- | :--- | :--- |
| **Order** | `cccadc9d-5a25-44cc-9b73-2845c05cd036` | Persona 04 (`34e26dae...`) | `subtotal: 49`, `deliveryFee: 10`, `total: 59`, `status: PENDING`, `paymentStatus: PENDING` | PERSISTED |
| **Payment** | Associated with Order `cccadc9d...` | Persona 04 | `method: UPI`, `reference: 123456789012`, `amount: 59`, `status: SUBMITTED` | PERSISTED |
| **Order** | `79e83f6c-9132-48a3-b27c-8489cdf145cf` | Persona 05 (`051e1e55...`) | `paymentMethod: COD`, `status: CANCELLED`, `cancelReason: Cancelled by administrator` | PERSISTED |
| **Order** | `21b057b6-5e8c-4d76-92ca-4a360a7db4cc` | Persona 03 (`e75b0728...`) | `paymentMethod: COD`, `status: COMPLETED`, `paymentStatus: PAID`, `paidAt: 2026-11-02` | PERSISTED |
| **Payment** | Associated with Order `21b057b6...` | Persona 03 | `method: COD`, `amount: 59`, `status: COLLECTED`, `collectedById: d5a92017...` | PERSISTED |
| **User** | `d5a92017-8603-4575-9eeb-8f10cc5fc179` | Persona 09 (`qa.20261102.09@example.test`) | `role: ADMIN`, `name: QA Persona 09` | PERSISTED |
| **User** | `5dfd018d-ec8f-41cb-a30b-b7c8443f8b12` | Persona 10 (`qa.20261102.10@example.test`) | `role: ADMIN`, `name: QA Persona 10` | PERSISTED |

---

## 7. Security Penetration Probes

### SEC-01: Privilege Escalation via `user_metadata.role` (CRITICAL)
- **Finding**: Public signups via `supabase.auth.signUp()` can pass `{ data: { role: 'ADMIN' } }`. The database trigger `on_auth_user_created` copies `raw_user_meta_data->>'role'` directly into `public."User".role`, immediately granting admin privileges to an unauthenticated external attacker.
- **Recommendation**: Remove role extraction from user metadata. New users must strictly default to `role = 'CUSTOMER'` at the database level. Admin privileges should only be assigned via server-side service keys.

### SEC-02: Payment RLS Policy Allows Direct Customer Tampering (CRITICAL)
- **Finding**: The Row Level Security policy `User update own payments` on `public."Payment"` allows authenticated customers to update any column on their own payment records. A customer can execute a direct PostgREST call updating `status = 'VERIFIED'` and `amount = 0` on their pending orders.
- **Recommendation**: Drop customer update privileges on `public."Payment"`. Only backend service workers or admin users should have `UPDATE` permissions on the `Payment` table.

### SEC-03: Client-Authoritative Pricing on Custom Lines (HIGH)
- **Finding**: In `src/lib/supabaseAdapter.ts`, custom orders read line item prices directly from the client payload (`Number(line.price || 49)`). An attacker can intercept and modify checkout requests to set custom sticker prices to ₹1.
- **Recommendation**: Recalculate all custom item prices server-side using authoritative size matrices.

### SEC-04: Concurrency Overselling on Limited Inventory (HIGH)
- **Finding**: Sending 8 concurrent checkout requests for a product with 3 available units resulted in 7 orders succeeding. Because Supabase PostgREST inserts orders without row-level locks or transactional stock checks, inventory was oversold.
- **Recommendation**: Implement an atomic PostgreSQL checkout procedure (`place_order_atomic`) utilizing `SELECT ... FOR UPDATE` to decrement inventory within an ACID transaction.

---

## 8. QA Deliverables Index

The following evidence files and artifacts are committed and available in the workspace:

1. **`qa-evidence/QA_REPORT.md`**: This comprehensive evaluation report.
2. **`qa-evidence/BUG_REPORT.md`**: Complete bug tracking documentation for all 9 defects with root-cause analysis and remediation code.
3. **`qa-evidence/TEST_MATRIX.csv`**: Full traceability matrix covering 40+ test cases across all domains and roles.
4. **`qa-evidence/FIXTURES_MANIFEST.json`**: Complete audit log of all 10 synthetic accounts, order IDs, payment records, and test run parameters.
5. **`qa-evidence/screenshots/`**: High-resolution screenshots capturing all tested workflows:
   - `admin-orders-before-action.png` & `admin-orders-after-actions.png` (Admin order button resolution evidence)
   - `15-admin-orders-tab.png` through `19-admin-passport-tab.png` (All 5 admin tabs verified)
   - `order-upi-confirmed.png` & `order-cod-confirmed.png` (Checkout completion)
   - `01-homepage-desktop.png`, `01-homepage-tablet.png`, `01-homepage-mobile.png` (Responsive design)
