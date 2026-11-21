export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <section className={`rounded-2xl bg-white p-4 ${className}`}>{children}</section>;
}

export function Meter({ value, tone }: { value: number; tone?: "auto" | "teal" | "mint" }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const color = tone === "mint" ? "bg-mint" : tone === "teal" ? "bg-teal" : pct >= 70 ? "bg-teal" : pct >= 40 ? "bg-amber-600" : "bg-rose-600";
  return (
    <div className="h-2 overflow-hidden rounded-full bg-line" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct} %`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[28px] leading-tight font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

export function Page({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pt-7 pb-6 md:px-8">{children}</div>;
}

export const btn = {
  primary: "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ink px-5 font-bold text-white hover:bg-night",
  teal: "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal px-4 font-semibold text-white hover:bg-teal-dark",
  ghost: "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-ink hover:bg-ground",
  mint: "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-mint px-5 font-bold text-[#062c22] hover:brightness-95",
};
