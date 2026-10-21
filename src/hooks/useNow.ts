"use client";

import { useEffect, useState } from "react";

/**
 * 현재 시각(Date)을 매초 갱신한다.
 * 매번 Date.now()로 다시 읽기 때문에 타이머 누적 오차가 없고,
 * 탭이 비활성화됐다 돌아오면 즉시 다시 계산한다.
 */
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const d = new Date();
      setNow(d);
      // 다음 초 경계에 맞춰 갱신
      timer = setTimeout(tick, 1000 - d.getMilliseconds());
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        tick();
      }
    };

    tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return now;
}
