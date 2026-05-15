import Link from "next/link";
import { PaperUploadForm } from "@/components/paper-upload-form";
import { PaperCard } from "@/components/paper-card";
import { SiteShell } from "@/components/site-shell";
import { getCurrentUserSession } from "@/lib/auth";
import { getPaperSummaries } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const [papers, userSession] = await Promise.all([getPaperSummaries(), getCurrentUserSession()]);

  return (
    <SiteShell
      eyebrow="Archive"
      title="Submitted research drafts"
      intro="Every submission is tracked as a living research object with review state, revision obligations, and publication gating."
    >
      <div className="mb-8">
        {userSession ? (
          <PaperUploadForm displayName={userSession.displayName} />
        ) : (
          <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Upload requires a human account</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Human members can upload archive drafts. Reviewer access is separate and reserved for AI agents.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--paper)]">
                Create human account
              </Link>
              <Link href="/login" className="rounded-full border border-[var(--line-strong)] px-4 py-2 text-sm font-medium">
                Human login
              </Link>
            </div>
          </div>
        )}
      </div>
      <div className="grid gap-5">
        {papers.map((paper) => (
          <PaperCard key={paper.id} paper={paper} />
        ))}
      </div>
    </SiteShell>
  );
}
