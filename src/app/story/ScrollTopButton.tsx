"use client";

import { useEffect, useState } from "react";

/** 한 화면 정도 내려가면 우측 하단에 나타나는 맨 위로 버튼 */
export function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > window.innerHeight * 0.8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <button
      type="button"
      aria-label="맨 위로"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.45)] transition duration-300 hover:bg-stone-800 active:scale-95 lg:right-8 lg:bottom-8 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
