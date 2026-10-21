"use client";

import { Suspense } from "react";
import { Environment } from "@react-three/drei";
import { PALETTE } from "@/constants/palette";

/**
 * 환경맵(반사광). drei 프리셋 apartment / city / studio 를 비교해 city(Potsdamer Platz, CC0)를 골랐다.
 * 프리셋은 실행 중 외부 CDN에서 받아오므로 같은 파일을 public/에 두고 직접 불러온다.
 */
const ENV_FILE = "/hdri/potsdamer_platz_1k.hdr";

/** 키 라이트(따뜻, 위·앞) + 필 라이트(차갑고 은은, 반대편) + 하늘/바닥 반사광 + 환경맵 */
export function SceneLighting() {
  return (
    <>
      <hemisphereLight args={[PALETTE.light.sky, PALETTE.light.ground, 0.35]} />
      <directionalLight position={[4, 9, 7]} intensity={1.5} color={PALETTE.light.key} />
      <directionalLight position={[-6, 3, 4]} intensity={0.45} color={PALETTE.light.fill} />
      <Suspense fallback={null}>
        <Environment files={ENV_FILE} environmentIntensity={0.55} />
      </Suspense>
    </>
  );
}
