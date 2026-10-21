import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// 공유 썸네일 (카톡·슬랙·트위터 등 링크 미리보기). 빌드 때 한 번 생성된다.
// 글자 없이 아이템들이 하늘에서 쏟아지는 장면만 보여준다.
export const alt = "오늘 번 돈 — 치킨·피자·떡볶이가 하늘에서 쏟아지는 그림";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * 떨어지는 아이템: [id, 중심 x, 중심 y, 크기, 회전, 불투명도]
 * 작고 흐린 것 = 멀리, 크고 진한 것 = 가까이 → 깊이감. 위쪽은 화면 밖에서 막 들어오는 중.
 */
const DROPS: [string, number, number, number, number, number][] = [
  // 멀리
  ["soju", 60, 300, 80, 24, 0.45],
  ["coffee", 250, 40, 90, -18, 0.5],
  ["icecream", 660, 20, 80, 20, 0.45],
  ["samgak", 660, 575, 90, -12, 0.5],
  ["cupramen", 1165, 320, 80, 16, 0.45],
  ["tteokbokki", 330, 590, 90, -8, 0.45],
  // 중간
  ["icecream", 90, 90, 150, -16, 1],
  ["samgak", 480, 110, 140, 14, 1],
  ["soju", 950, 60, 150, -22, 1],
  ["gukbap", 1090, 470, 170, 8, 1],
  ["coffee", 760, 300, 150, 12, 1],
  // 가까이
  ["pizza", 200, 420, 250, -10, 1],
  ["chicken", 520, 380, 270, 18, 1],
  ["burger", 900, 520, 230, -6, 1],
  ["tteokbokki", 1110, 160, 200, -14, 1],
];

export default async function Image() {
  const images = await Promise.all(
    DROPS.map(([id]) => readFile(join(process.cwd(), `public/items/${id}.png`), "base64")),
  );

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          background:
            "radial-gradient(80% 70% at 50% 0%, #fffaf2 0%, rgba(255,250,242,0) 70%), linear-gradient(180deg, #fdf6ec 0%, #f8ead6 100%)",
          overflow: "hidden",
        }}
      >
        {DROPS.map(([, cx, cy, s, deg, opacity], i) => (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img
            key={i}
            src={`data:image/png;base64,${images[i]}`}
            width={s}
            height={s}
            style={{ position: "absolute", left: cx - s / 2, top: cy - s / 2, transform: `rotate(${deg}deg)`, opacity }}
          />
        ))}
      </div>
    ),
    size,
  );
}
