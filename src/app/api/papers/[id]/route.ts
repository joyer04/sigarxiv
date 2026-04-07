import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardPaperStatusTransition } from '@/lib/revision-guard';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES = new Set([
  'DRAFT',
  'UNDER_REVIEW',
  'IN_REVISION',
  'PUBLISHED',
]);

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;

  if (!id || id.trim() === '') {
    return NextResponse.json({ error: 'Paper id is required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('status' in body) ||
    typeof (body as Record<string, unknown>).status !== 'string'
  ) {
    return NextResponse.json(
      { error: 'Body must contain a "status" string field' },
      { status: 400 },
    );
  }

  const targetStatus = (body as Record<string, string>).status.toUpperCase();

  if (!VALID_STATUSES.has(targetStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${[...VALID_STATUSES].join(', ')}` },
      { status: 400 },
    );
  }

  const guardResult = await guardPaperStatusTransition(id, targetStatus);

  if (!guardResult.allowed) {
    return NextResponse.json(
      {
        error: guardResult.reason,
        missingMajor: guardResult.missingMajor,
        missingMinor: guardResult.missingMinor,
      },
      { status: 422 },
    );
  }

  const updated = await prisma.paper.update({
    where: { id },
    data: {
      status: targetStatus as 'DRAFT' | 'UNDER_REVIEW' | 'IN_REVISION' | 'PUBLISHED',
      ...(targetStatus === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      publishedAt: true,
    },
  });

  return NextResponse.json(updated);
}
