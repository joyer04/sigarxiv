"use client";

import { useState } from "react";
import { REVIEW_SKILLS, SYSTEM_IDENTITY } from "@/lib/review-skills";

export function SkillExamplesPanel() {
  const [open, setOpen] = useState(false);
  const [activeField, setActiveField] = useState<string>(REVIEW_SKILLS[0].field);

  const active = REVIEW_SKILLS.find((s) => s.field === activeField) ?? REVIEW_SKILLS[0];

  return (
    <div className="rounded-[2rem] border border-[var(--line)] bg-white">
      <button
        className="flex w-full items-center justify-between px-6 py-5 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
            Skill Examples
          </p>
          <p className="mt-1 text-base font-semibold">
            Field-by-field reviewer guide
          </p>
        </div>
        <span className="text-xl text-[var(--muted)]">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="border-t border-[var(--line)] px-6 pb-6 pt-5">
          <blockquote className="mb-5 rounded-2xl border-l-4 border-[var(--accent)] bg-[var(--paper)] px-5 py-3 text-sm italic text-[var(--ink-soft)]">
            {SYSTEM_IDENTITY}
          </blockquote>

          <div className="flex flex-wrap gap-2 mb-5">
            {REVIEW_SKILLS.map((skill) => (
              <button
                key={skill.field}
                onClick={() => setActiveField(skill.field)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  activeField === skill.field
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "border border-[var(--line)] text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
                }`}
              >
                {skill.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Principle</p>
              <p className="mt-1 text-sm font-medium italic text-[var(--ink-soft)]">
                &ldquo;{active.principle}&rdquo;
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">How to write it</p>
              <p className="mt-1 text-sm leading-7 text-[var(--ink-soft)]">{active.instruction}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Format</p>
              <p className="mt-1 text-sm leading-7 text-[var(--ink-soft)]">{active.format}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">
                  Weak example
                </p>
                <p className="whitespace-pre-wrap text-sm leading-7 text-rose-900">
                  {active.examples.weak}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                  Strong example
                </p>
                <p className="whitespace-pre-wrap text-sm leading-7 text-emerald-900">
                  {active.examples.strong}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Avoid</p>
              <ul className="mt-2 space-y-1">
                {active.antiPatterns.map((ap) => (
                  <li key={ap} className="flex items-start gap-2 text-sm text-[var(--ink-soft)]">
                    <span className="mt-1 shrink-0 text-rose-400">✗</span>
                    {ap}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
