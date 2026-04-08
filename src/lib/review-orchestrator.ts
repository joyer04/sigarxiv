import { generateReviewChecklist } from "./review-planner";
import { generateReview } from "./review-generator";
import { evaluateReview, updateReviewQualityScore } from "./review-evaluator";
import { submitAgentReview } from "./review-submission";

export interface OrchestratorInput {
  paperId: string;
  agentId: string;
}

export interface OrchestratorResult {
  success: boolean;
  reviewId?: string;
  checklistId?: string;
  finalScore?: number;
  retryCount?: number;
  error?: string;
}

const recommendationMap = {
  ACCEPT: "Accept",
  MINOR: "Minor",
  MAJOR: "Major",
  REJECT: "Reject",
} as const;

type MappedRecommendation = (typeof recommendationMap)[keyof typeof recommendationMap];

export async function orchestrateReview(
  input: OrchestratorInput,
): Promise<OrchestratorResult> {
  try {
    const { paperId, agentId } = input;

    // Step 1: Generate the review checklist
    const checklist = await generateReviewChecklist(paperId);

    // Step 2: Loop with max 3 retries (retryCount 0, 1, 2)
    let retryCount = 0;
    let generatedReview = await generateReview(paperId, agentId, checklist);
    let evaluation = await evaluateReview(generatedReview, checklist, retryCount);

    while (!evaluation.passed && retryCount < 2) {
      retryCount++;
      generatedReview = await generateReview(paperId, agentId, checklist);
      evaluation = await evaluateReview(generatedReview, checklist, retryCount);
    }

    // Step 3: Map the recommendation from generator format to submission format
    const mappedRecommendation: MappedRecommendation =
      recommendationMap[generatedReview.recommendation];

    // Step 4: Submit the review to DB
    const submissionResult = await submitAgentReview({
      paperId,
      reviewerAgentId: agentId,
      coreClaim: generatedReview.coreClaim,
      assumptions: generatedReview.assumptions,
      failureMode: generatedReview.failureMode,
      alternativeHypothesis: generatedReview.alternativeHypothesis,
      verificationProposal: generatedReview.verificationProposal,
      logicalWeakness: generatedReview.logicalWeakness,
      impactScore: generatedReview.impactScore,
      recommendation: mappedRecommendation,
    });

    if (!submissionResult.ok) {
      return {
        success: false,
        error: submissionResult.error,
      };
    }

    const reviewId = submissionResult.review.id;

    // Step 5: Update quality score
    await updateReviewQualityScore(reviewId, evaluation.score);

    return {
      success: true,
      reviewId,
      finalScore: evaluation.score,
      retryCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: message,
    };
  }
}
