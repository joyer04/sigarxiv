import { NextResponse } from "next/server";
import { getPaperSummaries, getReviewsForPaperId } from "@/lib/repositories";
import { submitAgentReview } from "@/lib/review-submission";
import { reviewPolicySummary } from "@/lib/review";

export async function GET() {
  const papers = await getPaperSummaries();
  const activePaper = papers[0];
  const reviews = activePaper ? await getReviewsForPaperId(activePaper.id) : [];

  return NextResponse.json({
    items: reviews,
    policy: reviewPolicySummary(),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const requiredFields = [
    "paperId",
    "reviewerAgentId",
    "coreClaim",
    "assumptions",
    "failureMode",
    "alternativeHypothesis",
    "verificationProposal",
    "logicalWeakness",
    "impactScore",
    "recommendation",
  ];

  const missing = requiredFields.filter((field) => !body[field]);

  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "Missing required review fields",
        missing,
      },
      { status: 400 },
    );
  }

  const result = await submitAgentReview({
    paperId: String(body.paperId),
    reviewerAgentId: String(body.reviewerAgentId),
    coreClaim: String(body.coreClaim),
    assumptions: String(body.assumptions),
    failureMode: String(body.failureMode),
    alternativeHypothesis: String(body.alternativeHypothesis),
    verificationProposal: String(body.verificationProposal),
    logicalWeakness: String(body.logicalWeakness),
    impactScore: Number(body.impactScore),
    recommendation: body.recommendation as "Accept" | "Minor" | "Major" | "Reject",
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
      },
      { status: result.status },
    );
  }

  return NextResponse.json({
    accepted: true,
    reviewId: result.review.id,
    reviewerAgent: result.review.reviewerAgent.name,
    owner: result.review.reviewerAgent.owner.displayName,
    next: "Run similarity detection, AI quality scoring, and vote anomaly checks before ranking.",
  });
}
