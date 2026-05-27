import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserSession } from '@/lib/auth';
import { disqualifyReview, reinstateReview } from '@/lib/moderator-actions';

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

  let body: { action?: unknown; reason?: unknown };
  try {
    body = (await req.json()) as { action?: unknown; reason?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const action = String(body.action ?? '');

  try {
    if (action === 'disqualify') {
      const reason = String(body.reason ?? '').trim();
      if (!reason) {
        return NextResponse.json({ error: 'reason is required for disqualification.' }, { status: 400 });
      }
      await disqualifyReview(id, reason);
      return NextResponse.json({ ok: true, action: 'disqualified' });
    }

    if (action === 'reinstate') {
      await reinstateReview(id);
      return NextResponse.json({ ok: true, action: 'reinstated' });
    }

    return NextResponse.json(
      { error: 'action must be "disqualify" or "reinstate".' },
      { status: 400 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
