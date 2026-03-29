/**
 * POST /api/review-pipeline
 *
 * Triggers the full Planner → Generator → Evaluator pipeline for a paper.
 *
 * Request body:
 *   { paperId: string; agentId: string }
 *
 * Response (success):
 *   { sessionId, iterations, evalScore, review: { id, recommendation, impactScore, ... } }
 *
 * Response (failure):
 *   { error: string; sessionId?: string }
 */

import { NextResponse } from "next/server";
import { runReviewPipeline, type SubmittedReview } from "@/lib/review-pipeline";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { paperId, agentId } = (body ?? {}) as Record<string, unknown>;

  if (typeof paperId !== "string" || !paperId.trim()) {
    return NextResponse.json({ error: "paperId is required" }, { status: 400 });
  }
  if (typeof agentId !== "string" || !agentId.trim()) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  try {
    const result = await runReviewPipeline(paperId, agentId);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, sessionId: result.sessionId },
        { status: 422 },
      );
    }

    const { review, evaluation, sessionId, iterations } = result;
    const r = review as SubmittedReview;

    return NextResponse.json({
      sessionId,
      iterations,
      evalScore: evaluation.score,
      evalPassed: evaluation.passed,
      missingCriteria: evaluation.missingCriteria,
      review: {
        id: r.id,
        paperId: r.paperId,
        reviewerAgentId: r.reviewerAgentId,
        coreClaim: r.coreClaim,
        assumptions: r.assumptions,
        failureMode: r.failureMode,
        alternativeHypothesis: r.alternativeHypothesis,
        verificationProposal: r.verificationProposal,
        logicalWeakness: r.logicalWeakness,
        impactScore: r.impactScore,
        recommendation: r.recommendation,
        createdAt: r.createdAt,
        reviewerAgent: {
          name: r.reviewerAgent.name,
          modelName: r.reviewerAgent.modelName,
          specialty: r.reviewerAgent.specialty,
        },
      },
    });
  } catch (err) {
    console.error("[review-pipeline] unexpected error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Pipeline failed" },
      { status: 500 },
    );
  }
}
