"use client";

import { useState } from "react";

interface Props {
  paperId: string;
}

type Status = "idle" | "loading" | "done" | "error";

export function RecruitVotePanel({ paperId }: Props) {
  const [recruitStatus, setRecruitStatus] = useState<Status>("idle");
  const [voteStatus, setVoteStatus] = useState<Status>("idle");
  const [recruitMsg, setRecruitMsg] = useState("");
  const [voteMsg, setVoteMsg] = useState("");

  async function handleRecruit() {
    setRecruitStatus("loading");
    setRecruitMsg("");
    try {
      const res = await fetch("/api/recruit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId }),
      });
      const data = (await res.json()) as {
        results?: Array<{ agentName: string; success: boolean; error?: string }>;
        error?: string;
      };
      if (!res.ok) {
        setRecruitStatus("error");
        setRecruitMsg(data.error ?? "Recruitment failed.");
        return;
      }
      const results = data.results ?? [];
      const done = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      setRecruitStatus("done");
      setRecruitMsg(`Recruited ${done} agent(s). ${failed > 0 ? `${failed} failed.` : ""}`);
    } catch {
      setRecruitStatus("error");
      setRecruitMsg("Network error.");
    }
  }

  async function handleVote() {
    setVoteStatus("loading");
    setVoteMsg("");
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId }),
      });
      const data = (await res.json()) as {
        voterCount?: number;
        reviewsEvaluated?: number;
        votes?: unknown[];
        error?: string;
      };
      if (!res.ok) {
        setVoteStatus("error");
        setVoteMsg(data.error ?? "Voting failed.");
        return;
      }
      setVoteStatus("done");
      setVoteMsg(
        `${data.voterCount ?? 0} voter agent(s) evaluated ${data.reviewsEvaluated ?? 0} review(s). ${data.votes?.length ?? 0} vote(s) cast.`,
      );
    } catch {
      setVoteStatus("error");
      setVoteMsg("Network error.");
    }
  }

  return (
    <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6 space-y-4">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Agent orchestration</p>
      <p className="text-sm leading-7 text-[var(--ink-soft)]">
        Recruit AI reviewer agents to independently evaluate this paper, then have a separate set of agents vote on review quality.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <button
            onClick={() => void handleRecruit()}
            disabled={recruitStatus === "loading"}
            className="w-full rounded-3xl bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-[var(--paper)] disabled:opacity-50"
          >
            {recruitStatus === "loading" ? "Recruiting…" : "Recruit reviewers"}
          </button>
          {recruitMsg && (
            <p className={`text-xs leading-5 ${recruitStatus === "error" ? "text-red-600" : "text-[var(--muted)]"}`}>
              {recruitMsg}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={() => void handleVote()}
            disabled={voteStatus === "loading"}
            className="w-full rounded-3xl border border-[var(--line)] px-4 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {voteStatus === "loading" ? "Voting…" : "Run agent voting"}
          </button>
          {voteMsg && (
            <p className={`text-xs leading-5 ${voteStatus === "error" ? "text-red-600" : "text-[var(--muted)]"}`}>
              {voteMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
