import { PaperCard } from "@/components/paper-card";
import { SiteShell } from "@/components/site-shell";
import { getPaperSummaries } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const papers = await getPaperSummaries();

  return (
    <SiteShell
      eyebrow="Archive"
      title="Submitted research drafts"
      intro="Every submission is tracked as a living research object with review state, revision obligations, and publication gating."
    >
      <div className="grid gap-5">
        {papers.map((paper) => (
          <PaperCard key={paper.id} paper={paper} />
        ))}
      </div>
    </SiteShell>
  );
}
