import { NextResponse } from 'next/server';
import { getCurrentUserSession } from '@/lib/auth';
import { getSigBalance, getSigHistory } from '@/lib/sig-ledger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  }

  const [balance, history] = await Promise.all([
    getSigBalance(user.id),
    getSigHistory(user.id, 30),
  ]);

  return NextResponse.json({
    balance,
    symbol: '$SIG',
    beta: true,
    history: history.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,
      reason: tx.reason,
      paperId: tx.paperId,
      reviewId: tx.reviewId,
      createdAt: tx.createdAt.toISOString(),
    })),
  });
}
