"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";

/** 화면 가장자리에 맞춘 보이지 않는 물리 경계 */
export interface Bounds {
  /** 바닥 높이 (화면 맨 아래) */
  floorY: number;
  /** 좌우 벽 x (±) */
  halfWidth: number;
  /** 앞뒤 벽 z (±) */
  halfDepth: number;
  /** 화면 맨 위 높이 (생성 위치 기준) */
  topY: number;
}

const C = 1; // 콜라이더 두께 (얇으면 빠른 물체가 뚫고 지나갈 수 있음)
const CEILING_MARGIN = 6; // 흔들어도 화면 위로 너무 멀리 날아가지 않게

/**
 * 상자 없이 화면 아래에 쌓이도록: 바닥 + 좌우·앞뒤 벽 + 천장 콜라이더 (보이지 않음).
 * 바닥 그림자는 DropScene의 ContactShadows가 그린다.
 */
export function StageBounds({ bounds }: { bounds: Bounds }) {
  const { floorY, halfWidth: w, halfDepth: d, topY } = bounds;
  const ceilingY = topY + CEILING_MARGIN;
  const midY = (floorY + ceilingY) / 2;
  const halfH = (ceilingY - floorY) / 2;
  return (
    <>
      {/* 크기가 바뀌면(화면 회전 등) key로 다시 만든다 */}
      <RigidBody key={`${floorY}:${w}:${d}:${topY}`} type="fixed" colliders={false}>
        <CuboidCollider args={[w + C, C / 2, d + C]} position={[0, floorY - C / 2, 0]} />
        <CuboidCollider args={[w + C, C / 2, d + C]} position={[0, ceilingY + C / 2, 0]} />
        <CuboidCollider args={[C / 2, halfH, d + C]} position={[w + C / 2, midY, 0]} />
        <CuboidCollider args={[C / 2, halfH, d + C]} position={[-w - C / 2, midY, 0]} />
        <CuboidCollider args={[w + C, halfH, C / 2]} position={[0, midY, d + C / 2]} />
        <CuboidCollider args={[w + C, halfH, C / 2]} position={[0, midY, -d - C / 2]} />
      </RigidBody>
    </>
  );
}
