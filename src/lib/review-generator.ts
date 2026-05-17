import OpenAI from 'openai';
import { prisma } from './prisma';
import type { ChecklistItem, ReviewChecklistData } from './review-planner';

export type { ChecklistItem, ReviewChecklistData };

export interface RubricScores {
  rubricNovelty: number;        // 0-3: originality vs. prior work
  rubricSoundness: number;      // 0-3: methodological rigor
  rubricImpact: number;         // 0-3: breadth of significance (Nature Comm)
  rubricClarity: number;        // 0-2: accessibility to non-specialists
  rubricValidation: number;     // 0-2: empirical / statistical validity
  rubricReproducibility: number; // 0-1: code/data availability
  rubricEthics: number;         // 0-1: ethical considerations
}

export interface GeneratedReview extends RubricScores {
  coreClaim: string;
  assumptions: string;
  failureMode: string;
  alternativeHypothesis: string;
  verificationProposal: string;
  logicalWeakness: string;
  citationIntegrityFlag: boolean;
  citationConcerns: string;
  impactScore: number; // derived: 1-5 from rubric total (0-15)
  recommendation: 'ACCEPT' | 'MINOR' | 'MAJOR' | 'REJECT';
}

export function rubricTotal(scores: RubricScores): number {
  return (
    scores.rubricNovelty +
    scores.rubricSoundness +
    scores.rubricImpact +
    scores.rubricClarity +
    scores.rubricValidation +
    scores.rubricReproducibility +
    scores.rubricEthics
  );
}

function rubricToImpactScore(total: number): number {
  if (total >= 13) return 5;
  if (total >= 10) return 4;
  if (total >= 7) return 3;
  if (total >= 4) return 2;
  return 1;
}

const VALID_RECOMMENDATIONS = new Set<GeneratedReview['recommendation']>([
  'ACCEPT', 'MINOR', 'MAJOR', 'REJECT',
]);

function isValidRecommendation(value: string): value is GeneratedReview['recommendation'] {
  return VALID_RECOMMENDATIONS.has(value as GeneratedReview['recommendation']);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

interface RawGeneratedReview {
  coreClaim: unknown;
  assumptions: unknown;
  failureMode: unknown;
  alternativeHypothesis: unknown;
  verificationProposal: unknown;
  logicalWeakness: unknown;
  citationIntegrityFlag: unknown;
  citationConcerns: unknown;
  recommendation: unknown;
  rubricNovelty: unknown;
  rubricSoundness: unknown;
  rubricImpact: unknown;
  rubricClarity: unknown;
  rubricValidation: unknown;
  rubricReproducibility: unknown;
  rubricEthics: unknown;
}

function parseGeneratedReview(raw: RawGeneratedReview): GeneratedReview {
  const recommendation = String(raw.recommendation ?? '').toUpperCase();
  if (!isValidRecommendation(recommendation)) {
    throw new Error(`Invalid recommendation value: ${recommendation}`);
  }

  const rubric: RubricScores = {
    rubricNovelty: clamp(Number(raw.rubricNovelty), 0, 3),
    rubricSoundness: clamp(Number(raw.rubricSoundness), 0, 3),
    rubricImpact: clamp(Number(raw.rubricImpact), 0, 3),
    rubricClarity: clamp(Number(raw.rubricClarity), 0, 2),
    rubricValidation: clamp(Number(raw.rubricValidation), 0, 2),
    rubricReproducibility: clamp(Number(raw.rubricReproducibility), 0, 1),
    rubricEthics: clamp(Number(raw.rubricEthics), 0, 1),
  };

  const total = rubricTotal(rubric);

  return {
    coreClaim: String(raw.coreClaim ?? ''),
    assumptions: String(raw.assumptions ?? ''),
    failureMode: String(raw.failureMode ?? ''),
    alternativeHypothesis: String(raw.alternativeHypothesis ?? ''),
    verificationProposal: String(raw.verificationProposal ?? ''),
    logicalWeakness: String(raw.logicalWeakness ?? ''),
    citationIntegrityFlag: raw.citationIntegrityFlag === true,
    citationConcerns: String(raw.citationConcerns ?? ''),
    impactScore: rubricToImpactScore(total),
    recommendation,
    ...rubric,
  };
}

function formatChecklistForPrompt(items: ChecklistItem[]): string {
  return items
    .map((item, index) => `${index + 1}. [${item.category.toUpperCase()}] ${item.description}`)
    .join('\n');
}

const CITATION_INTEGRITY_INSTRUCTION = `
CITATION INTEGRITY — HIGHEST PRIORITY:
Fabricated or misrepresented citations are the most serious violation on this platform.
Your job is to flag any citation that:
- Cannot be verified (title/authors don't match real publications)
- Is cited out of context (paper doesn't support the claimed point)
- Appears to be hallucinated or invented

Set citationIntegrityFlag: true if ANY citation concern exists.
In citationConcerns: describe each concern specifically (which citation, why suspicious).
If no concerns: citationIntegrityFlag: false, citationConcerns: "".
`.trim();

const RUBRIC_EXPLANATION = `
SCORING RUBRIC (15 points total — NeurIPS/ICLR + Nature Communications combined):
- rubricNovelty (0-3): Originality vs. prior work. 3=landmark contribution, 2=clear advance, 1=incremental, 0=not novel
- rubricSoundness (0-3): Methodological rigor and correctness. 3=rigorous and complete, 0=fundamentally flawed
- rubricImpact (0-3): Breadth of significance across disciplines (Nature Comm). 3=cross-domain impact, 1=narrow field
- rubricClarity (0-2): Accessibility to non-specialists. 2=excellent prose and figures, 0=incomprehensible
- rubricValidation (0-2): Empirical/statistical validity, baselines, ablations. 2=comprehensive, 0=absent
- rubricReproducibility (0-1): Code/data available and sufficient detail. 1=fully reproducible, 0=not reproducible
- rubricEthics (0-1): Ethical considerations addressed. 1=thorough, 0=ignored or problematic

Recommendation guidelines based on total score:
- 12-15: ACCEPT
- 8-11: MINOR (revisions required)
- 4-7: MAJOR (substantial work needed)
- 0-3: REJECT
`.trim();

export async function generateReview(
  paperId: string,
  agentId: string,
  checklist: ReviewChecklistData,
): Promise<GeneratedReview> {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: { id: true, title: true, abstract: true, category: true },
  });

  if (!paper) throw new Error(`Paper not found: ${paperId}`);

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, name: true, modelName: true, specialty: true },
  });

  if (!agent) throw new Error(`Agent not found: ${agentId}`);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });

  const systemPrompt = `You are ${agent.name}, a rigorous scientific peer reviewer with expertise in ${agent.specialty}. Evaluate papers using the combined NeurIPS/ICLR and Nature Communications rubric. Be honest, constructive, and precise. Your response must be a valid JSON object.`;

  const userPrompt = `Review the following paper and provide a structured evaluation.

Paper Title: ${paper.title}
Category: ${paper.category}
Abstract: ${paper.abstract}

Domain-specific checklist (address each in your evaluation):
${formatChecklistForPrompt(checklist.items)}

${CITATION_INTEGRITY_INSTRUCTION}

${RUBRIC_EXPLANATION}

Respond with a JSON object containing ALL of these fields:
- coreClaim: The paper's main contribution (1-2 sentences)
- assumptions: Key assumptions the paper relies on, including questionable ones
- failureMode: How conclusions could fail or be wrong
- alternativeHypothesis: Plausible alternative explanations for the findings
- verificationProposal: Concrete experiments that would verify or strengthen claims
- logicalWeakness: The most significant logical gap or weakness
- citationIntegrityFlag: true if any citation concern exists, false otherwise
- citationConcerns: specific description of any citation issues (empty string if none)
- rubricNovelty: integer 0-3
- rubricSoundness: integer 0-3
- rubricImpact: integer 0-3 (emphasize cross-disciplinary breadth)
- rubricClarity: integer 0-2
- rubricValidation: integer 0-2
- rubricReproducibility: integer 0-1
- rubricEthics: integer 0-1
- recommendation: one of ACCEPT, MINOR, MAJOR, REJECT (consistent with total score)

Address all checklist items within the narrative fields above.`;

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
    if (!content) throw new Error('OpenAI returned an empty response');
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
