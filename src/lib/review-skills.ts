export const SYSTEM_IDENTITY =
  "This system does not decide whether a paper deserves to exist. It decides whether the research claim is clear, testable, and constructively improvable.";

export interface SkillTemplate {
  field: string;
  label: string;
  description: string;
  principle: string;
  instruction: string;
  format: string;
  examples: {
    weak: string;
    strong: string;
  };
  antiPatterns: string[];
}

export const REVIEW_SKILLS: SkillTemplate[] = [
  {
    field: "coreClaim",
    label: "Core Claim",
    description: "Identify and distill the paper's primary research contribution into 1–2 sentences.",
    principle: "A claim that cannot be stated clearly cannot be evaluated clearly.",
    instruction:
      "Read the abstract and introduction. Identify the single most important assertion the paper is making. Strip away framing, motivation, and hedging. State what the paper is actually claiming — not what it hopes, not what it suggests, not what it implies.",
    format:
      "1–2 sentences. Start with 'This paper claims that...' or 'The core contribution is...'. No jargon the paper itself does not define.",
    examples: {
      weak:
        "This paper presents a new method for training large language models that achieves good results.",
      strong:
        "This paper claims that replacing attention with a fixed-depth convolution kernel over token windows achieves equivalent perplexity on standard benchmarks at 3× lower inference cost, without architectural search or distillation.",
    },
    antiPatterns: [
      "Restating the abstract verbatim",
      "Listing multiple contributions instead of the core one",
      "Using hedged language ('seems to suggest', 'may indicate')",
      "Including motivation or impact instead of the claim itself",
    ],
  },
  {
    field: "assumptions",
    label: "Assumptions",
    description:
      "List the unstated premises the paper's conclusions depend on — especially ones the authors did not test.",
    principle: "Every claim rests on a stack of assumptions. Naming them is the first act of rigor.",
    instruction:
      "Ask: What must be true for this conclusion to hold? What did the authors take for granted? Focus on assumptions that are: (1) unacknowledged by the authors, (2) not validated in the experiments, (3) likely to break in deployment or a different domain.",
    format:
      "Bullet list. Each item: one assumption stated as a conditional ('This relies on X being true'). Include at least one assumption about data, one about method generalization, and one about evaluation validity.",
    examples: {
      weak: "The paper assumes the dataset is representative.",
      strong:
        "• This relies on the benchmark distribution matching real-world deployment inputs — a gap the authors do not test.\n• The efficiency gains assume a fixed batch size of 32; at smaller batches common in edge settings, the benefit likely reverses.\n• The evaluation assumes that perplexity is a sufficient proxy for downstream task quality, which prior work has shown is not always the case.",
    },
    antiPatterns: [
      "Listing assumptions the authors themselves acknowledge and address",
      "Vague assumptions ('assumes the data is good')",
      "Conflating limitations with assumptions",
      "More than 6 items — focus on the ones that actually matter",
    ],
  },
  {
    field: "failureMode",
    label: "Failure Mode",
    description: "Describe the most plausible scenario in which the paper's core result does not hold.",
    principle: "A result that cannot fail is not a result — it is a definition.",
    instruction:
      "Identify the single most dangerous failure mode. Not a list of theoretical risks, but the specific, concrete scenario in which the method breaks, the claim reverses, or the paper's contribution evaporates. Be specific about the mechanism, not just the outcome.",
    format:
      "2–4 sentences. Describe: (1) the triggering condition, (2) the mechanism of failure, (3) the consequence for the paper's central claim. Do not hedge with 'might' — state the failure mode as if you have observed it.",
    examples: {
      weak: "The method might not generalize to other datasets.",
      strong:
        "The efficiency advantage disappears when input sequences exceed 512 tokens, because the fixed-window convolution must fall back to full attention to avoid catastrophic accuracy loss. Since the authors evaluate only on sequences ≤256 tokens, the reported 3× speedup is not observable in the document summarization and code generation settings where such models are actually deployed.",
    },
    antiPatterns: [
      "Generic failure modes that apply to every paper ('might not generalize')",
      "Failure modes the authors already address",
      "Listing multiple failure modes instead of identifying the most important one",
      "Failure modes that are purely theoretical with no mechanism",
    ],
  },
  {
    field: "alternativeHypothesis",
    label: "Alternative Hypothesis",
    description:
      "Propose a plausible alternative explanation for the paper's observed results that the authors did not consider.",
    principle:
      "A result explained only one way is not yet understood — it is only observed.",
    instruction:
      "Identify the most significant observed result. Then construct a competing explanation that is: (1) consistent with the data presented, (2) not ruled out by the experiments, (3) would lead to a meaningfully different conclusion about what the authors should build or claim next.",
    format:
      "3–5 sentences. State the alternative mechanism, explain why the current experiments cannot distinguish it from the authors' explanation, and describe what additional experiment would adjudicate between them.",
    examples: {
      weak: "Maybe the improvement is due to the larger model size rather than the proposed method.",
      strong:
        "The accuracy gains on benchmarks A and B may be driven by the training data composition rather than the architectural change: the new pre-training corpus includes 40% more math-adjacent text than the baseline, and both benchmarks are math-heavy. The ablation in Section 4.2 removes the architectural component but not the data change, leaving this confound uncontrolled. An experiment pre-training the baseline architecture on the new corpus would determine whether the method or the data is responsible.",
    },
    antiPatterns: [
      "Alternatives that are already tested and ruled out in the paper",
      "Alternatives that require completely different domains or out-of-scope resources",
      "Vague alternatives ('could be noise')",
      "Multiple alternatives when one strong one is more useful",
    ],
  },
  {
    field: "verificationProposal",
    label: "Verification Proposal",
    description:
      "Propose a concrete, runnable experiment that would most directly confirm or refute the paper's central claim.",
    principle: "Every repair path must be actionable. Feedback that cannot be executed is commentary, not review.",
    instruction:
      "Design the single most informative experiment the authors could run to resolve the primary uncertainty in the paper. Be specific enough that another researcher could execute it without asking the authors for clarification. Include: dataset or setting, protocol, what to measure, and what result would confirm vs. refute.",
    format:
      "4–6 sentences or a brief structured spec. Required elements: (1) what to run, (2) what to measure, (3) what outcome confirms the claim, (4) what outcome would require revision. Avoid vague instructions like 'test on more datasets.'",
    examples: {
      weak: "The authors should test on more datasets and report variance.",
      strong:
        "Train the proposed architecture and the baseline (same hyperparameters, same data) on sequences of length 128, 256, 512, and 1024 tokens, reporting inference latency per token and validation perplexity at each length. If the speedup holds within 15% across all four lengths, the claim of hardware-general efficiency is supported. If speedup degrades above 256 tokens, the contribution should be reframed as a short-sequence optimization, not a general architectural improvement.",
    },
    antiPatterns: [
      "Experiments that would take years or require resources far beyond the paper's scope",
      "Vague proposals ('more ablations')",
      "Experiments that test something other than the core claim",
      "Proposals that replicate what the paper already does",
    ],
  },
  {
    field: "logicalWeakness",
    label: "Logical Weakness",
    description:
      "Identify the single most significant gap between what the paper demonstrates and what it concludes.",
    principle: "The gap between evidence and conclusion is where scientific progress either happens or fails.",
    instruction:
      "Find the step in the paper's argument where the logical leap is largest. This is not about what is missing from the experiments — it is about where the authors claim more than their evidence supports. Name the specific claim, name the specific evidence, and name the gap between them.",
    format:
      "3–5 sentences. Structure: (1) the claim the authors make, (2) the evidence they provide for it, (3) why that evidence does not fully support the claim, (4) what additional step would close the gap.",
    examples: {
      weak: "The paper overclaims in the conclusion.",
      strong:
        "The authors conclude that their method is 'training-free and immediately deployable' (Abstract, line 3), but the efficiency gains in Table 2 are measured on models that have been quantized using a proprietary calibration set not released with the code. The claim of training-free deployment is only valid if the calibration set is unnecessary, which the authors do not demonstrate. A zero-shot deployment experiment — running the model with no calibration — would determine whether the efficiency claim holds in the stated scenario.",
    },
    antiPatterns: [
      "Generic complaints ('the conclusion is too strong')",
      "Weaknesses the authors acknowledge as limitations",
      "Style issues instead of logical gaps",
      "Multiple weaknesses — identify the single most important one",
    ],
  },
  {
    field: "impactScore",
    label: "Impact Score",
    description:
      "Assign a 1–5 impact score derived from the 15-point rubric total, reflecting the paper's contribution breadth and significance.",
    principle: "Score the work as it is, not as it could be after revisions.",
    instruction:
      "Compute the rubric total across all 7 dimensions. Map to impact score: 13–15 → 5, 10–12 → 4, 7–9 → 3, 4–6 → 2, 0–3 → 1. The score should reflect the paper in its current state. Do not inflate for potential or deflate for presentation style.",
    format:
      "A single integer 1–5, followed by one sentence explaining the primary driver of that score.",
    examples: {
      weak: "3 — average paper.",
      strong:
        "3 — Rubric total: 8/15. Methodologically sound (Soundness: 3/3) but narrow in disciplinary reach (Impact: 1/3) and lacking reproducibility artifacts (Reproducibility: 0/1); revision could lift this to 4.",
    },
    antiPatterns: [
      "Scores inconsistent with rubric subtotals",
      "Impact scores that reflect potential rather than current state",
      "Using impact score as a rejection signal rather than a quality signal",
    ],
  },
  {
    field: "recommendation",
    label: "Recommendation",
    description: "Issue a final recommendation: ACCEPT, MINOR, MAJOR, or REJECT.",
    principle:
      "Never recommend rejection as the default outcome. Every criticism must include a repair path.",
    instruction:
      "Base your recommendation on the rubric total and the severity of logical weaknesses. REJECT only when the core claim is unfalsifiable, the evidence is fabricated, or the methodology is fundamentally unsuitable. For all other cases, prescribe the revision path. A MAJOR recommendation is not a rejection — it is a commitment to help the authors fix what needs fixing.",
    format:
      "One word (ACCEPT / MINOR / MAJOR / REJECT), followed by 2–3 sentences: primary reason, primary revision required (if not ACCEPT), expected outcome of revision.",
    examples: {
      weak: "REJECT — not good enough.",
      strong:
        "MAJOR — The core idea is technically sound but the efficiency claim does not hold beyond 256-token sequences, which are not representative of the paper's stated target applications. Revisions should (1) extend benchmarks to 512 and 1024 token sequences, (2) update the abstract to scope the contribution accurately, and (3) release the calibration code. If those revisions are made, MINOR or ACCEPT is warranted.",
    },
    antiPatterns: [
      "REJECT without identifying what would change the outcome",
      "ACCEPT for a paper with unverified core claims",
      "Recommendations inconsistent with the rubric total",
      "Treating MAJOR as equivalent to rejection",
    ],
  },
];

export function getSkillByField(field: string): SkillTemplate | undefined {
  return REVIEW_SKILLS.find((s) => s.field === field);
}

export function formatSkillsForPrompt(): string {
  return REVIEW_SKILLS.map((skill) => {
    return `=== SKILL: ${skill.label.toUpperCase()} (field: ${skill.field}) ===
Principle: ${skill.principle}
Instruction: ${skill.instruction}
Format: ${skill.format}
Strong example: ${skill.examples.strong}
Avoid: ${skill.antiPatterns.join("; ")}`;
  }).join("\n\n");
}
