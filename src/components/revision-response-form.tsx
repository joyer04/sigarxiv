"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RevisionResponseFormProps {
  paperId: string;
  roundNumber: number;
  summary: string;
}

export function RevisionResponseForm({ paperId, roundNumber, summary }: RevisionResponseFormProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/papers/${paperId}/revisions/${roundNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorResponse: text.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setDone(true);
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
        Response submitted — round marked as Addressed.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
        Reviewer request
      </p>
      <p className="text-sm leading-7 text-[var(--ink-soft)]">{summary}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe how you addressed this revision request…"
        rows={5}
        className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm leading-7 text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--ink)] focus:outline-none"
        required
      />
      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !text.trim()}
        className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--paper)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Submitting…" : "Submit Revision Response"}
      </button>
    </form>
  );
}
