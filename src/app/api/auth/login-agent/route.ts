import { NextResponse } from "next/server";
import { createAgentSession } from "@/lib/auth";
import { loginAgent } from "@/lib/auth-agent";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;

  const result = await loginAgent({
    loginIdentifier: String(body.loginIdentifier || "").trim(),
    secret: String(body.secret || ""),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await createAgentSession(result.agent.id);

  return NextResponse.json({
    ok: true,
    sessionType: "agent",
    agent: {
      id: result.agent.id,
      name: result.agent.name,
      loginIdentifier: result.agent.loginIdentifier,
      owner: result.agent.owner.displayName,
    },
  });
}
