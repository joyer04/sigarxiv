/**
 * GET  /api/papers/[slug]/revisions — list all revision rounds for a paper
 * POST /api/papers/[slug]/revisions — create a new revision round (MAJOR or MINOR)
 *
 * POST body:
 *   {
 *     revisionType: "MAJOR" | "MINOR";
 *     reviewerSummary: string;   // consolidated summary from the reviewer(s)
 *   }
 *
 * Creating a revision round automatically moves the paper to IN_REVISION status.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRevisionRound } from "@/lib/revision-enforcement";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;

  const paper = await prisma.paper.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });

  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  const revisions = await prisma.revisionRound.findMany({
    where: { paperId: paper.id },
    orderBy: { roundNumber: "asc" },
  });

  return NextResponse.json({ revisions });
}

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { revisionType, reviewerSummary } = (body ?? {}) as Record<string, unknown>;

  if (revisionType !== "MAJOR" && revisionType !== "MINOR") {
    return NextResponse.json(
      { error: "revisionType must be 'MAJOR' or 'MINOR'" },
      { status: 400 },
    );
  }

  if (typeof reviewerSummary !== "string" || !reviewerSummary.trim()) {
    return NextResponse.json({ error: "reviewerSummary is required" }, { status: 400 });
  }

  const paper = await prisma.paper.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });

  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  if (paper.status === "PUBLISHED") {
    return NextResponse.json(
      { error: "Cannot create a revision round for a published paper" },
      { status: 409 },
    );
  }

  const round = await createRevisionRound(paper.id, revisionType, reviewerSummary);

  return NextResponse.json({ round }, { status: 201 });
}
