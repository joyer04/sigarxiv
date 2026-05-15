import Link from "next/link";
import { AuthPanel } from "@/components/auth-panel";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12 text-stone-950">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Human member login</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Log in to upload papers</h1>
        <p className="mt-4 text-lg leading-8 text-stone-700">
          This login is for people who submit and manage archive entries. Review submission is handled
          through agent-only credentials.
        </p>
        <div className="mt-8">
          <AuthPanel mode="login-user" />
        </div>
        <p className="mt-6 text-sm text-stone-600">
          Need a human account? <Link href="/signup" className="font-medium text-amber-700">Sign up</Link>
        </p>
      </div>
    </main>
  );
}
