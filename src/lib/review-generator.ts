import OpenAI from 'openai';
import { prisma } from './prisma';
import type { ChecklistItem, ReviewChecklistData } from './review-planner';

export type { ChecklistItem, ReviewChecklistData };

export interface GeneratedReview {
  coreClaim: string;
  assumptions: string;
  failureMode: string;
  alternativeHypothesis: string;
  verificationProposal: string;
  logicalWeakness: string;
  impactScore: number; // 1-5
  recommendation: 'ACCEPT' | 'MINOR' | 'MAJOR' | 'REJECT';
}

const VALID_RECOMMENDATIONS = new Set<GeneratedReview['recommendation']>([
  'ACCEPT', 'MINOR', 'MAJOR', 'REJECT',
]);

function isValidRecommendation(value: string): value is GeneratedReview['recommendation'] {
  return VALID_RECOMMENDATIONS.has(value as GeneratedReview['recommendation']);
}

interface RawGeneratedReview {
  coreClaim: unknown;
  assumptions: unknown;
  failureMode: unknown;
  alternativeHypothesis: unknown;
  verificationProposal: unknown;
  logicalWeakness: unknown;
  impactScore: unknown;
  recommendation: unknown;
}

function parseGeneratedReview(raw: RawGeneratedReview): GeneratedReview {
  const recommendation = String(raw.recommendation ?? '').toUpperCase();
  if (!isValidRecommendation(recommendation)) {
    throw new Error(`Invalid recommendation value: ${recommendation}`);
  }

  const impactScore = Number(raw.impactScore);
  if (!Number.isInteger(impactScore) || impactScore < 1 || impactScore > 5) {
    throw new Error(`Invalid impactScore: ${raw.impactScore}. Must be an integer between 1 and 5.`);
  }

  return {
    coreClaim: String(raw.coreClaim ?? ''),
    assumptions: String(raw.assumptions ?? ''),
    failureMode: String(raw.failureMode ?? ''),
    alternativeHypothesis: String(raw.alternativeHypothesis ?? ''),
    verificationProposal: String(raw.verificationProposal ?? ''),
    logicalWeakness: String(raw.logicalWeakness ?? ''),
    impactScore,
    recommendation,
  };
}

function formatChecklistForPrompt(items: ChecklistItem[]): string {
  return items
    .map((item, index) => `${index + 1}. [${item.category.toUpperCase()}] ${item.description}`)
    .join('\n');
}

export async function generateReview(
  paperId: string,
  agentId: string,
  checklist: ReviewChecklistData,
): Promise<GeneratedReview> {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: { id: true, title: true, abstract: true, category: true },
  });

  if (!paper) {
    throw new Error(`Paper not found: ${paperId}`);
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, name: true, modelName: true },
  });

  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });

  const systemPrompt = `You are a rigorous scientific peer reviewer named ${agent.name}. You must evaluate this paper by addressing each checklist item in your review. Provide an honest, thorough, and constructive assessment. Your response must be a valid JSON object.`;

  const userPrompt = `Please review the following paper and provide a structured evaluation.

Paper Title: ${paper.title}
Category: ${paper.category}
Abstract: ${paper.abstract}

Review Checklist (address each item in your evaluation):
${formatChecklistForPrompt(checklist.items)}

Provide your review as a JSON object with the following fields:
- coreClaim: The paper's main contribution or central claim (1-2 sentences)
- assumptions: Key assumptions the paper relies on, including any that may be questionable
- failureMode: How the paper's conclusions could fail or be wrong
- alternativeHypothesis: Plausible alternative explanations for the presented findings
- verificationProposal: Concrete experiments or analyses that would strengthen or verify the claims
- logicalWeakness: The most significant logical gap or weakness in the argumentation
- impactScore: Integer from 1 (minimal) to 5 (transformative) rating scientific impact
- recommendation: One of ACCEPT, MINOR, MAJOR, or REJECT

Ensure your evaluation addresses all 8 checklist items across the review fields.`;

  let rawContent: string;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response');
    }
    rawContent = content;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate review via OpenAI: ${message}`);
  }

  let parsed: RawGeneratedReview;
  try {
    parsed = JSON.parse(rawContent) as RawGeneratedReview;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse OpenAI JSON response: ${message}`);
  }

  return parseGeneratedReview(parsed);
}
