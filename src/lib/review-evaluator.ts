import OpenAI from 'openai';
import { prisma } from './prisma';
import type { GeneratedReview } from './review-generator';
import type { ReviewChecklistData } from './review-planner';

export interface ItemScore {
  itemId: string;
  score: number;
  feedback: string;
}

export interface EvaluationResult {
  score: number;        // 0-100
  passed: boolean;      // score >= 70
  itemScores: ItemScore[];
  overallFeedback: string;
  retryCount: number;
}

const PASS_THRESHOLD = 70;

function buildReviewText(review: GeneratedReview): string {
  return [
    `Core Claim: ${review.coreClaim}`,
    `Assumptions: ${review.assumptions}`,
    `Failure Mode: ${review.failureMode}`,
    `Alternative Hypothesis: ${review.alternativeHypothesis}`,
    `Verification Proposal: ${review.verificationProposal}`,
    `Logical Weakness: ${review.logicalWeakness}`,
    `Impact Score: ${review.impactScore}/5`,
    `Recommendation: ${review.recommendation}`,
  ].join('\n\n');
}

function heuristicEvaluate(
  review: GeneratedReview,
  checklist: ReviewChecklistData,
  retryCount: number,
): EvaluationResult {
  const reviewText = buildReviewText(review);
  const wordCount = reviewText.split(/\s+/).length;

  const itemScores: ItemScore[] = checklist.items.map((item) => {
    const keywords: Record<string, string[]> = {
      methodology: ['method', 'approach', 'design', 'protocol', 'procedure', 'rigorous'],
      data: ['data', 'dataset', 'sample', 'collection', 'reliability', 'valid'],
      statistics: ['statistic', 'p-value', 'significance', 'confidence', 'model', 'analysis'],
      reproducibility: ['reproduc', 'replicate', 'code', 'open', 'transparent', 'available'],
      literature: ['literature', 'prior', 'citation', 'reference', 'related', 'existing'],
      ethics: ['ethic', 'bias', 'harm', 'consent', 'privacy', 'fair'],
      claims: ['claim', 'evidence', 'support', 'consistent', 'justify', 'demonstrate'],
      limitations: ['limitation', 'constrain', 'future', 'weakness', 'caveat', 'acknowledge'],
    };

    const words = keywords[item.category] ?? [];
    const lowerText = reviewText.toLowerCase();
    const matches = words.filter((w) => lowerText.includes(w)).length;
    const coverageScore = Math.min(100, (matches / Math.max(words.length, 1)) * 100);

    return {
      itemId: item.id,
      score: Math.round(coverageScore),
      feedback: matches > 0
        ? `Review addresses ${item.category} with ${matches} relevant term(s).`
        : `Review lacks coverage of ${item.category}.`,
    };
  });

  const weightedScore = checklist.items.reduce((acc, item, idx) => {
    return acc + (itemScores[idx]?.score ?? 0) * item.weight;
  }, 0);

  const lengthBonus = Math.min(10, Math.floor(wordCount / 50));
  const totalScore = Math.min(100, Math.round(weightedScore + lengthBonus));

  return {
    score: totalScore,
    passed: totalScore >= PASS_THRESHOLD,
    itemScores,
    overallFeedback: totalScore >= PASS_THRESHOLD
      ? 'Review meets quality threshold via heuristic evaluation.'
      : `Review scored ${totalScore}/100 (threshold: ${PASS_THRESHOLD}). Insufficient coverage of checklist items.`,
    retryCount,
  };
}

interface RawItemScore {
  itemId: unknown;
  score: unknown;
  feedback: unknown;
}

interface RawEvaluation {
  totalScore: unknown;
  itemScores: unknown;
  overallFeedback: unknown;
}

export async function evaluateReview(
  review: GeneratedReview,
  checklist: ReviewChecklistData,
  retryCount: number,
): Promise<EvaluationResult> {
  const reviewText = buildReviewText(review);

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });

    const checklistDescription = checklist.items
      .map((item) => `- ${item.id} (weight: ${item.weight}): ${item.description}`)
      .join('\n');

    const prompt = `You are a scientific review quality evaluator. Assess whether the following peer review adequately addresses all checklist items.

CHECKLIST ITEMS:
${checklistDescription}

REVIEW TEXT:
${reviewText}

Evaluate each checklist item (0-100) based on how well the review addresses it. Then compute a weighted total score.

Respond with a JSON object in this exact format:
{
  "totalScore": <number 0-100>,
  "itemScores": [
    { "itemId": "<item id>", "score": <0-100>, "feedback": "<one sentence>" }
  ],
  "overallFeedback": "<2-3 sentences>"
}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    const parsed = JSON.parse(content) as RawEvaluation;
    const totalScore = Number(parsed.totalScore);

    if (!Number.isFinite(totalScore) || totalScore < 0 || totalScore > 100) {
      throw new Error(`Invalid totalScore: ${parsed.totalScore}`);
    }

    const rawItemScores = Array.isArray(parsed.itemScores)
      ? (parsed.itemScores as RawItemScore[])
      : [];

    const itemScores: ItemScore[] = rawItemScores.map((raw) => ({
      itemId: String(raw.itemId ?? ''),
      score: Math.min(100, Math.max(0, Number(raw.score ?? 0))),
      feedback: String(raw.feedback ?? ''),
    }));

    return {
      score: Math.round(totalScore),
      passed: totalScore >= PASS_THRESHOLD,
      itemScores,
      overallFeedback: String(parsed.overallFeedback ?? ''),
      retryCount,
    };
  } catch {
    return heuristicEvaluate(review, checklist, retryCount);
  }
}

export async function updateReviewQualityScore(
  reviewId: string,
  score: number,
): Promise<void> {
  await prisma.review.update({
    where: { id: reviewId },
    data: { qualityScore: score },
  });
}
