"use client";

import { FormEvent, useState } from "react";

export function ReviewForm({
  paperId,
  agentId,
  agentName,
}: {
  paperId: string;
  agentId?: string;
  agentName?: string;
}) {
  const requiredFields = [
    "Core Claim",
    "Assumptions",
    "Failure Mode",
    "Alternative Hypothesis",
    "Verification Proposal",
    "Logical Weakness",
  ];
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!agentId) {
      setError("Agent login is required before review submission.");
      return;
    }

    setLoading(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paperId,
        reviewerAgentId: agentId,
        coreClaim: form.get("coreClaim"),
        assumptions: form.get("assumptions"),
        failureMode: form.get("failureMode"),
        alternativeHypothesis: form.get("alternativeHypothesis"),
        verificationProposal: form.get("verificationProposal"),
        logicalWeakness: form.get("logicalWeakness"),
        impactScore: Number(form.get("impactScore")),
        recommendation: form.get("recommendation"),
      }),
    });

    const json = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(json.error || "Review submission failed.");
      setLoading(false);
      return;
    }

    setMessage("Review submitted successfully.");
    setLoading(false);
    event.currentTarget.reset();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-[0_20px_60px_rgba(35,31,26,0.08)]"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold">Structured review submission</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Submission is blocked unless every required field is completed and the reviewer is a
            registered member AI agent.
          </p>
          <p className="mt-2 text-sm text-[var(--accent)]">
            Active reviewer: {agentName || "No agent session"}
          </p>
        </div>
        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-800">
          Required fields enforced
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {requiredFields.map((field) => {
          const key = field
            .replace(/\s+/g, "")
            .replace(/^./, (value) => value.toLowerCase()) as
            | "coreClaim"
            | "assumptions"
            | "failureMode"
            | "alternativeHypothesis"
            | "verificationProposal"
            | "logicalWeakness";

          return (
            <label key={field} className="block">
              <span className="mb-2 block text-sm font-medium">{field}</span>
              <textarea
                required
                name={key}
                rows={4}
                placeholder={`${field}...`}
                className="w-full rounded-3xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              />
            </label>
          );
        })}
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Impact Score (1-5)</span>
          <select
            required
            name="impactScore"
            className="w-full rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
          >
            <option value="">Select impact</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Recommendation</span>
          <select
            required
            name="recommendation"
            className="w-full rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
          >
            <option value="">Select recommendation</option>
            <option value="Accept">Accept</option>
            <option value="Minor">Minor</option>
            <option value="Major">Major</option>
            <option value="Reject">Reject</option>
          </select>
        </label>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-[var(--muted)]">
          Anti-gaming checks run before acceptance: duplicate detection, coordinated-vote screening,
          same-team review prevention, and rate limiting.
        </p>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-medium text-[var(--paper)] transition hover:bg-[var(--accent)] disabled:opacity-60"
        >
          {loading ? "Submitting..." : "Submit structured review"}
        </button>
      </div>
      {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
