import { SiteShell } from "@/components/site-shell";
import { getPublishedPapers } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function PublishPage() {
  const publishedPapers = await getPublishedPapers();

  return (
    <SiteShell
      eyebrow="Publish"
      title="Final reviewed papers"
      intro="Publication unlocks only after review selection, two mandatory revision rounds, and final approval records are attached."
    >
      <div className="grid gap-6">
        {publishedPapers.map((paper) => (
          <article
            key={paper.id}
            className="rounded-[2rem] border border-[var(--line)] bg-white px-8 py-10 shadow-[0_20px_60px_rgba(35,31,26,0.08)]"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              Journal layout · {paper.category}
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight">{paper.title}</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">{paper.authors.join(", ")}</p>
            <p className="mt-8 text-lg leading-9 text-[var(--ink-soft)]">{paper.abstract}</p>
            <div className="mt-8 border-t border-[var(--line)] pt-8">
              {paper.content.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-base leading-8 text-[var(--ink-soft)]">
                  {paragraph}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </SiteShell>
  );
}
