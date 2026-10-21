"use client";

import { useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { ItemId } from "@/constants/items";
import { getLook } from "@/components/scene/looks";
import { createMaterial } from "@/components/scene/ItemPile";
import { SceneLighting } from "@/components/scene/Lighting";

/** 썸네일과 비슷한 각도: 살이 왼쪽 위, 뼈가 오른쪽 아래로 */
const ANGLE: Partial<Record<ItemId, [number, number, number]>> = {
  chicken: [0.35, 0.2, -2.35],
  pizza: [0.75, 0, 0],
  icecream: [0.15, 0, 0],
  cupramen: [0.3, 0.4, 0],
  tteokbokki: [0.55, 0, 0],
  gukbap: [0.55, 0, 0],
  burger: [0.3, 0, 0],
};

export default function ModelView({ id }: { id: ItemId }) {
  const look = getLook(id);
  const material = useMemo(() => {
    const m = createMaterial(look.style, look.material);
    m.opacity = 1;
    return m;
  }, [look]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    // 모델 크기에 맞춰 카메라 거리 조절
    <Canvas
      key={id}
      dpr={[1, 2]}
      gl={{ toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.2 }}
      camera={{ position: [0, 0, Math.max(2.6, (look.geometry.boundingSphere?.radius ?? 0.8) * 4.2)], fov: 35 }}
    >
      <SceneLighting />
      <mesh geometry={look.geometry} material={material} rotation={ANGLE[id] ?? [0.3, 0.5, 0]} position={[0, 0.05, 0]} />
      <OrbitControls enablePan={false} />
    </Canvas>
  );
}
