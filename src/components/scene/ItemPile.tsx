"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import {
  BallCollider,
  CapsuleCollider,
  CuboidCollider,
  CylinderCollider,
  InstancedRigidBodies,
  InstancedRigidBodyProps,
  RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { ItemId } from "@/constants/items";
import { MAX_RENDERED_ITEMS, SPAWN_INTERVAL_MS } from "@/constants/scene";
import { useSequentialCount } from "@/hooks/useSequentialCount";
import { ColliderSpec, LookStyle, getLook } from "./looks";
import { Bounds } from "./StageBounds";

const FADE_SECONDS = 0.25;
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

/** 화면 위쪽 바깥에서 떨어지기 시작 */
function randomInstance(key: number, b: Bounds, size: number, upright: boolean): InstancedRigidBodyProps {
  // 오브젝트 크기만큼 벽에서 띄워서 생성 (거대한 아이템이 벽에 박힌 채 생기지 않게)
  const x = Math.max(b.halfWidth - size, 0);
  const z = Math.max(b.halfDepth - size, 0);
  return {
    key,
    position: [(Math.random() * 2 - 1) * x, b.topY + size + Math.random(), (Math.random() * 2 - 1) * z],
    rotation: upright
      ? // 윗면이 위를 보도록 ±0.3rad(약 17°)만 기울이고, 세로축 회전만 자유롭게
        [(Math.random() - 0.5) * 0.6, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.6]
      : [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
  };
}

function colliderNode(c: ColliderSpec, i: number) {
  switch (c.kind) {
    case "ball":
      return <BallCollider key={i} args={[c.r]} position={c.pos} />;
    case "cuboid":
      return <CuboidCollider key={i} args={c.half} position={c.pos} />;
    case "cylinder":
      return <CylinderCollider key={i} args={[c.halfHeight, c.r]} position={c.pos} />;
    case "capsule":
      return <CapsuleCollider key={i} args={[c.halfHeight, c.r]} position={c.pos} />;
  }
}

/** 페이드용으로 transparent, 처음엔 opacity 0에서 시작 */
export function createMaterial(style: LookStyle, overrides?: THREE.MeshPhysicalMaterialParameters): THREE.Material {
  if (style === "toy") {
    // 윤기 있는 플라스틱 장난감: 살짝 거친 바탕 + 매끈한 클리어코트 층
    return new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.42,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      sheen: 0.3,
      sheenRoughness: 0.5,
      transparent: true,
      opacity: 0,
      ...overrides,
    });
  }
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.65,
    transparent: true,
    opacity: 0,
  });
}

/** -0.5 ~ 0.5 */
const jitter = () => Math.random() - 0.5;

interface Props {
  itemId: ItemId;
  count: number;
  /** false면 페이드아웃 후 onHidden 호출 */
  visible: boolean;
  onHidden: () => void;
  /** 값이 바뀔 때마다 전체 흔들기 */
  shakeSignal: number;
  bounds: Bounds;
}

/**
 * 한 종류의 아이템 더미. 같은 모양을 InstancedMesh 하나로 그리고, 개별 물리 바디를 붙인다.
 * 아이템이 바뀌면 부모가 key를 바꿔 통째로 unmount → 물리 바디도 함께 정리된다.
 */
export function ItemPile({ itemId, count, visible, onHidden, shakeSignal, bounds }: Props) {
  const look = getLook(itemId);
  const colliderNodes = useMemo(() => look.colliders.map(colliderNode), [look]);
  const material = useMemo(() => createMaterial(look.style, look.material), [look]);
  useEffect(() => () => material.dispose(), [material]);

  const shown = useSequentialCount(Math.min(count, MAX_RENDERED_ITEMS), SPAWN_INTERVAL_MS);

  // 생성 위치는 한 번 정하면 유지 (개수가 늘 때만 뒤에 추가)
  const allInstances = useRef<InstancedRigidBodyProps[]>([]).current;
  while (allInstances.length < shown) allInstances.push(randomInstance(allInstances.length, bounds, look.geometry.boundingSphere?.radius ?? 0.6, look.upright));
  const instances = useMemo(() => allInstances.slice(0, shown), [allInstances, shown]);

  const bodies = useRef<(RapierRigidBody | null)[]>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // 아직 물리 바디가 붙지 않은 인스턴스가 원점에 보이지 않도록 전부 숨겨 둔다.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < MAX_RENDERED_ITEMS; i++) mesh.setMatrixAt(i, HIDDEN);
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  // 페이드 인/아웃
  const hiddenNotified = useRef(false);
  useFrame((_, dt) => {
    const step = dt / FADE_SECONDS;
    material.opacity = visible ? Math.min(1, material.opacity + step) : Math.max(0, material.opacity - step);
    if (!visible && material.opacity === 0 && !hiddenNotified.current) {
      hiddenNotified.current = true;
      onHidden();
    }
    if (visible) hiddenNotified.current = false;
  });

  // 흔들기: 모든 바디에 랜덤 임펄스 (질량에 비례해서 크기와 무관하게 비슷하게 튀도록)
  const lastShake = useRef(shakeSignal);
  useEffect(() => {
    if (shakeSignal === lastShake.current) return;
    lastShake.current = shakeSignal;
    bodies.current?.forEach((body) => {
      if (!body) return;
      const m = body.mass();
      body.applyImpulse({ x: jitter() * 5 * m, y: (4 + Math.random() * 4) * m, z: jitter() * 5 * m }, true);
      body.setAngvel({ x: jitter() * 12, y: jitter() * 12, z: jitter() * 12 }, true);
    });
  }, [shakeSignal]);

  // 클릭한 오브젝트 하나를 위로 튀어오르게
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 5 || e.instanceId === undefined) return; // 드래그(카메라 회전)는 무시
    e.stopPropagation();
    const body = bodies.current?.[e.instanceId];
    if (!body) return;
    const m = body.mass();
    body.applyImpulse({ x: jitter() * 1.5 * m, y: 8 * m, z: jitter() * 1.5 * m }, true);
    body.setAngvel({ x: jitter() * 8, y: jitter() * 8, z: jitter() * 8 }, true);
  };

  return (
    <InstancedRigidBodies
      ref={bodies}
      instances={instances}
      colliders={false}
      colliderNodes={colliderNodes}
      restitution={0.2}
      friction={0.9}
    >
      <instancedMesh
        ref={meshRef}
        args={[look.geometry, material, MAX_RENDERED_ITEMS]}
        count={shown}
        frustumCulled={false}
        onClick={handleClick}
      />
    </InstancedRigidBodies>
  );
}
