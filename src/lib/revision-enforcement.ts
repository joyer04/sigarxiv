/**
 * Revision enforcement — ensures a paper completes at least one MAJOR and one
 * MINOR revision cycle before it can be published.
 *
 * State machine:
 *   DRAFT → UNDER_REVIEW
 *     └─ createRevisionRound(MAJOR) → IN_REVISION
 *         └─ PATCH status=APPROVED   → UNDER_REVIEW
 *             └─ createRevisionRound(MINOR) → IN_REVISION
 *                 └─ PATCH status=APPROVED   → UNDER_REVIEW
 *                     └─ POST /publish        → PUBLISHED  ✓
 *
 * The publish endpoint calls checkRevisionRequirements and rejects the request
 * unless both a MAJOR and a MINOR round are APPROVED.
 */

import { prisma } from "@/lib/prisma";
import type { RevisionRound } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RevisionRequirement {
  majorApproved: boolean;
  minorApproved: boolean;
  canPublish: boolean;
  missingRequirements: string[];
  rounds: Pick<RevisionRound, "id" | "roundNumber" | "revisionType" | "status">[];
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function checkRevisionRequirements(paperId: string): Promise<RevisionRequirement> {
  const rounds = await prisma.revisionRound.findMany({
    where: { paperId },
    select: { id: true, roundNumber: true, revisionType: true, status: true },
    orderBy: { roundNumber: "asc" },
  });

  const majorApproved = rounds.some(
    (r) => r.revisionType === "MAJOR" && r.status === "APPROVED",
  );
  const minorApproved = rounds.some(
    (r) => r.revisionType === "MINOR" && r.status === "APPROVED",
  );

  const missingRequirements: string[] = [];
  if (!majorApproved) {
    missingRequirements.push(
      "At least one MAJOR revision round must be completed (status: APPROVED)",
    );
  }
  if (!minorApproved) {
    missingRequirements.push(
      "At least one MINOR revision round must be completed (status: APPROVED)",
    );
  }

  return {
    majorApproved,
    minorApproved,
    canPublish: majorApproved && minorApproved,
    missingRequirements,
    rounds,
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createRevisionRound(
  paperId: string,
  revisionType: "MAJOR" | "MINOR",
  reviewerSummary: string,
): Promise<RevisionRound> {
  // Derive next round number
  const last = await prisma.revisionRound.findFirst({
    where: { paperId },
    orderBy: { roundNumber: "desc" },
    select: { roundNumber: true },
  });

  const roundNumber = (last?.roundNumber ?? 0) + 1;

  const [round] = await prisma.$transaction([
    prisma.revisionRound.create({
      data: {
        paperId,
        roundNumber,
        revisionType,
        reviewerSummary,
        status: "REQUIRED",
      },
    }),
    // Move paper to IN_REVISION state
    prisma.paper.update({
      where: { id: paperId },
      data: { status: "IN_REVISION" },
    }),
  ]);

  return round;
}

export async function addressRevisionRound(
  paperId: string,
  roundNumber: number,
  fields: {
    status?: "REQUIRED" | "ADDRESSED" | "APPROVED" | "ESCALATED";
    authorResponse?: string;
    reviewerDecision?: string;
  },
): Promise<RevisionRound> {
  const round = await prisma.revisionRound.findUnique({
    where: { paperId_roundNumber: { paperId, roundNumber } },
  });

  if (!round) throw new Error(`Revision round ${roundNumber} not found for paper ${paperId}`);

  const updated = await prisma.revisionRound.update({
    where: { id: round.id },
    data: {
      ...(fields.status !== undefined && { status: fields.status }),
      ...(fields.authorResponse !== undefined && { authorResponse: fields.authorResponse }),
      ...(fields.reviewerDecision !== undefined && { reviewerDecision: fields.reviewerDecision }),
    },
  });

  // If the round is approved, return the paper to UNDER_REVIEW so it can
  // collect more reviews or enter the next revision cycle.
  if (fields.status === "APPROVED") {
    await prisma.paper.update({
      where: { id: paperId },
      data: { status: "UNDER_REVIEW" },
    });
  }

  return updated;
}

export async function publishPaper(paperId: string) {
  const requirements = await checkRevisionRequirements(paperId);

  if (!requirements.canPublish) {
    return { ok: false as const, requirements };
  }

  const paper = await prisma.paper.update({
    where: { id: paperId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
    select: { id: true, slug: true, title: true, status: true, publishedAt: true },
  });

  return { ok: true as const, paper, requirements };
}
