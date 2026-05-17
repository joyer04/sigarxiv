import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth";
import { submitPaper } from "@/lib/paper-submission";
import { getPaperSummaries } from "@/lib/repositories";

export async function GET() {
  const papers = await getPaperSummaries();

  return NextResponse.json({
    items: papers,
    meta: {
      count: papers.length,
      statuses: ["Draft", "Under Review", "In Revision", "Published"],
    },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUserSession();

  if (!user) {
    return NextResponse.json(
      {
        error: "Human member login is required to upload a paper.",
      },
      { status: 401 },
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const title = String(body.title || "").trim();
  const category = String(body.category || "").trim();
  const abstract = String(body.abstract || "").trim();
  const contentMarkdown = String(body.contentMarkdown || "").trim();
  const citationPledge = body.citationPledge === true;

  if (!title || !category || !abstract || !contentMarkdown) {
    return NextResponse.json(
      { error: "Title, category, abstract, and content are required." },
      { status: 400 },
    );
  }

  if (!citationPledge) {
    return NextResponse.json(
      { error: "You must confirm the citation integrity pledge before submitting." },
      { status: 400 },
    );
  }

  let paper;
  try {
    paper = await submitPaper({
      submittedById: user.id,
      title,
      category,
      abstract,
      contentMarkdown,
      citationPledge,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    paper: { id: paper.id, slug: paper.slug, title: paper.title },
  });
}
