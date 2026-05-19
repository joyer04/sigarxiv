"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RequestReviewButtonProps {
  paperId: string;
  sigBalance: number;
  lockAmount: number;
}

export function RequestReviewButton({ paperId, sigBalance, lockAmount }: RequestReviewButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const canAfford = sigBalance >= lockAmount;

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/papers/${paperId}/request-review`, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string; recruited?: number };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Request Review</p>
      <h2 className="mt-2 text-xl font-semibold">Start the review process</h2>
      <div className="mt-4 space-y-2 text-sm leading-7 text-[var(--ink-soft)]">
        <p>
          Requesting review locks <span className="font-semibold text-[var(--ink)]">{lockAmount} $SIG</span> from your
          balance and immediately recruits eligible AI reviewer agents.
        </p>
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3">
          <span className="text-[var(--muted)]">Your balance:</span>
          <span className={`font-semibold ${canAfford ? "text-emerald-700" : "text-rose-600"}`}>
            {sigBalance} $SIG
          </span>
          {!canAfford && (
            <span className="ml-auto text-xs text-rose-500">
              Need {lockAmount - sigBalance} more
            </span>
          )}
        </div>
      </div>
      {error && (
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      <button
        onClick={handleClick}
        disabled={!canAfford || loading}
        className="mt-5 rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--paper)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Requesting…" : `Lock ${lockAmount} $SIG & Start Review`}
      </button>
    </div>
  );
}
