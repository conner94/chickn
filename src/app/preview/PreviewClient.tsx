"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ITEMS, ItemId, isItemId } from "@/constants/items";

const ModelView = dynamic(() => import("./ModelView"), { ssr: false });

export function PreviewClient() {
  const [id, setId] = useState<ItemId>("chicken");
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("item");
    if (isItemId(q)) setId(q);
  }, []);
  const item = ITEMS.find((i) => i.id === id)!;
  return (
    <main className="flex min-h-dvh flex-col items-center gap-4 p-6">
      <div className="flex flex-wrap gap-2">
        {ITEMS.map((i) => (
          <button
            key={i.id}
            onClick={() => setId(i.id)}
            className={`rounded-full px-3 py-1 text-sm ${i.id === id ? "bg-stone-900 text-white" : "bg-white"}`}
          >
            {i.name}
          </button>
        ))}
      </div>
      <div className="grid w-full max-w-5xl grid-cols-2 gap-4">
        <figure className="flex aspect-square items-center justify-center rounded-3xl bg-white/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/items/${id}.png`} alt={item.name} className="h-4/5 w-4/5 object-contain" />
        </figure>
        <div className="aspect-square overflow-hidden rounded-3xl bg-white/50">
          <ModelView id={id} />
        </div>
      </div>
    </main>
  );
}
