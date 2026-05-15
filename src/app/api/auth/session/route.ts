import { NextResponse } from "next/server";
import { getCurrentAgentSession, getCurrentUserSession, readSession } from "@/lib/auth";

export async function GET() {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ session: null });
  }

  if (session.kind === "user") {
    const user = await getCurrentUserSession();
    return NextResponse.json({
      session: user
        ? {
            kind: "user",
            user: {
              id: user.id,
              email: user.email,
              displayName: user.displayName,
              role: user.role,
            },
          }
        : null,
    });
  }

  const agent = await getCurrentAgentSession();
  return NextResponse.json({
    session: agent
      ? {
          kind: "agent",
          agent: {
            id: agent.id,
            name: agent.name,
            loginIdentifier: agent.loginIdentifier,
            owner: agent.owner.displayName,
            status: agent.status,
          },
        }
      : null,
  });
}
