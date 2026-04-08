import OpenAI from 'openai';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export interface ChecklistItem {
  id: string;
  category: 'methodology' | 'data' | 'statistics' | 'reproducibility' | 'literature' | 'ethics' | 'claims' | 'limitations';
  description: string;
  required: boolean;
  weight: number; // 0-1, sum should equal 1
}

export interface ReviewChecklistData {
  items: ChecklistItem[];
}

const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'methodology',
    category: 'methodology',
    description: 'Evaluate whether the research methodology is rigorous, well-defined, and appropriate for the stated research questions',
    required: true,
    weight: 0.15,
  },
  {
    id: 'data',
    category: 'data',
    description: 'Assess the reliability, validity, and representativeness of the data used',
    required: true,
    weight: 0.15,
  },
  {
    id: 'statistics',
    category: 'statistics',
    description: 'Verify statistical methods are appropriate, correctly applied, and results are properly interpreted',
    required: true,
    weight: 0.125,
  },
  {
    id: 'reproducibility',
    category: 'reproducibility',
    description: 'Check if experiments/analyses are sufficiently described to be reproducible',
    required: true,
    weight: 0.125,
  },
  {
    id: 'literature',
    category: 'literature',
    description: 'Evaluate coverage of relevant prior work and proper contextualization',
    required: true,
    weight: 0.125,
  },
  {
    id: 'ethics',
    category: 'ethics',
    description: 'Consider ethical implications including consent, bias, potential harms',
    required: true,
    weight: 0.1,
  },
  {
    id: 'claims',
    category: 'claims',
    description: 'Verify all claims are directly supported by presented evidence',
    required: true,
    weight: 0.1,
  },
  {
    id: 'limitations',
    category: 'limitations',
    description: 'Assess whether limitations are honestly acknowledged and discussed',
    required: true,
    weight: 0.075,
  },
];

interface OpenAIChecklistItem {
  id: string;
  category: string;
  description: string;
  required: boolean;
  weight: number;
}

const VALID_CATEGORIES = new Set<ChecklistItem['category']>([
  'methodology', 'data', 'statistics', 'reproducibility',
  'literature', 'ethics', 'claims', 'limitations',
]);

function isValidCategory(value: string): value is ChecklistItem['category'] {
  return VALID_CATEGORIES.has(value as ChecklistItem['category']);
}

function parseChecklistItems(raw: OpenAIChecklistItem[]): ChecklistItem[] {
  return raw
    .filter((item) => isValidCategory(item.category))
    .map((item) => ({
      id: String(item.id),
      category: item.category as ChecklistItem['category'],
      description: String(item.description),
      required: Boolean(item.required),
      weight: Number(item.weight),
    }));
}

export async function generateReviewChecklist(paperId: string): Promise<ReviewChecklistData> {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: { id: true, title: true, abstract: true, category: true },
  });

  if (!paper) {
    throw new Error(`Paper not found: ${paperId}`);
  }

  let items: ChecklistItem[] = DEFAULT_CHECKLIST_ITEMS;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });

    const prompt = `You are a scientific peer review expert. Generate a domain-specific review checklist for the following paper.

Paper Title: ${paper.title}
Category: ${paper.category}
Abstract: ${paper.abstract}

Generate exactly 8 checklist items, one for each of these categories:
methodology, data, statistics, reproducibility, literature, ethics, claims, limitations

Each item should have a description tailored to the specific domain and research approach of this paper.
The weights must sum to 1.0.

Respond with a JSON object in this exact format:
{
  "items": [
    {
      "id": "methodology",
      "category": "methodology",
      "description": "<domain-specific description>",
      "required": true,
      "weight": 0.15
    },
    ...
  ]
}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content) as { items: OpenAIChecklistItem[] };
      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        const parsedItems = parseChecklistItems(parsed.items);
        if (parsedItems.length === 8) {
          items = parsedItems;
        }
      }
    }
  } catch {
    // Fall back to default items if OpenAI fails
    items = DEFAULT_CHECKLIST_ITEMS;
  }

  const checklistData: ReviewChecklistData = { items };

  const itemsJson = checklistData as unknown as Prisma.InputJsonValue;

  await prisma.reviewChecklist.upsert({
    where: { paperId },
    create: {
      paperId,
      items: itemsJson,
    },
    update: {
      items: itemsJson,
    },
  });

  return checklistData;
}
