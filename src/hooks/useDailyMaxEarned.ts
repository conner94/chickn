"use client";

import { useEffect, useRef, useState } from "react";
import { DailyMax, localDateKey, nextDailyMax } from "@/lib/earnings";

const STORAGE_KEY = "chickn:daily-max:v1";

function load(): DailyMax | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (parsed && typeof parsed.date === "string" && typeof parsed.max === "number") return parsed;
  } catch {
    // 무시
  }
  return null;
}

/**
 * 오늘 번 돈의 하루 중 최댓값. 아이템 개수는 이 값으로 계산해서 하루 중엔 줄어들지 않는다.
 * 새로고침해도 유지되도록 localStorage에 저장한다.
 */
export function useDailyMaxEarned(earned: number | null, now: Date | null, key: string): DailyMax | null {
  const [daily, setDaily] = useState<DailyMax | null>(null);
  const ref = useRef<DailyMax | null>(null);

  useEffect(() => {
    if (earned === null || now === null) return;
    const prev = ref.current ?? load();
    const next = nextDailyMax(prev, localDateKey(now), earned, key);
    if (next !== prev) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 무시
      }
    }
    ref.current = next;
    setDaily(next);
  }, [earned, now, key]);

  return daily;
}
