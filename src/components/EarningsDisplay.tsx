"use client";

import { WorkPhase, formatWon } from "@/lib/earnings";

const PHASE: Record<WorkPhase, { label: string; className: string }> = {
  before: { label: "출근 전", className: "bg-stone-200/80 text-stone-600" },
  working: { label: "버는 중", className: "bg-emerald-100 text-emerald-700" },
  lunch: { label: "점심시간 · 잠시 멈춤", className: "bg-sky-100 text-sky-700" },
  after: { label: "퇴근 · 오늘치 완료", className: "bg-accent-soft text-accent-strong" },
};

interface Props {
  earned: number | null;
  phase: WorkPhase | null;
  progress: number;
  workStart: string;
  workEnd: string;
}

export function EarningsDisplay({ earned, phase, progress, workStart, workEnd }: Props) {
  const percent = Math.min(100, Math.max(0, progress * 100));
  return (
    <section className="flex flex-col items-center text-center">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-stone-500">오늘 번 돈</p>
        {phase && (
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${PHASE[phase].className}`}>
            {phase === "working" && (
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
            )}
            {PHASE[phase].label}
          </span>
        )}
      </div>

      <p className="mt-1 flex items-baseline text-[52px] leading-tight font-black tracking-tight text-stone-900 tabular-nums sm:text-6xl">
        {earned === null ? "—" : formatWon(earned)}
        <span className="ml-1 text-2xl font-bold text-stone-400 sm:text-3xl">원</span>
      </p>

      <div className="mt-2 w-full max-w-xs">
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-stone-900/[0.07]"
          role="progressbar"
          aria-label="오늘 근무 진행률"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-light to-accent transition-[width] duration-1000 ease-linear"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] font-medium text-stone-400 tabular-nums">
          <span>{workStart}</span>
          <span className="font-bold text-accent">{percent.toFixed(1)}%</span>
          <span>{workEnd}</span>
        </div>
      </div>
    </section>
  );
}
