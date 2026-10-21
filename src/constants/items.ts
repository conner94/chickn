// 환산 아이템은 이 파일 한 곳에서만 관리한다.

export type ItemCategory = "small" | "meal" | "treat";

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  small: "소소",
  meal: "한 끼",
  treat: "소확행",
};

export const CATEGORY_ORDER: ItemCategory[] = ["small", "meal", "treat"];

/** 3D 오브젝트 형태 그룹. 같은 그룹은 모양을 공유하고 색·비율만 다르다. */
export type ItemShape = "cup" | "box" | "round";

export interface Item {
  id: string;
  name: string;
  /** 세는 단위 (잔, 병, 그릇 …) */
  unit: string;
  /** 카드 썸네일 (public/items/, 원본은 img/) */
  image: string;
  price: number;
  category: ItemCategory;
  shape: ItemShape;
}

// 카드 줄에 보이는 순서 그대로. 같은 가격끼리 붙지 않게 섞어 둔다 (끝 → 처음으로 이어지는 루프 포함)
const RAW_ITEMS = [
  { id: "icecream", name: "아이스크림", unit: "개", price: 1500, category: "small", shape: "round" },
  { id: "cupramen", name: "컵라면", unit: "개", price: 1800, category: "small", shape: "cup" },
  { id: "coffee", name: "커피", unit: "잔", price: 4500, category: "meal", shape: "cup" },
  { id: "tteokbokki", name: "떡볶이", unit: "그릇", price: 5000, category: "meal", shape: "round" },
  { id: "pizza", name: "피자", unit: "판", price: 25000, category: "treat", shape: "box" },
  { id: "soju", name: "소주", unit: "병", price: 5000, category: "meal", shape: "cup" },
  { id: "burger", name: "햄버거세트", unit: "세트", price: 9000, category: "meal", shape: "box" },
  { id: "samgak", name: "삼각김밥", unit: "개", price: 1500, category: "small", shape: "box" },
  { id: "gukbap", name: "국밥", unit: "그릇", price: 10000, category: "meal", shape: "round" },
  { id: "chicken", name: "치킨", unit: "마리", price: 20000, category: "treat", shape: "round" },
] as const satisfies readonly Omit<Item, "image">[];

export type ItemId = (typeof RAW_ITEMS)[number]["id"];

export const ITEMS: readonly (Item & { id: ItemId })[] = RAW_ITEMS.map((item) => ({
  ...item,
  image: `/items/${item.id}.png`,
}));

export const DEFAULT_ITEM_ID: ItemId = "chicken";

export function isItemId(value: unknown): value is ItemId {
  return ITEMS.some((item) => item.id === value);
}

export function getItem(id: ItemId) {
  return ITEMS.find((item) => item.id === id)!;
}

/** "32잔", "1,204장" */
export function formatCount(count: number, unit: string): string {
  return `${count.toLocaleString("ko-KR")}${unit}`;
}
