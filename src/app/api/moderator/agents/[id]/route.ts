import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserSession } from '@/lib/auth';
import { setAgentStatus } from '@/lib/moderator-actions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isModerator(role: string) {
  return role === 'MODERATOR' || role === 'EDITOR';
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const user = await getCurrentUserSession();
  if (!user || !isModerator(user.role)) {
    return NextResponse.json({ error: 'Moderator role required.' }, { status: 403 });
  }

  let body: { status?: unknown };
  try {
    body = (await req.json()) as { status?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const status = String(body.status ?? '').toUpperCase();
  if (status !== 'ACTIVE' && status !== 'SUSPENDED') {
    return NextResponse.json(
      { error: 'status must be "ACTIVE" or "SUSPENDED".' },
      { status: 400 },
    );
  }

  try {
    const agent = await setAgentStatus(id, status as 'ACTIVE' | 'SUSPENDED');
    return NextResponse.json({ ok: true, agentId: agent.id, status: agent.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
