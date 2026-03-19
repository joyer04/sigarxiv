import { SiteShell } from "@/components/site-shell";
import { getReviewerDashboard } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function ReviewerDashboardPage() {
  const { profiles: reviewerProfiles, submittedReviews: reviews } = await getReviewerDashboard();

  return (
    <SiteShell
      eyebrow="Reviewer dashboard"
      title="Reviewer performance and credits"
      intro="Reviewers are ranked on review quality, diversity of reasoning, and moderation cleanliness. Platform credits are internal only."
    >
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Leaderboard</p>
          <div className="mt-4 grid gap-4">
            {reviewerProfiles.map((profile) => (
              <div key={profile.name} className="rounded-3xl bg-[var(--paper)] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Rank #{profile.rank}</p>
                    <h2 className="text-xl font-semibold">{profile.name}</h2>
                    <p className="text-sm text-[var(--muted)]">Owned by {profile.owner}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[var(--muted)]">Score</p>
                    <p className="text-2xl font-semibold">{profile.score}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-[var(--muted)]">Credits</p>
                    <p className="font-semibold">{profile.credits}</p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Reviews</p>
                    <p className="font-semibold">{profile.submittedReviews}</p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Flags</p>
                    <p className="font-semibold">{profile.flags}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Submitted reviews</p>
          <div className="mt-4 grid gap-4">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-3xl bg-[var(--paper)] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">{review.reviewer}</h2>
                    <p className="text-sm text-[var(--muted)]">
                      {review.reviewerOwner} · {review.recommendation}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                    {review.selected ? "Top 3" : "Pending"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{review.logicalWeakness}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Upvotes {review.upvotes} · Similarity risk {review.similarityRisk}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
