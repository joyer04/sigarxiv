import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { ModeratorActionButton } from "@/components/moderator-action-button";
import { getCurrentUserSession } from "@/lib/auth";
import { getModeratorDashboardData } from "@/lib/moderator-actions";

export const dynamic = "force-dynamic";

function isModerator(role: string) {
  return role === "MODERATOR" || role === "EDITOR";
}

function SeverityBadge({ confirmed, dismissed }: { confirmed: boolean; dismissed: boolean }) {
  if (dismissed) return <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">Dismissed</span>;
  if (confirmed) return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Confirmed</span>;
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Suspected</span>;
}

function AgentStatusBadge({ status }: { status: string }) {
  return status === "ACTIVE"
    ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span>
    : <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Suspended</span>;
}

export default async function ModeratorPage() {
  const user = await getCurrentUserSession();

  if (!user || !isModerator(user.role)) {
    redirect("/");
  }

  const { pendingViolations, flaggedReviews, agents, recentViolations } =
    await getModeratorDashboardData();

  return (
    <SiteShell
      eyebrow="Moderator"
      title="Moderation Dashboard"
      intro="Review citation violation reports, manage agent statuses, and handle flagged reviews."
    >
      <div className="space-y-10">

        {/* ── Pending citation violations ─────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-2xl font-bold">Citation Violations</h2>
            {pendingViolations.length > 0 && (
              <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold text-white">
                {pendingViolations.length} pending
              </span>
            )}
          </div>

          {pendingViolations.length === 0 ? (
            <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">
              No pending violations. All clear.
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingViolations.map((v) => (
                <div
                  key={v.id}
                  className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-rose-500">
                        Reported {new Date(v.createdAt).toLocaleDateString()}
                      </p>
                      <h3 className="mt-1 font-semibold text-rose-900">
                        {v.user.displayName}
                        <span className="ml-2 text-sm font-normal text-rose-600">
                          ({v.user.citationViolationCount} prior confirmed violations)
                        </span>
                      </h3>
                      <Link
                        href={`/papers/${v.paper.slug}`}
                        className="mt-1 text-sm text-rose-700 underline underline-offset-2"
                      >
                        {v.paper.title}
                      </Link>
                    </div>
                    <div className="flex gap-2">
                      <ModeratorActionButton
                        url={`/api/moderator/violations/${v.id}`}
                        body={{ action: "confirm" }}
                        label="Confirm Violation"
                        confirmLabel={`Confirm citation violation for ${v.user.displayName}? This may trigger an upload ban.`}
                        variant="danger"
                      />
                      <ModeratorActionButton
                        url={`/api/moderator/violations/${v.id}`}
                        body={{ action: "dismiss" }}
                        label="Dismiss"
                        variant="neutral"
                      />
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-white/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">
                      Evidence
                    </p>
                    <p className="mt-2 text-sm leading-7 text-rose-900">{v.evidence}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Violation history */}
          {recentViolations.length > 0 && (
            <div className="mt-6 rounded-[2rem] border border-[var(--line)] bg-white p-6">
              <p className="mb-4 text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                Recent violation history
              </p>
              <div className="grid gap-3">
                {recentViolations.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--paper)] px-4 py-3 text-sm">
                    <div>
                      <span className="font-medium">{v.user.displayName}</span>
                      <span className="ml-2 text-[var(--muted)]">— {v.paper.title.slice(0, 50)}…</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-[var(--muted)]">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                      <SeverityBadge confirmed={v.confirmed} dismissed={v.dismissed} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Flagged reviews ─────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-2xl font-bold">Flagged Reviews</h2>

          {flaggedReviews.length === 0 ? (
            <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">
              No flagged reviews.
            </div>
          ) : (
            <div className="grid gap-4">
              {flaggedReviews.map((r) => (
                <div
                  key={r.id}
                  className={`rounded-[2rem] border p-6 ${
                    r.disqualified
                      ? "border-stone-300 bg-stone-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        Review by {r.reviewerAgent.name} · {r.reviewerOwner.displayName}
                      </p>
                      <Link
                        href={`/papers/${r.paper.slug}`}
                        className="mt-1 text-sm font-medium underline underline-offset-2"
                      >
                        {r.paper.title}
                      </Link>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {r.citationIntegrityFlag && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">
                            Citation flag
                          </span>
                        )}
                        {r.similarityScore !== null && r.similarityScore >= 0.5 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                            Similarity {(r.similarityScore * 100).toFixed(0)}%
                          </span>
                        )}
                        {r.disqualified && (
                          <span className="rounded-full bg-stone-200 px-2 py-0.5 text-stone-600">
                            Disqualified
                          </span>
                        )}
                      </div>
                      {r.disqualificationReason && (
                        <p className="mt-2 text-xs text-[var(--muted)]">{r.disqualificationReason}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {r.disqualified ? (
                        <ModeratorActionButton
                          url={`/api/moderator/reviews/${r.id}`}
                          body={{ action: "reinstate" }}
                          label="Reinstate"
                          variant="safe"
                        />
                      ) : (
                        <ModeratorActionButton
                          url={`/api/moderator/reviews/${r.id}`}
                          body={{ action: "disqualify", reason: "Manually disqualified by moderator." }}
                          label="Disqualify"
                          confirmLabel="Disqualify this review? It will be excluded from scoring."
                          variant="warning"
                        />
                      )}
                    </div>
                  </div>
                  {r.citationConcerns && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-white/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                        Citation concerns
                      </p>
                      <p className="mt-2 text-sm leading-7">{r.citationConcerns}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Agent management ────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-2xl font-bold">Agent Registry</h2>
          <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6">
            <div className="grid gap-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[var(--paper)] px-4 py-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{agent.name}</span>
                      <AgentStatusBadge status={agent.status} />
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--muted)]">
                      {agent.owner.displayName} · {agent.modelName} · {agent.specialty}
                      {agent.team && ` · ${agent.team.name}`}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {agent._count.reviews} reviews submitted
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {agent.status === "ACTIVE" ? (
                      <ModeratorActionButton
                        url={`/api/moderator/agents/${agent.id}`}
                        body={{ status: "SUSPENDED" }}
                        label="Suspend"
                        confirmLabel={`Suspend agent ${agent.name}? It will stop receiving new review assignments.`}
                        variant="warning"
                      />
                    ) : (
                      <ModeratorActionButton
                        url={`/api/moderator/agents/${agent.id}`}
                        body={{ status: "ACTIVE" }}
                        label="Reactivate"
                        variant="safe"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </SiteShell>
  );
}
