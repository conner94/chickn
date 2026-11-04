"use client";

import { useEffect, useRef, useState } from "react";
import { REPORTS, Thumb, type Report } from "./Thumbs";
import s from "./goals.module.css";

/**
 * 제목은 상단 한 줄로 줄이고, 첫 화면 대부분을 4개 썸네일 패널이 채운다.
 * 마우스를 올린(또는 포커스·숫자키 1~4로 고른) 패널이 넓게 펼쳐지며 설명이 드러난다.
 */
export function GoalsHub() {
  const [active, setActive] = useState<number | null>(null);

  // 블랙 배경을 html/body까지 칠해 iOS 바운스·노치 영역에서 앱의 크림색이 비치지 않게 한다
  useEffect(() => {
    const html = document.documentElement;
    const prev = [html.style.background, document.body.style.background, document.body.style.backgroundImage];
    html.style.background = "#000";
    document.body.style.background = "#000";
    document.body.style.backgroundImage = "none";
    return () => {
      html.style.background = prev[0];
      document.body.style.background = prev[1];
      document.body.style.backgroundImage = prev[2];
    };
  }, []);

  // 숫자키 1~4로 패널 선택, Esc로 해제
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= REPORTS.length) {
        setActive(n - 1);
        document.querySelector<HTMLElement>(`[data-panel="${n - 1}"]`)?.focus({ preventScroll: true });
      } else if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={s.page}>
      <Crosshair />
      <header className={s.top}>
        <div className={s.heading}>
          <p className={s.author}>Conner · 윤승학</p>
          <h1 className={s.title}>
            <span>2026</span> 골세팅 결과보고
          </h1>
        </div>
        <dl className={s.meta}>
          <div>
            <dt>Dept.</dt>
            <dd>D2-GXG-T5</dd>
          </div>
          <div>
            <dt>Company</dt>
            <dd>PTKOREA</dd>
          </div>
        </dl>
      </header>

      <main className={s.rail} onPointerLeave={() => setActive(null)} aria-label="결과보고서 목록">
        {REPORTS.map((r, i) => (
          <Panel key={r.key} r={r} i={i} active={active} setActive={setActive} />
        ))}
      </main>

      <footer className={s.bottom}>
        <ol className={s.index} aria-hidden>
          {REPORTS.map((r, i) => (
            <li key={r.key} className={active === i ? s.indexOn : ""}>
              <span>{r.no}</span>
              <i />
            </li>
          ))}
        </ol>
        <span className={s.hint}>
          <kbd>1</kbd>–<kbd>4</kbd> 키로도 선택
        </span>
        <span className={s.org}>© 2026</span>
      </footer>
    </div>
  );
}

function Panel({
  r,
  i,
  active,
  setActive,
}: {
  r: Report;
  i: number;
  active: number | null;
  setActive: (i: number) => void;
}) {
  const external = r.href?.startsWith("http");
  const state = active === null ? "" : active === i ? s.open : s.shut;

  const inner = (
    <>
      <div className={s.media}>
        <Thumb kind={r.thumb} tall bare />
      </div>
      <span className={s.shade} aria-hidden />
      <div className={s.head}>
        <span className={s.no}>{r.no}</span>
        <span className={`${s.status} ${r.href ? s.live : ""}`}>{r.href ? "Live" : "Coming soon"}</span>
      </div>
      <div className={s.info}>
        <p className={s.kicker}>{r.kicker}</p>
        <h2 className={s.name}>{r.title}</h2>
        <div className={s.more}>
          <div>
            <p className={s.body}>{r.body}</p>
            <ul className={s.tags}>
              {r.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {r.href && (
        <svg className={s.arrow} viewBox="0 0 24 24" aria-hidden>
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      )}
    </>
  );

  const common = {
    className: `${s.panel} ${state} ${r.href ? "" : s.soon}`,
    style: { "--d": `${0.1 + i * 0.08}s` } as React.CSSProperties,
    "data-panel": i,
    "data-cursor": r.href ? (external ? "Open ↗" : "View") : "Soon",
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setActive(i),
    onFocus: () => setActive(i),
  };

  return r.href ? (
    <a href={r.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...common}>
      {inner}
    </a>
  ) : (
    <article tabIndex={0} aria-disabled {...common}>
      {inner}
    </article>
  );
}

/**
 * 화면 전체를 가로지르는 가는 십자선 + 좌표 표시. 패널 위에서는 좌표 대신 이동 라벨.
 * 마우스 기기에서만.
 */
function Crosshair() {
  const h = useRef<HTMLDivElement>(null);
  const v = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [xy, setXy] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    setEnabled(mq.matches);
    if (!mq.matches) return;
    let x = -100;
    let y = -100;
    let cx = x;
    let cy = y;
    let raf = 0;
    const move = (e: PointerEvent) => {
      if (cx < 0) {
        cx = e.clientX;
        cy = e.clientY;
      }
      x = e.clientX;
      y = e.clientY;
      const t = (e.target as Element | null)?.closest<HTMLElement>("[data-cursor]");
      setLabel(t ? t.dataset.cursor ?? null : null);
      setXy(`X ${String(Math.round(x)).padStart(4, "0")}  Y ${String(Math.round(y)).padStart(4, "0")}`);
    };
    const loop = () => {
      cx += (x - cx) * 0.22;
      cy += (y - cy) * 0.22;
      if (h.current) h.current.style.transform = `translate3d(0, ${cy}px, 0)`;
      if (v.current) v.current.style.transform = `translate3d(${cx}px, 0, 0)`;
      if (tag.current) tag.current.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", move);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  if (!enabled) return null;
  return (
    <div className={s.cross} aria-hidden>
      <div ref={h} className={s.crossH} />
      <div ref={v} className={s.crossV} />
      <div ref={tag} className={s.crossTag}>
        <span className={`${s.crossBox} ${label ? s.crossBoxOn : ""}`} />
        <span className={s.crossText}>{label ?? xy}</span>
      </div>
    </div>
  );
}
