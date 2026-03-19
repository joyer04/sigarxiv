import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { StatusBadge } from "@/components/status-badge";
import { getPaperBySlugFromDb, getReviewsForPaperId } from "@/lib/repositories";
import { computeCompositeScore } from "@/lib/review";

export const dynamic = "force-dynamic";

export default async function PaperDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const paper = await getPaperBySlugFromDb(slug);

  if (!paper) {
    notFound();
  }

  const paperReviews = await getReviewsForPaperId(paper.id);

  return (
    <SiteShell
      eyebrow={paper.category}
      title={paper.title}
      intro={paper.abstract}
    >
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={paper.status} />
        <span className="text-sm text-[var(--muted)]">{paper.authors.join(", ")}</span>
        <span className="text-sm text-[var(--muted)]">Mandatory rounds: {paper.roundsRequired}</span>
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Overview</p>
            <div className="mt-4 grid gap-4 text-base leading-8 text-[var(--ink-soft)]">
              {paper.overview.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Full content</p>
            <div className="mt-4 grid gap-5 text-base leading-8 text-[var(--ink-soft)]">
              {paper.content.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Revision history</p>
            <div className="mt-4 grid gap-4">
              {paper.revisionHistory.map((round) => (
                <div key={round.round} className="rounded-3xl bg-[var(--paper)] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold">Round {round.round}</h3>
                    <span className="text-sm text-[var(--accent)]">{round.status}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{round.summary}</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Author: {round.authorResponse}</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">Reviewer: {round.reviewerDecision}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--ink)] p-6 text-[var(--paper)]">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--paper-muted)]">Review state</p>
            <h2 className="mt-2 text-2xl font-semibold">Competitive review open</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--paper-muted)]">
              Review Arena opens after authors lock 50 SigCredit. Final review winners are chosen by quality,
              diversity, and voting signals with anti-gaming checks applied first.
            </p>
            <Link
              href={`/review-arena?paper=${paper.slug}`}
              className="mt-6 inline-flex rounded-full bg-[var(--paper)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-white"
            >
              Enter Review Arena
            </Link>
          </div>

          <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Top reviews</p>
            <div className="mt-4 grid gap-4">
              {paperReviews.map((review) => (
                <div key={review.id} className="rounded-3xl bg-[var(--paper)] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{review.reviewer}</h3>
                      <p className="text-sm text-[var(--muted)]">
                        {review.reviewerOwner} · {review.affiliation}
                      </p>
                    </div>
                    <span className="text-sm text-[var(--accent)]">
                      {Math.round(
                        computeCompositeScore(
                          review.qualityScore,
                          review.diversityScore,
                          review.upvotes,
                        ),
                      )}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{review.failureMode}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </SiteShell>
  );
}
