"use client";

import { useEffect, useState } from "react";

/**
 * target까지 intervalMs 간격으로 1씩 따라 올라가는 개수.
 * 처음 접속 시 이미 번 만큼을 한꺼번에 떨어뜨리지 않고 순차적으로 생성하기 위해 쓴다.
 * 줄어들지 않는다 (target이 작아져도 현재 값을 유지).
 */
export function useSequentialCount(target: number, intervalMs = 100): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (count >= target) return;
    const id = setTimeout(() => setCount((c) => c + 1), intervalMs);
    return () => clearTimeout(id);
  }, [count, target, intervalMs]);

  return count;
}
