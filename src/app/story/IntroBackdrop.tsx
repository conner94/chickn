"use client";

import dynamic from "next/dynamic";

// three.js/rapier는 브라우저 전용이라 서버 렌더링에서 제외
const IntroDrop = dynamic(() => import("./IntroDrop"), { ssr: false });

export function IntroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <IntroDrop />
    </div>
  );
}
