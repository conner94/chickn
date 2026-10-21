"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import { ItemId } from "@/constants/items";
import { PALETTE } from "@/constants/palette";
import { ItemPile } from "@/components/scene/ItemPile";
import { SceneLighting } from "@/components/scene/Lighting";
import { Bounds, StageBounds } from "@/components/scene/StageBounds";

/** 인트로 배경에 쏟아지는 아이템 구성 */
const MIX: Record<ItemId, number> = {
  pizza: 1,
  icecream: 4,
  samgak: 4,
  coffee: 4,
  soju: 4,
  chicken: 2,
  cupramen: 2,
  tteokbokki: 2,
  burger: 2,
  gukbap: 2,
};

/** 한 개씩 떨어지는 간격(ms) */
const DROP_INTERVAL_MS = 160;

/** 종류가 섞여서 떨어지도록 떨어지는 순서를 섞는다 */
function shuffledOrder(): ItemId[] {
  const order = (Object.keys(MIX) as ItemId[]).flatMap((id) => Array<ItemId>(MIX[id]).fill(id));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

const noop = () => {};

const FOV = 35;
const HALF_DEPTH = 2.5;

/**
 * 인트로 영역 크기에 맞춘 카메라 거리와 물리 경계.
 * 서비스(폰 화면에 약 84px = 1유닛)와 비슷한 크기로 보이게, 화면 높이로 카메라 거리를 정한다.
 * 좁은 화면은 조금 더 멀리 — 아이템이 작아지고 덜 빽빽하게 쌓인다.
 */
function useStage(): Bounds {
  const { width, height } = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  const tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const pxPerUnit = width < 768 ? 60 : 100;
  const cameraZ = Math.max(height / pxPerUnit, 6) / 2 / tanV;
  useEffect(() => {
    camera.position.set(0, 0, cameraZ);
    camera.updateProjectionMatrix();
  }, [camera, cameraZ]);
  return useMemo(() => {
    const halfH = (cameraZ - HALF_DEPTH) * tanV;
    const halfW = halfH * (width / Math.max(height, 1));
    const round = (v: number) => Math.round(v * 100) / 100;
    return { floorY: round(-halfH), halfWidth: round(Math.max(halfW - 0.15, 1)), halfDepth: HALF_DEPTH, topY: round(cameraZ * tanV) };
  }, [cameraZ, tanV, width, height]);
}

function Scene() {
  const bounds = useStage();
  const order = useMemo(shuffledOrder, []);
  // 지금까지 떨어뜨린 개수 → 종류별 개수로 나눠 각 더미에 넘긴다
  const [dropped, setDropped] = useState(0);
  useEffect(() => {
    if (dropped >= order.length) return;
    const id = setTimeout(() => setDropped((n) => n + 1), dropped === 0 ? 400 : DROP_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [dropped, order.length]);
  const counts = useMemo(() => {
    const c = {} as Record<ItemId, number>;
    order.slice(0, dropped).forEach((id) => (c[id] = (c[id] ?? 0) + 1));
    return c;
  }, [order, dropped]);

  return (
    <>
      <SceneLighting />
      <ContactShadows
        position={[0, bounds.floorY + 0.005, 0]}
        scale={[bounds.halfWidth * 2 + 2, bounds.halfDepth * 2 + 2]}
        resolution={512}
        far={1.4}
        blur={1.7}
        opacity={0.5}
        color={PALETTE.contactShadow}
      />
      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]}>
          <StageBounds bounds={bounds} />
          {(Object.keys(MIX) as ItemId[]).map((id) => (
            // 서비스와 같은 더미 컴포넌트를 종류마다 하나씩 (인스턴싱 + 물리)
            // ItemPile은 count를 다시 100ms 간격으로 따라가므로 여기서 이미 순서대로 늘려 준다
            <ItemPile key={id} itemId={id} count={counts[id] ?? 0} visible onHidden={noop} shakeSignal={0} bounds={bounds} />
          ))}
        </Physics>
      </Suspense>
    </>
  );
}

/** /story 인트로 배경: 서비스처럼 10종 아이템이 위에서 쏟아져 바닥에 쌓인다. 클릭은 아래 콘텐츠로 통과 */
export default function IntroDrop() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ alpha: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.2 }}
      camera={{ position: [0, 0, 16], fov: FOV }}
      style={{ pointerEvents: "none" }}
    >
      <Scene />
    </Canvas>
  );
}
