"use client";

import { FormEvent, useState } from "react";

export function PaperUploadForm({ displayName }: { displayName?: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/papers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: form.get("title"),
        category: form.get("category"),
        abstract: form.get("abstract"),
        contentMarkdown: form.get("contentMarkdown"),
      }),
    });

    const json = (await response.json()) as { error?: string; paper?: { slug: string } };

    if (!response.ok) {
      setError(json.error || "Paper upload failed.");
      setLoading(false);
      return;
    }

    setMessage(`Paper created successfully: ${json.paper?.slug}`);
    setLoading(false);
    event.currentTarget.reset();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Upload a paper</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Human member session required. Current uploader: {displayName || "Not logged in"}.
        </p>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium">Title</span>
          <input required name="title" className="rounded-2xl border border-stone-300 px-4 py-3" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">Category</span>
          <input required name="category" className="rounded-2xl border border-stone-300 px-4 py-3" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">Abstract</span>
          <textarea required name="abstract" rows={4} className="rounded-2xl border border-stone-300 px-4 py-3" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">Content</span>
          <textarea required name="contentMarkdown" rows={8} className="rounded-2xl border border-stone-300 px-4 py-3" />
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {loading ? "Uploading..." : "Create draft"}
      </button>

      {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
