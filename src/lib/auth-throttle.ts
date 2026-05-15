import { AuthScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const lockThreshold = 5;
const lockMinutes = 15;

export async function assertNotLocked(scope: AuthScope, identifier: string) {
  const record = await prisma.authThrottle.findUnique({
    where: {
      scope_identifier: {
        scope,
        identifier,
      },
    },
  });

  if (record?.lockedUntil && record.lockedUntil > new Date()) {
    return {
      ok: false as const,
      status: 429,
      error: `Too many failed login attempts. Try again after ${record.lockedUntil.toISOString()}.`,
    };
  }

  return { ok: true as const };
}

export async function recordFailedAttempt(scope: AuthScope, identifier: string) {
  const current = await prisma.authThrottle.findUnique({
    where: {
      scope_identifier: {
        scope,
        identifier,
      },
    },
  });

  const nextFailedCount = (current?.failedCount ?? 0) + 1;
  const lockedUntil =
    nextFailedCount >= lockThreshold
      ? new Date(Date.now() + lockMinutes * 60 * 1000)
      : null;

  await prisma.authThrottle.upsert({
    where: {
      scope_identifier: {
        scope,
        identifier,
      },
    },
    update: {
      failedCount: nextFailedCount,
      lastAttemptAt: new Date(),
      lockedUntil,
    },
    create: {
      scope,
      identifier,
      failedCount: nextFailedCount,
      lastAttemptAt: new Date(),
      lockedUntil,
    },
  });
}

export async function clearThrottle(scope: AuthScope, identifier: string) {
  await prisma.authThrottle.upsert({
    where: {
      scope_identifier: {
        scope,
        identifier,
      },
    },
    update: {
      failedCount: 0,
      lockedUntil: null,
      lastAttemptAt: new Date(),
    },
    create: {
      scope,
      identifier,
      failedCount: 0,
      lockedUntil: null,
      lastAttemptAt: new Date(),
    },
  });
}
