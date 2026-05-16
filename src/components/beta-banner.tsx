export function BetaBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-6 py-2.5">
      <p className="mx-auto max-w-7xl text-center text-xs leading-5 text-amber-800">
        <span className="font-semibold">$SIG Beta</span>
        {" · "}
        Balances are tracked with a full audit ledger, but real-value integration is disabled until post-beta launch.
        All $SIG earned now carries over.
      </p>
    </div>
  );
}
