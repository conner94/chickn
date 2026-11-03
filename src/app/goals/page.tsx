import type { Metadata, Viewport } from "next";
import { GoalsHub } from "./GoalsHub";

// 2026 골세팅 과제 결과보고서 허브 (/goals) — 첫 화면부터 4개 썸네일이 꽉 차게 보이는 아코디언 갤러리
const title = "2026 골세팅 결과보고 · Conner";
const description = "D2-GXG-T5 Conner 윤승학 — 오늘 번 돈, Shop App 토큰 체계, AI 영상 스터디, Cast 결과보고서 모음.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, url: "/goals" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function GoalsPage() {
  return <GoalsHub />;
}
