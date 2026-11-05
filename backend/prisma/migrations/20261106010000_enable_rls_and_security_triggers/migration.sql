-- Enable Row Level Security and Security Triggers across all public tables
-- Version: 20261106010000

-- 1. Support auth.uid() function in both Supabase and standard PostgreSQL
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')
  )::text;
$$;

-- 2. Define authoritative admin check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text;
  v_role text;
BEGIN
  BEGIN
    v_uid := auth.uid()::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  IF v_uid IS NULL OR v_uid = '' THEN
    RETURN false;
  END IF;
  SELECT role::text INTO v_role FROM public."User" WHERE id = v_uid;
  RETURN v_role = 'ADMIN';
END;
$$;

-- 3. Trigger to protect User.role from customer privilege escalation
CREATE OR REPLACE FUNCTION public.trg_protect_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: only administrators can alter user roles.';
      END IF;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin() THEN
      NEW.role := 'CUSTOMER'::public."Role";
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_role ON public."User";
CREATE TRIGGER trg_protect_user_role
BEFORE INSERT OR UPDATE OF role ON public."User"
FOR EACH ROW
EXECUTE FUNCTION public.trg_protect_user_role();

-- 4. Trigger to protect Payment.status from unauthorized customer verification
CREATE OR REPLACE FUNCTION public.trg_protect_payment_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (NEW.status = 'VERIFIED'::public."PaymentState" AND OLD.status != 'VERIFIED'::public."PaymentState")
     OR (NEW.status = 'COLLECTED'::public."PaymentState" AND OLD.status != 'COLLECTED'::public."PaymentState") THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: customers cannot verify or collect payments.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_payment_updates ON public."Payment";
CREATE TRIGGER protect_payment_updates
BEFORE UPDATE OF status ON public."Payment"
FOR EACH ROW
EXECUTE FUNCTION public.trg_protect_payment_state();

-- 5. Inventory check constraint to prevent negative quantities
ALTER TABLE public."Inventory" DROP CONSTRAINT IF EXISTS "Inventory_quantity_check";
ALTER TABLE public."Inventory" ADD CONSTRAINT "Inventory_quantity_check" CHECK ("quantity" >= 0);

-- 6. Trigger to deduct inventory on OrderItem creation and block overselling
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

DROP TRIGGER IF EXISTS deduct_inventory_on_order_item ON public."OrderItem";
CREATE TRIGGER deduct_inventory_on_order_item
BEFORE INSERT ON public."OrderItem"
FOR EACH ROW
EXECUTE FUNCTION public.trg_deduct_inventory_on_order_item();

-- 7. Supabase Auth sync trigger if auth.users exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public."User" (id, email, name, "passwordHash", role, "createdAt", "updatedAt")
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Storefront Customer'),
    'SUPABASE_MANAGED_AUTH',
    'CUSTOMER'::public."Role",
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name,
      "updatedAt" = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 8. Enable Row Level Security on all 31 public tables
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Address" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InventoryMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StockChange" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Cart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CartItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CustomArtwork" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CustomOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CustomOrderArtwork" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DropProposal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProposalDirection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProposalVote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SubmittedIdea" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PassportRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CustomerStamp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PassportRewardRedemption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RefreshToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductActivity" ENABLE ROW LEVEL SECURITY;

-- 9. Row Level Security Policies

-- A. Catalogue Tables (Public read, admin write)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Category', 'Product', 'ProductVariant', 'ProductCategory', 'ProductImage', 'PassportRule', 'DropProposal', 'ProposalDirection']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_public_read" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_public_read" ON public.%I FOR SELECT USING (true)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_admin_write" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_admin_write" ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', t, t);
  END LOOP;
END $$;

-- B. User Table Policies
DROP POLICY IF EXISTS "User_select_own_or_admin" ON public."User";
CREATE POLICY "User_select_own_or_admin" ON public."User" FOR SELECT USING (auth.uid()::text = id OR public.is_admin());

DROP POLICY IF EXISTS "User_update_own_or_admin" ON public."User";
CREATE POLICY "User_update_own_or_admin" ON public."User" FOR UPDATE USING (auth.uid()::text = id OR public.is_admin()) WITH CHECK (auth.uid()::text = id OR public.is_admin());

DROP POLICY IF EXISTS "User_insert_public" ON public."User";
CREATE POLICY "User_insert_public" ON public."User" FOR INSERT WITH CHECK (true);

-- C. Customer Private Tables (Address, Cart, CustomerStamp, SubmittedIdea, ProposalVote, CustomArtwork, PassportRewardRedemption)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Address', 'Cart', 'CustomerStamp', 'SubmittedIdea', 'ProposalVote', 'CustomArtwork', 'PassportRewardRedemption']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select_own" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_select_own" ON public.%I FOR SELECT USING (auth.uid()::text = "userId" OR public.is_admin())', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_insert_own" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_insert_own" ON public.%I FOR INSERT WITH CHECK (auth.uid()::text = "userId" OR public.is_admin())', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_update_own" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_update_own" ON public.%I FOR UPDATE USING (auth.uid()::text = "userId" OR public.is_admin()) WITH CHECK (auth.uid()::text = "userId" OR public.is_admin())', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_delete_own" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_delete_own" ON public.%I FOR DELETE USING (auth.uid()::text = "userId" OR public.is_admin())', t, t);
  END LOOP;
END $$;

-- D. CartItem (via Cart)
DROP POLICY IF EXISTS "CartItem_own_cart" ON public."CartItem";
CREATE POLICY "CartItem_own_cart" ON public."CartItem" FOR ALL
USING (EXISTS (SELECT 1 FROM public."Cart" c WHERE c.id = "cartId" AND (c."userId" = auth.uid()::text OR public.is_admin())))
WITH CHECK (EXISTS (SELECT 1 FROM public."Cart" c WHERE c.id = "cartId" AND (c."userId" = auth.uid()::text OR public.is_admin())));

-- E. Order & Order Children
DROP POLICY IF EXISTS "Order_select_own" ON public."Order";
CREATE POLICY "Order_select_own" ON public."Order" FOR SELECT USING (auth.uid()::text = "userId" OR public.is_admin());

DROP POLICY IF EXISTS "Order_insert_own" ON public."Order";
CREATE POLICY "Order_insert_own" ON public."Order" FOR INSERT WITH CHECK (auth.uid()::text = "userId" OR public.is_admin());

DROP POLICY IF EXISTS "Order_update_own" ON public."Order";
CREATE POLICY "Order_update_own" ON public."Order" FOR UPDATE USING (auth.uid()::text = "userId" OR public.is_admin()) WITH CHECK (auth.uid()::text = "userId" OR public.is_admin());

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['OrderItem', 'OrderEvent', 'CustomOrder', 'CustomOrderArtwork', 'PaymentSubmission']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_order_access" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_order_access" ON public.%I FOR ALL USING (EXISTS (SELECT 1 FROM public."Order" o WHERE o.id = "orderId" AND (o."userId" = auth.uid()::text OR public.is_admin()))) WITH CHECK (EXISTS (SELECT 1 FROM public."Order" o WHERE o.id = "orderId" AND (o."userId" = auth.uid()::text OR public.is_admin())))', t, t);
  END LOOP;
END $$;

-- F. Payment
DROP POLICY IF EXISTS "Payment_order_access" ON public."Payment";
CREATE POLICY "Payment_order_access" ON public."Payment" FOR ALL
USING (EXISTS (SELECT 1 FROM public."Order" o WHERE o.id = "orderId" AND (o."userId" = auth.uid()::text OR public.is_admin())))
WITH CHECK (EXISTS (SELECT 1 FROM public."Order" o WHERE o.id = "orderId" AND (o."userId" = auth.uid()::text OR public.is_admin())));

-- G. Internal Tables (Admin only: Inventory, InventoryMovement, StockChange, AuditLog, RefreshToken, PasswordResetToken)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Inventory', 'InventoryMovement', 'StockChange', 'AuditLog', 'RefreshToken', 'PasswordResetToken']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_admin_only" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_admin_only" ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', t, t);
  END LOOP;
END $$;

-- H. ProductActivity
DROP POLICY IF EXISTS "ProductActivity_public_select" ON public."ProductActivity";
CREATE POLICY "ProductActivity_public_select" ON public."ProductActivity" FOR SELECT USING (true);

DROP POLICY IF EXISTS "ProductActivity_public_insert" ON public."ProductActivity";
CREATE POLICY "ProductActivity_public_insert" ON public."ProductActivity" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "ProductActivity_admin_all" ON public."ProductActivity";
CREATE POLICY "ProductActivity_admin_all" ON public."ProductActivity" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
