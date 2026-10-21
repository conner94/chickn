"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 연속한 두 측정 사이 가속도 변화량(m/s²)이 이보다 크면 흔든 것으로 본다 */
const SHAKE_THRESHOLD = 20;
/** 한 번 흔들림을 감지한 뒤 다음 감지까지 쉬는 시간 (ms) */
const COOLDOWN_MS = 800;

type MotionPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

/**
 * 기기를 실제로 흔들면 onShake 호출 (가속도 센서, devicemotion).
 * - 권한 함수가 없는 기기: 바로 동작
 * - 권한 함수가 있는 기기(iOS 13+): [흔들기] 버튼을 누를 때만 requestPermission으로 요청한다.
 *   접속 직후·아무 데나 탭할 때 요청하면 iOS 권한 창이 떠 있는 동안 애니메이션이 멈춰서
 *   첫 화면에 아이템이 쏟아지지 않는다.
 * - 센서는 https(보안 컨텍스트)에서만 동작한다. 휴대폰 테스트는 `npm run dev:https` 사용
 */
export function useDeviceShake(onShake: () => void) {
  const callback = useRef(onShake);
  useEffect(() => {
    callback.current = onShake;
  }, [onShake]);

  const [enabled, setEnabled] = useState(false);

  const requestPermission = useCallback(async () => {
    if (typeof DeviceMotionEvent === "undefined") return;
    const request = (DeviceMotionEvent as unknown as MotionPermission).requestPermission;
    if (typeof request !== "function") return setEnabled(true);
    try {
      if ((await request.call(DeviceMotionEvent)) === "granted") setEnabled(true);
    } catch {
      // 탭 밖에서 호출(iOS)·http 접속·거부 → 버튼으로만 흔들기
    }
  }, []);

  // 권한 함수가 없는 기기(안드로이드 등)는 묻지 않고 바로 켠다
  useEffect(() => {
    if (typeof DeviceMotionEvent === "undefined") return;
    if (typeof (DeviceMotionEvent as unknown as MotionPermission).requestPermission !== "function") setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let last: { x: number; y: number; z: number } | null = null;
    let lastShake = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      const cur = { x: a.x, y: a.y, z: a.z };
      if (last) {
        const delta = Math.abs(cur.x - last.x) + Math.abs(cur.y - last.y) + Math.abs(cur.z - last.z);
        const now = performance.now();
        if (delta > SHAKE_THRESHOLD && now - lastShake > COOLDOWN_MS) {
          lastShake = now;
          callback.current();
        }
      }
      last = cur;
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [enabled]);

  return { requestPermission };
}
