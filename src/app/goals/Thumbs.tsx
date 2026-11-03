"use client";

import { useEffect, useState } from "react";
import s from "./thumbs.module.css";

// /goals 결과보고서 목록 데이터와 썸네일
export type Report = {
  no: string;
  key: string;
  kicker: string;
  title: string;
  body: string;
  tags: string[];
  /** 없으면 준비 중 카드 */
  href?: string;
  /** 카드 스포트라이트·포인트 색 */
  accent: string;
  thumb: "chickn" | "token" | "video" | "cast";
};

export const REPORTS: Report[] = [
  {
    no: "01",
    key: "chickn",
    kicker: "MCP · AI Agent Study",
    title: "오늘 번 돈",
    body: "연봉 기반 실시간 수입 시각화 3D 웹앱.\nPRD 한 장과 AI 에이전트 대화로 기획부터 배포까지 진행함.",
    tags: ["Claude Code", "Next.js", "Three.js"],
    href: "/story",
    accent: "#a78bfa",
    thumb: "chickn",
  },
  {
    no: "02",
    key: "token",
    kicker: "Design Token System",
    title: "Samsung Shop App 토큰 체계",
    body: "로우값 기반 디자인을 3단계 토큰 체계로 전환함.\nAI가 읽기 좋은 CTV 네이밍 규칙을 설계함.",
    tags: ["Figma Variables", "Primitive · Semantic · Component"],
    href: "https://shop-app-token.vercel.app",
    accent: "#a78bfa",
    thumb: "token",
  },
  {
    no: "03",
    key: "video",
    kicker: "Generative Video Study",
    title: "AI 영상 스터디",
    body: "생성형 AI 기반 영상 제작 워크플로우를 연구함.",
    tags: ["Generative AI", "Motion"],
    accent: "#a78bfa",
    thumb: "video",
  },
  {
    no: "04",
    key: "cast",
    kicker: "Vibe Coding",
    title: "Cast",
    body: "프로젝트 요구 역량 기반 인력 매칭·관리 웹서비스.\n바이브코딩으로 Projects 메뉴와 매칭 화면을 구현함.",
    tags: ["Next.js", "Prisma", "Supabase"],
    accent: "#a78bfa",
    thumb: "cast",
  },
];

/**
 * tall: 데스크톱(761px~)에서는 세로형 이미지(<kind>-tall.jpg)를 쓴다 — 세로 패널용. 세로형이 있는 건 토큰뿐.
 * bare: 영상 썸네일의 REC·타임코드처럼 패널 표시와 겹치는 장식을 뺀다.
 */
export function Thumb({ kind, tall, bare }: { kind: Report["thumb"]; tall?: boolean; bare?: boolean }) {
  if (kind === "chickn" || kind === "token") {
    return (
      <picture>
        {tall && kind === "token" && <source media="(min-width: 761px)" srcSet={`/goals/${kind}-tall.jpg`} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={s.img} src={`/goals/${kind}.jpg`} alt="" loading="lazy" />
      </picture>
    );
  }
  if (kind === "video") return <VideoArt bare={bare} />;
  return <CastArt />;
}

/** AI 영상 스터디 썸네일: 흐르는 그라데이션 + 주사선 + 재생 표시 + 타임코드 */
function VideoArt({ bare }: { bare?: boolean }) {
  const [tc, setTc] = useState("00:00:00:00");
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const f = Math.floor(((t - start) / 1000) * 24);
      const p = (n: number) => String(n).padStart(2, "0");
      setTc(`00:${p(Math.floor(f / 1440) % 60)}:${p(Math.floor(f / 24) % 60)}:${p(f % 24)}`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className={s.video}>
      <i className={s.blobA} />
      <i className={s.blobB} />
      <i className={s.blobC} />
      <span className={s.scan} />
      {!bare && (
        <>
          <span className={s.rec}>
            <i /> REC
          </span>
          <span className={s.tc}>{tc}</span>
        </>
      )}
      <span className={s.play} aria-hidden />
    </div>
  );
}

/** Cast 썸네일: 심볼 주위를 사람(점)들이 궤도로 돌며 매칭되는 장면 */
function CastArt() {
  return (
    <div className={s.cast}>
      <span className={s.orbit} style={{ "--size": "46%", "--dur": "14s" } as React.CSSProperties}>
        <i />
        <i />
      </span>
      <span className={s.orbit} style={{ "--size": "70%", "--dur": "22s" } as React.CSSProperties}>
        <i />
        <i />
        <i />
      </span>
      <span className={s.orbit} style={{ "--size": "96%", "--dur": "34s" } as React.CSSProperties}>
        <i />
        <i />
        <i />
        <i />
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.castLogo} src="/goals/cast-symbol.svg" alt="" />
    </div>
  );
}
