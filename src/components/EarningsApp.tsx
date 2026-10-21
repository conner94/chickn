"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useDailyMaxEarned } from "@/hooks/useDailyMaxEarned";
import { useDeviceShake } from "@/hooks/useDeviceShake";
import { useNow } from "@/hooks/useNow";
import { useSelectedItem } from "@/hooks/useSelectedItem";
import { useSettings } from "@/hooks/useSettings";
import {
  dailyWage,
  earnedAt,
  formatDuration,
  itemCount,
  secondsOfDay,
  secondsUntilNextItem,
  settingsKey,
  validateSettings,
  workPhaseAt,
} from "@/lib/earnings";
import { ITEMS, ItemId, formatCount, getItem } from "@/constants/items";
import { MAX_RENDERED_ITEMS } from "@/constants/scene";
import { EarningsDisplay } from "./EarningsDisplay";
import { ItemMarquee } from "./ItemMarquee";
import { SettingsSheet } from "./SettingsSheet";

// three.js/rapier는 브라우저 전용이라 서버 렌더링에서 제외
const DropScene = dynamic(() => import("./scene/DropScene"), { ssr: false });

/** 쌓이는 바닥 위치: 아래 버튼 줄에서 카드 쪽으로 이만큼 올라간 지점 */
const FLOOR_RATIO = 1 / 3;

/**
 * 화면 맨 아래에서 바닥선까지의 거리(px).
 * 카드 줄 아래쪽과 버튼 줄 위쪽 사이를 FLOOR_RATIO로 나눈 지점에 바닥을 둔다. 화면 크기가 바뀌면 다시 잰다.
 */
function useFloorInset() {
  const mainRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [inset, setInset] = useState(0);

  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const measure = () => {
      const m = main.getBoundingClientRect();
      const cardsBottom = cardsRef.current?.getBoundingClientRect().bottom ?? m.top;
      const barTop = barRef.current?.getBoundingClientRect().top ?? m.bottom;
      const floorLine = barTop - (barTop - cardsBottom) * FLOOR_RATIO;
      setInset(Math.max(0, Math.round(m.bottom - floorLine)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(main);
    return () => ro.disconnect();
  }, []);

  return { mainRef, cardsRef, barRef, inset };
}

export function EarningsApp() {
  const { settings, update, loaded, hasSaved } = useSettings();
  const [itemId, selectItem] = useSelectedItem();
  const now = useNow();
  const [shakeSignal, setShakeSignal] = useState(0);
  // 버튼을 누르거나 기기를 실제로 흔들면 상자 속 아이템이 튄다
  const shake = useCallback(() => {
    setShakeSignal((n) => n + 1);
    navigator.vibrate?.(30);
  }, []);
  const deviceShake = useDeviceShake(shake);
  const [sheetOpen, setSheetOpen] = useState(false);
  const floor = useFloorInset();

  // 첫 방문이면 입력 시트를 먼저 띄운다
  useEffect(() => {
    if (loaded && !hasSaved) setSheetOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const errors = useMemo(() => validateSettings(settings), [settings]);
  const valid = errors.length === 0;
  const ready = loaded && now !== null && valid;

  const nowSec = now ? secondsOfDay(now) : 0;
  const earned = ready ? earnedAt(settings, nowSec) : null;
  const daily = valid ? dailyWage(settings) : 0;
  const progress = earned !== null && daily > 0 ? earned / daily : 0;

  // 개수는 "오늘 번 돈의 최댓값" 기준 → 하루 중엔 줄어들지 않는다
  const dailyMax = useDailyMaxEarned(earned, now, settingsKey(settings));
  const counts = useMemo(() => {
    if (!dailyMax) return null;
    return Object.fromEntries(ITEMS.map((i) => [i.id, itemCount(dailyMax.max, i.price)])) as Record<ItemId, number>;
  }, [dailyMax]);

  const item = getItem(itemId);
  const count = counts?.[itemId] ?? 0;
  const overflow = Math.max(0, count - MAX_RENDERED_ITEMS);
  const phase = ready ? workPhaseAt(settings, nowSec) : null;
  // 다음 1개를 더 획득하기까지 남은 시간 (점심시간 포함, 오늘 근무시간 안에 못 받으면 null)
  const nextIn = counts && phase ? secondsUntilNextItem(settings, nowSec, count, item.price) : null;
  const hint = !counts || !phase ? null : nextIn !== null ? `다음 획득까지 ${formatDuration(nextIn)}` : "오늘 획득 완료";

  return (
    <main ref={floor.mainRef} className="relative h-dvh min-h-[560px] w-full overflow-hidden">
      {/* 3D: 화면 전체, 투명 배경. 오브젝트가 위에서 떨어져 화면 아래에 쌓인다 */}
      <div className="absolute inset-0">
        <DropScene
          itemId={itemId}
          count={count}
          shakeSignal={shakeSignal}
          resetKey={dailyMax ? `${dailyMax.date}:${dailyMax.settingsKey ?? ""}` : ""}
          floorInsetPx={floor.inset}
        />
      </div>

      {/* UI 레이어: 빈 곳은 클릭이 3D로 통과하도록 pointer-events-none */}
      <div className="pointer-events-none relative flex h-full flex-col">
        <div className="mx-auto w-full max-w-md px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <EarningsDisplay
            earned={earned}
            phase={phase}
            progress={progress}
            workStart={settings.workStart}
            workEnd={settings.workEnd}
          />
        </div>

        <div ref={floor.cardsRef} className="pointer-events-auto mx-auto mt-4 w-full max-w-3xl">
          <ItemMarquee selectedId={itemId} counts={counts} onSelect={selectItem} />
        </div>

        <div className="mt-auto flex flex-col items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* 선택한 아이템 요약 */}
          <div className="flex max-w-full items-center gap-2 rounded-full bg-white/85 py-1.5 pr-4 pl-1.5 shadow-sm ring-1 ring-stone-900/5 backdrop-blur">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt="" width={26} height={26} className="h-[26px] w-[26px] object-contain" />
            </span>
            <span className="text-sm font-bold whitespace-nowrap text-stone-800 tabular-nums">
              {item.name} {counts ? formatCount(count, item.unit) : "—"}
            </span>
            {overflow > 0 && (
              <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-white tabular-nums">
                +{formatCount(overflow, item.unit)} 더
              </span>
            )}
            {hint && <span className="truncate text-xs text-stone-500 tabular-nums">· {hint}</span>}
          </div>

          <div ref={floor.barRef} className="pointer-events-auto flex w-full max-w-sm gap-2">
            <button
              type="button"
              onClick={() => {
                deviceShake.requestPermission(); // iOS: 버튼 탭 안에서 센서 권한 요청
                shake();
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-white/90 py-3.5 text-[15px] font-bold text-stone-800 shadow-sm ring-1 ring-stone-900/5 backdrop-blur transition hover:bg-white active:scale-[0.97]"
            >
              흔들기
            </button>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-2xl bg-stone-900 py-3.5 text-[15px] font-bold text-white shadow-md transition hover:bg-stone-800 active:scale-[0.97]"
            >
              월급 입력
            </button>
          </div>
        </div>
      </div>

      <SettingsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        settings={settings}
        onSave={update}
      />
    </main>
  );
}
