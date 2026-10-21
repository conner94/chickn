"use client";

import { useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// three.js/rapier는 브라우저 전용이라 서버 렌더링에서 제외
const IntroDrop = dynamic(() => import("./IntroDrop"), { ssr: false });

/**
 * 인트로 배경 3D. 바닥선은 영역 맨 아래와 폰 목업 아래 끝([data-intro-mockup])의 중간.
 * 크기가 바뀌면 다시 잰다.
 */
export function IntroBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  const [inset, setInset] = useState(0);

  useLayoutEffect(() => {
    const box = ref.current;
    const band = box?.parentElement;
    if (!box || !band) return;
    const measure = () => {
      const mockup = band.querySelector("[data-intro-mockup]");
      const bottom = box.getBoundingClientRect().bottom;
      const mockupBottom = mockup?.getBoundingClientRect().bottom ?? bottom;
      setInset(Math.max(0, Math.round((bottom - mockupBottom) / 2)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(band);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0" aria-hidden="true">
      <IntroDrop floorInsetPx={inset} />
    </div>
  );
}
