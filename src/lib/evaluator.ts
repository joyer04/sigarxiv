/**
 * Evaluator agent — scores a generated review against the planner's checklist.
 *
 * Scoring model:
 *   • Each criterion is scored 0–100 for coverage depth.
 *   • The weighted average across all criteria is the overall score.
 *   • A review passes when score ≥ PASS_THRESHOLD (70).
 *   • Required criteria that score below 50 are surfaced as missingCriteria
 *     and included in the feedback sent back to the Generator.
 *
 * Uses GPT when OPENAI_API_KEY is set; falls back to a length/completeness
 * heuristic otherwise.
 */

import OpenAI from "openai";
import type {
  ChecklistCriteria,
  EvaluationResult,
  GeneratedReviewFields,
} from "@/types/review-pipeline";

export const PASS_THRESHOLD = 70;

// ─── Heuristic fallback ───────────────────────────────────────────────────────

function heuristicEvaluate(
  review: GeneratedReviewFields,
  criteria: ChecklistCriteria[],
): EvaluationResult {
  const textFields: string[] = [
    review.coreClaim,
    review.assumptions,
    review.failureMode,
    review.alternativeHypothesis,
    review.verificationProposal,
    review.logicalWeakness,
  ];

  const totalLength = textFields.reduce((sum, f) => sum + f.length, 0);
  const filledCount = textFields.filter((f) => f.trim().length > 80).length;

  // 0–60 from completeness, 0–40 from total richness
  const completenessScore = Math.round((filledCount / 6) * 60);
  const richnessScore = Math.min(40, Math.round(totalLength / 150));
  const overall = completenessScore + richnessScore;

  const criterionScores: Record<string, number> = {};
  for (const c of criteria) {
    // Rough per-criterion score: slightly randomised around the overall score
    const jitter = Math.round((Math.random() - 0.5) * 20);
    criterionScores[c.id] = Math.min(100, Math.max(0, overall + jitter));
  }

  const missingCriteria = criteria
    .filter((c) => c.required && (criterionScores[c.id] ?? 0) < 50)
    .map((c) => c.criterion);

  const feedback =
    overall < PASS_THRESHOLD
      ? `Review quality insufficient (score ${overall}/100). Expand on: ${missingCriteria.length > 0 ? missingCriteria.join(", ") : "all sections need more depth"}. Each text field should be ≥150 words with specific evidence from the paper.`
      : `Review meets quality standards (score ${overall}/100).`;

  return { score: overall, passed: overall >= PASS_THRESHOLD, criterionScores, feedback, missingCriteria };
}

// ─── AI-powered evaluation ────────────────────────────────────────────────────

function buildEvalSystemPrompt(): string {
  return `You are a strict meta-reviewer evaluating whether a peer review adequately addresses all scientific review criteria.

For each criterion in the checklist, score the review 0–100:
  90–100: criterion addressed with specific evidence and deep analysis
  70–89:  criterion addressed but could be more specific
  50–69:  criterion mentioned superficially
  20–49:  criterion barely touched
  0–19:   criterion missing entirely

Return JSON:
{
  "criterionScores": { "<criterion_id>": <0-100>, ... },
  "feedback": "<specific guidance for the Generator to improve coverage of weak criteria>",
  "missingCriteria": ["<criterion name>", ...]
}

In "missingCriteria" list only required criteria with score < 50.
In "feedback" be directive: tell the Generator exactly what to add.`;
}

function buildEvalUserPrompt(
  review: GeneratedReviewFields,
  criteria: ChecklistCriteria[],
): string {
  const checklistBlock = criteria
    .map(
      (c) =>
        `[${c.id}] ${c.criterion} (area: ${c.area}, weight: ${c.weight}, required: ${c.required})\n  → ${c.description}`,
    )
    .join("\n");

  return `── CHECKLIST ──
${checklistBlock}

── REVIEW UNDER EVALUATION ──
coreClaim (${review.coreClaim.length} chars):
${review.coreClaim}

assumptions (${review.assumptions.length} chars):
${review.assumptions}

failureMode (${review.failureMode.length} chars):
${review.failureMode}

alternativeHypothesis (${review.alternativeHypothesis.length} chars):
${review.alternativeHypothesis}

verificationProposal (${review.verificationProposal.length} chars):
${review.verificationProposal}

logicalWeakness (${review.logicalWeakness.length} chars):
${review.logicalWeakness}

impactScore: ${review.impactScore}/5
recommendation: ${review.recommendation}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function evaluateReview(
  review: GeneratedReviewFields,
  criteria: ChecklistCriteria[],
): Promise<EvaluationResult> {
  if (!process.env.OPENAI_API_KEY) {
    return heuristicEvaluate(review, criteria);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_REVIEW_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildEvalSystemPrompt() },
        { role: "user", content: buildEvalUserPrompt(review, criteria) },
      ],
    });

    const text = completion.choices[0].message.content ?? "";
    const raw = JSON.parse(text) as {
      criterionScores?: Record<string, number>;
      feedback?: string;
      missingCriteria?: string[];
    };

    const criterionScores = raw.criterionScores ?? {};

    // Compute weighted overall score
    let totalWeight = 0;
    let weightedSum = 0;
    for (const c of criteria) {
      const s = criterionScores[c.id] ?? 50;
      weightedSum += s * c.weight;
      totalWeight += c.weight;
    }
    const score = Math.round(totalWeight > 0 ? weightedSum / totalWeight : 50);

    const missingCriteria = Array.isArray(raw.missingCriteria)
      ? (raw.missingCriteria as string[])
      : criteria.filter((c) => c.required && (criterionScores[c.id] ?? 0) < 50).map((c) => c.criterion);

    const feedback = String(raw.feedback ?? "");

    return {
      score,
      passed: score >= PASS_THRESHOLD,
      criterionScores,
      feedback,
      missingCriteria,
    };
  } catch {
    return heuristicEvaluate(review, criteria);
  }
}
