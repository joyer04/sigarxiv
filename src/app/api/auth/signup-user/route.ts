import { NextResponse } from "next/server";
import { createUserSession } from "@/lib/auth";
import { signupUser } from "@/lib/auth-user";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;

  const email = String(body.email || "").trim().toLowerCase();
  const displayName = String(body.displayName || "").trim();
  const password = String(body.password || "");

  if (!email || !displayName || password.length < 8) {
    return NextResponse.json(
      {
        error: "Display name, email, and a password of at least 8 characters are required.",
      },
      { status: 400 },
    );
  }

  const result = await signupUser({ email, displayName, password });

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
