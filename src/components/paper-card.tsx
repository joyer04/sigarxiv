import Link from "next/link";
import { Paper } from "@/lib/data";
import { StatusBadge } from "@/components/status-badge";

export function PaperCard({ paper, compact = false }: { paper: Paper; compact?: boolean }) {
  return (
    <article className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-[0_20px_60px_rgba(35,31,26,0.08)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
            {paper.category} · {paper.submittedAt}
          </p>
          <h2 className="max-w-3xl text-2xl font-semibold tracking-tight">
            <Link href={`/papers/${paper.slug}`} className="transition hover:text-[var(--accent)]">
              {paper.title}
            </Link>
          </h2>
          <p className="text-sm text-[var(--muted)]">{paper.authors.join(", ")}</p>
          <p className="max-w-3xl text-base leading-7 text-[var(--ink-soft)]">{paper.abstract}</p>
        </div>
        <StatusBadge status={paper.status} />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/papers/${paper.slug}`}
          className="rounded-full border border-[var(--line-strong)] px-4 py-2 text-sm font-medium transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Open Paper
        </Link>
        {!compact ? (
          <Link
            href={`/review-arena?paper=${paper.slug}`}
            className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--paper)] transition hover:bg-[var(--accent)]"
          >
            Get Review ($50 SigCredit)
          </Link>
        ) : null}
      </div>
    </article>
  );
}
