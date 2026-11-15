# Database Migration Review & Rollback Plan
**Migration:** `20261106160546_payment_receipt_url`  
**Target Database:** PostgreSQL 17 / Supabase  
**Date:** 15 November 2026  

---

## 1. Summary of Migration Changes

```sql
-- 1. Add receiptUrl to Payment
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT;

-- 2. Add receiptUrl to PaymentSubmission and make utr nullable
ALTER TABLE "PaymentSubmission" ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT;
ALTER TABLE "PaymentSubmission" ALTER COLUMN "utr" DROP NOT NULL;

-- 3. Remove duplicate inventory decrement trigger
DROP TRIGGER IF EXISTS deduct_inventory_on_order_item ON public."OrderItem";
```

---

## 2. Production Schema Compatibility Analysis

| Migration Statement | Live Supabase Schema Parity (`supabase_schema.sql`) | Risk / Impact |
| :--- | :--- | :--- |
| `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT;` | `Payment` already includes `"receiptUrl" TEXT` (line 260). Running `IF NOT EXISTS` is a no-op if already present. | **None (Zero Risk)**. Idempotent DDL. |
| `ALTER TABLE "PaymentSubmission" ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT;` | `PaymentSubmission` already includes `"receiptUrl" TEXT` (line 242). | **None (Zero Risk)**. Idempotent DDL. |
| `ALTER TABLE "PaymentSubmission" ALTER COLUMN "utr" DROP NOT NULL;` | `PaymentSubmission.utr` is already defined as nullable in `supabase_schema.sql` (line 241: `"utr" TEXT`). | **None (Zero Risk)**. No metadata lock. |
| `DROP TRIGGER IF EXISTS deduct_inventory_on_order_item ON public."OrderItem";` | Trigger was originally created in `20261106010000_enable_rls_and_security_triggers/migration.sql`. In application code (`backend/src/index.ts` lines 1456–1470), the backend decrements inventory inside serializable transactions. | **High Benefit (Fixes Bug)**. Prevents double-decrement of inventory on customer orders. Non-negative inventory constraint (`CHECK (quantity >= 0)`) remains active. |

---

## 3. Rationale for Trigger Removal

In `backend/src/index.ts` (lines 1456–1470), order creation performs:
```typescript
await tx.inventory.updateMany({
  where: { productId: line.productId, quantity: { gte: line.quantity } },
  data: { quantity: { decrement: line.quantity } },
});
```
When `tx.orderItem.create()` ran subsequently in the same transaction, the `deduct_inventory_on_order_item` trigger fired on `public."OrderItem"`, deducting inventory a second time. This caused items to decrement by $2 \times$ the ordered quantity and caused premature out-of-stock errors.

Dropping the database trigger restores single atomic deduction in backend transactions, while:
1. `Inventory_quantity_check` (`CHECK (quantity >= 0)`) at the PostgreSQL level continues to block overselling.
2. `recordStockMovement` continues to audit inventory movements with actor ID, reason (`ORDER`), and balance tracking.

---

## 4. Rollback Plan

If this migration needs to be rolled back, execute the following SQL script:

```sql
-- ============================================================================
-- ROLLBACK SCRIPT FOR MIGRATION 20261106160546_payment_receipt_url
-- ============================================================================

-- 1. Recreate the trigger function to deduct inventory on OrderItem
CREATE OR REPLACE FUNCTION public.trg_deduct_inventory_on_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available integer;
BEGIN
  IF NEW."productId" IS NOT NULL THEN
    SELECT "quantity" INTO v_available FROM public."Inventory" WHERE "productId" = NEW."productId" FOR UPDATE;
    IF v_available IS NOT NULL THEN
      IF v_available < NEW."quantity" THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: product % has % units but % requested', NEW."productId", v_available, NEW."quantity";
      END IF;
      UPDATE public."Inventory"
      SET "quantity" = "quantity" - NEW."quantity"
      WHERE "productId" = NEW."productId";
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Re-attach trigger on public."OrderItem"
DROP TRIGGER IF EXISTS deduct_inventory_on_order_item ON public."OrderItem";
CREATE TRIGGER deduct_inventory_on_order_item
BEFORE INSERT ON public."OrderItem"
FOR EACH ROW
EXECUTE FUNCTION public.trg_deduct_inventory_on_order_item();

-- 3. (Optional) Revert column modifications if strictly required
-- NOTE: Do NOT drop receiptUrl if customers or admin have uploaded payment receipts.
-- ALTER TABLE "Payment" DROP COLUMN IF EXISTS "receiptUrl";
-- ALTER TABLE "PaymentSubmission" DROP COLUMN IF EXISTS "receiptUrl";
-- ALTER TABLE "PaymentSubmission" ALTER COLUMN "utr" SET NOT NULL;
```

---

## 5. Deployment Policy Reminder
> [!IMPORTANT]
> Production database migrations must NEVER be executed automatically. This migration is strictly maintained in the Prisma migration log for reproducible CI/test environments, and will only be executed against production Supabase upon explicit manual authorization.
