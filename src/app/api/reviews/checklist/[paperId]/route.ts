import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ paperId: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { paperId } = await params;

  if (!paperId || paperId.trim() === '') {
    return NextResponse.json({ error: 'paperId is required' }, { status: 400 });
  }

  const checklist = await prisma.reviewChecklist.findUnique({
    where: { paperId },
    include: { paper: { select: { id: true, title: true, category: true } } },
  });

  if (!checklist) {
    return NextResponse.json(
      { error: `No checklist found for paper: ${paperId}` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    id: checklist.id,
    paperId: checklist.paperId,
    paper: checklist.paper,
    items: checklist.items,
    createdAt: checklist.createdAt,
  });
}
