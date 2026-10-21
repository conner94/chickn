"use client";

import { useState } from "react";
import {
  WorkSettings,
  annualFromMonthly,
  formatManwonInput,
  formatWon,
  monthlyFromAnnual,
} from "@/lib/earnings";

interface Props {
  settings: WorkSettings;
  errors: string[];
  onChange: (patch: Partial<WorkSettings>) => void;
}

// min-w-0: type="time" 입력칸은 브라우저 고유 최소 너비가 있어 2열 그리드에서 칸을 넘쳐 서로 겹친다 → 줄어들 수 있게
// text-base(16px): iOS에서 입력칸을 누를 때 화면이 확대되지 않게 / min-h: 기본 모양을 끈 iOS 시간 칸 높이 유지
const inputClass =
  "w-full min-w-0 min-h-11 text-base rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-stone-900 outline-none focus:border-accent-light focus:ring-2 focus:ring-accent-soft";

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm text-stone-600">
      {label}
      <input type="time" className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/**
 * 연봉·월급 입력칸. 어느 쪽에 입력해도 다른 쪽이 자동으로 맞춰진다. (월급 × 12 = 연봉)
 * 저장은 연봉 하나로만 하고, 각 칸은 입력 중인 글자를 그대로 유지하도록 자체 텍스트 상태를 둔다.
 */
function SalaryFields({ annual, onChange }: { annual: number; onChange: (annual: number) => void }) {
  const [annualText, setAnnualText] = useState(() => formatManwonInput(annual));
  const [monthlyText, setMonthlyText] = useState(() => formatManwonInput(monthlyFromAnnual(annual)));

  const onAnnual = (text: string) => {
    setAnnualText(text);
    const v = Number(text);
    setMonthlyText(text === "" ? "" : formatManwonInput(monthlyFromAnnual(v)));
    onChange(text === "" ? NaN : v);
  };

  const onMonthly = (text: string) => {
    setMonthlyText(text);
    const v = annualFromMonthly(Number(text));
    setAnnualText(text === "" ? "" : formatManwonInput(v));
    onChange(text === "" ? NaN : v);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col gap-1 text-sm text-stone-600">
          월급 (만원)
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={10}
            className={inputClass}
            value={monthlyText}
            onChange={(e) => onMonthly(e.target.value)}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm text-stone-600">
          연봉 (만원)
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={100}
            className={inputClass}
            value={annualText}
            onChange={(e) => onAnnual(e.target.value)}
          />
        </label>
      </div>
      {Number.isFinite(annual) && annual > 0 && (
        <p className="text-xs text-stone-400 tabular-nums">
          월 {formatWon(monthlyFromAnnual(annual) * 10_000)}원 · 연 {formatWon(annual * 10_000)}원
        </p>
      )}
      {/* 안심 문구: 입력칸 바로 아래에 눈에 띄게. 실제로는 localStorage에만 저장된다 (useSettings) */}
      <p className="mt-1 flex gap-1.5 rounded-xl bg-accent-soft px-3 py-2 text-[13px] leading-snug font-semibold text-accent-strong">
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="mt-px h-4 w-4 shrink-0">
          <path
            fillRule="evenodd"
            d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
            clipRule="evenodd"
          />
        </svg>
        <span className="break-keep">월급은 서버로 보내지 않아 어디에도 기록되지 않아요.</span>
      </p>
    </div>
  );
}

export function SettingsForm({ settings, errors, onChange }: Props) {
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
      <SalaryFields annual={settings.annualSalaryManwon} onChange={(v) => onChange({ annualSalaryManwon: v })} />

      <div className="grid grid-cols-2 gap-2">
        <TimeField label="출근" value={settings.workStart} onChange={(v) => onChange({ workStart: v })} />
        <TimeField label="퇴근" value={settings.workEnd} onChange={(v) => onChange({ workEnd: v })} />
        <TimeField label="점심 시작" value={settings.lunchStart} onChange={(v) => onChange({ lunchStart: v })} />
        <TimeField label="점심 종료" value={settings.lunchEnd} onChange={(v) => onChange({ lunchEnd: v })} />
      </div>

      {errors.length > 0 && (
        <ul className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
