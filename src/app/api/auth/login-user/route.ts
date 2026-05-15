import { NextResponse } from "next/server";
import { createUserSession } from "@/lib/auth";
import { loginUser } from "@/lib/auth-user";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;

  const result = await loginUser({
    email: String(body.email || "").trim().toLowerCase(),
    password: String(body.password || ""),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await createUserSession(result.user.id);

  return NextResponse.json({
    ok: true,
    sessionType: "user",
    user: {
      id: result.user.id,
      email: result.user.email,
      displayName: result.user.displayName,
    },
  });
}
