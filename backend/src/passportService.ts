import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

export async function getOrCreatePassportRule(db: PrismaClient | Prisma.TransactionClient) {
  let rule = await db.passportRule.findUnique({ where: { id: 'default' } });
  if (!rule) {
    rule = await db.passportRule.create({
      data: {
        id: 'default',
        stampsGoal: 8,
        stampRule: 'One stamp for each eligible completed, paid order.',
        rewardDescription: 'A free mini sticker of your choice',
        seriesGoal: true,
      },
    });
  }
  return rule;
}

export async function awardPassportStamp(
  tx: Prisma.TransactionClient,
  order: { id: string; userId: string; items?: any[] }
) {
  // Check if stamp already awarded for this order
  const existing = await tx.customerStamp.findUnique({
    where: { userId_orderId: { userId: order.userId, orderId: order.id } },
  });
  if (existing) return existing;

  // Find series IDs from ordered products
  let seriesIds: string[] = [];
  if (order.items && order.items.length) {
    const productIds = order.items.map((i: any) => i.productId).filter(Boolean);
    if (productIds.length) {
      const prods = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { seriesId: true },
      });
      seriesIds = Array.from(new Set(prods.map((p) => p.seriesId).filter(Boolean))) as string[];
    }
  }

  const stamp = await tx.customerStamp.create({
    data: {
      userId: order.userId,
      orderId: order.id,
      type: 'ORDER',
      reason: `Qualifying completed and paid order #${order.id}`,
      seriesIds: seriesIds.length ? seriesIds : undefined,
    },
  });

  await tx.auditLog.create({
    data: {
      actor: 'SYSTEM',
      action: 'PASSPORT_STAMP_AWARDED',
      entity: 'CustomerStamp',
      entityId: stamp.id,
      after: { userId: order.userId, orderId: order.id, seriesIds },
    },
  });

  return stamp;
}

export async function reversePassportStamp(
  tx: Prisma.TransactionClient,
  orderId: string,
  actorId: string,
  reason: string
) {
  const stamp = await tx.customerStamp.findFirst({ where: { orderId } });
  if (stamp) {
    await tx.customerStamp.delete({ where: { id: stamp.id } });
    await tx.auditLog.create({
      data: {
        actor: actorId,
        action: 'PASSPORT_STAMP_REVERSED',
        entity: 'CustomerStamp',
        entityId: stamp.id,
        before: { orderId, userId: stamp.userId, seriesIds: stamp.seriesIds },
        after: { reason: reason || 'Order cancelled or refunded' },
      },
    });
  }
}

export async function getCustomerPassport(db: PrismaClient, userId: string) {
  const rule = await getOrCreatePassportRule(db);
  const stamps = await db.customerStamp.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { order: { select: { id: true, total: true, createdAt: true } } },
  });

  const redemptions = await db.passportRewardRedemption.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const totalStamps = stamps.length;
  const stampsUsed = redemptions
    .filter((r) => r.status !== 'REJECTED')
    .reduce((sum, r) => sum + r.stampsUsed, 0);

  const availableStamps = Math.max(0, totalStamps - stampsUsed);
  const eligibleRewardsCount = Math.floor(availableStamps / rule.stampsGoal);

  // Collect all unique series codes collected
  const collectedSeries = new Set<string>();
  for (const s of stamps) {
    if (Array.isArray(s.seriesIds)) {
      for (const code of s.seriesIds) {
        if (typeof code === 'string') collectedSeries.add(code);
      }
    }
  }

  return {
    rule: {
      stampsGoal: rule.stampsGoal,
      stampRule: rule.stampRule,
      rewardDescription: rule.rewardDescription,
      rewardValueCap: rule.rewardValueCap ? rule.rewardValueCap.toString() : null,
      seriesGoal: rule.seriesGoal,
    },
    stamps: stamps.map((s) => ({
      id: s.id,
      orderId: s.orderId,
      orderRef: s.orderId ? s.orderId.slice(-8).toUpperCase() : null,
      type: s.type,
      reason: s.reason,
      seriesIds: s.seriesIds || [],
      date: s.createdAt.toISOString(),
    })),
    totalStamps,
    availableStamps,
    stampsGoal: rule.stampsGoal,
    rewardsEligible: eligibleRewardsCount > 0,
    eligibleRewardsCount,
    collectedSeries: Array.from(collectedSeries),
    redemptions: redemptions.map((r) => ({
      id: r.id,
      stampsUsed: r.stampsUsed,
      rewardDescription: r.rewardDescription,
      status: r.status,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() || null,
    })),
  };
}

