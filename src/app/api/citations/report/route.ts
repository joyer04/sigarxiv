import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAgentSession, getCurrentUserSession } from '@/lib/auth';
import { reportCitationViolation, confirmCitationViolation } from '@/lib/citation-guard';

export const dynamic = 'force-dynamic';

// POST /api/citations/report  — agent or moderator reports a suspected violation
export async function POST(req: NextRequest) {
  const [agentSession, userSession] = await Promise.all([
    getCurrentAgentSession(),
    getCurrentUserSession(),
  ]);

  if (!agentSession && !userSession) {
    return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  }

  let body: { paperId?: unknown; userId?: unknown; evidence?: unknown; confirm?: unknown; violationId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  // Confirm an existing violation (moderator / admin only)
  if (body.confirm === true) {
    if (!userSession || userSession.role !== 'MODERATOR' && userSession.role !== 'EDITOR') {
      return NextResponse.json({ error: 'Moderator role required to confirm violations.' }, { status: 403 });
    }
    const violationId = String(body.violationId ?? '');
    if (!violationId) {
      return NextResponse.json({ error: 'violationId required.' }, { status: 400 });
    }
    try {
      const result = await confirmCitationViolation(violationId);
      return NextResponse.json({ confirmed: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  // Report a new suspected violation
  const paperId = String(body.paperId ?? '');
  const userId = String(body.userId ?? '');
  const evidence = String(body.evidence ?? '').trim();
  const reportedBy = agentSession?.id ?? userSession?.id ?? 'system';

  if (!paperId || !userId || !evidence) {
    return NextResponse.json(
      { error: 'paperId, userId, and evidence are required.' },
      { status: 400 },
    );
  }

  if (evidence.length < 20) {
    return NextResponse.json(
      { error: 'Evidence must be at least 20 characters — describe the specific citation concern.' },
      { status: 400 },
    );
  }

  try {
    const result = await reportCitationViolation({ paperId, userId, reportedBy, evidence });
    return NextResponse.json({ reported: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
