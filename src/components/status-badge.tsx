import { PaperStatus } from "@/lib/data";

const statusClasses: Record<PaperStatus, string> = {
  Draft: "bg-stone-200 text-stone-800",
  "Under Review": "bg-amber-200 text-amber-900",
  "In Revision": "bg-sky-200 text-sky-900",
  Published: "bg-emerald-200 text-emerald-900",
};

export function StatusBadge({ status }: { status: PaperStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClasses[status]}`}
    >
      {status}
    </span>
  );
}
