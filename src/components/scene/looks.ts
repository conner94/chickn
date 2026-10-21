import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ITEMS, ItemId, getItem } from "@/constants/items";
import { PALETTE } from "@/constants/palette";

// 아이템별 로우폴리 모양 정의.
// 박스/원기둥/구 부품을 조합한 뒤 하나의 지오메트리(정점 색상)로 합쳐서
// 아이템 한 종류 = InstancedMesh 하나 = 드로우콜 하나가 되게 한다.

type Vec3 = [number, number, number];

interface Transform {
  pos?: Vec3;
  rot?: Vec3;
  scale?: Vec3;
}

interface Coloring {
  color: string;
  /** 있으면 부품 아래(color) → 위(color2)로 그라데이션 */
  color2?: string;
}

/** 표면 요철 (튀김옷 같은 오돌토돌함). 값은 지오메트리 단위 */
interface Bumps {
  /** 둥근 알갱이: 높이, 단위 길이당 알갱이 수 (크기가 제각각이고 서로 겹친다) */
  grains: [amp: number, freq: number];
  /** 큰 울퉁불퉁함 (비대칭 실루엣) */
  coarse?: [amp: number, freq: number];
  /** 오목한 곳 → 볼록한 곳 색 (이 값이 있으면 color/color2 대신 사용) */
  palette: [deep: string, base: string, light: string];
  seed?: number;
}

type Part = Transform &
  Coloring &
  (
    | { kind: "box"; size: Vec3 }
    | { kind: "cyl"; rTop: number; rBottom: number; h: number; seg?: number }
    | { kind: "sphere"; r: number; seg?: number }
    /** 단면 윤곽 [반지름, 높이]을 y축으로 회전시킨 형태 (부드럽게 보간). 컵·그릇·드럼스틱 등. 점은 아래 → 위 순서 */
    | {
        kind: "lathe";
        profile: [r: number, y: number][];
        seg?: number;
        samples?: number;
        bumps?: Bumps;
        /** 와플 콘 같은 사선 격자: 둘레당 줄 수, 줄 색, 홈 깊이 */
        waffle?: { lines: number; color: string; depth: number };
        /** 세로 골(슬리브 등): 둘레당 골 수, 홈 깊이 */
        ribs?: { count: number; depth: number };
      }
    /** 모서리가 둥근 다각형(xy 평면)을 z로 두께만큼 밀어낸 형태, 가장자리도 둥글게 */
    | { kind: "extrude"; points: [x: number, y: number][]; corner: number; depth: number; bevel: number }
  );

/** flat: 각진 로우폴리 / toy: 매끈하고 윤기 있는 장난감(클리어코트) */
export type LookStyle = "flat" | "toy";

export type ColliderSpec =
  | { kind: "ball"; r: number; pos?: Vec3 }
  | { kind: "cuboid"; half: Vec3; pos?: Vec3 }
  | { kind: "cylinder"; halfHeight: number; r: number; pos?: Vec3 }
  | { kind: "capsule"; halfHeight: number; r: number; pos?: Vec3 };

interface LookDef {
  parts: Part[];
  colliders: ColliderSpec[];
  /** 가격 비례 크기에 추가로 곱하는 배율 (납작해서 작아 보이는 아이템용) */
  boost?: number;
  style?: LookStyle;
  /** 재질 미세 조정 (style 기본값 위에 덮어씀) */
  material?: THREE.MeshPhysicalMaterialParameters;
  /** 윗면이 위를 보게 떨어뜨림 (살짝만 기울여 생성). 피자처럼 앞뒤가 있는 납작한 아이템용 */
  upright?: boolean;
}

// ─── 형태 그룹 ──────────────────────────────────────────────

/** 컵형: 몸통(원기둥) + 띠 + 뚜껑. 콜라·커피·소주맥주·컵라면 */
function cup(o: {
  r: number;
  rb?: number;
  h: number;
  body: string;
  band?: { color: string; h: number; y?: number };
  lid?: { color: string; h: number; r?: number };
  extras?: Part[];
}): LookDef {
  const rb = o.rb ?? o.r;
  const radiusAt = (y: number) => rb + (o.r - rb) * ((y + o.h / 2) / o.h);
  const parts: Part[] = [{ kind: "cyl", rTop: o.r, rBottom: rb, h: o.h, color: o.body }];
  if (o.band) {
    const y = o.band.y ?? 0;
    const bh = o.band.h;
    parts.push({
      kind: "cyl",
      rTop: radiusAt(y + bh / 2) * 1.04,
      rBottom: radiusAt(y - bh / 2) * 1.04,
      h: bh,
      pos: [0, y, 0],
      color: o.band.color,
    });
  }
  const lidH = o.lid?.h ?? 0;
  if (o.lid) {
    const lr = o.lid.r ?? o.r * 1.06;
    parts.push({ kind: "cyl", rTop: lr, rBottom: lr, h: lidH, pos: [0, o.h / 2 + lidH / 2, 0], color: o.lid.color });
  }
  parts.push(...(o.extras ?? []));
  return {
    parts,
    colliders: [{ kind: "cylinder", halfHeight: (o.h + lidH) / 2, r: Math.max(o.r, rb), pos: [0, lidH / 2, 0] }],
  };
}

/** 박스형: 납작하거나 각진 몸통 + 장식. 티켓·카드·김밥·햄버거·피자 등 */
function box(o: { size: Vec3; color: string; extras?: Part[]; collider?: ColliderSpec; boost?: number }): LookDef {
  return {
    boost: o.boost,
    parts: [{ kind: "box", size: o.size, color: o.color }, ...(o.extras ?? [])],
    colliders: [o.collider ?? { kind: "cuboid", half: [o.size[0] / 2, o.size[1] / 2, o.size[2] / 2] }],
  };
}

/** 구/원형: 둥근 몸통 위주. 아이스크림·붕어빵·그릇·삼겹살·치킨 */
function round(o: { parts: Part[]; colliders: ColliderSpec[] }): LookDef {
  return o;
}

const HALF_PI = Math.PI / 2;

// 국밥 파: 가운데가 뚫린 초록 고리
const SCALLION_RING: Part = {
  kind: "lathe",
  profile: [
    [0.01, 0.005],
    [0.017, 0],
    [0.024, 0.005],
    [0.017, 0.01],
    [0.01, 0.005],
  ],
  seg: 16,
  samples: 10,
  color: PALETTE.gukbap.scallion,
};

// 피자 토핑 (같은 모양을 여러 개 놓으므로 위치만 바꿔 쓴다)
const PEPPERONI: Part = {
  kind: "lathe",
  // 가운데가 도톰하게 부푼 원판
  profile: [
    [0, 0],
    [0.047, 0],
    [0.046, 0.007],
    [0.03, 0.014],
    [0, 0.016],
  ],
  seg: 24,
  samples: 10,
  color: PALETTE.pizza.pepperoni,
  color2: PALETTE.pizza.pepperoniLight,
};
const OLIVE: Part = {
  kind: "lathe",
  // 단면이 둥근 고리
  profile: [
    [0.008, 0.006],
    [0.016, 0],
    [0.024, 0.006],
    [0.016, 0.013],
    [0.008, 0.006],
  ],
  seg: 16,
  samples: 10,
  color: PALETTE.pizza.olive,
};
const BASIL: Part = { kind: "sphere", r: 1, seg: 12, scale: [0.045, 0.007, 0.026], color: PALETTE.pizza.basil, color2: PALETTE.pizza.basilLight };

// ─── 아이템별 모양 ─────────────────────────────────────────

const LOOKS: Record<ItemId, LookDef> = {
  // 컵형
  // 커피(테이크아웃 컵): 원본처럼 베이지 컵 + 세로 골 갈색 슬리브 + 둥근 뚜껑.
  // 클레이 질감: 반사 없는 무광 + 부드러운 쉰(sheen)으로 보슬보슬한 표면 (요철·얼룩은 결이 생겨서 뺌)
  coffee: {
    style: "toy",
    material: { roughness: 0.88, clearcoat: 0, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color("#fff3df") },
    parts: [
      {
        kind: "lathe",
        profile: [[0, -0.3], [0.126, -0.3], [0.136, -0.285], [0.157, 0.0], [0.172, 0.13], [0, 0.13]],
        seg: 96,
        samples: 60,
        color: PALETTE.coffee.cupDeep,
        color2: PALETTE.coffee.cupLight,
      },
      {
        kind: "lathe",
        profile: [[0.15, -0.15], [0.158, -0.148], [0.17, 0.06], [0.162, 0.065]],
        seg: 120,
        samples: 30,
        color: PALETTE.coffee.sleeveDeep,
        color2: PALETTE.coffee.sleeveLight,
        ribs: { count: 34, depth: 0.008 },
      },
      {
        kind: "lathe",
        // 뚜껑: 컵보다 살짝 넓은 테두리 → 둥근 어깨 → 평평한 윗면
        profile: [[0, 0.115], [0.18, 0.115], [0.188, 0.135], [0.184, 0.16], [0.165, 0.175], [0.152, 0.2], [0.13, 0.208], [0, 0.208]],
        seg: 96,
        samples: 40,
        color: PALETTE.coffee.cup,
        color2: PALETTE.coffee.lid,
      },
      // 마시는 구멍
      { kind: "sphere", r: 1, seg: 10, scale: [0.03, 0.006, 0.014], pos: [0, 0.207, 0.08], color: PALETTE.coffee.hole },
    ],
    colliders: [{ kind: "cylinder", halfHeight: 0.255, r: 0.19, pos: [0, -0.045, 0] }],
  },
  // 소주: 원본의 초록 유리병만 (잔은 뺌). 둥근 어깨 + 긴 목 + 진한 초록 뚜껑 + 크림색 라벨 띠
  soju: {
    style: "toy",
    material: { roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08 },
    parts: [
      {
        kind: "lathe",
        profile: [[0, -0.3], [0.105, -0.3], [0.115, -0.28], [0.115, 0.02], [0.105, 0.07], [0.06, 0.13], [0.042, 0.17], [0.04, 0.22], [0.044, 0.235], [0, 0.24]],
        seg: 48,
        samples: 40,
        color: PALETTE.soju.glassDeep,
        color2: PALETTE.soju.glass,
      },
      // 라벨 띠
      { kind: "lathe", profile: [[0.116, -0.19], [0.119, -0.185], [0.119, -0.01], [0.116, -0.005]], seg: 48, samples: 8, color: PALETTE.soju.label },
      // 뚜껑 (홈 대신 아래로 살짝 좁아지는 원통)
      { kind: "cyl", rTop: 0.05, rBottom: 0.047, h: 0.065, seg: 24, pos: [0, 0.265, 0], color: PALETTE.soju.cap, color2: PALETTE.soju.capLight },
    ],
    colliders: [{ kind: "cylinder", halfHeight: 0.3, r: 0.115, pos: [0, -0.003, 0] }],
  },
  // 컵라면: 위가 넓은 빨간 컵(아랫부분 크림색 띠) + 흰 테두리 + 오돌토돌한 노란 면과 건더기 + 반쯤 벗긴 뚜껑 + 젓가락
  cupramen: {
    style: "toy",
    material: { roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.4 },
    parts: [
      { kind: "lathe", profile: [[0, -0.28], [0.16, -0.28], [0.172, -0.13], [0.174, -0.125]], seg: 48, samples: 12, color: PALETTE.cupramen.cupBase },
      { kind: "lathe", profile: [[0.174, -0.13], [0.2, 0.05], [0.222, 0.15], [0.218, 0.152]], seg: 48, samples: 16, color: PALETTE.cupramen.cup, color2: PALETTE.cupramen.cupLight },
      // 흰 테두리
      { kind: "lathe", profile: [[0.2, 0.14], [0.235, 0.145], [0.238, 0.165], [0.21, 0.17]], seg: 48, samples: 10, color: PALETTE.cupramen.rim },
      // 면: 테두리 위로 봉긋한 원판, 꼬불꼬불한 요철
      {
        kind: "lathe",
        profile: [[0, 0.15], [0.215, 0.15], [0.208, 0.172], [0.12, 0.19], [0, 0.195]],
        seg: 64,
        samples: 36,
        color: PALETTE.cupramen.noodle,
        bumps: { grains: [0.01, 22], coarse: [0.004, 8], palette: [PALETTE.cupramen.noodleDeep, PALETTE.cupramen.noodle, PALETTE.cupramen.noodleLight], seed: 4 },
      },
      // 건더기 (파·당근)
      { kind: "sphere", r: 0.022, seg: 8, scale: [1, 0.5, 1], pos: [0.06, 0.2, 0.05], color: PALETTE.cupramen.scallion },
      { kind: "sphere", r: 0.02, seg: 8, scale: [1, 0.5, 1], pos: [-0.08, 0.195, 0.07], color: PALETTE.cupramen.scallion },
      { kind: "sphere", r: 0.018, seg: 8, scale: [1, 0.5, 1], pos: [0.02, 0.2, -0.06], color: PALETTE.cupramen.carrot },
      { kind: "sphere", r: 0.02, seg: 8, scale: [1, 0.5, 1], pos: [-0.04, 0.195, 0.12], color: PALETTE.cupramen.carrot },
      // 반쯤 벗겨 젖힌 종이 뚜껑
      { kind: "box", size: [0.26, 0.01, 0.2], rot: [-0.35, 0.35, 0.12], pos: [-0.05, 0.23, -0.16], color: PALETTE.cupramen.lidShade, color2: PALETTE.cupramen.lid },
      // 젓가락
      { kind: "cyl", rTop: 0.012, rBottom: 0.018, h: 0.34, seg: 8, rot: [0.25, 0, -0.45], pos: [0.12, 0.3, -0.04], color: PALETTE.cupramen.chopstick },
      { kind: "cyl", rTop: 0.012, rBottom: 0.018, h: 0.34, seg: 8, rot: [0.1, 0, -0.38], pos: [0.15, 0.3, 0.0], color: PALETTE.cupramen.chopstick },
    ],
    colliders: [{ kind: "cylinder", halfHeight: 0.25, r: 0.23, pos: [0, -0.03, 0] }],
  },

  // 박스형
  // 삼각김밥: 원본처럼 모서리가 둥근 하얀 밥 삼각형 + 아래 가운데를 감싼 김
  samgak: {
    style: "toy",
    material: { roughness: 0.6, clearcoat: 0.1, clearcoatRoughness: 0.5, sheen: 0.7, sheenRoughness: 0.6, sheenColor: new THREE.Color("#ffffff") },
    parts: [
      {
        kind: "extrude",
        // 통통하게: 두께와 가장자리 둥글기를 크게
        points: [
          [-0.25, -0.19],
          [0.25, -0.19],
          [0, 0.23],
        ],
        corner: 0.12,
        depth: 0.12,
        bevel: 0.07,
        color: PALETTE.samgak.riceShade,
        color2: PALETTE.samgak.rice,
      },
      // 김: 아래 가운데에서 앞뒤를 감싸는 띠
      { kind: "extrude", points: [[-0.12, -0.1], [0.12, -0.1], [0.12, 0.1], [-0.12, 0.1]], corner: 0.02, depth: 0.25, bevel: 0.012, pos: [0, -0.15, 0], color: PALETTE.samgak.nori, color2: PALETTE.samgak.noriLight },
    ],
    colliders: [{ kind: "cuboid", half: [0.28, 0.23, 0.13], pos: [0, 0.0, 0] }],
  },
  // 햄버거: 원본처럼 참깨 올린 둥근 윗빵 + 초록 양상추 + 빨간 토마토 + 노란 치즈 + 진한 패티 + 아랫빵
  burger: {
    style: "toy",
    material: { roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.35 },
    parts: [
      { kind: "lathe", profile: [[0, -0.13], [0.22, -0.13], [0.25, -0.105], [0.252, -0.075], [0, -0.07]], seg: 48, samples: 14, color: PALETTE.burger.bunDeep, color2: PALETTE.burger.bun },
      {
        kind: "lathe",
        profile: [[0, -0.075], [0.25, -0.075], [0.266, -0.04], [0.252, -0.005], [0, -0.004]],
        seg: 56,
        samples: 16,
        color: PALETTE.burger.patty,
        bumps: { grains: [0.006, 28], coarse: [0.004, 8], palette: [PALETTE.burger.pattyDeep, PALETTE.burger.patty, PALETTE.burger.pattyLight], seed: 8 },
      },
      { kind: "box", size: [0.42, 0.016, 0.42], rot: [0, 0.785, 0], pos: [0, 0.004, 0], color: PALETTE.burger.cheese },
      { kind: "cyl", rTop: 0.235, rBottom: 0.235, h: 0.024, seg: 40, pos: [0, 0.024, 0], color: PALETTE.burger.tomato },
      {
        kind: "lathe",
        // 가장자리가 물결치는 양상추
        profile: [[0, 0.036], [0.27, 0.036], [0.285, 0.046], [0.27, 0.058], [0, 0.056]],
        seg: 64,
        samples: 10,
        color: PALETTE.burger.lettuce,
        bumps: { grains: [0.004, 20], coarse: [0.02, 12], palette: [PALETTE.burger.lettuceDeep, PALETTE.burger.lettuce, PALETTE.burger.lettuceLight], seed: 3 },
      },
      { kind: "lathe", profile: [[0, 0.055], [0.25, 0.055], [0.264, 0.09], [0.24, 0.18], [0.145, 0.25], [0, 0.27]], seg: 48, samples: 24, color: PALETTE.burger.bunDeep, color2: PALETTE.burger.bun },
      { kind: "sphere", r: 1, seg: 8, scale: [0.016, 0.008, 0.009], rot: [0, 0.0, 0], pos: [0.0, 0.272, 0.0], color: PALETTE.burger.sesame },
      { kind: "sphere", r: 1, seg: 8, scale: [0.016, 0.008, 0.009], rot: [0, 0.8, 0], pos: [0.086, 0.26, 0.027], color: PALETTE.burger.sesame },
      { kind: "sphere", r: 1, seg: 8, scale: [0.016, 0.008, 0.009], rot: [0, 3.4, 0], pos: [-0.066, 0.26, 0.061], color: PALETTE.burger.sesame },
      { kind: "sphere", r: 1, seg: 8, scale: [0.016, 0.008, 0.009], rot: [0, 5.9, 0], pos: [-0.031, 0.258, -0.095], color: PALETTE.burger.sesame },
      { kind: "sphere", r: 1, seg: 8, scale: [0.016, 0.008, 0.009], rot: [0, 3.2, 0], pos: [0.058, 0.241, 0.149], color: PALETTE.burger.sesame },
      { kind: "sphere", r: 1, seg: 8, scale: [0.016, 0.008, 0.009], rot: [0, 5.7, 0], pos: [-0.17, 0.233, -0.01], color: PALETTE.burger.sesame },
      { kind: "sphere", r: 1, seg: 8, scale: [0.016, 0.008, 0.009], rot: [0, 8.2, 0], pos: [0.08, 0.234, -0.15], color: PALETTE.burger.sesame },
      { kind: "sphere", r: 1, seg: 8, scale: [0.016, 0.008, 0.009], rot: [0, 2.9, 0], pos: [0.107, 0.254, -0.073], color: PALETTE.burger.sesame },
    ],
    colliders: [{ kind: "cylinder", halfHeight: 0.2, r: 0.27, pos: [0, 0.07, 0] }],
  },
  // 피자: 원본 이미지처럼 받침 없이 도우만. 노릇하게 부푼 크러스트 + 살짝 그을린 치즈 면 +
  // 가운데가 도톰한 페퍼로니, 고리 모양 올리브, 윤기 있는 바질
  pizza: {
    style: "toy",
    boost: 1.8,
    upright: true,
    material: { roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.45, sheen: 0.15, sheenRoughness: 0.5, sheenColor: new THREE.Color("#ffe2b0") },
    parts: [
      // 바닥 도우
      { kind: "cyl", rTop: 0.29, rBottom: 0.28, h: 0.02, seg: 48, pos: [0, 0.01, 0], color: PALETTE.pizza.crustDeep },
      {
        kind: "lathe",
        // 도톰하게 말린 크러스트 고리 (단면이 둥근 빵)
        profile: [
          [0.235, 0.012],
          [0.27, 0.0],
          [0.295, 0.014],
          [0.303, 0.036],
          [0.288, 0.056],
          [0.258, 0.056],
          [0.24, 0.038],
          [0.235, 0.012],
        ],
        seg: 96,
        samples: 40,
        color: PALETTE.pizza.crust,
        bumps: { grains: [0.005, 26], coarse: [0.005, 6], palette: [PALETTE.pizza.crustDeep, PALETTE.pizza.crust, PALETTE.pizza.crustLight], seed: 5 },
      },
      {
        kind: "lathe",
        // 치즈 면: 가장자리가 살짝 내려간 원판, 녹은 치즈 요철 + 군데군데 노릇한 점
        // 회전체 윤곽은 아래 → 위 순서여야 면이 바깥을 향한다
        profile: [
          [0, 0.015],
          [0.25, 0.015],
          [0.248, 0.032],
          [0.22, 0.042],
          [0.12, 0.046],
          [0, 0.044],
        ],
        seg: 72,
        samples: 40,
        color: PALETTE.pizza.cheese,
        bumps: { grains: [0.004, 30], coarse: [0.004, 8], palette: [PALETTE.pizza.cheeseToasted, PALETTE.pizza.cheese, PALETTE.pizza.cheeseLight], seed: 9 },
      },
      { ...PEPPERONI, pos: [0, 0.052, 0] },
      { ...PEPPERONI, pos: [0.153, 0.052, 0.047] },
      { ...PEPPERONI, pos: [0.035, 0.052, 0.156] },
      { ...PEPPERONI, pos: [-0.117, 0.052, 0.109] },
      { ...PEPPERONI, pos: [-0.153, 0.052, -0.047] },
      { ...PEPPERONI, pos: [-0.035, 0.052, -0.156] },
      { ...PEPPERONI, pos: [0.117, 0.052, -0.109] },
      { ...OLIVE, pos: [0.057, 0.052, 0.088] },
      { ...OLIVE, pos: [-0.088, 0.052, 0.057] },
      { ...OLIVE, pos: [-0.057, 0.052, -0.088] },
      { ...OLIVE, pos: [0.088, 0.052, -0.057] },
      { ...BASIL, rot: [0.15, 0.4, 0], pos: [0.124, 0.058, 0.157] },
      { ...BASIL, rot: [0.15, 1.1, 0], pos: [-0.198, 0.058, 0.029] },
      { ...BASIL, rot: [0.15, 1.8, 0], pos: [0.074, 0.058, -0.186] },
    ],
    colliders: [{ kind: "cylinder", halfHeight: 0.04, r: 0.31, pos: [0, 0.035, 0] }],
  },

  // 구/원형
  // 아이스크림: 원본 이미지처럼 격자무늬 와플 콘 + 층층이 감겨 올라가 끝이 뾰족한 바닐라 소프트아이스크림
  icecream: {
    style: "toy",
    // 클리어코트가 환경맵의 회색을 반사해 크림이 탁해 보여서 낮추고, 따뜻한 쉰(sheen)으로 크림 느낌
    material: { roughness: 0.5, clearcoat: 0.08, clearcoatRoughness: 0.5, sheen: 0.8, sheenRoughness: 0.6, sheenColor: new THREE.Color("#fff0d0") },
    parts: [
      {
        kind: "lathe",
        profile: [
          [0.004, -0.42],
          [0.06, -0.21],
          [0.112, 0.0],
          [0.1, 0.005],
        ],
        seg: 64,
        samples: 40,
        color: PALETTE.icecream.cone,
        color2: PALETTE.icecream.coneLight,
        waffle: { lines: 9, color: PALETTE.icecream.coneLine, depth: 0.006 },
      },
      // 콘 윗부분의 매끈한 테두리 띠
      {
        kind: "lathe",
        profile: [
          [0.1, -0.005],
          [0.135, 0.0],
          [0.15, 0.045],
          [0.148, 0.085],
          [0.12, 0.09],
        ],
        seg: 48,
        samples: 20,
        color: PALETTE.icecream.cone,
        color2: PALETTE.icecream.coneLight,
      },
      {
        kind: "lathe",
        // 볼록-오목을 반복하며 좁아지는 소프트아이스크림 층 → 위로 살짝 뾰족한 끝
        profile: [
          [0, 0.07],
          [0.13, 0.07],
          [0.158, 0.11],
          [0.14, 0.16],
          [0.128, 0.175],
          [0.136, 0.21],
          [0.11, 0.255],
          [0.096, 0.268],
          [0.098, 0.3],
          [0.07, 0.34],
          [0.045, 0.36],
          [0.03, 0.39],
          [0.01, 0.43],
          [0, 0.44],
        ],
        seg: 48,
        samples: 64,
        // 콘보다 넓게 풍성하게
        scale: [1.4, 1.2, 1.4],
        pos: [0, -0.005, 0],
        color: PALETTE.icecream.creamShade,
        color2: PALETTE.icecream.cream,
      },
    ],
    colliders: [{ kind: "capsule", halfHeight: 0.26, r: 0.19, pos: [0, 0.04, 0] }],
  },
  // 떡볶이: 원본처럼 붉은 그릇 + 빨간 소스 + 하얀 떡·주황 어묵·파 (숟가락은 뺌)
  tteokbokki: {
    style: "toy",
    material: { roughness: 0.45, clearcoat: 0.15, clearcoatRoughness: 0.4 },
    parts: [
      { kind: "lathe", profile: [[0, -0.13], [0.17, -0.13], [0.25, -0.05], [0.29, 0.06], [0.3, 0.09], [0.275, 0.098]], seg: 56, samples: 24, color: PALETTE.tteokbokki.bowl, color2: PALETTE.tteokbokki.bowlLight },
      {
        kind: "lathe",
        profile: [[0, 0.06], [0.28, 0.06], [0.278, 0.08], [0, 0.085]],
        seg: 56,
        samples: 12,
        color: PALETTE.tteokbokki.sauce,
        bumps: { grains: [0.004, 26], coarse: [0.004, 6], palette: [PALETTE.tteokbokki.sauceDeep, PALETTE.tteokbokki.sauce, PALETTE.tteokbokki.sauceLight], seed: 6 },
      },
      { kind: "cyl", rTop: 0.036, rBottom: 0.036, h: 0.17, seg: 14, rot: [0, 0.3, HALF_PI], pos: [0.02, 0.1, 0.07], color: PALETTE.tteokbokki.cakeShade, color2: PALETTE.tteokbokki.cake },
      { kind: "cyl", rTop: 0.036, rBottom: 0.036, h: 0.17, seg: 14, rot: [0, 1.2, HALF_PI], pos: [-0.1, 0.1, -0.03], color: PALETTE.tteokbokki.cakeShade, color2: PALETTE.tteokbokki.cake },
      { kind: "cyl", rTop: 0.036, rBottom: 0.036, h: 0.17, seg: 14, rot: [0, 2.0, HALF_PI], pos: [0.1, 0.1, -0.08], color: PALETTE.tteokbokki.cakeShade, color2: PALETTE.tteokbokki.cake },
      { kind: "cyl", rTop: 0.036, rBottom: 0.036, h: 0.17, seg: 14, rot: [0, 2.6, HALF_PI], pos: [-0.05, 0.1, 0.13], color: PALETTE.tteokbokki.cakeShade, color2: PALETTE.tteokbokki.cake },
      { kind: "cyl", rTop: 0.036, rBottom: 0.036, h: 0.17, seg: 14, rot: [0, 0.9, HALF_PI], pos: [0.13, 0.1, 0.1], color: PALETTE.tteokbokki.cakeShade, color2: PALETTE.tteokbokki.cake },
      { kind: "box", size: [0.12, 0.026, 0.09], rot: [0.1, 0.4, 0.05], pos: [-0.14, 0.1, 0.06], color: PALETTE.tteokbokki.fishcake },
      { kind: "box", size: [0.12, 0.026, 0.09], rot: [0.1, 1.1, 0.05], pos: [0.06, 0.1, -0.15], color: PALETTE.tteokbokki.fishcake },
      { kind: "box", size: [0.12, 0.026, 0.09], rot: [0.1, 2.2, 0.05], pos: [0.15, 0.1, 0.0], color: PALETTE.tteokbokki.fishcake },
      { kind: "box", size: [0.036, 0.014, 0.03], pos: [0.0, 0.105, -0.05], color: PALETTE.tteokbokki.scallion },
      { kind: "box", size: [0.036, 0.014, 0.03], pos: [-0.15, 0.105, -0.1], color: PALETTE.tteokbokki.scallion },
      { kind: "box", size: [0.036, 0.014, 0.03], pos: [0.09, 0.105, 0.17], color: PALETTE.tteokbokki.scallion },
      { kind: "box", size: [0.036, 0.014, 0.03], pos: [-0.18, 0.105, 0.14], color: PALETTE.tteokbokki.scallion },
    ],
    colliders: [{ kind: "cylinder", halfHeight: 0.12, r: 0.3, pos: [0, -0.02, 0] }],
  },
  // 국밥: 원본처럼 검은 뚝배기 + 뽀얀 국물 + 소고기 + 동그란 파
  gukbap: {
    style: "toy",
    material: { roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.35 },
    parts: [
      { kind: "lathe", profile: [[0, -0.14], [0.2, -0.14], [0.27, -0.07], [0.3, 0.05], [0.31, 0.1], [0.284, 0.106]], seg: 56, samples: 24, color: PALETTE.gukbap.bowl, color2: PALETTE.gukbap.bowlLight },
      { kind: "lathe", profile: [[0, 0.06], [0.29, 0.06], [0.287, 0.08], [0, 0.085]], seg: 56, samples: 10, color: PALETTE.gukbap.broth, color2: PALETTE.gukbap.brothLight },
      { kind: "sphere", r: 1, seg: 12, scale: [0.075, 0.018, 0.05], rot: [0.05, 0.4, 0.04], pos: [-0.08, 0.088, 0.02], color: PALETTE.gukbap.beef, color2: PALETTE.gukbap.beefLight },
      { kind: "sphere", r: 1, seg: 12, scale: [0.075, 0.018, 0.05], rot: [0.05, 1.3, 0.04], pos: [0.07, 0.088, -0.06], color: PALETTE.gukbap.beef, color2: PALETTE.gukbap.beefLight },
      { kind: "sphere", r: 1, seg: 12, scale: [0.075, 0.018, 0.05], rot: [0.05, 2.4, 0.04], pos: [0.04, 0.088, 0.09], color: PALETTE.gukbap.beef, color2: PALETTE.gukbap.beefLight },
      { kind: "sphere", r: 1, seg: 12, scale: [0.075, 0.018, 0.05], rot: [0.05, 3.0, 0.04], pos: [-0.12, 0.088, -0.1], color: PALETTE.gukbap.beef, color2: PALETTE.gukbap.beefLight },
      { ...SCALLION_RING, pos: [0.12, 0.092, 0.04] },
      { ...SCALLION_RING, pos: [-0.02, 0.092, -0.15] },
      { ...SCALLION_RING, pos: [-0.17, 0.092, 0.08] },
      { ...SCALLION_RING, pos: [0.15, 0.092, -0.12] },
      { ...SCALLION_RING, pos: [0.0, 0.092, 0.17] },
    ],
    colliders: [{ kind: "cylinder", halfHeight: 0.13, r: 0.31, pos: [0, -0.02, 0] }],
  },
  // 치킨: 원본 이미지(img/치킨.png)처럼 물방울형 살 + 전체에 오돌토돌한 황금빛 튀김옷,
  // 뼈 나오는 곳을 튀김옷 테두리가 감싸고, 매끈한 크림색 뼈 끝은 두 갈래로 둥글다.
  chicken: {
    style: "toy",
    material: { roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.5, sheenRoughness: 0.5, sheenColor: new THREE.Color("#ffcf8a") },
    parts: [
      {
        kind: "lathe",
        // 아래가 둥글고 위로 길게 좁아지는 물방울 → 끝은 뼈를 감싸는 튀김옷 테두리
        profile: [
          [0, -0.36],
          [0.13, -0.34],
          [0.215, -0.28],
          [0.255, -0.18],
          [0.26, -0.08],
          [0.24, 0.02],
          [0.2, 0.12],
          [0.155, 0.21],
          [0.122, 0.28],
          [0.112, 0.32],
          [0.095, 0.338],
          [0.07, 0.334],
          [0, 0.33],
        ],
        // 알갱이를 지오메트리로 표현하려면 촘촘해야 한다 (치킨은 비싸서 화면에 수가 적으므로 감당 가능)
        seg: 160,
        samples: 120,
        scale: [0.93, 1, 0.84],
        color: PALETTE.chicken.crust,
        bumps: {
          grains: [0.026, 20],
          coarse: [0.014, 4.5],
          palette: [PALETTE.chicken.crustDeep, PALETTE.chicken.crust, PALETTE.chicken.crustLight],
          seed: 7,
        },
      },
      // 짧고 굵은 뼈
      {
        kind: "lathe",
        profile: [
          [0, 0.27],
          [0.07, 0.28],
          [0.064, 0.36],
          [0.06, 0.42],
          [0.068, 0.47],
          [0.08, 0.5],
          [0, 0.52],
        ],
        seg: 28,
        samples: 24,
        color: PALETTE.chicken.boneShade,
        color2: PALETTE.chicken.bone,
      },
      // 뼈 끝 두 갈래 혹
      { kind: "sphere", r: 0.08, seg: 22, scale: [1, 0.95, 0.95], pos: [0.046, 0.54, 0], color: PALETTE.chicken.bone },
      { kind: "sphere", r: 0.08, seg: 22, scale: [1, 0.95, 0.95], pos: [-0.046, 0.54, 0], color: PALETTE.chicken.bone },
    ],
    // 콜라이더는 단순하게 유지 (성능): 살 = 구, 목·뼈 = 캡슐
    colliders: [
      { kind: "ball", r: 0.26, pos: [0, -0.1, 0] },
      { kind: "capsule", halfHeight: 0.13, r: 0.09, pos: [0, 0.39, 0] },
    ],
  },
};

// ─── 가격 → 크기 ──────────────────────────────────────────

const MIN_SCALE = 1.05;
const MAX_SCALE = 1.4;
const LOG_MIN = Math.log(Math.min(...ITEMS.map((i) => i.price)));
const LOG_MAX = Math.log(Math.max(...ITEMS.map((i) => i.price)));

/** 저가는 작게, 고가는 크게. 로그 스케일로 살짝만 차이 나게 한다. */
export function priceScale(price: number): number {
  const t = LOG_MAX > LOG_MIN ? (Math.log(price) - LOG_MIN) / (LOG_MAX - LOG_MIN) : 0.5;
  return MIN_SCALE + (MAX_SCALE - MIN_SCALE) * t;
}

// ─── 지오메트리 생성 ─────────────────────────────────────

function partMatrix(p: Transform): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...(p.pos ?? [0, 0, 0])),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...(p.rot ?? [0, 0, 0]))),
    new THREE.Vector3(...(p.scale ?? [1, 1, 1])),
  );
}

// ─── 요철용 3D 노이즈 (결정적: 같은 seed면 항상 같은 모양) ───

function hash3(x: number, y: number, z: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 144665) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = x - xi, fy = y - yi, fz = z - zi;
  const s = (t: number) => t * t * (3 - 2 * t);
  const u = s(fx), v = s(fy), w = s(fz);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}

/**
 * 3D 셀마다 크기가 다른 둥근 돔을 하나씩 두고 겹치는 곳은 높은 쪽 → 빈틈 적은 알갱이 표면 (0~1).
 */
function grainNoise(x: number, y: number, z: number, seed: number): number {
  const cx = Math.floor(x), cy = Math.floor(y), cz = Math.floor(z);
  let h = 0;
  for (let dz = -1; dz <= 1; dz++)
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const gx = cx + dx, gy = cy + dy, gz = cz + dz;
        const fx = gx + 0.1 + 0.8 * hash3(gx, gy, gz, seed);
        const fy = gy + 0.1 + 0.8 * hash3(gx, gy, gz, seed + 5);
        const fz = gz + 0.1 + 0.8 * hash3(gx, gy, gz, seed + 9);
        const radius = 0.6 + 0.35 * hash3(gx, gy, gz, seed + 13);
        const r = Math.hypot(x - fx, y - fy, z - fz) / radius;
        if (r < 1) h = Math.max(h, Math.sqrt(1 - r * r));
      }
  return h;
}

/** 꼭짓점을 corner 반지름으로 둥글린 다각형을 밀어내고 가장자리도 둥글게 (z 중심 정렬, 인덱스 지오메트리) */
function roundedExtrude(points: [number, number][], corner: number, depth: number, bevel: number): THREE.BufferGeometry {
  const v = points.map(([x, y]) => new THREE.Vector2(x, y));
  const shape = new THREE.Shape();
  v.forEach((cur, i) => {
    const prev = v[(i + v.length - 1) % v.length];
    const next = v[(i + 1) % v.length];
    const a = cur.clone().add(prev.clone().sub(cur).setLength(corner));
    const b = cur.clone().add(next.clone().sub(cur).setLength(corner));
    if (i === 0) shape.moveTo(a.x, a.y);
    else shape.lineTo(a.x, a.y);
    shape.quadraticCurveTo(cur.x, cur.y, b.x, b.y);
  });
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 8,
    curveSegments: 16,
  });
  g.translate(0, 0, -depth / 2);
  // 법선·uv를 지우고 같은 위치 정점을 합쳐 매끈한 음영으로 (가장자리 계단 무늬 방지)
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  const merged = mergeVertices(g);
  g.dispose();
  merged.computeVertexNormals();
  merged.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(merged.attributes.position.count * 2), 2));
  return merged;
}

/** 윤곽점을 부드럽게 보간해서 회전체 생성 */
function latheGeometry(profile: [number, number][], seg: number, samples: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(profile.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, "centripetal");
  const pts = curve.getPoints(samples).map((v) => new THREE.Vector2(Math.max(0, v.x), v.y));
  return new THREE.LatheGeometry(pts, seg);
}

/** 같은 위치에 겹친 정점(회전체 이음매·극점)의 법선을 평균내서 금이 가 보이지 않게 */
function smoothSeams(g: THREE.BufferGeometry) {
  g.computeVertexNormals();
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const groups = new Map<string, number[]>();
  for (let i = 0; i < pos.count; i++) {
    // 반올림 정수로 비교 (-0.000001과 0이 다른 점으로 취급되지 않게)
    const key = `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
    const list = groups.get(key);
    if (list) list.push(i);
    else groups.set(key, [i]);
  }
  const n = new THREE.Vector3();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    n.set(0, 0, 0);
    for (const i of list) n.x += nor.getX(i), n.y += nor.getY(i), n.z += nor.getZ(i);
    n.normalize();
    for (const i of list) nor.setXYZ(i, n.x, n.y, n.z);
  }
}

/**
 * 법선 방향으로 밀어내 둥근 알갱이 + 큰 울퉁불퉁함을 만들고,
 * 알갱이 틈은 진하게·꼭대기는 밝게 칠한다.
 */
function applyBumps(g: THREE.BufferGeometry, b: Bumps): THREE.BufferGeometry {
  smoothSeams(g);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const seed = b.seed ?? 1;
  const heights = new Float32Array(pos.count);
  const [grainAmp, grainFreq] = b.grains;
  const [coarseAmp, coarseFreq] = b.coarse ?? [0, 1];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const grain = grainNoise(x * grainFreq, y * grainFreq, z * grainFreq, seed);
    const coarse = valueNoise(x * coarseFreq, y * coarseFreq, z * coarseFreq, seed + 23) - 0.5;
    heights[i] = grain;
    const d = grain * grainAmp + coarse * coarseAmp;
    pos.setXYZ(i, x + nor.getX(i) * d, y + nor.getY(i) * d, z + nor.getZ(i) * d);
  }
  smoothSeams(g);
  const [deep, base, light] = b.palette.map((c) => new THREE.Color(c));
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = heights[i];
    if (t < 0.5) c.copy(deep).lerp(base, t / 0.5);
    else c.copy(base).lerp(light, (t - 0.5) / 0.5);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

/** 둘레를 따라 세로 홈을 판다 (반지름 방향으로 안쪽으로) */
function applyRibs(g: THREE.BufferGeometry, r: { count: number; depth: number }) {
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const len = Math.hypot(x, z);
    if (len < 1e-6) continue;
    const a = Math.atan2(x, z) * r.count;
    const k = 1 - r.depth * (0.5 - 0.5 * Math.cos(a)) ** 4 / len; // 골 사이 좁은 홈
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
}

/** 둘레를 감는 두 방향 사선이 만나는 마름모 격자: 줄 위는 진한 색 + 살짝 안쪽으로 */
function applyWaffle(g: THREE.BufferGeometry, w: { lines: number; color: string; depth: number }) {
  smoothSeams(g);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const col = g.attributes.color;
  const line = new THREE.Color(w.color);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = (Math.atan2(x, z) / (Math.PI * 2)) * w.lines;
    const along = y * w.lines * 1.6;
    const dist = (t: number) => Math.abs(t - Math.round(t));
    const d = Math.min(dist(a + along), dist(a - along));
    const k = Math.max(0, 1 - d / 0.12); // 줄 중심 1 → 바깥 0
    c.setRGB(col.getX(i), col.getY(i), col.getZ(i)).lerp(line, k);
    col.setXYZ(i, c.r, c.g, c.b);
    pos.setXYZ(i, x - nor.getX(i) * w.depth * k, y - nor.getY(i) * w.depth * k, z - nor.getZ(i) * w.depth * k);
  }
  smoothSeams(g);
}

function partGeometry(p: Part): THREE.BufferGeometry {
  if (p.kind === "lathe" && p.bumps) {
    const base = latheGeometry(p.profile, p.seg ?? 32, p.samples ?? 32);
    if (p.ribs) applyRibs(base, p.ribs);
    const g = applyBumps(base, p.bumps);
    g.applyMatrix4(partMatrix(p));
    return g;
  }
  const g =
    p.kind === "box"
      ? new THREE.BoxGeometry(...p.size)
      : p.kind === "cyl"
        ? new THREE.CylinderGeometry(p.rTop, p.rBottom, p.h, p.seg ?? 10)
        : p.kind === "lathe"
          ? latheGeometry(p.profile, p.seg ?? 32, p.samples ?? 32)
          : p.kind === "extrude"
            ? roundedExtrude(p.points, p.corner, p.depth, p.bevel)
          : new THREE.SphereGeometry(p.r, p.seg ?? 8, p.seg ? Math.round(p.seg * 0.7) : 6);
  if (p.kind === "lathe" && p.ribs) {
    applyRibs(g, p.ribs);
    smoothSeams(g);
  }
  // 그라데이션은 부품 자체 높이 기준 (위치·회전·크기 변형 전의 y)
  g.computeBoundingBox();
  const minY = g.boundingBox!.min.y;
  const spanY = Math.max(g.boundingBox!.max.y - minY, 1e-6);
  const localY = Float32Array.from({ length: g.attributes.position.count }, (_, i) => g.attributes.position.getY(i));
  g.applyMatrix4(partMatrix(p));
  const from = new THREE.Color(p.color);
  const to = new THREE.Color(p.color2 ?? p.color);
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.copy(from).lerp(to, (localY[i] - minY) / spanY);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  if (p.kind === "lathe" && p.waffle) applyWaffle(g, p.waffle);
  return g;
}

function scaleVec(v: Vec3 | undefined, s: number): Vec3 | undefined {
  return v && [v[0] * s, v[1] * s, v[2] * s];
}

function scaleCollider(c: ColliderSpec, s: number): ColliderSpec {
  switch (c.kind) {
    case "ball":
      return { ...c, r: c.r * s, pos: scaleVec(c.pos, s) };
    case "cuboid":
      return { ...c, half: scaleVec(c.half, s)!, pos: scaleVec(c.pos, s) };
    case "cylinder":
    case "capsule":
      return { ...c, halfHeight: c.halfHeight * s, r: c.r * s, pos: scaleVec(c.pos, s) };
  }
}

export interface Look {
  geometry: THREE.BufferGeometry;
  colliders: ColliderSpec[];
  style: LookStyle;
  material?: THREE.MeshPhysicalMaterialParameters;
  upright: boolean;
}

const cache = new Map<ItemId, Look>();

/** 아이템의 합쳐진 지오메트리 + 콜라이더 (가격 비례 크기 적용, 한 번만 생성) */
export function getLook(id: ItemId): Look {
  let look = cache.get(id);
  if (!look) {
    const def = LOOKS[id];
    const s = priceScale(getItem(id).price) * (def.boost ?? 1);
    const parts = def.parts.map(partGeometry);
    const geometry = mergeGeometries(parts)!;
    parts.forEach((g) => g.dispose());
    geometry.scale(s, s, s);
    geometry.computeBoundingSphere();
    look = {
      geometry,
      colliders: def.colliders.map((c) => scaleCollider(c, s)),
      style: def.style ?? "flat",
      material: def.material,
      upright: def.upright ?? false,
    };
    cache.set(id, look);
  }
  return look;
}
