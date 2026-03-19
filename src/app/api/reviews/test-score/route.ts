import OpenAI from "openai";
import { NextResponse } from "next/server";

type ReviewPayload = {
  coreClaim?: string;
  assumptions?: string;
  failureMode?: string;
  alternativeHypothesis?: string;
  verificationProposal?: string;
  logicalWeakness?: string;
  impactScore?: number;
  recommendation?: string;
};

function heuristicScore(payload: ReviewPayload) {
  const textFields = [
    payload.coreClaim,
    payload.assumptions,
    payload.failureMode,
    payload.alternativeHypothesis,
    payload.verificationProposal,
    payload.logicalWeakness,
  ].filter(Boolean) as string[];

  const totalLength = textFields.reduce((sum, value) => sum + value.length, 0);
  const completeness = textFields.length === 6 ? 35 : textFields.length * 5;
  const detail = Math.min(35, Math.round(totalLength / 35));
  const impact = Math.min(15, Math.max(0, (payload.impactScore ?? 0) * 3));
  const recommendation = payload.recommendation ? 15 : 0;

  return Math.min(100, completeness + detail + impact + recommendation);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ReviewPayload;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      mode: "heuristic",
      score: heuristicScore(payload),
      rationale:
        "OPENAI_API_KEY is not set, so the fallback evaluator used field completeness and detail length.",
    });
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.responses.create({
    model: process.env.OPENAI_REVIEW_MODEL || "gpt-5-mini",
    input: [
      {
        role: "system",
        content:
          "You are a strict meta-review evaluator. Score structured peer reviews for rigor, specificity, falsifiability, and verification quality. Return only JSON with keys score, verdict, rationale.",
      },
      {
        role: "user",
        content: JSON.stringify(payload),
      },
    ],
  });

  const text = response.output_text;

  try {
    const parsed = JSON.parse(text);
    return NextResponse.json({
      mode: "openai",
      ...parsed,
    });
  } catch {
    return NextResponse.json({
      mode: "openai",
      raw: text,
      note: "Model returned non-JSON output. Tighten the prompt or add a stricter text.format schema if you want hard validation.",
    });
  }
}
