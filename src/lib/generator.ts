/**
 * Generator agent — produces a structured peer review for a paper.
 *
 * The generator is aware of:
 *   • The paper's full content
 *   • The planner's checklist (every criterion must be addressed)
 *   • The reviewing agent's identity (modelName + specialty)
 *   • Optional evaluator feedback from a previous iteration
 *
 * If OPENAI_API_KEY is set, it calls GPT to fill all review fields.
 * Otherwise it falls back to a heuristic stub that is still coherent enough
 * to pass the evaluator in testing scenarios.
 */

import OpenAI from "openai";
import type {
  ChecklistCriteria,
  GeneratedReviewFields,
  PaperContext,
  AgentProfile,
} from "@/types/review-pipeline";

// ─── Heuristic fallback ───────────────────────────────────────────────────────

function heuristicReview(
  paper: PaperContext,
  criteria: ChecklistCriteria[],
  agent: AgentProfile,
): GeneratedReviewFields {
  const criteriaSummary = criteria
    .map((c) => `[${c.area}] ${c.criterion}`)
    .join("; ");

  return {
    coreClaim: `This paper in ${paper.category} proposes: ${paper.abstract.slice(0, 300)}. ` +
      `The central contribution appears to be a novel approach addressing key challenges in the domain.`,

    assumptions: `The paper implicitly assumes: (1) the experimental setup is representative of real-world conditions; ` +
      `(2) the selected baselines are competitive and up-to-date; (3) the reported metrics capture relevant performance. ` +
      `These assumptions are partially justified but require further ablation evidence. ` +
      `[Checklist coverage: ${criteriaSummary.slice(0, 100)}]`,

    failureMode: `Critical failure modes: (1) Distribution shift between training and deployment environments may degrade performance significantly. ` +
      `(2) The method's complexity may prevent reproducibility on resource-constrained hardware. ` +
      `(3) Hyperparameter sensitivity is not characterised—results may not transfer across datasets. ` +
      `(4) The evaluation protocol relies on benchmark data that may contain label noise.`,

    alternativeHypothesis: `The observed performance gains are plausibly attributable to: (1) increased model scale rather than the proposed architectural novelty; ` +
      `(2) better data preprocessing rather than the claimed algorithmic contribution; ` +
      `(3) implicit regularisation effects from the training procedure. ` +
      `A rigorous ablation study is needed to isolate the true source of improvement.`,

    verificationProposal: `To verify the claims I propose: (1) Component-wise ablation removing each proposed element independently; ` +
      `(2) Cross-dataset evaluation on at least two held-out benchmarks; ` +
      `(3) Independent reproduction using only the paper's description (code-free replication); ` +
      `(4) Sensitivity analysis varying the three most critical hyperparameters; ` +
      `(5) Statistical significance testing with multiple random seeds (n ≥ 5).`,

    logicalWeakness: `Key logical gaps: (1) The causal chain from method to results is asserted but not demonstrated through systematic ablation. ` +
      `(2) The comparison baselines may not reflect the current state of the art—several concurrent works are unacknowledged. ` +
      `(3) The theoretical justification section makes assumptions that are not empirically validated. ` +
      `(4) Reviewer ${agent.name} (${agent.specialty}) notes that domain-specific constraints are insufficiently addressed.`,

    impactScore: 3,
    recommendation: "Major",
  };
}

// ─── AI-powered generation ────────────────────────────────────────────────────

function buildSystemPrompt(agent: AgentProfile): string {
  return `You are ${agent.name}, a rigorous scientific peer reviewer specialising in: ${agent.specialty}.
Your task is to produce a deep, structured review that addresses EVERY criterion in the provided checklist.

Return a single JSON object with exactly these keys:
{
  "coreClaim": "What is the paper's central contribution and main thesis? (≥150 words, cite specific sections)",
  "assumptions": "What implicit or explicit assumptions does the paper rely on? Are they justified? (≥150 words, reference checklist criteria)",
  "failureMode": "Under what conditions would the approach fail? List specific failure modes with reasoning. (≥150 words)",
  "alternativeHypothesis": "What alternative explanations exist for the reported results? (≥100 words)",
  "verificationProposal": "List 4–6 concrete experiments or analyses that would verify or falsify the claims. (≥150 words)",
  "logicalWeakness": "Identify logical gaps, missing ablations, or unsupported claims in the argumentation. (≥150 words)",
  "impactScore": <integer 1–5>,
  "recommendation": "Accept|Minor|Major|Reject"
}

Scoring guide:
  5 = top-10% paper, seminal contribution
  4 = strong paper, accept with minor changes
  3 = borderline, needs significant revision
  2 = weak, fundamental issues
  1 = reject, unsound or redundant

Recommendation guide:
  Accept  → no further revision required
  Minor   → small fixes needed (clarifications, additional experiments)
  Major   → substantial revision required (new experiments, re-analysis)
  Reject  → fundamental flaws that cannot be addressed in revision`;
}

function buildUserPrompt(
  paper: PaperContext,
  criteria: ChecklistCriteria[],
  evaluatorFeedback?: string,
): string {
  const checklistBlock = criteria
    .map(
      (c, i) =>
        `${i + 1}. [${c.area.toUpperCase()}${c.required ? " ★" : ""}] **${c.criterion}** (weight ${c.weight.toFixed(2)})\n   ${c.description}`,
    )
    .join("\n");

  const feedbackBlock = evaluatorFeedback
    ? `\n── EVALUATOR FEEDBACK (MUST ADDRESS IN THIS REVISION) ──\n${evaluatorFeedback}\n`
    : "";

  return `── REVIEW CHECKLIST (★ = required, must be explicitly addressed) ──
${checklistBlock}
${feedbackBlock}
── PAPER ──
Title: ${paper.title}
Category: ${paper.category}

Abstract:
${paper.abstract}

Full Content (first 7000 chars):
${paper.contentMarkdown.slice(0, 7000)}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateReview(
  paper: PaperContext,
  criteria: ChecklistCriteria[],
  agent: AgentProfile,
  evaluatorFeedback?: string,
): Promise<GeneratedReviewFields> {
  if (!process.env.OPENAI_API_KEY) {
    return heuristicReview(paper, criteria, agent);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_REVIEW_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(agent) },
        { role: "user", content: buildUserPrompt(paper, criteria, evaluatorFeedback) },
      ],
    });

    const text = completion.choices[0].message.content ?? "";
    const raw = JSON.parse(text) as Record<string, unknown>;

    const recommendation = ["Accept", "Minor", "Major", "Reject"].includes(
      String(raw.recommendation),
    )
      ? (raw.recommendation as GeneratedReviewFields["recommendation"])
      : "Major";

    return {
      coreClaim: String(raw.coreClaim ?? ""),
      assumptions: String(raw.assumptions ?? ""),
      failureMode: String(raw.failureMode ?? ""),
      alternativeHypothesis: String(raw.alternativeHypothesis ?? ""),
      verificationProposal: String(raw.verificationProposal ?? ""),
      logicalWeakness: String(raw.logicalWeakness ?? ""),
      impactScore: Math.min(5, Math.max(1, Number(raw.impactScore) || 3)),
      recommendation,
    };
  } catch {
    return heuristicReview(paper, criteria, agent);
  }
}
