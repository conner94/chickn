import type { Metadata, Viewport } from "next";
import "./globals.css";

// 공유 문구는 여기 한 곳에서 관리 (description · og:description · twitter:description 공통)
const SITE_URL = "https://261008chickn.vercel.app";
const title = "오늘 번 돈";
const description = "오늘 나는 얼마나 벌었을까? 연봉만 넣으면 지금 이 순간에도 쌓이는 돈을 초 단위로 세고, 그만큼 치킨·피자·떡볶이가 쏟아져요.";

// og:image / twitter:image 는 app/opengraph-image.tsx, app/twitter-image.tsx 에서 자동으로 붙는다 (1200×630)
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  openGraph: { title, description, url: "/", siteName: title, type: "website", locale: "ko_KR" },
  twitter: { card: "summary_large_image", title, description },
  appleWebApp: { capable: true, title, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 노치·홈 인디케이터 영역까지 배경을 채우고, 내용은 safe-area 여백으로 피한다
  viewportFit: "cover",
  themeColor: "#fdf6ec",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
