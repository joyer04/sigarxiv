import { NextResponse } from "next/server";
import { getPaperSummaries } from "@/lib/repositories";

export async function GET() {
  const papers = await getPaperSummaries();

  return NextResponse.json({
    items: papers,
    meta: {
      count: papers.length,
      statuses: ["Draft", "Under Review", "In Revision", "Published"],
    },
  });
}
