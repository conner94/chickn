import type { Metadata } from "next";
import Link from "next/link";
import { IntroBackdrop } from "./IntroBackdrop";
import { GridItem, ItemGrid } from "./ItemGrid";

// 이 프로젝트를 만든 과정을 소개하는 정적 페이지 (/story). 스크린샷은 public/story/ 에 있다.
const title = "MCP · AI 에이전트 스터디 결과 보고서 · 오늘 번 돈";
const description = "피그마 없이 PRD.md 한 장과 AI 에이전트와의 대화만으로 배포까지 간 첫 MCP 스터디 기록.";

export const metadata: Metadata = {
  title,
  description,
  // 하위 페이지에서 openGraph/twitter를 다시 정의하면 루트의 OG 이미지가 빠지므로 서비스와 같은 이미지를 직접 지정
  openGraph: {
    title,
    description,
    url: "/story",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "오늘 번 돈 — 치킨·피자·떡볶이가 하늘에서 쏟아지는 그림" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/twitter-image"] },
};

const WORKFLOW = [
  { title: "터미널의 Claude Code", body: "디자인 툴 대신 터미널에서 Claude Code를 실행하고, PRD를 읽혀 코드 작성부터 배포까지 진행." },
  { title: "PRD.md로 시작", body: "화면을 그리는 대신 기능·계산식·기술 스택·진행 단계를 PRD.md에 정리하고, 바뀐 결정은 버전을 올려 다시 반영." },
  { title: "단계마다 멈추고 확인", body: "4단계로 나눠 단계마다 직접 확인. 에이전트도 헤드리스 크롬으로 화면을 찍어 스스로 점검." },
  { title: "말로 고치기", body: "“카드를 더 크게”, “두 배로 키워줘”처럼 대화로 디자인을 다듬음." },
]

type Shot = { src: string; alt: string; caption?: string; phone?: boolean };
type Step = {
  tag: string;
  title: string;
  body: string;
  /** 에이전트에게 보낸 요청을 요청사항 형태로 다듬은 것 */
  prompt?: string[];
  /** 작업 순서를 칩으로 보여줄 때 */
  flow?: string[];
  /** 스크린샷 대신 보여줄 터미널 화면. "$ "로 시작하면 명령, 그 외는 출력 */
  terminal?: string[];
  /** 이 단계에서 반영된 PRD 버전 */
  prd?: string;
  /** 스크린샷 대신 보여줄 PRD.md 문서 미리보기 (마크다운 줄) */
  doc?: string[];
  shots: Shot[];
};

const STEPS: Step[] = [
  {
    tag: "기획",
    title: "PRD.md 한 장으로 시작",
    body: "피그마 시안 대신 마크다운 PRD를 먼저 작성. 목표·제약, 기술 스택, 기능 요구사항, 계산식, 4단계 진행 계획까지 한 문서에 담아 에이전트의 단일 기준으로 사용.",
    prd: "v1.0",
    doc: [
      "# 오늘 번 돈 — PRD",
      "> 연봉을 입력하면 오늘 번 돈을 초 단위로 계산하고, 그만큼 3D 오브젝트가 떨어져 쌓인다.",
      "## 1. 목표와 제약",
      "- 외부 API·DB·로그인 없이 브라우저에서만 동작",
      "- 운영 비용 0원 (GitHub + Vercel Hobby)",
      "## 3.2 계산 로직",
      "- 시급 = 월급 ÷ (하루 실근무시간 × 21.7일)",
      "- 오늘 번 돈 = 실근무 경과 시간(점심 제외) × 시급",
      "## 4. 진행 방식",
      "1. 세팅 + 계산 로직 + 입력 폼 (3D 없이)",
      "2. 3D 씬 + 치킨 물리 낙하",
      "3. 아이템 추가 · 상호작용 · 성능 상한",
      "4. 디자인 · README · Vercel 배포",
    ],
    shots: [],
  },
  {
    tag: "세팅",
    title: "터미널에서 Claude Code, GitHub·Vercel 연결",
    body: "터미널에서 Claude Code를 실행해 PRD.md를 읽히고 1단계부터 진행. GitHub 저장소와 Vercel을 연결해 main에 푸시할 때마다 같은 주소로 자동 배포.",
    prompt: [
      "PRD.md를 읽고 4. 진행 방식의 1단계부터 시작해줘. 단계마다 멈추고 build 통과 여부와 변경 파일을 요약해줘.",
      "GitHub 원격 저장소를 생성하고 main 브랜치를 Vercel 프로젝트에 연결해줘.",
      "main 푸시 시 프로덕션 자동 배포(CI/CD)가 돌도록 설정하고, 같은 도메인을 유지해줘.",
    ],
    flow: ["PRD.md", "claude 실행", "GitHub 저장소", "Vercel 연결", "push = 자동 배포"],
    terminal: [
      "$ cd ~/Desktop/Project/261008_Chickn",
      "$ claude",
      "> PRD.md 읽고 1단계부터 진행해줘",
      "✓ 22 tests passed · build ok",
      "$ git push",
      "✓ Vercel  Deployment has completed",
    ],
    shots: [],
  },
  {
    tag: "초안",
    title: "유리 상자 속에 각진 치킨",
    body: "PRD v1.0대로 나온 첫 화면. 계산 로직은 단위 테스트로 먼저 고정하고, 3D는 유리 상자 안에 로우폴리 치킨이 떨어지는 형태.",
    prompt: [
      "연봉 기반 실근무 시간(점심 제외) 시급을 계산해, 오늘 번 금액을 1초 단위로 갱신해줘. 계산 로직은 순수 함수로 분리하고 단위 테스트를 붙여줘.",
      "누적 금액을 아이템 단가로 환산해 3D 오브젝트가 물리 엔진(Rapier)으로 낙하·적재되게 해줘.",
      "외부 API·DB·인증 없이 클라이언트 단에서만 동작하고, 입력값은 localStorage에만 저장. 운영 비용 0원.",
    ],
    shots: [{ src: "/story/01-draft-glassbox.jpg", alt: "유리 상자 안에 각진 치킨이 놓인 첫 화면", phone: true }],
  },
  {
    tag: "기능 확장",
    title: "아이템 17종 + 흘러가는 카드",
    prd: "v1.1",
    body: "아이템을 17종으로 늘리고, 저절로 흘러가는 마키 캐러셀과 소소·한 끼·소확행 카테고리 칩을 추가.",
    prompt: [
      "아이템 데이터를 단일 상수로 관리하고 17종으로 확장, 가격 오름차순 정렬해줘.",
      "rAF 기반 무한 루프 마키 캐러셀로 구현해줘. 사용자 인터랙션 시 자동 흐름을 일시정지하고, 탭하면 선택 + 중앙 정렬.",
    ],
    shots: [{ src: "/story/02-marquee-17.jpg", alt: "카테고리 칩과 마키 카드가 추가된 화면", phone: true }],
  },
  {
    tag: "UI 구조 수정",
    title: "상자를 없애고 화면 전체를 무대로",
    prd: "v1.2",
    body: "써 보니 답답했던 상자를 제거하기로 하고 PRD를 v1.2로 수정. 카테고리 탭을 없애고, 카드를 금액 바로 아래로 크게 올리고, 오브젝트가 화면 아래에 그대로 쌓이는 구조로 변경.",
    prompt: [
      "PRD 3.4·3.5를 아래 결정대로 수정하고(v1.2), 수정한 PRD 기준으로 구현해줘.",
      "카테고리 탭을 제거하고 전체 아이템을 단일 리스트로 노출해줘.",
      "카드 영역을 금액·진행 바 바로 아래로 올리고 크기를 키워 정보 위계를 재정리해줘.",
      "컨테이너 박스를 없애고 투명 캔버스 + 화면 경계 콜라이더로 바꿔, 오브젝트가 뷰포트 하단에 자연스럽게 쌓이게 해줘.",
    ],
    shots: [
      { src: "/story/02-marquee-17.jpg", alt: "구조 수정 전 화면", caption: "Before", phone: true },
      { src: "/story/03-no-box.jpg", alt: "상자 없이 화면 아래에 콜라가 쌓인 화면", caption: "After", phone: true },
    ],
  },
  {
    tag: "디테일",
    title: "남은 시간과 알맞은 단위",
    prd: "v1.2",
    body: "“다음 아이템까지 남은 돈” 대신 남은 시간을 표시하고, 커피는 잔·김밥은 줄·떡볶이는 그릇처럼 단위를 정리.",
    prompt: [
      "‘다음 획득까지’ 지표를 잔여 금액 대신 잔여 시간(분·초)으로 바꿔줘.",
      "수량 단위를 아이템별로 정의해줘(잔·줄·그릇 등).",
    ],
    shots: [{ src: "/story/04-polish.jpg", alt: "남은 시간과 단위가 바뀐 화면", phone: true }],
  },
  {
    tag: "폴리곤 업데이트 ①",
    title: "각진 모델에서 윤기 나는 장난감으로",
    prd: "v1.3",
    body: "환경맵 조명, 부드러운 그림자, 클리어코트 재질로 플라스틱 장난감 같은 질감 표현. 후보 조명 여러 개를 찍어 비교한 뒤 선택.",
    prompt: [
      "HDRI 환경맵, ContactShadows, 키·필 라이트 구성으로 씬 라이팅을 재설계해줘.",
      "MeshPhysicalMaterial 클리어코트로 토이 질감을 내고, 컬러는 파스텔 팔레트 토큰으로 통일해줘.",
      "데스크톱에서만 SSAO·Bloom 후처리를 켜고, 기존 물리·성능 구조는 유지해줘.",
    ],
    shots: [{ src: "/story/05-toy-material.jpg", alt: "윤기 있는 치킨과 각진 콜라 비교" }],
  },
  {
    tag: "UI 구조 수정",
    title: "이모지를 직접 만든 썸네일로",
    prd: "v1.3",
    body: "아이템 이미지를 직접 준비해 교체하고, 이미지가 없는 아이템은 제외해 10종으로 정리. 카드는 이미지가 잘 보이도록 유리 질감으로 재구성.",
    prompt: [
      "PRD 3.3 아이템 구성을 썸네일이 있는 10종으로 갱신해줘(v1.3).",
      "이모지를 직접 준비한 썸네일 에셋으로 교체하고, 에셋이 없는 아이템은 데이터에서 제외해줘.",
      "썸네일 가독성을 기준으로 카드 컴포넌트를 글래스 스타일로 재설계해줘.",
    ],
    shots: [{ src: "/story/06-thumb-cards.jpg", alt: "썸네일 이미지 카드로 바뀐 화면", phone: true }],
  },
  {
    tag: "폴리곤 업데이트 ②",
    title: "썸네일과 나란히 놓고 3D 맞추기",
    body: "개발용 비교 페이지에 왼쪽은 썸네일, 오른쪽은 3D를 배치. 매끈한 덩어리였던 치킨에 튀김옷 돌기를 올려 원본에 가깝게 조정.",
    prompt: [
      "썸네일 레퍼런스와 형태·색감·재질을 맞춰 3D 모델을 리모델링해줘.",
      "원본과 3D를 나란히 비교하는 개발용 프리뷰 페이지를 만들고, 치킨부터 아이템 단위로 반복 개선. 폴리곤·토큰 사용량은 적정 수준으로.",
    ],
    shots: [
      { src: "/story/07-chicken-before.jpg", alt: "썸네일과 매끈한 3D 치킨 비교", caption: "1차" },
      { src: "/story/08-chicken-after.jpg", alt: "썸네일과 튀김옷이 표현된 3D 치킨 비교", caption: "최종" },
    ],
  },
  {
    tag: "마무리",
    title: "입력 시트, 확인 다이얼로그, 공유 이미지",
    prd: "v1.4",
    body: "월급 입력 시트에 “서버로 보내지 않음” 안내를 추가하고, 저장 버튼과 나가기 확인 창을 정리. 공유용 OG 이미지는 아이템이 하늘에서 떨어지는 장면으로.",
    prompt: [
      "입력 필드 하단에 ‘서버 미전송’ 프라이버시 안내 문구를 추가해줘.",
      "저장 CTA를 하단 풀폭 캡슐형으로 바꾸고, 변경 사항이 있을 때 닫으면 이탈 확인 다이얼로그를 띄워줘.",
      "OG 이미지는 텍스트 없이 아이템이 낙하하는 키 비주얼로 생성해줘.",
    ],
    shots: [
      { src: "/story/14-live-sheet.jpg", alt: "월급 입력 바텀시트", caption: "입력 시트", phone: true },
      { src: "/story/11-sheet-confirm.jpg", alt: "저장하지 않고 나갈까요 확인 창", caption: "확인 창", phone: true },
      { src: "/story/12-og.jpg", alt: "아이템이 떨어지는 공유 이미지", caption: "공유 시 보이는 OG 이미지" },
    ],
  },
];

/** [id, 이름, 카드 너비 대비 이미지 너비(%)] — 면적이 비슷해 보이도록 가로세로 비율로 환산 (삼각김밥 34% 기준) */
const ITEMS: GridItem[] = [
  ["chicken", "치킨", 35],
  ["pizza", "피자", 41],
  ["icecream", "아이스크림", 24],
  ["cupramen", "컵라면", 27],
  ["coffee", "커피", 28],
  ["tteokbokki", "떡볶이", 41],
  ["soju", "소주", 17],
  ["burger", "햄버거세트", 38],
  ["samgak", "삼각김밥", 34],
  ["gukbap", "국밥", 40],
];

const LEARNINGS = [
  { title: "피그마 대신 PRD.md", body: "레이아웃을 그리지 않아도 “어디에, 얼마나 크게, 왜”를 문서로 적으면 화면이 나옴. 결정이 바뀌면 PRD부터 고치니 에이전트와 기준이 어긋나지 않음." },
  { title: "작게 자르고 자주 멈추기", body: "한 번에 다 맡기지 않고 단계·아이템 하나씩 요청하니 결과 확인과 방향 수정이 쉬워짐." },
  { title: "비교할 수 있게 만들기", body: "원본 썸네일과 3D를 나란히 보는 페이지 하나로 “비슷하게 해줘”가 구체적인 피드백이 됨." },
  { title: "범위와 비용 정하기", body: "“토큰 너무 많이 쓰지 말고 적당히”처럼 얼마나 공들일지도 함께 전달하는 것이 중요." },
];

const STACK = ["PRD.md (Markdown)", "Claude Code", "Next.js", "TypeScript", "Tailwind CSS", "three.js · React Three Fiber", "Rapier 물리 엔진", "GitHub", "Vercel"];

/** className을 주면 기본 너비(폰 260px / 가로 이미지 100%) 대신 그 크기로 */
function ShotImage({ shot, className }: { shot: Shot; className?: string }) {
  return (
    <figure className={`pointer-events-none select-none ${className ?? (shot.phone ? "mx-auto w-full max-w-[260px]" : "w-full")}`}>
      {/* 스크린샷은 보기만: 클릭·드래그·길게 눌러 저장 막음 */}
      <img
        src={shot.src}
        alt={shot.alt}
        loading="lazy"
        draggable={false}
        className={`w-full bg-white shadow-[0_12px_32px_-12px_rgba(120,72,30,0.28)] ring-1 ring-stone-900/5 ${
          shot.phone ? "rounded-[28px]" : "rounded-2xl"
        }`}
      />
      {shot.caption && (
        <figcaption className="mt-2.5 text-center text-xs font-bold text-stone-500">{shot.caption}</figcaption>
      )}
    </figure>
  );
}

export default function StoryPage() {
  return (
    <main className="w-full break-keep">
      {/* 밴드 1: 인트로 (라테 샌드) */}
      <div className="relative overflow-hidden bg-[radial-gradient(120%_80%_at_50%_0%,#f7eadb_0%,#efdcc5_100%)]">
        {/* 배경 3D: 아이템이 쏟아져 아래쪽 빈 공간에 쌓인다 */}
        <IntroBackdrop />
        <div className="pointer-events-none relative mx-auto w-full max-w-3xl px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-40 lg:max-w-[1200px] lg:px-8 lg:pt-20 lg:pb-44">
          {/* 히어로 */}
          <header className="flex flex-col items-center text-center lg:flex-row lg:justify-between lg:gap-16 lg:text-left">
            <div className="pointer-events-auto flex flex-col items-center lg:max-w-[560px] lg:items-start">
              {/* 작성자 배지 */}
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-accent-strong">D2-GXG-T5 · Conner</span>
              {/* 스터디 결과 보고서 타이틀 */}
              <h1 className="mt-5 text-[34px] leading-[1.2] font-ko font-black tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
                MCP · AI 에이전트
                <br />
                스터디 <span className="text-accent">결과 보고서</span>
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-stone-700 lg:mt-6 lg:max-w-none lg:text-lg">
                피그마 없이 터미널의 Claude Code(AI 코딩 에이전트)와 PRD.md 한 장만으로 웹서비스를 기획·구현·배포하는 과정을 실습.
                결과물은 연봉을 넣으면 지금 이 순간 번 돈만큼 치킨·피자·떡볶이가 쏟아지는 <strong className="font-bold text-stone-900">‘오늘 번 돈’</strong>.
              </p>
              <div className="pointer-events-auto mt-6 flex w-full max-w-sm flex-col gap-2 sm:flex-row lg:mt-8">
                <Link
                  href="/"
                  className="flex items-center gap-1 sm:flex-[1.4] justify-center rounded-2xl bg-stone-900 py-3.5 text-[15px] font-bold text-white shadow-md transition hover:bg-stone-800 active:scale-[0.97]"
                >
                  <img src="/items/chicken.png" alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
                  서비스 써보기
                </Link>
                <a
                  href="https://github.com/conner94/chickn"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center sm:flex-1 justify-center gap-2 rounded-2xl bg-white/90 py-3.5 text-[15px] font-bold text-stone-800 shadow-sm ring-1 ring-stone-900/5 transition hover:bg-white active:scale-[0.97]"
                >
                  <GitHubMark className="h-[18px] w-[18px]" />
                  GitHub
                </a>
              </div>
            </div>
            <div data-intro-mockup className="mx-auto mt-10 w-full max-w-[340px] lg:mx-0 lg:mt-0 lg:w-[360px] lg:max-w-none lg:shrink-0">
              <ShotImage className="w-full" shot={{ src: "/story/13-live-falling.jpg", alt: "치킨이 바닥에 쌓인 완성 화면", phone: true }} />
            </div>
          </header>
        </div>
      </div>

      {/* 밴드 2: 만든 과정 (아주 연한 베이지) */}
      <div className="bg-[#fffaf4]">
        <div className="mx-auto w-full max-w-3xl px-4 lg:max-w-[1200px] lg:px-8 py-16 lg:py-28">
          {/* 일하는 방식 */}
          <Section eyebrow="HOW" title="작업 방식" desc="화면을 그리는 대신 문장으로 설명하고, 결과를 보고 다시 말로 고치는 흐름을 반복.">
            <ol className="grid gap-2 sm:grid-cols-2 lg:gap-3">
              {WORKFLOW.map((w, i) => (
                <li key={w.title} className="flex gap-3 rounded-[28px] bg-white/45 p-5 shadow-[0_4px_14px_-6px_rgba(60,40,20,0.16)] ring-1 ring-white/80 backdrop-blur-xl lg:p-6">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-black text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-stone-900">{w.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-stone-700">{w.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          {/* 타임라인 */}
          <Section eyebrow="PROCESS" title="초안에서 완성까지" desc="PRD.md로 시작해 초안을 써 보고, 결정이 바뀔 때마다 PRD 버전을 올리며 구조와 3D를 한 단계씩 수정.">
            <ol className="relative">
              {/* 세로 선 */}
              <span className="absolute top-2 bottom-2 left-[11px] w-0.5 rounded-full bg-accent-light/50" aria-hidden="true" />
              {STEPS.map((step, i) => (
                <li
                  key={i}
                  className="relative pb-14 pl-10 last:pb-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-10 lg:pb-20"
                >
                  {/* 작은 오렌지 점: 배지 높이의 가운데 */}
                  <span className="absolute top-[5px] left-[7px] h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-[#fffaf4]" aria-hidden="true" />
                  {/* PC에서는 글이 스크롤 동안 따라오도록 sticky */}
                  <div className="lg:sticky lg:top-10">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent-strong">{step.tag}</span>
                      {step.prd && (
                        <span className="inline-block rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold text-stone-500 ring-1 ring-stone-300">
                          PRD {step.prd}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-xl font-ko font-black tracking-tight text-stone-900">{step.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-stone-700">{step.body}</p>
                    {step.prompt && (
                      // 터미널 입력처럼: 테두리 박스 안에 고정폭 명령 + 터미널 창의 요청 줄과 같은 글꼴(기본 글꼴 13px)
                      <div className="mt-4 rounded-2xl px-4 py-3.5 ring-1 ring-[#e8dccd]">
                        <span className="font-mono text-[13px]">
                          <span className="text-accent">$</span> <span className="text-stone-800">claude</span>{" "}
                          <span className="text-stone-500">--request</span>
                        </span>
                        <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-stone-600">
                          {step.prompt.map((line) => (
                            <li key={line} className="flex gap-1.5">
                              <span className="text-stone-400" aria-hidden="true">&gt;</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {step.flow && (
                      <ol className="mt-4 flex flex-wrap items-center gap-1.5 text-sm font-bold">
                        {step.flow.map((f, j) => (
                          <li key={f} className="flex items-center gap-1.5">
                            {j > 0 && <span className="text-accent-light" aria-hidden="true">→</span>}
                            <span className="rounded-full bg-white/90 px-3 py-1 text-stone-700 shadow-sm ring-1 ring-stone-900/5">{f}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                  <div className="mt-5 flex flex-col gap-4 lg:mt-0">
                    {step.doc && <MarkdownFile name="PRD.md" lines={step.doc} />}
                    {step.terminal && <Terminal lines={step.terminal} />}
                    {/* 폰 화면은 나란히, 가로로 긴 이미지는 그 아래로 */}
                    {step.shots.some((s) => s.phone) && (
                      <div className="flex items-start gap-3">
                        {step.shots
                          .filter((s) => s.phone)
                          .map((shot) => (
                            <div key={shot.src} className="flex w-full flex-1 justify-center">
                              <ShotImage shot={shot} />
                            </div>
                          ))}
                      </div>
                    )}
                    {step.shots
                      .filter((s) => !s.phone)
                      .map((shot) => (
                        <ShotImage key={shot.src} shot={shot} />
                      ))}
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          {/* 10종 3D */}
          <Section eyebrow="RESULT" title="하나씩 다듬은 3D 아이템 10종" desc="썸네일 이미지를 옆에 두고 형태·색감·재질을 하나씩 맞춘 결과. 카드를 누르면 쏟아짐.">
            <ItemGrid items={ITEMS} />
          </Section>

        </div>
      </div>

      {/* 밴드 3: 정리 (어두운 배경) */}
      <div className="bg-stone-900">
        <div className="mx-auto w-full max-w-3xl px-4 lg:max-w-[1200px] lg:px-8 py-16 lg:py-28">
          {/* 배운 것 */}
          <Section dark eyebrow="LEARNED" title="해 보고 알게 된 것" desc="처음 AI 에이전트와 서비스를 만들며 얻은 작업 요령.">
            <div className="grid gap-2 sm:grid-cols-2 lg:gap-3">
              {LEARNINGS.map((l) => (
                <div key={l.title} className="rounded-3xl bg-white/[0.06] p-5 ring-1 ring-white/10 lg:p-6">
                  <h3 className="font-bold text-white">{l.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-stone-400">{l.body}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* 스택 */}
          <Section dark eyebrow="STACK" title="사용한 도구" desc="서비스를 만들고 배포하는 데 쓴 도구.">
            <ul className="flex flex-wrap justify-center gap-2 lg:justify-start">
              {STACK.map((s) => (
                <li key={s} className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-bold text-stone-100 ring-1 ring-white/10 lg:px-4 lg:py-2 lg:text-[15px]">
                  {s}
                </li>
              ))}
            </ul>
          </Section>

          {/* 마무리: PC에서는 왼쪽 문구 / 오른쪽 버튼인 가로 배너 */}
          <section className="mt-16 flex flex-col items-center gap-4 text-center lg:mt-28 lg:flex-row lg:justify-between lg:rounded-[32px] lg:bg-white/[0.06] lg:px-12 lg:py-10 lg:text-left lg:ring-1 lg:ring-white/10">
            <div>
              <p className="text-lg font-ko font-black text-white lg:text-3xl lg:tracking-tight">오늘 나는 얼마나 벌었을까?</p>
              <p className="mt-2 hidden text-stone-400 lg:block">연봉만 넣으면 지금 이 순간까지 번 돈만큼 쏟아지는 치킨.</p>
            </div>
            <Link
              href="/"
              className="flex w-full max-w-sm items-center gap-1 justify-center rounded-full bg-accent py-4 text-[15px] font-bold text-white shadow-md transition hover:bg-accent-strong active:scale-[0.97] lg:w-72 lg:shrink-0"
            >
              <img src="/items/chicken.png" alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
              지금 확인하러 가기
            </Link>
          </section>
        </div>
      </div>

      {/* 푸터 */}
      <footer className="bg-[#edeeef] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-10 text-center lg:max-w-[1200px] lg:flex-row lg:justify-between lg:px-8 lg:text-left">
          <div className="flex items-center gap-1.5">
            {/* 서비스 로고(치킨 닭다리, 파비콘과 같은 이미지)의 흑백 버전 */}
            <img src="/items/chicken.png" alt="" width={42} height={42} className="h-[42px] w-[42px] object-contain grayscale" />
            <span className="text-[28px] font-ko font-black text-neutral-800">오늘 번 돈</span>
          </div>
          <p className="flex flex-wrap items-center justify-center gap-x-2 text-sm font-medium text-neutral-500">
            <span>PTKOREA</span>
            <span className="text-neutral-300" aria-hidden="true">|</span>
            <span>D2-GXG-T5</span>
            <span className="text-neutral-300" aria-hidden="true">|</span>
            <span>Conner</span>
          </p>
        </div>
      </footer>
    </main>
  );
}

/** 모바일은 제목 아래 내용, PC는 왼쪽 제목(따라 내려옴) / 오른쪽 내용 */
function Section({
  eyebrow,
  title,
  desc,
  dark = false,
  children,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16 first:mt-0 lg:mt-28 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-16">
      <div className="text-center lg:sticky lg:top-10 lg:self-start lg:text-left">
        <span className={`text-xs font-black tracking-[0.2em] ${dark ? "text-accent-light" : "text-accent"}`}>{eyebrow}</span>
        <h2 className={`mt-1.5 text-2xl font-ko font-black tracking-tight sm:text-3xl lg:leading-snug ${dark ? "text-white" : "text-stone-900"}`}>{title}</h2>
        <p className={`mt-3 hidden text-[15px] leading-relaxed lg:block ${dark ? "text-stone-400" : "text-stone-700"}`}>{desc}</p>
      </div>
      <div className="mt-6 lg:mt-0">{children}</div>
    </section>
  );
}

/** 터미널 창 모양. "$ "로 시작하는 줄은 명령, "✓"는 성공 출력 */
function Terminal({ lines }: { lines: string[] }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-[#1f1b18] shadow-[0_12px_32px_-12px_rgba(120,72,30,0.35)] ring-1 ring-stone-900/10">
      <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-3" aria-hidden="true">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-xs font-medium text-stone-500">Terminal — claude</span>
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-7 whitespace-pre-wrap text-stone-300">
        {lines.map((line) => (
          <div key={line}>
            {line.startsWith("$ ") ? (
              <>
                <span className="text-accent-light">$</span> <span className="text-white">{line.slice(2)}</span>
              </>
            ) : line.startsWith("✓") ? (
              <span className="text-emerald-400">{line}</span>
            ) : (
              // 한글 요청 줄은 고정폭 글꼴에서 자간이 벌어져 기본 글꼴로
              <span className="font-sans text-stone-400">{line}</span>
            )}
          </div>
        ))}
      </pre>
    </div>
  );
}

/** GitHub 로고 (Octicons mark-github) */
function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/** 에디터에서 연 마크다운 파일 모양. "#"는 제목, ">"는 인용, "-"·숫자는 목록 */
function MarkdownFile({ name, lines }: { name: string; lines: string[] }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white/70 shadow-[0_12px_32px_-12px_rgba(120,72,30,0.28)] ring-1 ring-stone-900/5 backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-stone-900/5 px-4 py-3">
        <span className="rounded-md bg-stone-900/5 px-2 py-0.5 font-mono text-xs font-semibold text-stone-700">{name}</span>
        <span className="text-xs text-stone-400">Markdown</span>
      </div>
      <div className="space-y-1 px-5 py-4 font-mono text-[13px] leading-6">
        {lines.map((line) =>
          line.startsWith("# ") ? (
            <p key={line} className="text-base font-bold text-stone-900">
              <span className="text-accent">#</span> {line.slice(2)}
            </p>
          ) : line.startsWith("## ") ? (
            <p key={line} className="pt-2 font-bold text-stone-800">
              <span className="text-accent">##</span> {line.slice(3)}
            </p>
          ) : line.startsWith("> ") ? (
            <p key={line} className="border-l-2 border-stone-300 pl-3 font-sans text-stone-500">
              {line.slice(2)}
            </p>
          ) : (
            <p key={line} className="font-sans text-stone-600">
              <span className="font-mono text-stone-400">{line.match(/^(\d+\.|-)/)?.[0]}</span>
              {line.replace(/^(\d+\.|-)/, "")}
            </p>
          ),
        )}
      </div>
    </div>
  );
}
