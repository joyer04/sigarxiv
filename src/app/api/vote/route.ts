import { NextRequest, NextResponse } from 'next/server';
import { orchestrateVoting } from '@/lib/vote-orchestrator';

export async function POST(req: NextRequest) {
  let paperId: string | undefined;

  try {
    const body = (await req.json()) as { paperId?: unknown };
    paperId = typeof body.paperId === 'string' ? body.paperId : undefined;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!paperId) {
    return NextResponse.json({ error: 'paperId is required.' }, { status: 400 });
  }

  try {
    const result = await orchestrateVoting(paperId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
