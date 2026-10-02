import type { ReactNode } from "react";

export function PageHead({
  title,
  lede,
  action,
}: {
  title: string;
  lede?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {lede && <p className="mt-1.5 text-sm text-muted-foreground">{lede}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border bg-background ${className}`}>{children}</div>;
}

export function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`num text-xs font-semibold ${up ? "text-ok" : "text-signal"}`}>
      {up ? "▲" : "▼"} {Math.abs(value)}%
    </span>
  );
}

export function Metric({
  label,
  value,
  delta,
  suffix,
}: {
  label: string;
  value: string;
  delta?: number;
  suffix?: string;
}) {
  return (
    <div className="bg-background p-5">
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="num text-3xl font-bold">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {delta !== undefined && (
        <p className="mt-1.5">
          <Delta value={delta} />{" "}
          <span className="text-xs text-muted-foreground">vs last week</span>
        </p>
      )}
    </div>
  );
}

export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "signal" | "ok" | "warn";
}) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    signal: "bg-signal-soft text-signal",
    ok: "bg-ok/10 text-ok",
    warn: "bg-warn/15 text-warn",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed bg-surface p-4 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function Sparkline({ data, max = 4 }: { data: number[]; max?: number }) {
  const w = 72;
  const h = 22;
  const step = w / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - (v / max) * h}`).join(" ");
  const flat = data.every((v) => v === data[0]);
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={flat ? "var(--color-muted-foreground)" : "var(--color-signal)"}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
