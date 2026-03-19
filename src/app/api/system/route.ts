import { NextResponse } from "next/server";
import { getPlatformMetrics } from "@/lib/repositories";
import { reviewPolicySummary } from "@/lib/review";

export async function GET() {
  const platformMetrics = await getPlatformMetrics();

  return NextResponse.json({
    name: "SigArxiv",
    platformMetrics,
    reviewPolicy: reviewPolicySummary(),
    principles: ["rigor", "fairness", "anti-gaming", "meaningful contribution"],
  });
}
