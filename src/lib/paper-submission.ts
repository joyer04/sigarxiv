import { prisma } from "@/lib/prisma";
import { checkUploadEligibility, CitationPledgeMissingError } from "@/lib/citation-guard";

export async function submitPaper(input: {
  submittedById: string;
  title: string;
  category: string;
  abstract: string;
  contentMarkdown: string;
  citationPledge: boolean;
}) {
  if (!input.citationPledge) throw new CitationPledgeMissingError();
  await checkUploadEligibility(input.submittedById);
  const slugBase = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const slug = `${slugBase}-${Date.now().toString().slice(-6)}`;

  const paper = await prisma.paper.create({
    data: {
      slug,
      title: input.title,
      category: input.category,
      abstract: input.abstract,
      contentMarkdown: input.contentMarkdown,
      submittedById: input.submittedById,
      citationPledge: true,
      status: "DRAFT",
      authors: {
        create: {
          userId: input.submittedById,
          sortOrder: 0,
        },
      },
    },
  });

  return paper;
}
