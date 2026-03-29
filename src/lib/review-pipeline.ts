/**
 * Review pipeline orchestrator — runs the full Planner → Generator → Evaluator loop.
 *
 * Flow:
 *   1. PLANNING   — Planner generates a scientific checklist for the paper.
 *   2. GENERATING — Generator produces a structured review using the checklist.
 *   3. EVALUATING — Evaluator scores the review against the checklist.
 *      • If score ≥ 70 → submit the review and mark session COMPLETE.
 *      • If score < 70 and iterations < MAX_ITERATIONS → feed evaluator
 *        feedback back to Generator and repeat from step 2.
 *      • If MAX_ITERATIONS reached without passing → submit the best attempt
 *        and mark session COMPLETE (the review is flagged with the low score).
 *
 * All intermediate state is persisted to AgentReviewSession so the caller can
 * inspect progress or resume in future.
 */

import { type Review, type Agent, type User, type Team } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { planReviewChecklist } from "@/lib/planner";
import { generateReview } from "@/lib/generator";
import { evaluateReview } from "@/lib/evaluator";
import { submitAgentReview } from "@/lib/review-submission";
import type { ChecklistCriteria, EvaluationResult } from "@/types/review-pipeline";

const MAX_ITERATIONS = 3;

// ─── Return type ─────────────────────────────────────────────────────────────

export type SubmittedReview = Review & {
  reviewerAgent: Agent & { owner: User; team: Team | null };
};

type PipelineSuccess = {
  ok: true;
  review: SubmittedReview;
  evaluation: EvaluationResult;
  sessionId: string;
  iterations: number;
};

type PipelineFailure = {
  ok: false;
  error: string;
  sessionId: string;
};

export type PipelineResult = PipelineSuccess | PipelineFailure;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function updateSession(
  id: string,
  data: Parameters<typeof prisma.agentReviewSession.update>[0]["data"],
) {
  return prisma.agentReviewSession.update({ where: { id }, data });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function runReviewPipeline(
  paperId: string,
  agentId: string,
): Promise<PipelineResult> {
  // ── Preflight checks ──────────────────────────────────────────────────────
  const [paper, agent] = await Promise.all([
    prisma.paper.findUnique({
      where: { id: paperId },
      select: { title: true, abstract: true, category: true, contentMarkdown: true, status: true },
    }),
    prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, name: true, modelName: true, specialty: true, status: true, ownerId: true },
    }),
  ]);

  if (!paper) return fail("(pre-session)", `Paper not found: ${paperId}`);
  if (!agent) return fail("(pre-session)", `Agent not found: ${agentId}`);
  if (agent.status !== "ACTIVE") return fail("(pre-session)", "Agent is suspended");

  // Check for duplicate review before creating session
  const duplicate = await prisma.review.findUnique({
    where: { paperId_reviewerAgentId: { paperId, reviewerAgentId: agentId } },
  });
  if (duplicate) return fail("(pre-session)", "This agent already has a review for this paper");

  // ── Create session record ─────────────────────────────────────────────────
  const session = await prisma.agentReviewSession.create({
    data: { paperId, agentId, status: "PLANNING", iterations: 0 },
  });

  // ── Step 1: Planner ───────────────────────────────────────────────────────
  let checklistId: string;
  let criteria: ChecklistCriteria[];

  try {
    const planned = await planReviewChecklist(paperId);
    checklistId = planned.checklistId;
    criteria = planned.criteria;

    await updateSession(session.id, { checklistId, status: "GENERATING" });
  } catch (err) {
    await updateSession(session.id, {
      status: "FAILED",
      evalFeedback: `Planner error: ${String(err)}`,
    });
    return { ok: false, error: `Planner failed: ${String(err)}`, sessionId: session.id };
  }

  // ── Steps 2+3: Generator ↔ Evaluator loop ─────────────────────────────────
  let iterations = 0;
  let lastFeedback: string | undefined;
  let lastEvaluation: EvaluationResult | undefined;

  const paperCtx = {
    title: paper.title,
    abstract: paper.abstract,
    contentMarkdown: paper.contentMarkdown,
    category: paper.category,
  };
  const agentProfile = {
    name: agent.name,
    modelName: agent.modelName,
    specialty: agent.specialty,
  };

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    // Generate
    await updateSession(session.id, { status: "GENERATING", iterations });

    const reviewFields = await generateReview(paperCtx, criteria, agentProfile, lastFeedback);

    // Evaluate
    await updateSession(session.id, { status: "EVALUATING" });

    const evaluation = await evaluateReview(reviewFields, criteria);
    lastEvaluation = evaluation;

    // Persist intermediate eval score/feedback
    await updateSession(session.id, {
      evalScore: evaluation.score,
      evalFeedback: evaluation.feedback,
    });

    if (evaluation.passed || iterations === MAX_ITERATIONS) {
      // ── Submit the review ──────────────────────────────────────────────────
      const submitResult = await submitAgentReview({
        paperId,
        reviewerAgentId: agentId,
        ...reviewFields,
      });

      if (!submitResult.ok) {
        await updateSession(session.id, {
          status: "FAILED",
          evalFeedback: `Submit error (eval score ${evaluation.score}): ${submitResult.error}`,
        });
        return { ok: false, error: submitResult.error, sessionId: session.id };
      }

      await updateSession(session.id, {
        status: "COMPLETE",
        reviewId: submitResult.review.id,
        evalScore: evaluation.score,
        evalFeedback: evaluation.feedback,
      });

      return {
        ok: true as const,
        review: submitResult.review as SubmittedReview,
        evaluation,
        sessionId: session.id,
        iterations,
      };
    }

    // Not passed, send feedback to next Generator iteration
    lastFeedback = evaluation.feedback;
  }

  // TypeScript exhaustiveness guard (unreachable in practice)
  await updateSession(session.id, { status: "FAILED", evalFeedback: "Unexpected loop exit" });
  return { ok: false, error: "Unexpected pipeline loop exit", sessionId: session.id };
}

function fail(sessionId: string, error: string): PipelineFailure {
  return { ok: false, error, sessionId };
}
