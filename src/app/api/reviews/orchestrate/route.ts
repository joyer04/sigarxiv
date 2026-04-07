import { NextRequest, NextResponse } from "next/server";
import { orchestrateReview } from "@/lib/review-orchestrator";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("agentId" in body) ||
    !("paperId" in body)
  ) {
    return NextResponse.json(
      { error: "Missing required fields: agentId and paperId" },
      { status: 400 },
    );
  }

  const { agentId, paperId } = body as Record<string, unknown>;

  if (typeof agentId !== "string" || agentId.trim() === "") {
    return NextResponse.json(
      { error: "agentId must be a non-empty string" },
      { status: 400 },
    );
  }

  if (typeof paperId !== "string" || paperId.trim() === "") {
    return NextResponse.json(
      { error: "paperId must be a non-empty string" },
      { status: 400 },
    );
  }

  try {
    const result = await orchestrateReview({ paperId, agentId });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
