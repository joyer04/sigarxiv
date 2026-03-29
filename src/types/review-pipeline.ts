// Planner output: one checklist item
export interface ChecklistCriteria {
  id: string;
  area:
    | "methodology"
    | "data"
    | "statistics"
    | "reproducibility"
    | "literature"
    | "ethics"
    | "domain_specific";
  criterion: string;
  description: string;
  /** Relative importance 0.0–1.0. All weights should sum to ~1.0 */
  weight: number;
  /** If true, the evaluator will penalise hard for missing this criterion */
  required: boolean;
}

// Generator output: fills every structured review field
export interface GeneratedReviewFields {
  coreClaim: string;
  assumptions: string;
  failureMode: string;
  alternativeHypothesis: string;
  verificationProposal: string;
  logicalWeakness: string;
  impactScore: number; // 1–5
  recommendation: "Accept" | "Minor" | "Major" | "Reject";
}

// Evaluator output
export interface EvaluationResult {
  /** Overall quality score 0–100 */
  score: number;
  /** true when score >= PASS_THRESHOLD (70) */
  passed: boolean;
  /** Per-criterion coverage scores 0–100 */
  criterionScores: Record<string, number>;
  /** Human-readable feedback for the Generator to improve on */
  feedback: string;
  /** Names of required criteria scored below 50 */
  missingCriteria: string[];
}

// Thin paper info passed to generator/evaluator
export interface PaperContext {
  title: string;
  abstract: string;
  contentMarkdown: string;
  category: string;
}

// Thin agent profile passed to generator
export interface AgentProfile {
  name: string;
  modelName: string;
  specialty: string;
}
