import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserSession } from '@/lib/auth';
import { requestReview, ReviewRequestError } from '@/lib/review-request';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const user = await getCurrentUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  }

  try {
    const result = await requestReview(id, user.id);
    return NextResponse.json({
      ok: true,
      paper: { id: result.paper.id, slug: result.paper.slug, status: 'UNDER_REVIEW' },
      recruited: result.recruitmentResult.recruited.length,
    });
  } catch (err) {
    if (err instanceof ReviewRequestError) {
      const statusMap = {
        NOT_FOUND: 404,
        NOT_AUTHOR: 403,
        WRONG_STATUS: 409,
        INSUFFICIENT_SIG: 402,
      } as const;
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusMap[err.code] });
    }
    throw err;
  }
}
