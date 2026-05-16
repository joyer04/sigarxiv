import { NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/leaderboard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getLeaderboard();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
