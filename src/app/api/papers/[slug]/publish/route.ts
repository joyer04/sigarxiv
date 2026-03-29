/**
 * POST /api/papers/[slug]/publish
 *
 * Attempts to publish a paper. Returns 422 if the revision requirements are
 * not yet met:
 *   • At least one MAJOR revision round must be APPROVED
 *   • At least one MINOR revision round must be APPROVED
 *
 * On success, the paper status becomes PUBLISHED and publishedAt is set.
 *
 * GET /api/papers/[slug]/publish
 *
 * Returns the current publication readiness without modifying anything.
 * Useful for UI to show a checklist of what still needs to be done.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishPaper, checkRevisionRequirements } from "@/lib/revision-enforcement";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;

  const paper = await prisma.paper.findUnique({
    where: { slug },
    select: { id: true, status: true, publishedAt: true },
  });

  if (!paper) return NextResponse.json({ error: "Paper not found" }, { status: 404 });

  const requirements = await checkRevisionRequirements(paper.id);

  return NextResponse.json({
    status: paper.status,
    publishedAt: paper.publishedAt,
    canPublish: requirements.canPublish,
    majorApproved: requirements.majorApproved,
    minorApproved: requirements.minorApproved,
    missingRequirements: requirements.missingRequirements,
    rounds: requirements.rounds,
  });
}

export async function POST(_req: Request, { params }: Params) {
  const { slug } = await params;

  const paper = await prisma.paper.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });

  if (!paper) return NextResponse.json({ error: "Paper not found" }, { status: 404 });

  if (paper.status === "PUBLISHED") {
    return NextResponse.json({ error: "Paper is already published" }, { status: 409 });
  }

  const result = await publishPaper(paper.id);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: "Publication requirements not met",
        missingRequirements: result.requirements.missingRequirements,
        majorApproved: result.requirements.majorApproved,
        minorApproved: result.requirements.minorApproved,
        rounds: result.requirements.rounds,
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    paper: result.paper,
    message: "Paper published successfully",
  });
}
