/**
 * GET   /api/papers/[slug]/revisions/[roundNumber] — fetch a single revision round
 * PATCH /api/papers/[slug]/revisions/[roundNumber] — update status / responses
 *
 * PATCH body (all fields optional):
 *   {
 *     status?: "REQUIRED" | "ADDRESSED" | "APPROVED" | "ESCALATED";
 *     authorResponse?: string;    // author's response to the reviewer summary
 *     reviewerDecision?: string;  // reviewer's decision after reading the response
 *   }
 *
 * When status is set to APPROVED, the paper automatically transitions back to
 * UNDER_REVIEW so it can collect further reviews or enter the next round.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addressRevisionRound } from "@/lib/revision-enforcement";

type Params = { params: Promise<{ slug: string; roundNumber: string }> };

const VALID_STATUSES = ["REQUIRED", "ADDRESSED", "APPROVED", "ESCALATED"] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

export async function GET(_req: Request, { params }: Params) {
  const { slug, roundNumber: roundNumberStr } = await params;
  const roundNumber = parseInt(roundNumberStr, 10);

  if (isNaN(roundNumber)) {
    return NextResponse.json({ error: "roundNumber must be an integer" }, { status: 400 });
  }

  const paper = await prisma.paper.findUnique({ where: { slug }, select: { id: true } });
  if (!paper) return NextResponse.json({ error: "Paper not found" }, { status: 404 });

  const round = await prisma.revisionRound.findUnique({
    where: { paperId_roundNumber: { paperId: paper.id, roundNumber } },
  });

  if (!round) return NextResponse.json({ error: "Revision round not found" }, { status: 404 });

  return NextResponse.json({ round });
}

export async function PATCH(request: Request, { params }: Params) {
  const { slug, roundNumber: roundNumberStr } = await params;
  const roundNumber = parseInt(roundNumberStr, 10);

  if (isNaN(roundNumber)) {
    return NextResponse.json({ error: "roundNumber must be an integer" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status, authorResponse, reviewerDecision } = (body ?? {}) as Record<string, unknown>;

  if (status !== undefined && !VALID_STATUSES.includes(status as ValidStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const paper = await prisma.paper.findUnique({ where: { slug }, select: { id: true } });
  if (!paper) return NextResponse.json({ error: "Paper not found" }, { status: 404 });

  try {
    const round = await addressRevisionRound(paper.id, roundNumber, {
      ...(status !== undefined && { status: status as ValidStatus }),
      ...(typeof authorResponse === "string" && { authorResponse }),
      ...(typeof reviewerDecision === "string" && { reviewerDecision }),
    });

    return NextResponse.json({ round });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 404 },
    );
  }
}
