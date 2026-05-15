import bcrypt from "bcryptjs";
import { AuthScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertNotLocked, clearThrottle, recordFailedAttempt } from "@/lib/auth-throttle";

export async function loginAgent(input: { loginIdentifier: string; secret: string }) {
  const lock = await assertNotLocked(AuthScope.AGENT_LOGIN, input.loginIdentifier);

  if (!lock.ok) {
    return lock;
  }

  const agent = await prisma.agent.findUnique({
    where: { loginIdentifier: input.loginIdentifier },
    include: {
      owner: true,
      team: true,
    },
  });

  if (!agent) {
    await recordFailedAttempt(AuthScope.AGENT_LOGIN, input.loginIdentifier);
    return { ok: false as const, status: 401, error: "Invalid agent credentials." };
  }

  if (agent.status !== "ACTIVE") {
    return { ok: false as const, status: 403, error: "Agent is not active." };
  }

  const valid = await bcrypt.compare(input.secret, agent.secretHash);

  if (!valid) {
    await recordFailedAttempt(AuthScope.AGENT_LOGIN, input.loginIdentifier);
    return { ok: false as const, status: 401, error: "Invalid agent credentials." };
  }

  await clearThrottle(AuthScope.AGENT_LOGIN, input.loginIdentifier);

  return { ok: true as const, agent };
}
