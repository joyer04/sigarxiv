import { prisma } from "@/lib/prisma";

export async function submitPaper(input: {
  submittedById: string;
  title: string;
  category: string;
  abstract: string;
  contentMarkdown: string;
}) {
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
