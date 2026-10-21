"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ItemId } from "@/constants/items";

// 첫 클릭 때만 3D 캔버스를 불러온다
const RainCanvas = dynamic(() => import("./RainCanvas"), { ssr: false });

/** [id, 이름, 카드 너비 대비 이미지 너비(%)] */
export type GridItem = [ItemId, string, number];

/** 3D 아이템 카드 그리드. 카드를 누르면 그 아이템이 화면 위에서 우르르 쏟아져 아래로 사라진다 */
export function ItemGrid({ items }: { items: GridItem[] }) {
  const [bursts, setBursts] = useState<Partial<Record<ItemId, number>>>({});
  const rain = (id: ItemId) => setBursts((b) => ({ ...b, [id]: (b[id] ?? 0) + 1 }));

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:gap-3">
        {items.map(([id, name, width]) => (
          // 서비스 아이템 카드와 같은 유리 카드: 반투명 흰 바탕 + 블러 + 이미지 뒤 은은한 색 번짐
          <li key={id}>
            <button
              type="button"
              onClick={() => rain(id)}
              aria-label={`${name} 쏟아지게 하기`}
              className="group relative block w-full cursor-pointer overflow-hidden rounded-[28px] bg-white/45 shadow-[0_4px_14px_-6px_rgba(60,40,20,0.16)] ring-1 ring-white/80 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/60 active:scale-[0.97]"
            >
              <span className="pointer-events-none absolute top-[18%] left-1/2 h-2/3 w-2/3 -translate-x-1/2 rounded-full bg-[#f3e2cf]/80 blur-2xl" aria-hidden="true" />
              <span className="relative flex aspect-[3/2] items-center justify-center pt-3">
                <img
                  src={`/story/pv-${id}.png`}
                  alt={`${name} 3D 모델`}
                  loading="lazy"
                  style={{ width: `${width}%` }}
                  className="h-auto transition-transform duration-300 group-hover:scale-105"
                />
              </span>
              {/* 앞 아이콘 몫만큼 오른쪽 여백을 줘서 이름이 위 이미지와 가운데로 맞아 보이게 */}
              <span className="relative flex items-center justify-center gap-1.5 pt-2 pr-2 pb-4">
                <img src={`/items/${id}.png`} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
                <span className="text-sm font-bold text-stone-800">{name}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {Object.keys(bursts).length > 0 && <RainCanvas bursts={bursts} />}
    </>
  );
}
