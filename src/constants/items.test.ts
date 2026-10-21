import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ITEMS } from "./items";

describe("ITEMS", () => {
  it("10종, id 중복 없음", () => {
    expect(ITEMS).toHaveLength(10);
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(10);
  });
  it("모든 아이템에 썸네일 파일이 있음", () => {
    for (const item of ITEMS) expect(existsSync(path.join("public", item.image))).toBe(true);
  });
  it("같은 가격이 이웃하지 않음 (끝 → 처음 루프 포함)", () => {
    ITEMS.forEach((item, i) => expect(item.price).not.toBe(ITEMS[(i + 1) % ITEMS.length].price));
  });
});
