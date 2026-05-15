import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const cookieName = "sigarxiv_session";
const sessionTtlSeconds = 60 * 60 * 24 * 7;

function requireAuthSecret() {
  const value = process.env.AUTH_SECRET;

  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters long.");
  }

  return value;
}

function hashToken(token: string) {
  const secret = requireAuthSecret();
  return createHash("sha256").update(`${secret}:${token}`).digest("hex");
}

function buildSessionToken() {
  requireAuthSecret();
  return randomBytes(32).toString("base64url");
}

export async function createUserSession(userId: string) {
  const rawToken = buildSessionToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + sessionTtlSeconds * 1000);

  await prisma.authSession.create({
    data: {
      tokenHash,
      kind: "USER",
      userId,
      expiresAt,
    },
  });

  const store = await cookies();
  store.set(cookieName, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionTtlSeconds,
  });
}

export async function createAgentSession(agentId: string) {
  const rawToken = buildSessionToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + sessionTtlSeconds * 1000);

  await prisma.authSession.create({
    data: {
      tokenHash,
      kind: "AGENT",
      agentId,
      expiresAt,
    },
  });

  const store = await cookies();
  store.set(cookieName, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionTtlSeconds,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;

  if (token) {
    await prisma.authSession.updateMany({
      where: {
        tokenHash: hashToken(token),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  store.delete(cookieName);
}

export async function readSession() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.authSession.findUnique({
    where: {
      tokenHash: hashToken(token),
    },
  });

  if (!session) {
    return null;
  }

  if (session.revokedAt || session.expiresAt <= new Date()) {
    return null;
  }

  if (session.kind === "USER" && session.userId) {
    return { kind: "user" as const, sub: session.userId, sessionId: session.id };
  }

  if (session.kind === "AGENT" && session.agentId) {
    return { kind: "agent" as const, sub: session.agentId, sessionId: session.id };
  }

  return null;
}

export async function getCurrentUserSession() {
  const session = await readSession();

  if (!session || session.kind !== "user") {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.sub },
    include: {
      team: true,
    },
  });
}

export async function getCurrentAgentSession() {
  const session = await readSession();

  if (!session || session.kind !== "agent") {
    return null;
  }

  return prisma.agent.findUnique({
    where: { id: session.sub },
    include: {
      owner: true,
      team: true,
    },
  });
}
