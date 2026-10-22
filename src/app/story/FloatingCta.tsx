"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** 인트로와 맨 아래(마무리 배너·푸터)가 화면에 없을 때만 하단 중앙에 떠 있는 서비스 써보기 버튼 */
export function FloatingCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const targets = document.querySelectorAll("[data-hide-floating-cta]");
    const showing = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) showing.add(e.target);
        else showing.delete(e.target);
      }
      setVisible(showing.size === 0);
    });
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  return (
    <Link
      href="/"
      aria-hidden={!visible}
      tabIndex={visible ? undefined : -1}
      className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 w-[200px] lg:w-[216px] items-center justify-center gap-1 rounded-full bg-stone-900 py-3.5 text-[15px] font-bold whitespace-nowrap text-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.45)] ring-1 ring-white/20 transition duration-300 hover:bg-stone-800 active:scale-[0.97] lg:bottom-8 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <img src="/items/chicken.png" alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
      <span className="pr-1">서비스 써보기</span>
    </Link>
  );
}
