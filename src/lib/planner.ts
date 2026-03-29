/**
 * Planner agent — generates a domain-specific scientific review checklist for a paper.
 *
 * If OPENAI_API_KEY is set the planner asks GPT to produce tailored criteria;
 * otherwise it falls back to a comprehensive static checklist that covers every
 * major review dimension (methodology, data, statistics, reproducibility,
 * literature, ethics, domain-specific).
 */

import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import type { ChecklistCriteria } from "@/types/review-pipeline";

// ─── Static fallback checklist ───────────────────────────────────────────────

function buildDefaultCriteria(category: string): ChecklistCriteria[] {
  const base: ChecklistCriteria[] = [
    // Methodology
    {
      id: "meth_1",
      area: "methodology",
      criterion: "Research Design Soundness",
      description:
        "Is the research design appropriate for the stated questions? Are control conditions, baselines, and comparisons properly specified?",
      weight: 0.12,
      required: true,
    },
    {
      id: "meth_2",
      area: "methodology",
      criterion: "Experimental Validity",
      description:
        "Do the experiments actually test the claimed hypotheses? Are confounds identified and controlled?",
      weight: 0.1,
      required: true,
    },
    {
      id: "meth_3",
      area: "methodology",
      criterion: "Scope and Generalisability",
      description:
        "Are the conclusions appropriately scoped? Does the paper over-claim beyond what the experiments support?",
      weight: 0.08,
      required: true,
    },
    // Data
    {
      id: "data_1",
      area: "data",
      criterion: "Dataset Quality and Documentation",
      description:
        "Are datasets described in sufficient detail (size, provenance, splits)? Are known biases or limitations acknowledged?",
      weight: 0.09,
      required: true,
    },
    {
      id: "data_2",
      area: "data",
      criterion: "Data Collection Reliability",
      description:
        "Are collection protocols reliable and consistent? Is measurement error or annotation noise addressed?",
      weight: 0.07,
      required: true,
    },
    // Statistics
    {
      id: "stat_1",
      area: "statistics",
      criterion: "Statistical Method Appropriateness",
      description:
        "Are the chosen statistical tests appropriate for the data distribution and research question?",
      weight: 0.1,
      required: true,
    },
    {
      id: "stat_2",
      area: "statistics",
      criterion: "Effect Sizes and Uncertainty",
      description:
        "Are effect sizes, confidence intervals, or credible intervals reported alongside p-values? Is significance interpreted correctly?",
      weight: 0.08,
      required: true,
    },
    // Reproducibility
    {
      id: "repro_1",
      area: "reproducibility",
      criterion: "Code and Data Availability",
      description:
        "Are code and data publicly available or is there a credible commitment to release? Is the method described in sufficient detail to re-implement?",
      weight: 0.09,
      required: true,
    },
    {
      id: "repro_2",
      area: "reproducibility",
      criterion: "Computational Reproducibility",
      description:
        "Are software environments, random seeds, and hardware specs specified? Are results deterministic?",
      weight: 0.06,
      required: false,
    },
    // Literature
    {
      id: "lit_1",
      area: "literature",
      criterion: "Related Work Coverage",
      description:
        "Does the paper adequately survey the literature? Are obvious prior works and competing approaches cited?",
      weight: 0.07,
      required: true,
    },
    {
      id: "lit_2",
      area: "literature",
      criterion: "Novelty Positioning",
      description:
        "Is the contribution clearly differentiated from prior work? Is the delta of novelty accurately characterised?",
      weight: 0.06,
      required: true,
    },
    // Ethics
    {
      id: "eth_1",
      area: "ethics",
      criterion: "Ethical Review and Compliance",
      description:
        "Is IRB/ethics board approval obtained where required? Are participant consent and privacy addressed?",
      weight: 0.04,
      required: false,
    },
    {
      id: "eth_2",
      area: "ethics",
      criterion: "Broader Impact and Dual-Use Risk",
      description:
        "Does the paper discuss potential negative societal impacts, misuse scenarios, or environmental costs?",
      weight: 0.04,
      required: false,
    },
  ];

  // Inject a domain-specific criterion based on the paper's category
  const domainCriterion = buildDomainCriterion(category);
  if (domainCriterion) base.push(domainCriterion);

  return base;
}

function buildDomainCriterion(category: string): ChecklistCriteria | null {
  const cat = category.toLowerCase();

  if (cat.includes("machine learning") || cat.includes("deep learning") || cat.includes("neural")) {
    return {
      id: "dom_ml",
      area: "domain_specific",
      criterion: "Model Architecture and Training Rigour",
      description:
        "Are hyperparameter choices justified? Is the training procedure (early stopping, regularisation, learning rate schedule) documented? Are multiple random seeds used?",
      weight: 0.1,
      required: true,
    };
  }
  if (cat.includes("nlp") || cat.includes("language")) {
    return {
      id: "dom_nlp",
      area: "domain_specific",
      criterion: "Benchmark and Evaluation Protocol",
      description:
        "Are benchmark splits used correctly (no test-set leakage)? Are human evaluation protocols described?",
      weight: 0.1,
      required: true,
    };
  }
  if (cat.includes("bio") || cat.includes("clin") || cat.includes("med")) {
    return {
      id: "dom_bio",
      area: "domain_specific",
      criterion: "Biological/Clinical Validity",
      description:
        "Do findings replicate across independent cohorts or model organisms? Are clinical effect sizes meaningful?",
      weight: 0.1,
      required: true,
    };
  }
  if (cat.includes("phys") || cat.includes("chem")) {
    return {
      id: "dom_phys",
      area: "domain_specific",
      criterion: "Physical/Chemical Plausibility",
      description:
        "Do results respect known physical or chemical constraints? Are calibration and systematic uncertainties characterised?",
      weight: 0.1,
      required: true,
    };
  }

  // Generic domain criterion
  return {
    id: "dom_generic",
    area: "domain_specific",
    criterion: "Domain Standards Compliance",
    description:
      "Does the work adhere to accepted methodological standards for its specific sub-field?",
    weight: 0.1,
    required: false,
  };
}

// ─── AI-augmented checklist ───────────────────────────────────────────────────

async function generateAIChecklist(paper: {
  title: string;
  abstract: string;
  category: string;
}): Promise<ChecklistCriteria[]> {
  if (!process.env.OPENAI_API_KEY) {
    return buildDefaultCriteria(paper.category);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_REVIEW_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a scientific peer-review planner. Given a paper's metadata, generate a domain-specific review checklist as a JSON object with this shape:
{
  "criteria": [
    {
      "id": "unique_snake_case_id",
      "area": "methodology|data|statistics|reproducibility|literature|ethics|domain_specific",
      "criterion": "Short criterion name",
      "description": "What a reviewer must evaluate (1-2 sentences)",
      "weight": <float 0.0-1.0>,
      "required": <true|false>
    }
  ]
}
Rules:
- Generate 12–16 criteria covering all major areas.
- Weights must sum to approximately 1.0.
- At least 2 domain_specific criteria tailored to this paper's category.
- Mark the 8 most critical criteria as required: true.`,
        },
        {
          role: "user",
          content: `Category: ${paper.category}\nTitle: ${paper.title}\nAbstract: ${paper.abstract}`,
        },
      ],
    });

    const text = completion.choices[0].message.content ?? "";
    const parsed = JSON.parse(text) as { criteria?: unknown };

    if (Array.isArray(parsed.criteria) && parsed.criteria.length > 0) {
      return parsed.criteria as ChecklistCriteria[];
    }
  } catch {
    // fall through to default
  }

  return buildDefaultCriteria(paper.category);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function planReviewChecklist(
  paperId: string,
): Promise<{ checklistId: string; criteria: ChecklistCriteria[] }> {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: { title: true, abstract: true, category: true },
  });

  if (!paper) throw new Error(`Paper not found: ${paperId}`);

  const criteria = await generateAIChecklist(paper);

  const checklist = await prisma.reviewChecklist.create({
    data: {
      paperId,
      criteria: criteria as unknown as import("@prisma/client").Prisma.JsonArray,
    },
  });

  return { checklistId: checklist.id, criteria };
}
