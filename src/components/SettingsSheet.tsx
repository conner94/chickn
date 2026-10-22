"use client";

import { useEffect, useRef, useState } from "react";
import { WorkSettings, dailyWage, formatWon, hourlyWage, monthlySalary, validateSettings } from "@/lib/earnings";
import { SettingsForm } from "./SettingsForm";

interface Props {
  open: boolean;
  onClose: () => void;
  settings: WorkSettings;
  onSave: (settings: WorkSettings) => void;
}

/** 저장된 값과 입력 중인 값이 다른지 (빈 칸은 NaN이라 Object.is로 비교) */
function isDirty(a: WorkSettings, b: WorkSettings) {
  return (Object.keys(a) as (keyof WorkSettings)[]).some((k) => !Object.is(a[k], b[k]));
}

/**
 * 아래에서 올라오는 입력 시트. 네이티브 <dialog>라 포커스 가두기가 기본 제공된다.
 * 입력값은 [저장]을 눌러야 반영된다. 바꾼 채로 닫으려 하면(X·Esc·바깥 클릭) 나갈지 한 번 묻는다.
 */
export function SettingsSheet({ open, onClose, settings, onSave }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // 닫기 요청: 시트 본문이 바뀐 값이 있으면 확인 창을 띄우도록 가로챈다
  const requestCloseRef = useRef(onClose);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Esc: 바로 닫지 않고 닫기 요청으로 처리
      onCancel={(e) => {
        e.preventDefault();
        requestCloseRef.current();
      }}
      // 바깥(배경) 클릭 시 닫기 요청
      onClick={(e) => e.target === e.currentTarget && requestCloseRef.current()}
      aria-labelledby="settings-title"
      className="fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[90dvh] w-full max-w-md overflow-x-hidden overflow-y-auto overscroll-contain rounded-t-3xl bg-[#fdf8f1] p-0 text-stone-900 shadow-2xl backdrop:bg-stone-900/30 backdrop:backdrop-blur-[2px]"
    >
      {/* 열려 있을 때만 그려서, 열 때마다 저장된 최신 값으로 입력칸을 채운다 */}
      {open && (
        <SheetBody
          settings={settings}
          onClose={onClose}
          onSave={(next) => {
            onSave(next);
            onClose();
          }}
          requestCloseRef={requestCloseRef}
        />
      )}
    </dialog>
  );
}

function SheetBody({
  settings,
  onClose,
  onSave,
  requestCloseRef,
}: {
  settings: WorkSettings;
  onClose: () => void;
  onSave: (settings: WorkSettings) => void;
  requestCloseRef: React.RefObject<() => void>;
}) {
  const [draft, setDraft] = useState(settings);
  const [confirming, setConfirming] = useState(false);
  const errors = validateSettings(draft);
  const valid = errors.length === 0;
  const dirty = isDirty(draft, settings);

  const requestClose = () => (dirty ? setConfirming(true) : onClose());
  useEffect(() => {
    requestCloseRef.current = requestClose;
  });

  return (
    <div className="flex flex-col gap-4 px-5 pt-5">
      <div className="flex items-center justify-between">
        {/* 열릴 때 첫 포커스를 제목에 둔다 (X 버튼에 포커스 테두리가 생기거나 입력칸 키보드가 뜨지 않게) */}
        <h2 id="settings-title" tabIndex={-1} autoFocus className="text-lg font-bold outline-none">
          월급 입력
        </h2>
        <button
          type="button"
          onClick={requestClose}
          aria-label="닫기"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-300 text-white transition hover:bg-stone-400"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true" className="h-4 w-4">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>

      <SettingsForm settings={draft} errors={errors} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />

      {valid && (
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ["월급", monthlySalary(draft)],
            ["시급", hourlyWage(draft)],
            ["하루치", dailyWage(draft)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white/45 px-2 py-3 shadow-[0_4px_14px_-6px_rgba(60,40,20,0.16)] ring-1 ring-white/80 backdrop-blur-xl">
              <dt className="text-xs text-stone-500">{label}</dt>
              <dd className="mt-1 text-[13px] font-semibold whitespace-nowrap tabular-nums">{formatWon(value as number)}원</dd>
            </div>
          ))}
        </dl>
      )}

      {/* 하단 고정 저장 버튼: 시트가 길어 스크롤돼도 항상 보인다 */}
      <div className="sticky bottom-0 -mx-5 bg-[#fdf8f1] px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => onSave(draft)}
          disabled={!valid}
          className="w-full rounded-full bg-stone-900 py-4 text-base font-bold text-white transition hover:bg-stone-800 active:scale-[0.98] disabled:bg-stone-300"
        >
          저장
        </button>
      </div>

      {confirming && <DiscardConfirm onStay={() => setConfirming(false)} onLeave={onClose} />}
    </div>
  );
}

/** 바꾼 값을 저장하지 않고 닫으려 할 때 띄우는 확인 창 (시트 위에 겹치는 네이티브 <dialog>) */
function DiscardConfirm({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onStay();
      }}
      aria-labelledby="discard-title"
      className="m-auto w-[calc(100%-3rem)] max-w-xs rounded-3xl bg-white p-6 text-center text-stone-900 shadow-2xl backdrop:bg-stone-900/40"
    >
      <h3 id="discard-title" className="text-base font-bold">
        저장하지 않고 나갈까요?
      </h3>
      <p className="mt-1.5 text-sm text-stone-500">바꾼 내용은 사라져요.</p>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onStay}
          className="flex-1 rounded-full bg-stone-100 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-200"
        >
          계속 입력
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="flex-1 rounded-full bg-stone-900 py-3 text-sm font-bold text-white transition hover:bg-stone-800"
        >
          나가기
        </button>
      </div>
    </dialog>
  );
}
