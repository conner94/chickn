"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { Bloom, EffectComposer, SSAO, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import { ItemId } from "@/constants/items";
import { PALETTE } from "@/constants/palette";
import { ItemPile } from "./ItemPile";
import { SceneLighting } from "./Lighting";
import { Bounds, StageBounds } from "./StageBounds";

const FOV = 35;
/** 카메라에서 z=0 평면까지 거리. 화면 세로에 약 10유닛이 보인다. */
const CAMERA_Z = 16;
/** 앞뒤로 쌓이는 깊이 (±) */
const HALF_DEPTH = 2.5;

/**
 * 화면 크기에 맞는 물리 경계. 가장 앞쪽 평면 기준이라 오브젝트가 화면 밖으로 잘리지 않는다.
 * floorInsetPx: 화면 맨 아래에서 바닥선까지 거리(px) — 앞쪽 오브젝트가 이 높이에 놓인다.
 */
function useBounds(floorInsetPx: number): Bounds {
  const { width, height } = useThree((s) => s.size);
  return useMemo(() => {
    const tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const front = CAMERA_Z - HALF_DEPTH;
    const halfH = front * tanV;
    const halfW = halfH * (width / Math.max(height, 1));
    const round = (v: number) => Math.round(v * 100) / 100;
    return {
      floorY: round(-halfH + (Math.min(floorInsetPx, height * 0.8) / Math.max(height, 1)) * 2 * halfH),
      halfWidth: round(Math.max(halfW - 0.15, 1)),
      halfDepth: HALF_DEPTH,
      topY: round(CAMERA_Z * tanV),
    };
  }, [width, height, floorInsetPx]);
}

/** 모바일(터치 위주 또는 좁은 화면)이면 후처리를 끄고 그림자 해상도를 낮춘다 */
function useLowPower(): boolean {
  const [low, setLow] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse), (max-width: 767px)");
    const update = () => setLow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return low;
}

interface SceneProps {
  itemId: ItemId;
  count: number;
  shakeSignal: number;
  resetKey: string;
  floorInsetPx: number;
}

function Scene({ itemId, count, shakeSignal, resetKey, floorInsetPx }: SceneProps) {
  const bounds = useBounds(floorInsetPx);
  const lowPower = useLowPower();
  // 아이템이 바뀌면 기존 더미를 페이드아웃 → unmount 한 뒤 새 아이템으로 교체
  const [displayedId, setDisplayedId] = useState(itemId);
  const visible = displayedId === itemId;
  const handleHidden = useCallback(() => setDisplayedId(itemId), [itemId]);

  return (
    <>
      <SceneLighting />

      <ContactShadows
        position={[0, bounds.floorY + 0.005, 0]}
        scale={[bounds.halfWidth * 2 + 2, bounds.halfDepth * 2 + 2]}
        // 넓은 화면에서도 번지지 않게: 바닥 가까이 있는 것만, 짧게 흐리게
        resolution={lowPower ? 512 : 1024}
        far={1.4}
        blur={1.7}
        opacity={0.5}
        color={PALETTE.contactShadow}
      />

      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]}>
          <StageBounds bounds={bounds} />
          <ItemPile
            key={`${displayedId}:${resetKey}`}
            itemId={displayedId}
            // 페이드아웃 중인 더미는 더 늘리지 않는다
            count={visible ? count : 0}
            visible={visible}
            onHidden={handleHidden}
            shakeSignal={shakeSignal}
            bounds={bounds}
          />
        </Physics>
      </Suspense>

      {/* 후처리: 데스크톱에서만. 아주 약한 SSAO(틈새 음영) + Bloom(하이라이트 번짐) */}
      {!lowPower && (
        <EffectComposer enableNormalPass multisampling={4}>
          <SSAO
            samples={16}
            radius={0.05}
            intensity={5}
            bias={0.03}
            luminanceInfluence={0.7}
            worldDistanceThreshold={1}
            worldDistanceFalloff={0.5}
            worldProximityThreshold={0.4}
            worldProximityFalloff={0.2}
          />
          <Bloom mipmapBlur luminanceThreshold={0.88} luminanceSmoothing={0.2} intensity={0.35} />
          {/* 후처리 경로에선 렌더러 톤매핑이 빠지므로 모바일(후처리 없음)과 같은 색이 나오게 다시 적용 (Neutral: 주황 등 채도 유지) */}
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        </EffectComposer>
      )}
    </>
  );
}

/**
 * 위에서 떨어진 아이템이 화면 아래에 쌓이는 장면.
 * 배경은 투명 — 페이지의 CSS 그라데이션(globals.css)이 비친다. (후처리 톤매핑이 배경색을 바꾸지 않도록)
 */
export default function DropScene(props: SceneProps) {
  return (
    <Canvas dpr={[1, 2]} gl={{ alpha: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.2 }} camera={{ position: [0, 0, CAMERA_Z], fov: FOV }}>
      <Scene {...props} />
    </Canvas>
  );
}
