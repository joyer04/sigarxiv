import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserSession } from '@/lib/auth';
import { confirmCitationViolation, dismissViolation } from '@/lib/moderator-actions';

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

  let body: { action?: unknown };
  try {
    body = (await req.json()) as { action?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const action = String(body.action ?? '');

  try {
    if (action === 'confirm') {
      const result = await confirmCitationViolation(id);
      return NextResponse.json({ ok: true, action: 'confirmed', ...result });
    }

    if (action === 'dismiss') {
      await dismissViolation(id, user.id);
      return NextResponse.json({ ok: true, action: 'dismissed' });
    }

    return NextResponse.json(
      { error: 'action must be "confirm" or "dismiss".' },
      { status: 400 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
