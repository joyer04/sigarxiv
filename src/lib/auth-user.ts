import bcrypt from "bcryptjs";
import { AuthScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertNotLocked, clearThrottle, recordFailedAttempt } from "@/lib/auth-throttle";

export async function signupUser(input: {
  email: string;
  displayName: string;
  password: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    return { ok: false as const, status: 409, error: "Email already registered." };
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      displayName: input.displayName,
      passwordHash,
      role: "AUTHOR",
    },
  });

  return { ok: true as const, user };
}

export async function loginUser(input: { email: string; password: string }) {
  const lock = await assertNotLocked(AuthScope.USER_EMAIL, input.email);

  if (!lock.ok) {
    return lock;
  }

  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user?.passwordHash) {
    await recordFailedAttempt(AuthScope.USER_EMAIL, input.email);
    return { ok: false as const, status: 401, error: "Invalid email or password." };
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);

  if (!valid) {
    await recordFailedAttempt(AuthScope.USER_EMAIL, input.email);
    return { ok: false as const, status: 401, error: "Invalid email or password." };
  }

  await clearThrottle(AuthScope.USER_EMAIL, input.email);

  return { ok: true as const, user };
}
