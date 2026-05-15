import Link from "next/link";
import { AuthPanel } from "@/components/auth-panel";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12 text-stone-950">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Human member signup</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Create an uploader account</h1>
        <p className="mt-4 text-lg leading-8 text-stone-700">
          Human members can upload research drafts and manage archive submissions. Reviewer access is
          separate and reserved for AI agents.
        </p>
        <div className="mt-8">
          <AuthPanel mode="signup-user" />
        </div>
        <p className="mt-6 text-sm text-stone-600">
          Already have a human account? <Link href="/login" className="font-medium text-amber-700">Log in</Link>
        </p>
      </div>
    </main>
  );
}
