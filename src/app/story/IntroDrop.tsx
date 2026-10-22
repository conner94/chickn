"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { Physics, useRapier } from "@react-three/rapier";
import * as THREE from "three";
import { ItemId } from "@/constants/items";
import { PALETTE } from "@/constants/palette";
import { ItemPile } from "@/components/scene/ItemPile";
import { SceneLighting } from "@/components/scene/Lighting";
import { Bounds, StageBounds } from "@/components/scene/StageBounds";

/** 인트로 배경에 쏟아지는 아이템 구성 */
const MIX: Record<ItemId, number> = {
  pizza: 2,
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
 * floorInsetPx: 영역 맨 아래에서 바닥선까지 거리(px).
 * 좁은 화면은 조금 더 멀리 — 아이템이 작아지고 덜 빽빽하게 쌓인다.
 */
function useStage(floorInsetPx: number): Bounds {
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
    return { floorY: round(-halfH + (Math.min(floorInsetPx, height * 0.8) / Math.max(height, 1)) * 2 * halfH), halfWidth: round(Math.max(halfW - 0.15, 1)), halfDepth: HALF_DEPTH, topY: round(cameraZ * tanV) };
  }, [cameraZ, tanV, width, height, floorInsetPx]);
}

/** 반경 안의 아이템이 받는 최대 힘(질량 1 기준)과 반경(유닛) */
const HIT_FORCE = 9;
const HIT_RADIUS = 3;

/** 마우스를 올리고 움직일 때 살짝 밀어내는 힘·반경, 같은 아이템을 다시 밀기까지 쉬는 시간(ms) */
const NUDGE_FORCE = 2.4;
const NUDGE_RADIUS = 1.1;
const NUDGE_COOLDOWN_MS = 180;

/**
 * 오브젝트에 마우스를 올리면 클릭 가능한 커서로, 누르면(터치 포함) 그 지점을 중심으로 주변 아이템을 튕겨 낸다.
 * 가까울수록 세게, 바깥쪽 + 위쪽으로.
 * 마우스는 올려서 움직이기만 해도 커서가 지나가는 방향으로 살짝 튀며 밀린다 (터치는 누를 때만).
 */
function Hittable({ children }: { children: React.ReactNode }) {
  const { world } = useRapier();
  const gl = useThree((s) => s.gl);
  const groupRef = useRef<THREE.Group>(null);
  // InstancedMesh는 처음 계산한 경계 구로 레이캐스트를 걸러서, 움직인 아이템이 안 잡힌다. 매 프레임 다시 계산하게 비운다.
  useFrame(() => {
    groupRef.current?.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) o.boundingSphere = null;
    });
  });
  const setCursor = (c: string) => (gl.domElement.style.cursor = c);
  const lastPoint = useRef<THREE.Vector3 | null>(null);
  const lastNudge = useRef(new Map<number, number>());
  const nudge = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (e.pointerType !== "mouse") return;
      e.stopPropagation();
      const p = e.point;
      const prev = lastPoint.current;
      lastPoint.current = p.clone();
      // 커서가 움직인 방향(없으면 바깥쪽)으로 민다
      const mx = prev ? p.x - prev.x : 0;
      const mz = prev ? p.z - prev.z : 0;
      const mLen = Math.hypot(mx, mz);
      const now = performance.now();
      world.forEachRigidBody((body) => {
        if (!body.isDynamic()) return;
        const t = body.translation();
        const dx = t.x - p.x, dy = t.y - p.y, dz = t.z - p.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist > NUDGE_RADIUS) return;
        if (now - (lastNudge.current.get(body.handle) ?? 0) < NUDGE_COOLDOWN_MS) return;
        lastNudge.current.set(body.handle, now);
        const f = (1 - dist / NUDGE_RADIUS) * NUDGE_FORCE * body.mass();
        const len = Math.max(Math.hypot(dx, dz), 0.3);
        const [ux, uz] = mLen > 0.01 ? [mx / mLen, mz / mLen] : [dx / len, dz / len];
        body.applyImpulse({ x: ux * f, y: f * 0.7, z: uz * f * 0.5 }, true);
        body.applyTorqueImpulse({ x: (Math.random() - 0.5) * f * 0.1, y: (Math.random() - 0.5) * f * 0.1, z: -ux * f * 0.15 }, true);
      });
    },
    [world],
  );
  const hit = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const p = e.point;
      world.forEachRigidBody((body) => {
        if (!body.isDynamic()) return;
        const t = body.translation();
        const dx = t.x - p.x, dy = t.y - p.y, dz = t.z - p.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist > HIT_RADIUS) return;
        const f = (1 - dist / HIT_RADIUS) * HIT_FORCE * body.mass();
        const len = Math.max(dist, 0.3);
        body.applyImpulse({ x: (dx / len) * f, y: f * 0.9 + Math.max(dy, 0), z: (dz / len) * f * 0.5 }, true);
        body.setAngvel({ x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10, z: (Math.random() - 0.5) * 10 }, true);
      });
    },
    [world],
  );
  return (
    <group
      ref={groupRef}
      onPointerDown={hit}
      onPointerMove={nudge}
      onPointerOver={(e) => {
        e.stopPropagation();
        setCursor("pointer");
      }}
      onPointerOut={() => {
        setCursor("");
        lastPoint.current = null;
      }}
    >
      {children}
    </group>
  );
}

function Scene({ floorInsetPx }: { floorInsetPx: number }) {
  const bounds = useStage(floorInsetPx);
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
          <Hittable>
            {(Object.keys(MIX) as ItemId[]).map((id) => (
              // 서비스와 같은 더미 컴포넌트를 종류마다 하나씩 (인스턴싱 + 물리)
              // ItemPile은 count를 다시 100ms 간격으로 따라가므로 여기서 이미 순서대로 늘려 준다
              <ItemPile key={id} itemId={id} count={counts[id] ?? 0} visible onHidden={noop} shakeSignal={0} bounds={bounds} />
            ))}
          </Hittable>
        </Physics>
      </Suspense>
    </>
  );
}

/** /story 인트로 배경: 서비스처럼 10종 아이템이 위에서 쏟아져 바닥에 쌓이고, 누르면 튕겨 나간다 */
export default function IntroDrop({ floorInsetPx }: { floorInsetPx: number }) {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ alpha: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.2 }}
      camera={{ position: [0, 0, 16], fov: FOV }}
      // 모바일에서 배경을 쓸어도 페이지 세로 스크롤은 되도록
      style={{ touchAction: "pan-y" }}
    >
      <Scene floorInsetPx={floorInsetPx} />
    </Canvas>
  );
}
