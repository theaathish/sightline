import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid h-7 w-7 place-items-center rounded bg-signal font-display text-sm font-bold text-primary-foreground">
        S
      </span>
      <span className="font-display text-lg font-bold tracking-tight">Sightline</span>
    </Link>
  );
}

const steps = ["Sign up", "Verify", "Onboarding", "Google", "First audit"];

export function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span
            className={`text-[11px] uppercase tracking-[0.14em] ${
              i === current
                ? "text-signal"
                : i < current
                  ? "text-foreground"
                  : "text-muted-foreground"
            }`}
          >
            {s}
          </span>
          {i < steps.length - 1 && <span className="h-px w-5 bg-border" />}
        </div>
      ))}
    </div>
  );
}

export function FlowShell({
  step,
  title,
  lede,
  children,
  aside,
}: {
  step: number;
  title: string;
  lede?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Wordmark />
        <div className="hidden md:block">
          <StepBar current={step} />
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">{title}</h1>
          {lede && <p className="mt-3 text-base text-muted-foreground">{lede}</p>}
          <div className="mt-10">{children}</div>
        </div>
        {aside && <aside className="lg:pt-4">{aside}</aside>}
      </main>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-l-2 border-l-signal bg-surface p-4 text-sm text-muted-foreground">
      {children}
    </div>
  );
}
