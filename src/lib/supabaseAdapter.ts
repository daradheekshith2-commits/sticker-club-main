import { supabase } from './supabase';
import type { Account } from '../context/AuthContext';
import type { OrderReceipt } from '../components/checkout/LiveOrderCheckout';
import { customStickerUnitPrice } from '../utils/customSticker';
import { packPrice } from '../utils/customPack';
import { wallPrice } from '../utils/customWall';
import { getLayout } from '../data/wallLayouts';

export interface AdapterResult<T = any> {
  handled: boolean;
  data?: T;
  error?: string;
  status?: number;
}

/**
 * Direct Supabase data adapter for Sticker Club storefront.
 * Ensures all UI data entries (auth, addresses, orders, payments, ideas, votes, passport, uploads)
 * are committed directly into Supabase database tables with Row Level Security.
 */
export async function handleSupabaseRequest<T>(
  path: string,
  options: RequestInit = {},
  user: Account | null
): Promise<AdapterResult<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const urlPath = path.split('?')[0];
  const queryParams = new URLSearchParams(path.includes('?') ? path.split('?')[1] : '');

  const parseBody = () => {
    if (typeof options.body === 'string') {
      try {
        return JSON.parse(options.body);
      } catch {
        return {};
      }
    }
    return (options.body as any) || {};
  };

  // 1. Profile / Account Settings (/api/me)
  if (urlPath === '/api/me') {
    if (!user) return { handled: true, error: 'Sign in required', status: 401 };

    if (method === 'GET') {
      const { data, error } = await supabase
        .from('User')
        .select('id, name, email, phone, role, createdAt')
        .eq('id', user.id)
        .single();
      if (error || !data) {
        return { handled: true, data: user as unknown as T };
      }
      return {
        handled: true,
        data: {
          id: data.id,
          email: data.email,
          name: data.name,
          phone: data.phone ?? undefined,
          role: data.role,
        } as unknown as T,
      };
    }

    if (method === 'PATCH') {
      const body = parseBody();
      const name = (body.name || '').trim();
      const phone = body.phone !== undefined ? (body.phone ? String(body.phone).trim() : null) : undefined;

      // Update in Supabase auth metadata
      await supabase.auth.updateUser({
        data: {
          name: name || user.name,
          phone: phone !== undefined ? phone : user.phone,
        },
      });

      // Update in public."User"
      const updatePayload: Record<string, any> = { updatedAt: new Date().toISOString() };
      if (name) updatePayload.name = name;
      if (phone !== undefined) updatePayload.phone = phone;

      const { data, error } = await supabase
        .from('User')
        .update(updatePayload)
        .eq('id', user.id)
        .select('id, name, email, phone, role, createdAt')
        .single();

      if (error) {
        return { handled: true, error: error.message, status: 400 };
      }

      return {
        handled: true,
        data: {
          id: data.id,
          email: data.email,
          name: data.name,
          phone: data.phone ?? undefined,
          role: data.role,
        } as unknown as T,
      };
    }
  }

  // 2. Change Password (/api/me/password)
  if (urlPath === '/api/me/password' && method === 'POST') {
    if (!user) return { handled: true, error: 'Sign in required', status: 401 };
    const body = parseBody();
    if (!body.newPassword || body.newPassword.length < 12) {
      return { handled: true, error: 'New password must be at least 12 characters', status: 400 };
    }
    const { error } = await supabase.auth.updateUser({ password: body.newPassword });
    if (error) return { handled: true, error: error.message, status: 400 };
    return { handled: true, data: { message: 'Password updated successfully' } as unknown as T };
  }

  // 3. Addresses (/api/me/addresses)
  if (urlPath === '/api/me/addresses') {
    if (!user) return { handled: true, error: 'Sign in required', status: 401 };

    if (method === 'GET') {
      const { data, error } = await supabase
        .from('Address')
        .select('*')
        .eq('userId', user.id)
        .order('isDefault', { ascending: false })
        .order('id', { ascending: true });

      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: (data || []) as unknown as T };
    }

    if (method === 'POST') {
      const body = parseBody();
      if (!body.recipient || !body.line1 || !body.city || !body.state || !body.postalCode) {
        return { handled: true, error: 'All required address fields must be filled', status: 400 };
      }

      if (body.isDefault) {
        await supabase.from('Address').update({ isDefault: false }).eq('userId', user.id);
      }

      const newAddress = {
        id: crypto.randomUUID(),
        userId: user.id,
        recipient: body.recipient.trim(),
        line1: body.line1.trim(),
        line2: body.line2 ? body.line2.trim() : null,
        city: body.city.trim(),
        state: body.state.trim(),
        postalCode: body.postalCode.trim(),
        isDefault: Boolean(body.isDefault),
      };

      const { data, error } = await supabase.from('Address').insert(newAddress).select().single();
      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: data as unknown as T };
    }
  }

  // 4. Address Mutations by ID (/api/me/addresses/:id)
  if (urlPath.startsWith('/api/me/addresses/')) {
    if (!user) return { handled: true, error: 'Sign in required', status: 401 };
    const parts = urlPath.replace('/api/me/addresses/', '').split('/');
    const addressId = decodeURIComponent(parts[0]);
    const action = parts[1];

    if (action === 'default' && method === 'POST') {
      await supabase.from('Address').update({ isDefault: false }).eq('userId', user.id);
      const { data, error } = await supabase
        .from('Address')
        .update({ isDefault: true })
        .eq('id', addressId)
        .eq('userId', user.id)
        .select()
        .single();
      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: data as unknown as T };
    }

    if (method === 'PATCH') {
      const body = parseBody();
      if (body.isDefault) {
        await supabase.from('Address').update({ isDefault: false }).eq('userId', user.id);
      }
      const updateData: Record<string, any> = {};
      if (body.recipient) updateData.recipient = body.recipient.trim();
      if (body.line1) updateData.line1 = body.line1.trim();
      if (body.line2 !== undefined) updateData.line2 = body.line2 ? body.line2.trim() : null;
      if (body.city) updateData.city = body.city.trim();
      if (body.state) updateData.state = body.state.trim();
      if (body.postalCode) updateData.postalCode = body.postalCode.trim();
      if (body.isDefault !== undefined) updateData.isDefault = Boolean(body.isDefault);

      const { data, error } = await supabase
        .from('Address')
        .update(updateData)
        .eq('id', addressId)
        .eq('userId', user.id)
        .select()
        .single();
      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: data as unknown as T };
    }

    if (method === 'DELETE') {
      const { error } = await supabase.from('Address').delete().eq('id', addressId).eq('userId', user.id);
      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: { message: 'Address deleted' } as unknown as T };
    }
  }

  // 5. Payment Config (/api/payment/config)
  if (urlPath === '/api/payment/config' && method === 'GET') {
    const storeUpiId = (import.meta.env.VITE_UPI_ID as string) || '7981793020@kotakbank';
    const upiPayeeName = 'KOMMULA SRUJAN REDDY';
    const upiUri = `upi://pay?pa=${encodeURIComponent(storeUpiId)}&pn=${encodeURIComponent(upiPayeeName)}&cu=INR`;
    const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUri)}`;

    return {
      handled: true,
      data: {
        upiId: storeUpiId,
        upiName: upiPayeeName,
        upiQrUrl,
        deliveryFeeUPI: '15',
        deliveryFeeCOD: '30',
        deliveryFee: '15',
      } as unknown as T,
    };
  }

  // 6. Cart Management (/api/cart, /api/cart/items)
  if (urlPath === '/api/cart') {
    if (!user) return { handled: true, error: 'Sign in required', status: 401 };

    // Find or create user cart
    let { data: cart } = await supabase.from('Cart').select('id').eq('userId', user.id).maybeSingle();
    if (!cart) {
      const { data: newCart } = await supabase
        .from('Cart')
        .insert({ id: crypto.randomUUID(), userId: user.id })
        .select('id')
        .single();
      cart = newCart;
    }

    if (method === 'GET') {
      if (!cart) return { handled: true, data: { id: '', items: [] } as unknown as T };
      const { data: items } = await supabase
        .from('CartItem')
        .select('id, productId, variantId, quantity, product:Product(*, variants:ProductVariant(*), inventory:Inventory(*))')
        .eq('cartId', cart.id);

      const formattedItems = (items || []).map((i: any) => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId || '',
        quantity: i.quantity,
        product: {
          name: i.product?.name || 'Sticker',
          price: String(i.product?.price ?? '0'),
          active: Boolean(i.product?.active ?? true),
          variants: (i.product?.variants || []).map((v: any) => ({
            id: v.id,
            label: v.label,
            price: String(v.price),
          })),
          inventory: i.product?.inventory ? { quantity: i.product.inventory.quantity } : null,
        },
      }));
      return { handled: true, data: { id: cart.id, userId: user.id, items: formattedItems } as unknown as T };
    }

    if (method === 'DELETE') {
      if (cart) {
        await supabase.from('CartItem').delete().eq('cartId', cart.id);
      }
      return { handled: true, data: { message: 'Cart cleared' } as unknown as T };
    }
  }

  if (urlPath === '/api/cart/items' && method === 'POST') {
    if (!user) return { handled: true, error: 'Sign in required', status: 401 };
    const body = parseBody();
    let { data: cart } = await supabase.from('Cart').select('id').eq('userId', user.id).maybeSingle();
    if (!cart) {
      const { data: newCart } = await supabase
        .from('Cart')
        .insert({ id: crypto.randomUUID(), userId: user.id })
        .select('id')
        .single();
      cart = newCart;
    }
    if (!cart) return { handled: true, error: 'Could not resolve cart', status: 500 };

    const variantId = body.variantId || '';
    const quantity = Number(body.quantity) || 1;

    const { data, error } = await supabase
      .from('CartItem')
      .upsert(
        {
          id: crypto.randomUUID(),
          cartId: cart.id,
          productId: body.productId,
          variantId,
          quantity,
        },
        { onConflict: 'cartId,productId,variantId' }
      )
      .select()
      .single();

    if (error) return { handled: true, error: error.message, status: 400 };
    return { handled: true, data: data as unknown as T };
  }

  // 7. Order Placement (/api/orders)
  if (urlPath === '/api/orders' && method === 'POST') {
    if (!user) return { handled: true, error: 'Sign in required', status: 401 };
    const body = parseBody();

    // Fast check for idempotency replay scoped to (userId, idempotencyKey)
    const rawKey =
      (options.headers as any)?.['idempotency-key'] ||
      (options.headers as any)?.['x-idempotency-key'] ||
      body.idempotencyKey;
    const idempotencyKey = typeof rawKey === 'string' && rawKey.trim() ? rawKey.trim() : null;

    if (idempotencyKey) {
      const { data: existingOrder } = await supabase
        .from('Order')
        .select('*, payment:Payment(*)')
        .eq('userId', user.id)
        .eq('idempotencyKey', idempotencyKey)
        .maybeSingle();

      if (existingOrder) {
        const existingReceipt: OrderReceipt = {
          id: existingOrder.id,
          total: Number(existingOrder.total).toFixed(2),
          subtotal: Number(existingOrder.subtotal).toFixed(2),
          deliveryFee: Number(existingOrder.deliveryFee).toFixed(2),
          paymentMethod: existingOrder.paymentMethod || 'UPI',
          paymentStatus: existingOrder.paymentStatus || 'PENDING',
          status: existingOrder.status || 'PENDING',
          payment: existingOrder.payment
            ? {
                id: existingOrder.payment.id,
                status: existingOrder.payment.status,
                method: existingOrder.payment.method,
                amount: Number(existingOrder.payment.amount).toFixed(2),
              }
            : null,
        };
        return { handled: true, data: existingReceipt as unknown as T };
      }
    }

    // 1. Fetch shipping address
    let shippingAddress = body.shippingAddress;
    if (!shippingAddress && body.addressId) {
      const { data: addr } = await supabase
        .from('Address')
        .select('*')
        .eq('id', body.addressId)
        .eq('userId', user.id)
        .single();
      if (addr) {
        shippingAddress = {
          recipient: addr.recipient,
          line1: addr.line1,
          line2: addr.line2,
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode,
        };
      }
    }

    if (!shippingAddress) {
      return { handled: true, error: 'Shipping address is required to place an order', status: 400 };
    }

    const phone = (body.phone || shippingAddress.phone || user.phone || '').trim();
    if (phone) {
      shippingAddress.phone = phone;
      // Sync phone to User profile if not already set or updated
      await supabase.from('User').update({ phone }).eq('id', user.id);
    }

    // 2. Fetch cart items
    let { data: cart } = await supabase.from('Cart').select('id').eq('userId', user.id).maybeSingle();
    const { data: cartItems } = cart
      ? await supabase.from('CartItem').select('*, product:Product(*)').eq('cartId', cart.id)
      : { data: [] };

    const customLines = body.customLines || [];
    let subtotal = 0;
    const orderLines: Array<{
      productId: string | null;
      nameSnapshot: string;
      variantId?: string | null;
      variantLabel?: string | null;
      unitPrice: number;
      quantity: number;
      imageUrl?: string | null;
      metadata?: any;
    }> = [];

    if (Array.isArray(body.standardItems) && body.standardItems.length > 0) {
      const prodIds = body.standardItems.map((item: any) => item.productId).filter(Boolean);
      const { data: dbProducts } = prodIds.length > 0
        ? await supabase.from('Product').select('id, name, price').in('id', prodIds)
        : { data: [] };
      const productMap = new Map((dbProducts || []).map((p: any) => [p.id, p]));

      for (const item of body.standardItems) {
        const qty = Math.max(1, Math.min(100, Math.floor(Number(item.quantity) || 1)));
        const dbProd = item.productId ? productMap.get(item.productId) : null;
        // Recompute price authoritatively from database record; never trust client unitPrice
        const authoritativePrice = dbProd ? Number(dbProd.price) : Number(item.unitPrice || item.price || 0);
        subtotal += authoritativePrice * qty;
        orderLines.push({
          productId: item.productId || null,
          nameSnapshot: dbProd?.name || item.nameSnapshot || item.name || 'Sticker Item',
          variantId: item.variantId || null,
          variantLabel: item.variantLabel || null,
          unitPrice: authoritativePrice,
          quantity: qty,
          imageUrl: item.imageUrl || null,
          metadata: item.secretNote ? { secretNote: item.secretNote } : null,
        });
      }
    } else if (cartItems && cartItems.length > 0) {
      for (const item of cartItems) {
        const qty = Math.max(1, Math.min(100, Math.floor(Number(item.quantity) || 1)));
        const price = Number(item.product?.price || 0);
        subtotal += price * qty;
        orderLines.push({
          productId: item.productId,
          nameSnapshot: item.product?.name || 'Sticker Item',
          variantId: item.variantId || null,
          unitPrice: price,
          quantity: qty,
          imageUrl: null,
        });
      }
    }

    if (customLines.length > 0) {
      for (const line of customLines) {
        let linePrice = 49;
        const qty = Math.max(1, Math.min(100, Math.floor(Number(line.quantity || 1))));

        if (line.type === 'custom-sticker') {
          const calc = customStickerUnitPrice(line.sizeId || 'medium', line.finishId || 'glossy');
          linePrice = calc ?? 49;
        } else if (line.type === 'custom-pack') {
          const calc = packPrice(Number(line.size || 5), line.finishId || 'glossy');
          linePrice = calc ?? 119;
        } else if (line.type === 'custom-wall') {
          if (line.slots && Array.isArray(line.slots) && line.slots.length > 0) {
            linePrice = line.slots.reduce((sum: number, slot: any) => {
              const sz = slot.size;
              const p = sz === 'a3' ? 150 : sz === 'a4' ? 120 : 90;
              return sum + p;
            }, 0);
          } else {
            const layout = line.layoutId ? getLayout(line.layoutId) : null;
            linePrice = layout ? wallPrice(layout) : 199;
          }
        }

        let lineArtworkUrl: string | null = line.previewUrl || null;
        if (line.type === 'custom-sticker' && line.artworkId && !lineArtworkUrl) {
          const { data: artRow } = await supabase.from('CustomArtwork').select('fileName').eq('id', line.artworkId).maybeSingle();
          if (artRow?.fileName) {
            lineArtworkUrl = supabase.storage.from('artworks').getPublicUrl(artRow.fileName).data.publicUrl;
          }
        }

        subtotal += linePrice * qty;
        orderLines.push({
          productId: null,
          nameSnapshot:
            line.type === 'custom-wall'
              ? 'Custom Wall Mosaic'
              : line.type === 'custom-pack'
              ? 'Custom Sticker Pack'
              : 'Custom Die-Cut Sticker',
          unitPrice: linePrice,
          quantity: qty,
          imageUrl: lineArtworkUrl,
          metadata: line,
        });
      }
    }

    const isCod = (body.paymentMethod || '').toUpperCase() === 'COD';
    const deliveryFee = isCod ? 30 : 15;
    const total = subtotal + deliveryFee;
    const orderId = crypto.randomUUID();

    // Check inventory stock and prepare deductions
    const inventoryDeductions: Array<{ productId: string; quantity: number }> = [];
    for (const line of orderLines) {
      if (line.productId) {
        const { data: invRow } = await supabase
          .from('Inventory')
          .select('quantity')
          .eq('productId', line.productId)
          .maybeSingle();

        if (invRow) {
          if (invRow.quantity < line.quantity) {
            return {
              handled: true,
              error: `INSUFFICIENT_STOCK: ${line.nameSnapshot} has insufficient stock (available: ${invRow.quantity}, requested: ${line.quantity})`,
              status: 400,
            };
          }
          inventoryDeductions.push({ productId: line.productId, quantity: line.quantity });
        }
      }
    }

    // Apply inventory deductions
    for (const deduction of inventoryDeductions) {
      const { data: cur } = await supabase.from('Inventory').select('quantity').eq('productId', deduction.productId).single();
      if (cur) {
        const newQty = cur.quantity - deduction.quantity;
        await supabase.from('Inventory').update({ quantity: newQty }).eq('productId', deduction.productId);
        await supabase.from('InventoryMovement').insert({
          id: crypto.randomUUID(),
          productId: deduction.productId,
          delta: -deduction.quantity,
          quantityAfter: newQty,
          reason: 'ORDER',
          orderId,
        });
      }
    }

    // Rollback helper in case of insert failures
    const rollback = async (errorMsg: string) => {
      for (const deduction of inventoryDeductions) {
        const { data: cur } = await supabase.from('Inventory').select('quantity').eq('productId', deduction.productId).single();
        if (cur) {
          await supabase.from('Inventory').update({ quantity: cur.quantity + deduction.quantity }).eq('productId', deduction.productId);
        }
      }
      await supabase.from('OrderItem').delete().eq('orderId', orderId);
      await supabase.from('CustomOrder').delete().eq('orderId', orderId);
      await supabase.from('Payment').delete().eq('orderId', orderId);
      await supabase.from('Order').delete().eq('id', orderId);
      return { handled: true, error: errorMsg, status: 400 };
    };

    // 3. Insert Order
    const { error: orderError } = await supabase
      .from('Order')
      .insert({
        id: orderId,
        userId: user.id,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: body.paymentMethod || 'UPI',
        fulfilmentMethod: 'DELIVERY',
        shippingAddress,
        subtotal,
        deliveryFee,
        total,
        idempotencyKey,
      })
      .select()
      .single();

    if (orderError) return await rollback(orderError.message);

    // 4. Insert Order Items
    if (orderLines.length > 0) {
      const { error: itemsError } = await supabase.from('OrderItem').insert(
        orderLines.map((l) => ({
          id: crypto.randomUUID(),
          orderId,
          productId: l.productId,
          nameSnapshot: l.nameSnapshot,
          variantId: l.variantId ?? null,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          imageUrl: l.imageUrl ?? null,
          metadata: l.metadata ?? null,
        }))
      );
      if (itemsError) return await rollback(itemsError.message);
    }

    // 4.1 Insert Custom Order configurations & artwork linkages
    if (customLines.length > 0) {
      for (const cl of customLines) {
        let artworkId = cl.artworkId || null;
        let previewUrl = cl.previewUrl || null;

        if (artworkId && !previewUrl) {
          const { data: artRow } = await supabase
            .from('CustomArtwork')
            .select('fileName')
            .eq('id', artworkId)
            .maybeSingle();
          if (artRow?.fileName) {
            previewUrl = supabase.storage.from('artworks').getPublicUrl(artRow.fileName).data.publicUrl;
          }
        }

        const { error: customErr } = await supabase.from('CustomOrder').insert({
          id: crypto.randomUUID(),
          orderId,
          artworkId,
          previewUrl,
          config: cl,
          productionNotes:
            cl.type === 'custom-sticker'
              ? `Size: ${cl.sizeId || 'medium'}, Finish: ${cl.finishId || 'glossy'}, Shape: ${cl.shape || 'die-cut'}`
              : cl.type === 'custom-wall'
              ? `Layout: ${cl.layoutId || 'custom-wall'}`
              : `Pack size: ${cl.size || 5}, Finish: ${cl.finishId || 'glossy'}`,
        });
        if (customErr) return await rollback(customErr.message);
      }
    }

    // 5. Insert Payment
    const paymentId = crypto.randomUUID();
    const { data: payment, error: paymentError } = await supabase
      .from('Payment')
      .insert({
        id: paymentId,
        orderId,
        method: body.paymentMethod || 'UPI',
        status: 'AWAITING',
        amount: total,
      })
      .select()
      .single();

    if (paymentError) return await rollback(paymentError.message);

    // 6. Record Order Event
    await supabase.from('OrderEvent').insert({
      id: crypto.randomUUID(),
      orderId,
      kind: 'ORDER_PLACED',
      detail: { total, linesCount: orderLines.length },
    });

    // 7. Clear cart ONLY on commit
    if (cart && (body.clearServerCart || customLines.length === 0)) {
      await supabase.from('CartItem').delete().eq('cartId', cart.id);
    }

    const receipt: OrderReceipt = {
      id: orderId,
      total: total.toFixed(2),
      subtotal: subtotal.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      paymentMethod: body.paymentMethod || 'UPI',
      paymentStatus: 'PENDING',
      status: 'PENDING',
      payment: payment
        ? {
            id: payment.id,
            status: payment.status,
            method: payment.method,
            amount: Number(payment.amount).toFixed(2),
          }
        : null,
    };

    return { handled: true, data: receipt as unknown as T };
  }

  // 8. Payment Submission via UTR (/api/orders/:id/payment/utr)
  if (urlPath.startsWith('/api/orders/') && urlPath.endsWith('/payment/utr') && method === 'POST') {
    if (!user) return { handled: true, error: 'Sign in required', status: 401 };
    const orderId = urlPath.replace('/api/orders/', '').replace('/payment/utr', '').trim();
    const body = parseBody();
    const utr = (body.utr || '').trim() || null;
    const receiptUrl = (body.receiptUrl || '').trim() || null;

    if (!utr && !receiptUrl) return { handled: true, error: 'Payment receipt image or UTR transaction reference is required', status: 400 };
    if (utr && (utr.length < 6 || utr.length > 30 || !/^[A-Za-z0-9_-]+$/.test(utr))) {
      return { handled: true, error: 'Invalid UTR reference format: must be 6-30 characters alphanumeric', status: 400 };
    }

    // 1. Verify ownership of the order
    const { data: order, error: orderErr } = await supabase
      .from('Order')
      .select('id, userId, paymentMethod, paymentStatus')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return { handled: true, error: 'Order not found', status: 404 };
    }
    if (order.userId !== user.id && user.role !== 'ADMIN') {
      return { handled: true, error: 'Forbidden: you do not own this order', status: 403 };
    }
    if (order.paymentMethod !== 'UPI') {
      return { handled: true, error: 'This order does not use UPI payment method', status: 400 };
    }
    if (order.paymentStatus === 'PAID') {
      return { handled: true, error: 'This order has already been paid', status: 400 };
    }

    // 2. Reject duplicate UTR across all orders
    if (utr) {
      const { data: duplicatePayment } = await supabase
        .from('Payment')
        .select('id, orderId')
        .eq('utr', utr)
        .neq('orderId', orderId)
        .maybeSingle();

      if (duplicatePayment) {
        return { handled: true, error: 'This UTR reference has already been submitted for another order', status: 409 };
      }
    }

    // Record submission
    await supabase.from('PaymentSubmission').insert({
      id: crypto.randomUUID(),
      orderId,
      userId: user.id,
      utr,
      receiptUrl,
      status: 'SUBMITTED',
    });

    // Update payment
    const updatePayload: Record<string, any> = {
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
    };
    if (utr) updatePayload.utr = utr;
    if (receiptUrl) updatePayload.receiptUrl = receiptUrl;

    const { data: payment, error } = await supabase
      .from('Payment')
      .update(updatePayload)
      .eq('orderId', orderId)
      .select()
      .single();

    if (error) return { handled: true, error: error.message, status: 400 };

    await supabase.from('OrderEvent').insert({
      id: crypto.randomUUID(),
      orderId,
      kind: 'PAYMENT_SUBMITTED',
      detail: { utr, receiptUrl },
    });

    return {
      handled: true,
      data: {
        orderId,
        payment: {
          id: payment.id,
          status: payment.status,
          utr: payment.utr,
          receiptUrl: payment.receiptUrl,
        },
      } as unknown as T,
    };
  }

  // 9. Customer Orders List (/api/me/orders)
  if (urlPath === '/api/me/orders' && method === 'GET') {
    if (!user) return { handled: true, error: 'Sign in required', status: 401 };

    const { data, error } = await supabase
      .from('Order')
      .select('*, items:OrderItem(*), payment:Payment(*), submissions:PaymentSubmission(*), customOrders:CustomOrder(*, artwork:CustomArtwork(*))')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });

    if (error) return { handled: true, error: error.message, status: 400 };
    return { handled: true, data: (data || []) as unknown as T };
  }

  // 10. Cancel Order (/api/me/orders/:id/cancel)
  if (urlPath.startsWith('/api/me/orders/') && urlPath.endsWith('/cancel') && method === 'POST') {
    if (!user) return { handled: true, error: 'Sign in required', status: 401 };
    const orderId = urlPath.replace('/api/me/orders/', '').replace('/cancel', '').trim();
    const body = parseBody();

    // 1. Fetch order and verify ownership & prior state
    const { data: order, error: orderErr } = await supabase
      .from('Order')
      .select('id, userId, status')
      .eq('id', orderId)
      .eq('userId', user.id)
      .single();

    if (orderErr || !order) {
      return { handled: true, error: 'Order not found', status: 404 };
    }

    if (order.status !== 'PENDING' && order.status !== 'PROCESSING') {
      return {
        handled: true,
        error: `Only pending orders can be cancelled. Current status is ${order.status}.`,
        status: 400,
      };
    }

    // 2. Atomically restore inventory
    const { data: orderItems } = await supabase
      .from('OrderItem')
      .select('productId, quantity')
      .eq('orderId', orderId);

    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        if (item.productId) {
          const { data: inv } = await supabase
            .from('Inventory')
            .select('quantity')
            .eq('productId', item.productId)
            .single();
          if (inv) {
            const restoredQty = inv.quantity + item.quantity;
            await supabase.from('Inventory').update({ quantity: restoredQty }).eq('productId', item.productId);
            await supabase.from('InventoryMovement').insert({
              id: crypto.randomUUID(),
              productId: item.productId,
              delta: item.quantity,
              quantityAfter: restoredQty,
              reason: 'CANCELLATION',
              orderId,
              actorUserId: user.id,
            });
          }
        }
      }
    }

    // 3. Update Order status
    const { data, error } = await supabase
      .from('Order')
      .update({
        status: 'CANCELLED',
        cancelledAt: new Date().toISOString(),
        cancelReason: body.reason || 'Cancelled by customer',
      })
      .eq('id', orderId)
      .eq('userId', user.id)
      .select()
      .single();

    if (error) return { handled: true, error: error.message, status: 400 };

    // Update payment if awaiting/submitted
    await supabase.from('Payment').update({ status: 'CANCELLED' }).eq('orderId', orderId).in('status', ['AWAITING', 'SUBMITTED']);

    await supabase.from('OrderEvent').insert({
      id: crypto.randomUUID(),
      orderId,
      kind: 'ORDER_CANCELLED',
      detail: { reason: body.reason || 'Cancelled by customer' },
    });

    return { handled: true, data: data as unknown as T };
  }

  // 11. Drop Proposals & Voting (/api/proposals, /api/proposals/:id/vote)
  if (urlPath === '/api/proposals' && method === 'GET') {
    const { data: proposals, error } = await supabase
      .from('DropProposal')
      .select('*, directions:ProposalDirection(*), votes:ProposalVote(*)')
      .order('displayOrder', { ascending: true });

    if (error) return { handled: true, error: error.message, status: 400 };

    const formatted = (proposals || []).map((p: any) => {
      const votes = p.votes || [];
      const userVote = user ? votes.find((v: any) => v.userId === user.id) : null;
      return {
        id: p.id,
        theme: p.theme,
        pitch: p.pitch,
        motif: p.motif,
        color: p.color,
        status: p.status,
        resultsPublic: p.resultsPublic,
        userVotedDirectionId: userVote?.directionId ?? null,
        totalVotes: votes.length,
        directions: (p.directions || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          voteCount: votes.filter((v: any) => v.directionId === d.id).length,
        })),
      };
    });

    return { handled: true, data: formatted as unknown as T };
  }

  if (urlPath.startsWith('/api/proposals/') && urlPath.endsWith('/vote') && method === 'POST') {
    if (!user) return { handled: true, error: 'Sign in required to vote', status: 401 };
    const proposalId = urlPath.replace('/api/proposals/', '').replace('/vote', '').trim();
    const body = parseBody();

    const { error } = await supabase.from('ProposalVote').upsert(
      {
        id: crypto.randomUUID(),
        proposalId,
        directionId: body.directionId,
        userId: user.id,
        updatedAt: new Date().toISOString(),
      },
      { onConflict: 'proposalId,userId' }
    );

    if (error) return { handled: true, error: error.message, status: 400 };
    return {
      handled: true,
      data: {
        ok: true,
        message: 'Your vote has been saved! You can update it anytime while voting is open.',
      } as unknown as T,
    };
  }

  // 12. Community Ideas (/api/ideas)
  if (urlPath === '/api/ideas') {
    if (method === 'GET') {
      const query = supabase.from('SubmittedIdea').select('*').order('createdAt', { ascending: false });
      if (!user || user.role !== 'ADMIN') {
        query.or(`status.eq.APPROVED${user ? `,userId.eq.${user.id}` : ''}`);
      }
      const { data, error } = await query;
      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: (data || []) as unknown as T };
    }

    if (method === 'POST') {
      if (!user) return { handled: true, error: 'Sign in required to submit ideas', status: 401 };
      const body = parseBody();
      if (!body.idea || !body.idea.trim()) {
        return { handled: true, error: 'Idea description is required', status: 400 };
      }

      const { data, error } = await supabase
        .from('SubmittedIdea')
        .insert({
          id: crypto.randomUUID(),
          userId: user.id,
          proposalId: body.proposalId || null,
          idea: body.idea.trim(),
          name: body.name ? body.name.trim() : user.name,
          originalConfirmed: Boolean(body.originalConfirmed),
          status: 'PENDING',
        })
        .select()
        .single();

      if (error) return { handled: true, error: error.message, status: 400 };
      return {
        handled: true,
        data: {
          ok: true,
          message: 'Your idea has been received and submitted for review!',
          idea: data,
        } as unknown as T,
      };
    }
  }

  // 13. Passport Rewards (/api/me/passport, /api/me/passport/redeem)
  if (urlPath === '/api/me/passport') {
    if (!user) return { handled: true, error: 'Sign in required', status: 401 };

    const [stampsRes, ruleRes, redemptionsRes] = await Promise.all([
      supabase.from('CustomerStamp').select('*').eq('userId', user.id).order('createdAt', { ascending: false }),
      supabase.from('PassportRule').select('*').eq('id', 'default').single(),
      supabase.from('PassportRewardRedemption').select('*').eq('userId', user.id).order('createdAt', { ascending: false }),
    ]);

    const rule = ruleRes.data || {
      stampsGoal: 8,
      stampRule: 'One stamp for each eligible completed, paid order.',
      rewardDescription: 'A free mini sticker of your choice',
      rewardValueCap: '60.00',
      seriesGoal: true,
    };

    const stamps = stampsRes.data || [];
    const redemptions = redemptionsRes.data || [];
    const totalStamps = stamps.length;
    const stampsUsed = redemptions.reduce((sum: number, r: any) => sum + (r.stampsUsed || 8), 0);
    const availableStamps = Math.max(0, totalStamps - stampsUsed);

    return {
      handled: true,
      data: {
        rule,
        stamps: stamps.map((s: any) => ({
          id: s.id,
          orderId: s.orderId,
          orderRef: s.orderId ? `Order #${s.orderId.slice(0, 8)}` : 'Bonus Stamp',
          type: s.type,
          reason: s.reason || 'Completed order stamp',
          seriesIds: s.seriesIds || [],
          date: s.createdAt,
        })),
        totalStamps,
        availableStamps,
        stampsGoal: rule.stampsGoal,
        rewardsEligible: availableStamps >= rule.stampsGoal,
        eligibleRewardsCount: Math.floor(availableStamps / rule.stampsGoal),
        collectedSeries: [],
        redemptions,
      } as unknown as T,
    };
  }

  if (urlPath === '/api/me/passport/redeem' && method === 'POST') {
    if (!user) return { handled: true, error: 'Sign in required', status: 401 };

    const { data: rule } = await supabase.from('PassportRule').select('*').eq('id', 'default').maybeSingle();
    const stampsGoal = rule?.stampsGoal || 8;
    const rewardDescription = rule?.rewardDescription || 'A free mini sticker of your choice';

    // 1. Fetch total earned stamps
    const { count: totalEarned } = await supabase
      .from('CustomerStamp')
      .select('id', { count: 'exact' })
      .eq('userId', user.id);

    // 2. Fetch total redeemed stamps
    const { data: redemptions } = await supabase
      .from('PassportRewardRedemption')
      .select('stampsUsed, status')
      .eq('userId', user.id)
      .neq('status', 'REJECTED');

    const totalUsed = (redemptions || []).reduce((sum: number, r: any) => sum + (Number(r.stampsUsed) || 8), 0);
    const availableStamps = Math.max(0, (totalEarned || 0) - totalUsed);

    if (availableStamps < stampsGoal) {
      return {
        handled: true,
        error: `Insufficient stamps for reward redemption. You currently have ${availableStamps} stamps, but ${stampsGoal} stamps are needed.`,
        status: 400,
      };
    }

    const { data, error } = await supabase
      .from('PassportRewardRedemption')
      .insert({
        id: crypto.randomUUID(),
        userId: user.id,
        stampsUsed: stampsGoal,
        rewardDescription,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) return { handled: true, error: error.message, status: 400 };
    return {
      handled: true,
      data: {
        ok: true,
        message: 'Reward redemption submitted successfully! Our team will verify and dispatch it.',
        redemption: data,
      } as unknown as T,
    };
  }

  // 14. Admin Endpoints (/api/admin/...)
  if (urlPath.startsWith('/api/admin/')) {
    if (!user || user.role !== 'ADMIN') {
      return { handled: true, error: 'Administrator access required', status: 403 };
    }

    if (urlPath === '/api/admin/orders') {
      const { data, error } = await supabase
        .from('Order')
        .select('*, items:OrderItem(*), payment:Payment(*), submissions:PaymentSubmission(*), user:User(id, name, email, phone), customOrders:CustomOrder(*, artwork:CustomArtwork(*))')
        .order('createdAt', { ascending: false });
      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: (data || []) as unknown as T };
    }

    // 14.1 Admin COD Collection (/api/admin/orders/:id/cod-collected)
    if (urlPath.startsWith('/api/admin/orders/') && urlPath.endsWith('/cod-collected') && method === 'POST') {
      const orderId = decodeURIComponent(urlPath.replace('/api/admin/orders/', '').replace('/cod-collected', '').trim());

      const { data: order, error: orderErr } = await supabase
        .from('Order')
        .select('*, items:OrderItem(*), payment:Payment(*)')
        .eq('id', orderId)
        .single();

      if (orderErr || !order) return { handled: true, error: orderErr?.message || 'Order not found', status: 404 };

      // Update Order to PAID & COMPLETED
      const { data: updatedOrder, error: updateErr } = await supabase
        .from('Order')
        .update({
          paymentStatus: 'PAID',
          paidAt: new Date().toISOString(),
          status: 'COMPLETED',
        })
        .eq('id', orderId)
        .select()
        .single();

      if (updateErr) return { handled: true, error: updateErr.message, status: 400 };

      // Update or create Payment
      if (order.payment?.id) {
        await supabase
          .from('Payment')
          .update({
            status: 'COLLECTED',
            collectedAt: new Date().toISOString(),
            collectedById: user.id,
          })
          .eq('orderId', orderId);
      } else {
        await supabase
          .from('Payment')
          .insert({
            id: crypto.randomUUID(),
            orderId: orderId,
            method: 'COD',
            amount: String(order.total),
            status: 'COLLECTED',
            collectedAt: new Date().toISOString(),
            collectedById: user.id,
          });
      }

      // Award passport stamp if eligible
      if (order.userId) {
        try {
          await supabase.from('CustomerStamp').insert({
            userId: order.userId,
            orderId: order.id,
            type: 'ORDER',
            reason: 'Cash on Delivery collected for order #' + order.id.slice(0, 8),
            actorId: user.id,
          });
        } catch {}
      }

      // Record AuditLog
      try {
        await supabase.from('AuditLog').insert({
          actor: user.id,
          action: 'COD_COLLECTED',
          entity: 'Order',
          entityId: orderId,
          before: { paymentStatus: order.paymentStatus, status: order.status },
          after: { paymentStatus: 'PAID', status: 'COMPLETED' },
        });
      } catch {}

      return { handled: true, data: updatedOrder as unknown as T };
    }

    // 14.2 Admin Update Order Status (/api/admin/orders/:id)
    if (urlPath.startsWith('/api/admin/orders/') && method === 'PATCH') {
      const orderId = decodeURIComponent(urlPath.replace('/api/admin/orders/', '').trim());
      const body = parseBody();
      const nextStatus = body.status;

      const { data: current, error: curErr } = await supabase
        .from('Order')
        .select('*, items:OrderItem(*)')
        .eq('id', orderId)
        .single();

      if (curErr || !current) return { handled: true, error: curErr?.message || 'Order not found', status: 404 };

      const updatePayload: Record<string, any> = { status: nextStatus };
      if (nextStatus === 'CANCELLED') {
        updatePayload.cancelledAt = new Date().toISOString();
        updatePayload.cancelReason = body.reason || 'Cancelled by administrator';

        // Restore stock if needed
        for (const it of current.items || []) {
          if (it.productId) {
            const { data: inv } = await supabase.from('Inventory').select('quantity').eq('productId', it.productId).single();
            if (inv) {
              try {
                await supabase.from('Inventory').update({ quantity: (inv.quantity || 0) + it.quantity }).eq('productId', it.productId);
              } catch {}
            }
          }
        }
      }

      const { data: updated, error: updErr } = await supabase
        .from('Order')
        .update(updatePayload)
        .eq('id', orderId)
        .select()
        .single();

      if (updErr) return { handled: true, error: updErr.message, status: 400 };

      // Record AuditLog
      try {
        await supabase.from('AuditLog').insert({
          actor: user.id,
          action: 'ORDER_STATUS_' + nextStatus,
          entity: 'Order',
          entityId: orderId,
          before: { status: current.status },
          after: { status: nextStatus },
        });
      } catch {}

      return { handled: true, data: updated as unknown as T };
    }

    if (urlPath === '/api/admin/payments') {
      const statusFilter = queryParams.get('status') || 'SUBMITTED';
      const { data, error } = await supabase
        .from('Payment')
        .select('*, order:Order(*, user:User(id, name, email, phone))')
        .eq('status', statusFilter)
        .order('createdAt', { ascending: false });
      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: (data || []) as unknown as T };
    }

    if (urlPath.startsWith('/api/admin/payments/') && urlPath.endsWith('/verify') && method === 'POST') {
      const paymentId = urlPath.replace('/api/admin/payments/', '').replace('/verify', '');
      const { data: payment, error } = await supabase
        .from('Payment')
        .update({
          status: 'VERIFIED',
          verifiedAt: new Date().toISOString(),
          verifiedById: user.id,
        })
        .eq('id', paymentId)
        .select()
        .single();
      if (error) return { handled: true, error: error.message, status: 400 };

      if (payment?.orderId) {
        await supabase
          .from('Order')
          .update({ paymentStatus: 'PAID', paidAt: new Date().toISOString() })
          .eq('id', payment.orderId);
      }
      return { handled: true, data: payment as unknown as T };
    }

    if (urlPath.startsWith('/api/admin/payments/') && urlPath.endsWith('/reject') && method === 'POST') {
      const paymentId = urlPath.replace('/api/admin/payments/', '').replace('/reject', '');
      const body = parseBody();
      const { data: payment, error } = await supabase
        .from('Payment')
        .update({
          status: 'REJECTED',
          rejectionReason: body.rejectionReason || 'Rejected by administrator',
        })
        .eq('id', paymentId)
        .select()
        .single();
      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: payment as unknown as T };
    }

    if (urlPath === '/api/admin/customers') {
      const { data: users, error } = await supabase
        .from('User')
        .select('id, name, email, phone, role, createdAt, orders:Order(id, total, status)');
      if (error) return { handled: true, error: error.message, status: 400 };
      const formatted = (users || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        createdAt: u.createdAt,
        orderCount: u.orders?.length || 0,
        _count: { orders: u.orders?.length || 0 },
        totalSpend: (u.orders || []).reduce((acc: number, o: any) => acc + (Number(o.total) || 0), 0).toFixed(2),
      }));
      return { handled: true, data: formatted as unknown as T };
    }

    if (urlPath === '/api/admin/stats') {
      const [ordersRes, usersRes, productsRes] = await Promise.all([
        supabase.from('Order').select('total, status, paymentStatus'),
        supabase.from('User').select('id', { count: 'exact' }),
        supabase.from('Product').select('id', { count: 'exact' }),
      ]);
      const orders = ordersRes.data || [];
      const pendingOrders = orders.filter((o: any) => o.status === 'PENDING').length;
      const paidOrders = orders.filter((o: any) => o.status !== 'CANCELLED' && o.paymentStatus === 'PAID');
      const totalRevenue = (paidOrders.length ? paidOrders : orders.filter((o: any) => o.status !== 'CANCELLED'))
        .reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0)
        .toFixed(2);
      const customersCount = usersRes.count || 0;
      const productsCount = productsRes.count || 0;
      return {
        handled: true,
        data: {
          customers: customersCount,
          products: productsCount,
          orders: orders.length,
          pendingOrders,
          totalRevenue,
          customersCount,
          productsCount,
          ordersCount: orders.length,
        } as unknown as T,
      };
    }

    // 15. Admin Product Catalogue (/api/admin/products)
    if (urlPath === '/api/admin/products' && method === 'GET') {
      const typeFilter = queryParams.get('type');
      const categoryFilter = queryParams.get('category');
      const statusFilter = queryParams.get('status');
      const q = (queryParams.get('q') || '').trim();
      const page = Math.max(1, Number(queryParams.get('page') || 1));
      const limit = Math.max(1, Math.min(200, Number(queryParams.get('limit') || 15)));

      let productIdsFilter: string[] | null = null;
      if (categoryFilter && categoryFilter !== 'ALL') {
        const { data: catRows } = await supabase
          .from('ProductCategory')
          .select('productId')
          .eq('categoryId', categoryFilter);
        productIdsFilter = (catRows || []).map((r: any) => r.productId);
      }

      let query = supabase
        .from('Product')
        .select(
          '*, inventory:Inventory(quantity), variants:ProductVariant(*), images:ProductImage(*), categories:ProductCategory(categoryId)',
          { count: 'exact' }
        );

      if (productIdsFilter !== null) {
        if (productIdsFilter.length === 0) {
          return { handled: true, data: { items: [], products: [], total: 0 } as unknown as T };
        }
        query = query.in('id', productIdsFilter);
      }

      if (typeFilter && typeFilter !== 'ALL') {
        if (typeFilter === 'posters') {
          query = query.or('category.eq.posters,productType.eq.poster');
        } else if (typeFilter === 'stickers') {
          query = query.neq('category', 'posters').neq('productType', 'poster');
        } else {
          query = query.eq('productType', typeFilter);
        }
      }

      if (statusFilter && statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }

      if (q) {
        query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%,id.ilike.%${q}%`);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.order('createdAt', { ascending: false }).range(from, to);

      const { data, count, error } = await query;
      if (error) return { handled: true, error: error.message, status: 400 };

      const items = (data || []).map((p: any) => ({
        ...p,
        inventory: Array.isArray(p.inventory) ? p.inventory[0] || null : p.inventory || null,
        variants: p.variants || [],
        images: p.images || [],
        categories: p.categories || [],
      }));

      return {
        handled: true,
        data: {
          items,
          products: items,
          total: count ?? items.length,
        } as unknown as T,
      };
    }

    if (urlPath === '/api/admin/products' && method === 'POST') {
      const body = parseBody();
      const trimmedName = (body.name || '').trim();
      if (!trimmedName) return { handled: true, error: 'Product name is required', status: 400 };

      const id = body.id || `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const slug = body.slug || trimmedName.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
      const price = Number(body.price) || 0;
      const status = body.status || 'PUBLISHED';
      const active = body.active !== undefined ? body.active : status === 'PUBLISHED';

      const { error: prodErr } = await supabase.from('Product').insert({
        id,
        name: trimmedName,
        slug,
        description: body.description || trimmedName,
        price,
        status,
        active,
        productType: body.productType || 'single',
        category: body.category || 'stickers',
        featured: Boolean(body.featured),
        isNew: Boolean(body.isNew),
        displayOrder: Number(body.displayOrder) || 0,
        seriesId: body.seriesId || null,
        rarity: body.rarity || 'common',
        note: body.note || null,
        packQuantity: body.packQuantity || null,
        dimensions: body.dimensions || null,
        material: body.material || null,
        finish: body.finish || null,
      });

      if (prodErr) return { handled: true, error: prodErr.message, status: 400 };

      // Inventory
      const stock = body.stock !== undefined ? Number(body.stock) : (body.inventory?.quantity !== undefined ? Number(body.inventory.quantity) : 100);
      await supabase.from('Inventory').upsert({ productId: id, quantity: stock });

      // Variants
      if (Array.isArray(body.variants) && body.variants.length > 0) {
        await supabase.from('ProductVariant').insert(
          body.variants.map((v: any) => ({
            id: v.id || crypto.randomUUID(),
            productId: id,
            label: v.label || 'Default',
            price: Number(v.price) || price,
          }))
        );
      }

      // Images
      if (Array.isArray(body.images) && body.images.length > 0) {
        await supabase.from('ProductImage').insert(
          body.images.map((img: any, idx: number) => ({
            id: crypto.randomUUID(),
            productId: id,
            url: img.url,
            alt: img.alt || trimmedName,
            position: img.position ?? idx,
            isPrimary: img.isPrimary ?? idx === 0,
          }))
        );
      }

      // Categories
      const categories = body.categories || body.collections || [];
      if (Array.isArray(categories) && categories.length > 0) {
        await supabase.from('ProductCategory').insert(
          categories.map((c: any) => ({
            productId: id,
            categoryId: typeof c === 'string' ? c : c.categoryId || c.collectionId,
          }))
        );
      }

      return {
        handled: true,
        data: { ok: true, id, message: `Product "${trimmedName}" created successfully.` } as unknown as T,
      };
    }

    if (urlPath === '/api/admin/products/bulk-delete' && method === 'POST') {
      const body = parseBody();
      const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
      const isPermanent = Boolean(body.permanent);

      if (ids.length > 0) {
        if (isPermanent) {
          await supabase.from('ProductCategory').delete().in('productId', ids);
          await supabase.from('ProductVariant').delete().in('productId', ids);
          await supabase.from('ProductImage').delete().in('productId', ids);
          await supabase.from('Inventory').delete().in('productId', ids);
          const { error } = await supabase.from('Product').delete().in('id', ids);
          if (error) return { handled: true, error: error.message, status: 400 };
        } else {
          const { error } = await supabase
            .from('Product')
            .update({ status: 'ARCHIVED', active: false })
            .in('id', ids);
          if (error) return { handled: true, error: error.message, status: 400 };
        }
      }

      return {
        handled: true,
        data: { ok: true, count: ids.length, message: `Processed ${ids.length} products.` } as unknown as T,
      };
    }

    if (urlPath.startsWith('/api/admin/products/') && method === 'PATCH') {
      const prodId = decodeURIComponent(urlPath.replace('/api/admin/products/', '').trim());
      const body = parseBody();

      const updateData: Record<string, any> = {};
      if (body.name !== undefined) updateData.name = body.name.trim();
      if (body.slug !== undefined) updateData.slug = body.slug;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.price !== undefined) updateData.price = Number(body.price);
      if (body.status !== undefined) {
        updateData.status = body.status;
        if (body.active === undefined) updateData.active = body.status === 'PUBLISHED';
      }
      if (body.active !== undefined) updateData.active = body.active;
      if (body.productType !== undefined) updateData.productType = body.productType;
      if (body.category !== undefined) updateData.category = body.category;
      if (body.featured !== undefined) updateData.featured = body.featured;
      if (body.isNew !== undefined) updateData.isNew = body.isNew;
      if (body.seriesId !== undefined) updateData.seriesId = body.seriesId || null;
      if (body.rarity !== undefined) updateData.rarity = body.rarity;
      if (body.note !== undefined) updateData.note = body.note || null;
      if (body.dimensions !== undefined) updateData.dimensions = body.dimensions || null;
      if (body.material !== undefined) updateData.material = body.material || null;
      if (body.finish !== undefined) updateData.finish = body.finish || null;

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase.from('Product').update(updateData).eq('id', prodId);
        if (error) return { handled: true, error: error.message, status: 400 };
      }

      if (body.stock !== undefined) {
        await supabase.from('Inventory').upsert({ productId: prodId, quantity: Number(body.stock) });
      }

      if (Array.isArray(body.variants)) {
        await supabase.from('ProductVariant').delete().eq('productId', prodId);
        if (body.variants.length > 0) {
          await supabase.from('ProductVariant').insert(
            body.variants.map((v: any) => ({
              id: v.id || crypto.randomUUID(),
              productId: prodId,
              label: v.label || 'Default',
              price: Number(v.price) || 0,
            }))
          );
        }
      }

      if (Array.isArray(body.images)) {
        await supabase.from('ProductImage').delete().eq('productId', prodId);
        if (body.images.length > 0) {
          await supabase.from('ProductImage').insert(
            body.images.map((img: any, idx: number) => ({
              id: crypto.randomUUID(),
              productId: prodId,
              url: img.url,
              alt: img.alt || updateData.name || 'Product Image',
              position: img.position ?? idx,
              isPrimary: img.isPrimary ?? idx === 0,
            }))
          );
        }
      }

      if (Array.isArray(body.categories) || Array.isArray(body.collections)) {
        const cats = body.categories || body.collections || [];
        await supabase.from('ProductCategory').delete().eq('productId', prodId);
        if (cats.length > 0) {
          await supabase.from('ProductCategory').insert(
            cats.map((c: any) => ({
              productId: prodId,
              categoryId: typeof c === 'string' ? c : c.categoryId || c.collectionId,
            }))
          );
        }
      }

      return {
        handled: true,
        data: { ok: true, message: 'Product updated successfully.' } as unknown as T,
      };
    }

    if (urlPath.startsWith('/api/admin/products/') && method === 'DELETE') {
      const prodId = decodeURIComponent(urlPath.replace('/api/admin/products/', '').trim());
      const isPermanent = queryParams.get('permanent') === 'true';

      if (isPermanent) {
        await supabase.from('ProductCategory').delete().eq('productId', prodId);
        await supabase.from('ProductVariant').delete().eq('productId', prodId);
        await supabase.from('ProductImage').delete().eq('productId', prodId);
        await supabase.from('Inventory').delete().eq('productId', prodId);
        const { error } = await supabase.from('Product').delete().eq('id', prodId);
        if (error) return { handled: true, error: error.message, status: 400 };
      } else {
        const { error } = await supabase
          .from('Product')
          .update({ status: 'ARCHIVED', active: false })
          .eq('id', prodId);
        if (error) return { handled: true, error: error.message, status: 400 };
      }

      return {
        handled: true,
        data: { ok: true, message: isPermanent ? 'Product permanently deleted' : 'Product archived' } as unknown as T,
      };
    }

    // 16. Admin Categories (/api/admin/categories)
    if (urlPath === '/api/admin/categories' && method === 'GET') {
      const { data, error } = await supabase
        .from('Category')
        .select('*')
        .order('displayOrder', { ascending: true });
      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: (data || []) as unknown as T };
    }

    if (urlPath === '/api/admin/categories' && method === 'POST') {
      const body = parseBody();
      const id = body.id || (body.name || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
      const { data, error } = await supabase
        .from('Category')
        .upsert({
          id,
          name: body.name,
          blurb: body.blurb || null,
          color: body.color || null,
          motif: body.motif || null,
          displayOrder: Number(body.displayOrder) || 0,
          archived: false,
        })
        .select()
        .single();
      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: data as unknown as T };
    }

    if (urlPath.startsWith('/api/admin/categories/') && method === 'PATCH') {
      const catId = decodeURIComponent(urlPath.replace('/api/admin/categories/', '').trim());
      const body = parseBody();
      const { data, error } = await supabase
        .from('Category')
        .update(body)
        .eq('id', catId)
        .select()
        .single();
      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: data as unknown as T };
    }

    if (urlPath.startsWith('/api/admin/categories/') && method === 'DELETE') {
      const catId = decodeURIComponent(urlPath.replace('/api/admin/categories/', '').trim());
      await supabase.from('Category').update({ archived: true }).eq('id', catId);
      return { handled: true, data: { ok: true, message: 'Category archived' } as unknown as T };
    }

    // 17. Admin Inventory Management (/api/admin/inventory)
    if (urlPath.startsWith('/api/admin/inventory/') && method === 'PUT') {
      const prodId = decodeURIComponent(urlPath.replace('/api/admin/inventory/', '').trim());
      const body = parseBody();
      const quantity = Number(body.quantity);
      const { error } = await supabase
        .from('Inventory')
        .upsert({ productId: prodId, quantity });
      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: { ok: true, message: 'Inventory updated in PostgreSQL.' } as unknown as T };
    }

    if (urlPath === '/api/admin/inventory/bulk-init' && method === 'POST') {
      const body = parseBody();
      const qty = Number(body.quantity) || 25;
      const { data: allProds } = await supabase.from('Product').select('id');
      const { data: existingInv } = await supabase.from('Inventory').select('productId');
      const existingSet = new Set((existingInv || []).map((x: any) => x.productId));
      const missing = (allProds || []).filter((p: any) => !existingSet.has(p.id));

      if (missing.length > 0) {
        const rows = missing.map((p: any) => ({ productId: p.id, quantity: qty }));
        for (let i = 0; i < rows.length; i += 500) {
          await supabase.from('Inventory').insert(rows.slice(i, i + 500));
        }
      }
      return {
        handled: true,
        data: {
          count: missing.length,
          message: `Successfully initialized stock (${qty} units) for ${missing.length} products.`,
        } as unknown as T,
      };
    }

    // 18. Admin Passport & Rewards
    if (urlPath === '/api/admin/passport/customers' && method === 'GET') {
      const [usersRes, stampsRes, redemptionsRes, ruleRes] = await Promise.all([
        supabase.from('User').select('id, name, email, phone, createdAt').eq('role', 'CUSTOMER').order('createdAt', { ascending: false }),
        supabase.from('CustomerStamp').select('*'),
        supabase.from('PassportRewardRedemption').select('*'),
        supabase.from('PassportRule').select('*').eq('id', 'default').single(),
      ]);

      const rule = ruleRes.data || { stampsGoal: 8 };
      const stamps = stampsRes.data || [];
      const redemptions = redemptionsRes.data || [];

      const results = (usersRes.data || []).map((u: any) => {
        const userStamps = stamps.filter((s: any) => s.userId === u.id);
        const userRedemptions = redemptions.filter((r: any) => r.userId === u.id);
        const totalStamps = userStamps.length;
        const stampsUsed = userRedemptions
          .filter((r: any) => r.status !== 'REJECTED')
          .reduce((sum: number, r: any) => sum + (Number(r.stampsUsed) || 0), 0);
        const availableStamps = Math.max(0, totalStamps - stampsUsed);

        return {
          id: u.id,
          userId: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          totalStamps,
          stampsUsed,
          availableStamps,
          canRedeem: availableStamps >= (rule.stampsGoal || 8),
          redemptionCount: userRedemptions.length,
          stampsCount: totalStamps,
          totalEarned: totalStamps,
          totalRedeemed: stampsUsed,
          lastAwardedAt: userStamps[userStamps.length - 1]?.createdAt || null,
          user: { id: u.id, name: u.name, email: u.email, phone: u.phone },
        };
      });

      return { handled: true, data: results as unknown as T };
    }

    if (urlPath.startsWith('/api/admin/passport/customers/') && method === 'GET') {
      const targetUserId = decodeURIComponent(urlPath.replace('/api/admin/passport/customers/', '').trim());
      const [userRes, stampsRes, redemptionsRes, ruleRes] = await Promise.all([
        supabase.from('User').select('id, name, email, phone, createdAt').eq('id', targetUserId).single(),
        supabase.from('CustomerStamp').select('*').eq('userId', targetUserId),
        supabase.from('PassportRewardRedemption').select('*').eq('userId', targetUserId),
        supabase.from('PassportRule').select('*').eq('id', 'default').single(),
      ]);

      const u = userRes.data;
      if (!u) return { handled: true, error: 'User not found', status: 404 };

      const userStamps = stampsRes.data || [];
      const userRedemptions = redemptionsRes.data || [];
      const totalStamps = userStamps.length;
      const stampsUsed = userRedemptions
        .filter((r: any) => r.status !== 'REJECTED')
        .reduce((sum: number, r: any) => sum + (Number(r.stampsUsed) || 0), 0);
      const availableStamps = Math.max(0, totalStamps - stampsUsed);
      const stampsGoal = ruleRes.data?.stampsGoal || 8;

      return {
        handled: true,
        data: {
          id: u.id,
          userId: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          totalStamps,
          stampsUsed,
          availableStamps,
          canRedeem: availableStamps >= stampsGoal,
          redemptionCount: userRedemptions.length,
          stampsCount: totalStamps,
          totalEarned: totalStamps,
          totalRedeemed: stampsUsed,
          lastAwardedAt: userStamps[userStamps.length - 1]?.createdAt || null,
          user: { id: u.id, name: u.name, email: u.email, phone: u.phone },
        } as unknown as T,
      };
    }

    if (urlPath === '/api/admin/passport/stamps' && method === 'POST') {
      const body = parseBody();
      const count = Math.max(1, Math.min(20, Math.round(Number(body.count || 1))));
      const stamps = Array.from({ length: count }).map(() => ({
        id: crypto.randomUUID(),
        userId: body.userId,
        type: 'MANUAL_GRANT',
        reason: body.reason || 'Manual administrative stamp adjustment',
        actorId: user.id,
        createdAt: new Date().toISOString(),
      }));
      const { error } = await supabase.from('CustomerStamp').insert(stamps);
      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: { ok: true, count, message: `Added ${count} stamp(s).` } as unknown as T };
    }

    if (urlPath === '/api/admin/passport/redemptions' && method === 'GET') {
      const { data, error } = await supabase
        .from('PassportRewardRedemption')
        .select('*, user:User(id, name, email, phone)')
        .order('createdAt', { ascending: false });
      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: (data || []) as unknown as T };
    }

    if (urlPath.startsWith('/api/admin/passport/redemptions/') && method === 'PATCH') {
      const redId = decodeURIComponent(urlPath.replace('/api/admin/passport/redemptions/', '').trim());
      const body = parseBody();
      const { data, error } = await supabase
        .from('PassportRewardRedemption')
        .update({
          status: body.status,
          notes: body.notes || undefined,
          reviewedById: user.id,
          reviewedAt: new Date().toISOString(),
        })
        .eq('id', redId)
        .select()
        .single();
      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: data as unknown as T };
    }

    if (urlPath === '/api/admin/passport/rules' && method === 'GET') {
      const { data } = await supabase.from('PassportRule').select('*').eq('id', 'default').single();
      const rule = data || {
        id: 'default',
        stampsGoal: 8,
        stampRule: 'One stamp for each eligible completed, paid order.',
        rewardDescription: 'A free mini sticker of your choice',
        rewardValueCap: 60,
        seriesGoal: true,
      };
      return { handled: true, data: rule as unknown as T };
    }

    if (urlPath === '/api/admin/passport/rules' && method === 'PUT') {
      const body = parseBody();
      const { data, error } = await supabase
        .from('PassportRule')
        .upsert({
          id: 'default',
          stampsGoal: Number(body.stampsGoal) || 8,
          stampRule: body.stampRule || 'One stamp for each eligible completed, paid order.',
          rewardDescription: body.rewardDescription || 'A free mini sticker of your choice',
          rewardValueCap: body.rewardValueCap ? Number(body.rewardValueCap) : null,
          seriesGoal: body.seriesGoal ?? true,
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: data as unknown as T };
    }

    // 19. Admin Community Ideas (/api/admin/ideas)
    if (urlPath === '/api/admin/ideas' && method === 'GET') {
      const { data, error } = await supabase
        .from('SubmittedIdea')
        .select('*, user:User(id, name, email)')
        .order('createdAt', { ascending: false });
      if (error) return { handled: true, error: error.message, status: 400 };
      const formatted = (data || []).map((idea: any) => ({
        id: idea.id,
        title: idea.idea,
        description: idea.idea,
        category: idea.proposalId || 'Community Idea',
        status: idea.status || 'SUBMITTED',
        authorName: idea.user?.name || idea.name || 'Collector',
        authorEmail: idea.user?.email,
        createdAt: idea.createdAt,
      }));
      return { handled: true, data: formatted as unknown as T };
    }

    if (urlPath.startsWith('/api/admin/ideas/') && method === 'PATCH') {
      const ideaId = decodeURIComponent(urlPath.replace('/api/admin/ideas/', '').trim());
      const body = parseBody();
      const { data, error } = await supabase
        .from('SubmittedIdea')
        .update({
          status: body.status,
          reviewNote: body.reviewNote || null,
          reviewedAt: new Date().toISOString(),
          reviewedById: user.id,
        })
        .eq('id', ideaId)
        .select()
        .single();
      if (error) return { handled: true, error: error.message, status: 400 };
      return { handled: true, data: data as unknown as T };
    }
  }

  // Not handled by direct Supabase adapter (or fallback needed)
  return { handled: false };
}

/**
 * Direct Supabase multipart file upload handler (artwork images).
 */
export async function handleSupabaseMultipart<T>(
  path: string,
  formData: FormData,
  user: Account | null
): Promise<AdapterResult<T>> {
  if (path === '/api/uploads/artwork') {
    if (!user) return { handled: true, error: 'Sign in required', status: 401 };
    const file = formData.get('file') as File | null;
    if (!file) return { handled: true, error: 'No file uploaded', status: 400 };

    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!file.type || !allowedMimes.includes(file.type.toLowerCase())) {
      return { handled: true, error: 'Only PNG, JPEG, and WebP raster images are supported', status: 400 };
    }
    const maxSizeBytes = 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return { handled: true, error: 'File size exceeds maximum allowed limit (15MB)', status: 400 };
    }

    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${user.id}/${Date.now()}-${cleanName}`;

    // Upload to Supabase Storage bucket 'artworks'
    const { error: uploadError } = await supabase.storage.from('artworks').upload(fileName, file, {
      contentType: file.type || 'image/png',
      upsert: true,
    });

    if (uploadError) {
      return { handled: true, error: `Storage upload failed: ${uploadError.message}`, status: 500 };
    }

    // Generate signed URL (expires in 1 hour) for secure access
    const { data: signedData } = await supabase.storage.from('artworks').createSignedUrl(fileName, 3600);
    const artworkUrl = signedData?.signedUrl || supabase.storage.from('artworks').getPublicUrl(fileName).data.publicUrl;
    const artworkId = crypto.randomUUID();

    // Record in public."CustomArtwork"
    const { error: dbError } = await supabase.from('CustomArtwork').insert({
      id: artworkId,
      userId: user.id,
      mimeType: file.type,
      originalName: file.name,
      fileName,
      fileSize: file.size,
      role: 'customer-upload',
    });

    if (dbError) {
      // Clean up orphaned storage object
      await supabase.storage.from('artworks').remove([fileName]);
      return { handled: true, error: `Database insert failed: ${dbError.message}`, status: 500 };
    }

    return {
      handled: true,
      data: {
        id: artworkId,
        fileName,
        url: artworkUrl,
      } as unknown as T,
    };
  }

  if (path === '/api/admin/uploads/product-image') {
    if (!user || user.role !== 'ADMIN') return { handled: true, error: 'Administrator access required', status: 403 };
    const file = formData.get('file') as File | null;
    if (!file) return { handled: true, error: 'No file uploaded', status: 400 };

    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `products/${Date.now()}-${cleanName}`;

    await supabase.storage.from('artworks').upload(fileName, file, {
      contentType: file.type || 'image/png',
      upsert: true,
    });

    const { data: publicUrlData } = supabase.storage.from('artworks').getPublicUrl(fileName);
    const publicUrl = publicUrlData?.publicUrl || URL.createObjectURL(file);

    return {
      handled: true,
      data: {
        url: publicUrl,
        fileName: cleanName,
      } as unknown as T,
    };
  }

  // Upload UPI payment receipt screenshot / photo
  if (path.startsWith('/api/orders/') && path.endsWith('/payment/receipt')) {
    if (!user) return { handled: true, error: 'Sign in required', status: 401 };
    const orderId = path.replace('/api/orders/', '').replace('/payment/receipt', '').trim();
    const file = (formData.get('receipt') || formData.get('file')) as File | null;
    const utr = ((formData.get('utr') as string | null) || '').trim() || null;

    if (!file) return { handled: true, error: 'No receipt image uploaded. Please choose a photo or screenshot.', status: 400 };

    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!file.type || !allowedMimes.includes(file.type.toLowerCase())) {
      return { handled: true, error: 'Only PNG, JPEG, and WebP images are supported for payment receipts', status: 400 };
    }
    const maxSizeBytes = 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return { handled: true, error: 'Receipt image size exceeds maximum limit of 15MB', status: 400 };
    }

    // Verify order ownership
    const { data: order, error: orderErr } = await supabase
      .from('Order')
      .select('id, userId, paymentMethod, paymentStatus')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return { handled: true, error: 'Order not found', status: 404 };
    }
    if (order.userId !== user.id && user.role !== 'ADMIN') {
      return { handled: true, error: 'Forbidden: you do not own this order', status: 403 };
    }
    if (order.paymentMethod !== 'UPI') {
      return { handled: true, error: 'This order does not use UPI payment method', status: 400 };
    }
    if (order.paymentStatus === 'PAID') {
      return { handled: true, error: 'This order has already been marked as paid', status: 400 };
    }

    if (utr && (utr.length < 6 || utr.length > 30 || !/^[A-Za-z0-9_-]+$/.test(utr))) {
      return { handled: true, error: 'Invalid UTR reference format: must be 6-30 characters alphanumeric', status: 400 };
    }

    const cleanName = (file.name || 'receipt.png').replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `receipts/${orderId}/${Date.now()}-${cleanName}`;

    // Upload to Supabase Storage bucket 'artworks'
    const { error: uploadError } = await supabase.storage.from('artworks').upload(storagePath, file, {
      contentType: file.type || 'image/png',
      upsert: true,
    });

    if (uploadError) {
      return { handled: true, error: `Receipt upload failed: ${uploadError.message}`, status: 500 };
    }

    const { data: publicUrlData } = supabase.storage.from('artworks').getPublicUrl(storagePath);
    const receiptUrl = publicUrlData?.publicUrl || '';

    // Record submission
    await supabase.from('PaymentSubmission').insert({
      id: crypto.randomUUID(),
      orderId,
      userId: user.id,
      utr,
      receiptUrl,
      status: 'SUBMITTED',
    });

    // Update Payment
    const updatePayload: Record<string, any> = {
      receiptUrl,
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
    };
    if (utr) {
      updatePayload.utr = utr;
    }

    const { data: payment, error: payError } = await supabase
      .from('Payment')
      .update(updatePayload)
      .eq('orderId', orderId)
      .select()
      .single();

    if (payError) {
      return { handled: true, error: payError.message, status: 400 };
    }

    await supabase.from('OrderEvent').insert({
      id: crypto.randomUUID(),
      orderId,
      kind: 'PAYMENT_RECEIPT_SUBMITTED',
      detail: { receiptUrl, utr },
    });

    return {
      handled: true,
      data: {
        orderId,
        payment: {
          id: payment.id,
          status: payment.status,
          utr: payment.utr,
          receiptUrl: payment.receiptUrl,
        },
      } as unknown as T,
    };
  }

  return { handled: false };
}
