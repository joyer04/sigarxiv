"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ModeratorActionButtonProps {
  url: string;
  body: Record<string, unknown>;
  label: string;
  confirmLabel?: string;
  variant?: "danger" | "warning" | "safe" | "neutral";
  disabled?: boolean;
}

const variantStyles = {
  danger:
    "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  warning:
    "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  safe:
    "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  neutral:
    "border border-[var(--line)] bg-white text-[var(--muted)] hover:text-[var(--ink)]",
};

export function ModeratorActionButton({
  url,
  body,
  label,
  confirmLabel,
  variant = "neutral",
  disabled = false,
}: ModeratorActionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    if (confirmLabel && !window.confirm(confirmLabel)) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed.");
      } else {
        setDone(true);
        router.refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <span className="rounded-full px-3 py-1 text-xs font-medium border border-emerald-200 bg-emerald-50 text-emerald-700">
        Done
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading || disabled}
        className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${variantStyles[variant]}`}
      >
        {loading ? "…" : label}
      </button>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
