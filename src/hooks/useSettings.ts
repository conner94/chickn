"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, WorkSettings } from "@/lib/earnings";

// 입력값은 이 브라우저의 localStorage에만 저장한다. 서버로 보내지 않는다.
const STORAGE_KEY = "chickn:settings:v1";

function load(): WorkSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<WorkSettings>;
    return {
      annualSalaryManwon:
        typeof parsed.annualSalaryManwon === "number"
          ? parsed.annualSalaryManwon
          : DEFAULT_SETTINGS.annualSalaryManwon,
      workStart: typeof parsed.workStart === "string" ? parsed.workStart : DEFAULT_SETTINGS.workStart,
      workEnd: typeof parsed.workEnd === "string" ? parsed.workEnd : DEFAULT_SETTINGS.workEnd,
      lunchStart: typeof parsed.lunchStart === "string" ? parsed.lunchStart : DEFAULT_SETTINGS.lunchStart,
      lunchEnd: typeof parsed.lunchEnd === "string" ? parsed.lunchEnd : DEFAULT_SETTINGS.lunchEnd,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** localStorage에 저장되는 근무 설정. 첫 렌더(서버/하이드레이션) 동안 loaded=false */
export function useSettings() {
  const [settings, setSettings] = useState<WorkSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  // 한 번이라도 저장한 적이 있는지 (첫 방문이면 입력 시트를 띄우는 데 사용)
  const [hasSaved, setHasSaved] = useState(true);

  useEffect(() => {
    setSettings(load());
    try {
      setHasSaved(localStorage.getItem(STORAGE_KEY) !== null);
    } catch {
      // 무시
    }
    setLoaded(true);
  }, []);

  const update = useCallback((patch: Partial<WorkSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 저장 실패(사생활 보호 모드 등)해도 화면은 계속 동작
      }
      return next;
    });
    setHasSaved(true);
  }, []);

  return { settings, update, loaded, hasSaved };
}
