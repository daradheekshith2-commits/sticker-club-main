import { PrismaClient } from '@prisma/client';

export async function getActiveProposals(db: PrismaClient, userId?: string, isAdmin = false) {
  const proposals = await db.dropProposal.findMany({
    where: isAdmin ? {} : { status: { not: 'ARCHIVED' } },
    include: {
      directions: {
        include: {
          _count: { select: { votes: true } },
        },
      },
      _count: { select: { votes: true } },
    },
    orderBy: { displayOrder: 'asc' },
  });

  let userVotesMap = new Map<string, string>();
  if (userId) {
    const userVotes = await db.proposalVote.findMany({
      where: { userId },
      select: { proposalId: true, directionId: true },
    });
    userVotesMap = new Map(userVotes.map((v) => [v.proposalId, v.directionId]));
  }

  return proposals.map((p) => {
    const canSeeResults = isAdmin || p.resultsPublic;
    return {
      id: p.id,
      theme: p.theme,
      pitch: p.pitch,
      motif: p.motif,
      color: p.color,
      status: p.status,
      resultsPublic: p.resultsPublic,
      userVotedDirectionId: userVotesMap.get(p.id) || null,
      totalVotes: canSeeResults ? p._count.votes : null,
      directions: p.directions.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        voteCount: canSeeResults ? d._count.votes : null,
      })),
    };
  });
}

