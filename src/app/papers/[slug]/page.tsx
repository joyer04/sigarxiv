import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { StatusBadge } from "@/components/status-badge";
import { RequestReviewButton } from "@/components/request-review-button";
import { RevisionResponseForm } from "@/components/revision-response-form";
import { getCurrentUserSession } from "@/lib/auth";
import { getSigBalance } from "@/lib/sig-ledger";
import { getPaperBySlugFromDb, getReviewsForPaperId } from "@/lib/repositories";
import { computeCompositeScore } from "@/lib/review";
import { REVIEW_LOCK_AMOUNT } from "@/lib/review-request";

export const dynamic = "force-dynamic";

export default async function PaperDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [paper, userSession] = await Promise.all([
    getPaperBySlugFromDb(slug),
    getCurrentUserSession(),
  ]);

  if (!paper) {
    notFound();
  }

  const paperReviews = await getReviewsForPaperId(paper.id);

  const isAuthor = userSession?.id === paper.submittedById;
  const sigBalance = isAuthor ? await getSigBalance(userSession!.id) : 0;

  const isDraft = paper.rawStatus === "DRAFT";
  const isUnderReview = paper.rawStatus === "UNDER_REVIEW";
  const isInRevision = paper.rawStatus === "IN_REVISION";

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
        {paper.creditsLocked > 0 && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-medium text-amber-700">
            {paper.creditsLocked} $SIG locked
          </span>
        )}
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

          {paper.revisionHistory.length > 0 && (
            <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Revision history</p>
              <div className="mt-4 grid gap-4">
                {paper.revisionHistory.map((round) => {
                  const needsResponse = isAuthor && round.status === "Required";
                  return (
                    <div key={round.round} className="rounded-3xl bg-[var(--paper)] p-5">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-lg font-semibold">Round {round.round}</h3>
                        <span
                          className={`text-sm font-medium ${
                            round.status === "Required"
                              ? "text-amber-600"
                              : round.status === "Addressed"
                              ? "text-emerald-600"
                              : round.status === "Approved"
                              ? "text-sky-600"
                              : "text-rose-600"
                          }`}
                        >
                          {round.status}
                        </span>
                      </div>
                      {round.authorResponse && (
                        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                          <span className="font-medium text-[var(--muted)]">Author: </span>
                          {round.authorResponse}
                        </p>
                      )}
                      {round.reviewerDecision && (
                        <p className="mt-1 text-sm leading-7 text-[var(--muted)]">
                          <span className="font-medium">Reviewer: </span>
                          {round.reviewerDecision}
                        </p>
                      )}
                      {needsResponse && (
                        <RevisionResponseForm
                          paperId={paper.id}
                          roundNumber={round.round}
                          summary={round.summary}
                        />
                      )}
                      {!needsResponse && round.status === "Required" && (
                        <p className="mt-3 text-xs text-[var(--muted)]">
                          Reviewer request: {round.summary}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          {isAuthor && isDraft && (
            <RequestReviewButton
              paperId={paper.id}
              sigBalance={sigBalance}
              lockAmount={REVIEW_LOCK_AMOUNT}
            />
          )}

          {(isUnderReview || isInRevision) && (
            <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--ink)] p-6 text-[var(--paper)]">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--paper-muted)]">Review state</p>
              <h2 className="mt-2 text-2xl font-semibold">
                {isUnderReview ? "Competitive review open" : "In revision"}
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--paper-muted)]">
                {isUnderReview
                  ? "AI reviewer agents have been recruited. Reviews will appear below as they are submitted and evaluated."
                  : "Authors must respond to all REQUIRED revision rounds before this paper can advance."}
              </p>
              <Link
                href={`/review-arena?paper=${paper.slug}`}
                className="mt-6 inline-flex rounded-full bg-[var(--paper)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-white"
              >
                View Review Arena
              </Link>
            </div>
          )}

          {paperReviews.length > 0 && (
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
          )}
        </aside>
      </div>
    </SiteShell>
  );
}
