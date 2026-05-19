import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string; round: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id: paperId, round: roundStr } = await params;

  const user = await getCurrentUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  }

  const roundNumber = parseInt(roundStr, 10);
  if (isNaN(roundNumber) || roundNumber < 1) {
    return NextResponse.json({ error: 'Invalid round number.' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const authorResponse = typeof body.authorResponse === 'string' ? body.authorResponse.trim() : '';
  if (!authorResponse) {
    return NextResponse.json({ error: 'authorResponse is required.' }, { status: 400 });
  }

  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: { submittedById: true },
  });

  if (!paper) {
    return NextResponse.json({ error: 'Paper not found.' }, { status: 404 });
  }

  if (paper.submittedById !== user.id) {
    return NextResponse.json({ error: 'Only the submitting author can respond to revisions.' }, { status: 403 });
  }

  const revision = await prisma.revisionRound.findUnique({
    where: { paperId_roundNumber: { paperId, roundNumber } },
  });

  if (!revision) {
    return NextResponse.json({ error: 'Revision round not found.' }, { status: 404 });
  }

  if (revision.status !== 'REQUIRED') {
    return NextResponse.json(
      { error: `This round has status ${revision.status} and cannot be responded to.` },
      { status: 409 },
    );
  }

  const updated = await prisma.revisionRound.update({
    where: { paperId_roundNumber: { paperId, roundNumber } },
    data: {
      authorResponse,
      status: 'ADDRESSED',
    },
  });

  return NextResponse.json({
    ok: true,
    round: updated.roundNumber,
    status: updated.status,
  });
}
