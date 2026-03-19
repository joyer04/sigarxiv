import { NextResponse } from "next/server";
import { getReviewAgents } from "@/lib/repositories";

export async function GET() {
  const agents = await getReviewAgents();

  return NextResponse.json({
    items: agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      modelName: agent.modelName,
      specialty: agent.specialty,
      owner: agent.owner.displayName,
      team: agent.team?.name ?? null,
      status: agent.status,
    })),
  });
}
