"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ITEMS, ItemId } from "@/constants/items";
import { getLook } from "@/components/scene/looks";
import { createMaterial } from "@/components/scene/ItemPile";
import { SceneLighting } from "@/components/scene/Lighting";

const FOV = 35;
/** 아이템 하나가 한 번에 쏟아지는 개수 */
export const RAIN_COUNT = 10;
/** 종류별 동시에 떠 있을 수 있는 최대 개수 (연타 대비) */
const CAPACITY = 60;
const GRAVITY = 9.8;
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

interface Drop {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  spin: THREE.Vector3;
}

/** 화면 높이 기준으로 1유닛 크기를 정하고 카메라 거리를 맞춘다. 화면 세로 절반 높이(유닛)를 돌려준다 */
function useViewport() {
  const { width, height } = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  const pxPerUnit = width < 768 ? 60 : 100;
  const halfH = height / pxPerUnit / 2;
  const halfW = width / pxPerUnit / 2;
  const z = halfH / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  useEffect(() => {
    camera.position.set(0, 0, z);
    camera.updateProjectionMatrix();
  }, [camera, z]);
  return { halfH, halfW };
}

/** 한 종류의 낙하 묶음. bursts가 늘 때마다 화면 위 바깥에서 RAIN_COUNT개를 떨어뜨리고, 화면 아래로 나가면 지운다 */
function Rain({ id, bursts }: { id: ItemId; bursts: number }) {
  const look = getLook(id);
  const material = useMemo(() => {
    const m = createMaterial(look.style, look.material);
    m.opacity = 1;
    m.transparent = false;
    return m;
  }, [look]);
  useEffect(() => () => material.dispose(), [material]);

  const { halfH, halfW } = useViewport();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const drops = useRef<Drop[]>([]);
  const seen = useRef(0);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < CAPACITY; i++) mesh.setMatrixAt(i, HIDDEN);
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  // 새 클릭만큼 추가 (가로로 고르게 흩뿌리고, 높이를 달리해 우르르 쏟아지게)
  useEffect(() => {
    for (; seen.current < bursts; seen.current++) {
      for (let i = 0; i < RAIN_COUNT && drops.current.length < CAPACITY; i++) {
        const slot = (i + Math.random()) / RAIN_COUNT;
        drops.current.push({
          pos: new THREE.Vector3((slot * 2 - 1) * halfW * 0.9, halfH + 1 + Math.random() * 3, (Math.random() - 0.5) * 2),
          vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, -(1 + Math.random() * 3), 0),
          rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
          spin: new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5),
        });
      }
    }
  }, [bursts, halfH, halfW]);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const one = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  useFrame((_, rawDt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dt = Math.min(rawDt, 1 / 30);
    const list = drops.current;
    for (const d of list) {
      d.vel.y -= GRAVITY * dt;
      d.pos.addScaledVector(d.vel, dt);
      d.rot.x += d.spin.x * dt;
      d.rot.y += d.spin.y * dt;
      d.rot.z += d.spin.z * dt;
    }
    // 화면 아래로 완전히 나간 것은 제거
    drops.current = list.filter((d) => d.pos.y > -halfH - 2);
    drops.current.forEach((d, i) => mesh.setMatrixAt(i, m.compose(d.pos, q.setFromEuler(d.rot), one)));
    for (let i = drops.current.length; i < list.length; i++) mesh.setMatrixAt(i, HIDDEN);
    mesh.count = Math.max(drops.current.length, 0);
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[look.geometry, material, CAPACITY]} frustumCulled={false} />;
}

/** 화면 전체를 덮는 투명 캔버스 (클릭은 통과). 아이템 카드를 누를 때마다 그 아이템이 쏟아진다 */
export default function RainCanvas({ bursts }: { bursts: Partial<Record<ItemId, number>> }) {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ alpha: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.2 }}
      camera={{ position: [0, 0, 16], fov: FOV }}
      style={{ position: "fixed", inset: 0, zIndex: 50, pointerEvents: "none" }}
    >
      <SceneLighting />
      {ITEMS.map((item) => (bursts[item.id] ? <Rain key={item.id} id={item.id} bursts={bursts[item.id]!} /> : null))}
    </Canvas>
  );
}
