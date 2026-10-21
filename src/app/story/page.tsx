import type { Metadata } from "next";
import Link from "next/link";

// 이 프로젝트를 만든 과정을 소개하는 정적 페이지 (/story). 스크린샷은 public/story/ 에 있다.
const title = "만든 과정 · 오늘 번 돈";
const description = "피그마 없이 AI 에이전트와 대화만으로 기획서 한 장에서 배포까지 간 첫 MCP 스터디 기록.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, url: "/story" },
  twitter: { title, description },
};

const STATS = [
  { value: "0", unit: "개", label: "사용한 디자인 툴" },
  { value: "10", unit: "종", label: "직접 다듬은 3D 아이템" },
  { value: "2", unit: "일", label: "실제 작업한 날" },
  { value: "0", unit: "원", label: "서버·운영 비용" },
];

const WORKFLOW = [
  { title: "글로 쓴 기획서", body: "화면을 그리는 대신 기능·계산식·기술 스택을 문서로 적어 붙여 넣었어요." },
  { title: "단계마다 멈추기", body: "4단계로 나눠 한 단계가 끝날 때마다 멈추고 직접 확인한 뒤 다음으로." },
  { title: "AI가 직접 보고 확인", body: "에이전트가 헤드리스 크롬으로 화면을 찍어 보고 스스로 고쳤어요." },
  { title: "말로 고치기", body: "“카드를 더 크게”, “두 배로 키워줘”처럼 대화로 디자인을 다듬었어요." },
];

type Shot = { src: string; alt: string; caption?: string; phone?: boolean };
type Step = {
  tag: string;
  title: string;
  body: string;
  /** 에이전트에게 보낸 요청을 요청사항 형태로 다듬은 것 */
  prompt?: string[];
  /** 작업 순서를 칩으로 보여줄 때 */
  flow?: string[];
  shots: Shot[];
};

const STEPS: Step[] = [
  {
    tag: "초안",
    title: "유리 상자 속에 각진 치킨",
    body: "기획서대로 나온 첫 화면. 계산 로직은 단위 테스트로 먼저 고정하고, 3D는 유리 상자 안에 로우폴리 치킨이 떨어지는 형태였어요.",
    prompt: [
      "연봉을 입력하면 오늘 번 돈을 초 단위로 실시간 계산해 주세요.",
      "번 금액만큼 치킨·콜라·커피 3D 오브젝트가 물리 효과로 떨어져 쌓이게 해 주세요.",
      "외부 API·DB·로그인 없이 브라우저에서만 동작하고, 운영 비용은 0원이어야 해요.",
    ],
    shots: [{ src: "/story/01-draft-glassbox.jpg", alt: "유리 상자 안에 각진 치킨이 놓인 첫 화면", phone: true }],
  },
  {
    tag: "기능 확장",
    title: "아이템 17종 + 흘러가는 카드",
    body: "아이템을 17종으로 늘리고, 저절로 흘러가는 마키 캐러셀과 소소·한 끼·소확행 카테고리 칩을 붙였어요.",
    prompt: [
      "아이템을 17종으로 늘리고 가격순으로 정리해 주세요.",
      "카드가 가로로 천천히 흐르는 무한 캐러셀을 만들고, 만지면 멈추고 누르면 선택되게 해 주세요.",
    ],
    shots: [{ src: "/story/02-marquee-17.jpg", alt: "카테고리 칩과 마키 카드가 추가된 화면", phone: true }],
  },
  {
    tag: "UI 구조 수정",
    title: "상자를 없애고 화면 전체를 무대로",
    body: "써 보니 상자가 답답했어요. 카테고리 탭을 없애고, 카드를 금액 바로 아래로 크게 올리고, 오브젝트가 화면 아래에 그냥 쌓이게 구조를 바꿨어요.",
    prompt: [
      "카테고리 탭 없이 모든 아이템을 한 줄로 보여 주세요.",
      "카드는 금액과 진행 바 바로 아래에 크게 배치해 주세요.",
      "상자 없이 투명한 화면 위로 떨어져 아래쪽에 자연스럽게 쌓이게 해 주세요.",
    ],
    shots: [
      { src: "/story/02-marquee-17.jpg", alt: "구조 수정 전 화면", caption: "Before", phone: true },
      { src: "/story/03-no-box.jpg", alt: "상자 없이 화면 아래에 콜라가 쌓인 화면", caption: "After", phone: true },
    ],
  },
  {
    tag: "디테일",
    title: "남은 시간과 알맞은 단위",
    body: "“다음 아이템까지 남은 돈” 대신 남은 시간을 보여 주고, 커피는 잔·김밥은 줄·떡볶이는 그릇처럼 단위를 맞췄어요.",
    prompt: [
      "‘다음 아이템까지’는 남은 금액 대신 남은 시간(분·초)으로 보여 주세요.",
      "단위는 아이템에 맞춰 주세요. 커피는 잔, 김밥은 줄, 떡볶이는 그릇.",
    ],
    shots: [{ src: "/story/04-polish.jpg", alt: "남은 시간과 단위가 바뀐 화면", phone: true }],
  },
  {
    tag: "폴리곤 업데이트 ①",
    title: "각진 모델에서 윤기 나는 장난감으로",
    body: "환경맵 조명, 부드러운 그림자, 클리어코트 재질을 더해 플라스틱 장난감 같은 질감을 냈어요. 후보 조명을 여러 개 찍어 비교한 뒤 골랐어요.",
    prompt: [
      "환경맵, 부드러운 그림자, 은은한 빛 번짐으로 씬의 완성도를 올려 주세요.",
      "재질은 윤기 있는 장난감 느낌, 색은 파스텔 톤 팔레트로 통일해 주세요.",
      "유료 서비스 없이, 기존 물리·성능 구조는 그대로 유지해 주세요.",
    ],
    shots: [{ src: "/story/05-toy-material.jpg", alt: "윤기 있는 치킨과 각진 콜라 비교" }],
  },
  {
    tag: "UI 구조 수정",
    title: "이모지를 직접 만든 썸네일로",
    body: "아이템 이미지를 직접 준비해 img 폴더에 넣고, 이미지가 없는 아이템은 과감히 뺐어요. 10종이 남았고, 카드는 이미지가 잘 보이도록 유리 질감으로 다시 짰어요.",
    prompt: [
      "이모지 대신 준비한 썸네일 이미지를 써 주세요. 이미지가 없는 아이템은 제외해요.",
      "이미지가 잘 보이도록 카드 디자인을 다시 정리해 주세요.",
    ],
    shots: [{ src: "/story/06-thumb-cards.jpg", alt: "썸네일 이미지 카드로 바뀐 화면", phone: true }],
  },
  {
    tag: "폴리곤 업데이트 ②",
    title: "썸네일과 나란히 놓고 3D 맞추기",
    body: "개발용 비교 페이지를 만들어 왼쪽엔 썸네일, 오른쪽엔 3D를 띄웠어요. 매끈한 덩어리였던 치킨에 튀김옷 돌기를 올려 원본에 가깝게 맞췄어요.",
    prompt: [
      "썸네일과 최대한 같은 형태·색감·재질로 3D 모델을 만들어 주세요.",
      "치킨부터 하나씩 진행하고, 리소스는 적당한 선에서 써 주세요.",
    ],
    shots: [
      { src: "/story/07-chicken-before.jpg", alt: "썸네일과 매끈한 3D 치킨 비교", caption: "1차" },
      { src: "/story/08-chicken-after.jpg", alt: "썸네일과 튀김옷이 표현된 3D 치킨 비교", caption: "최종" },
    ],
  },
  {
    tag: "해프닝",
    title: "피자가 너무 커졌어요",
    body: "“어이없어서 웃기게” 키워 달라고 했더니 화면을 덮는 피자가 나왔어요. 절반으로 줄이고, 토핑이 위를 보며 쌓이도록 방향까지 손봤어요.",
    prompt: [
      "피자는 치킨보다 훨씬, 웃길 만큼 크게 키워 주세요.",
      "(너무 커서) 지금의 50%로 줄이고, 디테일은 치킨 수준으로 다듬어 주세요.",
      "토핑이 위를 향해 쌓이도록 방향을 바꿔 주세요.",
    ],
    shots: [
      { src: "/story/09-pizza-giant.jpg", alt: "화면을 덮을 만큼 커진 피자", caption: "너무 큼", phone: true },
      { src: "/story/10-pizza-final.jpg", alt: "알맞은 크기로 쌓인 피자", caption: "최종", phone: true },
    ],
  },
  {
    tag: "마무리",
    title: "입력 시트, 확인 다이얼로그, 공유 이미지",
    body: "월급 입력 시트에 “서버로 보내지 않아요” 안내를 넣고, 저장 버튼과 나가기 확인 창을 정리했어요. 공유용 OG 이미지는 아이템이 하늘에서 떨어지는 장면으로.",
    prompt: [
      "입력값은 서버에 저장되지 않는다는 안내를 입력칸 바로 아래에 넣어 주세요.",
      "저장 버튼은 하단에 꽉 찬 캡슐형으로, 수정 후 닫으면 확인 창을 띄워 주세요.",
      "공유 이미지는 글자 없이 아이템이 하늘에서 떨어지는 장면으로 만들어 주세요.",
    ],
    shots: [
      { src: "/story/14-live-sheet.jpg", alt: "월급 입력 바텀시트", caption: "입력 시트", phone: true },
      { src: "/story/11-sheet-confirm.jpg", alt: "저장하지 않고 나갈까요 확인 창", caption: "확인 창", phone: true },
    ],
  },
  {
    tag: "배포",
    title: "GitHub에 올리면 자동으로 배포",
    body: "로컬 폴더를 git 저장소로 만들어 GitHub에 올리고, 이미 있던 Vercel 프로젝트에 연결했어요. 이제 main에 푸시만 하면 같은 주소로 자동 배포돼요.",
    prompt: [
      "GitHub 저장소를 만들고 기존 Vercel 프로젝트에 연결해 주세요.",
      "main에 푸시하면 같은 주소로 자동 배포되게 해 주세요.",
    ],
    flow: ["git init", "GitHub 저장소", "Vercel 연결", "push = 자동 배포"],
    shots: [{ src: "/story/12-og.jpg", alt: "아이템이 떨어지는 공유 이미지", caption: "공유 시 보이는 OG 이미지" }],
  },
];

const ITEMS = [
  ["chicken", "치킨"],
  ["pizza", "피자"],
  ["icecream", "아이스크림"],
  ["cupramen", "컵라면"],
  ["coffee", "커피"],
  ["tteokbokki", "떡볶이"],
  ["soju", "소주"],
  ["burger", "햄버거세트"],
  ["samgak", "삼각김밥"],
  ["gukbap", "국밥"],
];

const LEARNINGS = [
  { title: "피그마 대신 말로 쓰는 명세", body: "레이아웃을 그리지 않아도 “어디에, 얼마나 크게, 왜”를 문장으로 적으면 화면이 나왔어요. 오히려 의도를 더 명확히 쓰게 됐어요." },
  { title: "작게 자르고 자주 멈추기", body: "한 번에 다 시키지 않고 단계·아이템 하나씩 요청했더니 결과를 확인하고 방향을 틀기 쉬웠어요." },
  { title: "비교할 수 있게 만들기", body: "원본 썸네일과 3D를 나란히 보는 페이지 하나가 “비슷하게 해줘”를 구체적인 피드백으로 바꿔 줬어요." },
  { title: "범위와 비용 정하기", body: "“토큰 너무 많이 쓰지 말고 적당히”처럼 얼마나 공들일지도 같이 말해 주는 게 중요했어요." },
];

const STACK = ["Claude Code", "Next.js", "TypeScript", "Tailwind CSS", "three.js · React Three Fiber", "Rapier 물리 엔진", "GitHub", "Vercel"];

function ShotImage({ shot }: { shot: Shot }) {
  return (
    <figure className={shot.phone ? "w-full max-w-[260px]" : "w-full"}>
      <a href={shot.src} target="_blank" rel="noreferrer" className="block">
        <img
          src={shot.src}
          alt={shot.alt}
          loading="lazy"
          className={`w-full bg-white shadow-[0_12px_32px_-12px_rgba(120,72,30,0.28)] ring-1 ring-stone-900/5 ${
            shot.phone ? "rounded-[28px]" : "rounded-2xl"
          }`}
        />
      </a>
      {shot.caption && (
        <figcaption className="mt-2.5 text-center text-xs font-bold text-stone-500">{shot.caption}</figcaption>
      )}
    </figure>
  );
}

export default function StoryPage() {
  return (
    <main className="w-full break-keep">
      {/* 밴드 1: 인트로 (페이지 기본 크림 배경) */}
      <div className="mx-auto w-full max-w-3xl px-4 lg:max-w-[1200px] lg:px-8 pt-[max(2.5rem,env(safe-area-inset-top))] pb-16 lg:pt-20 lg:pb-28">
        {/* 히어로 */}
        <header className="flex flex-col items-center text-center lg:flex-row lg:justify-between lg:gap-16 lg:text-left">
          <div className="flex flex-col items-center lg:max-w-[560px] lg:items-start">
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent-strong">
              MCP · AI 에이전트 스터디
            </span>
            <h1 className="mt-5 text-[34px] leading-[1.2] font-black tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
              피그마 없이,
              <br />
              대화로 만든 <span className="text-accent">오늘 번 돈</span>
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-stone-600 lg:mt-6 lg:max-w-none lg:text-lg">
              연봉을 넣으면 지금 이 순간 번 돈만큼 치킨·피자·떡볶이가 쏟아지는 웹서비스. 디자인 툴 없이 AI 코딩 에이전트와 대화만으로 기획서 한 장에서
              배포까지 간 과정을 정리했어요.
            </p>
            <div className="mt-6 flex w-full max-w-sm gap-2 lg:mt-8">
              <Link
                href="/"
                className="flex flex-[1.4] items-center justify-center rounded-2xl bg-stone-900 py-3.5 text-[15px] font-bold text-white shadow-md transition hover:bg-stone-800 active:scale-[0.97]"
              >
                서비스 써보기
              </Link>
              <a
                href="https://github.com/conner94/chickn"
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center rounded-2xl bg-white/90 py-3.5 text-[15px] font-bold text-stone-800 shadow-sm ring-1 ring-stone-900/5 transition hover:bg-white active:scale-[0.97]"
              >
                GitHub
              </a>
            </div>
          </div>
          <div className="mt-10 w-full max-w-[300px] lg:mt-0 lg:shrink-0">
            <ShotImage shot={{ src: "/story/13-live.jpg", alt: "완성된 오늘 번 돈 화면", phone: true }} />
          </div>
        </header>

        {/* 숫자 */}
        <section className="mt-12 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:mt-20 lg:gap-3">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-3xl bg-white/80 px-3 py-5 text-center shadow-sm ring-1 ring-stone-900/5">
              <div className="text-3xl font-black text-stone-900 tabular-nums">
                {s.value}
                <span className="ml-0.5 text-base font-bold text-stone-400">{s.unit}</span>
              </div>
              <div className="mt-1 text-xs font-medium text-stone-500">{s.label}</div>
            </div>
          ))}
        </section>
      </div>

      {/* 밴드 2: 만든 과정 (한 톤 진한 샌드) */}
      <div className="rounded-t-[40px] bg-[#f6e6d2] lg:rounded-t-[64px]">
        <div className="mx-auto w-full max-w-3xl px-4 lg:max-w-[1200px] lg:px-8 pt-16 pb-28 lg:pt-28 lg:pb-44">
          {/* 일하는 방식 */}
          <Section eyebrow="HOW" title="이렇게 만들었어요" desc="화면을 그리는 대신 문장으로 설명하고, 결과를 보고 다시 말로 고치는 흐름을 반복했어요.">
            <ol className="grid gap-2 sm:grid-cols-2 lg:gap-3">
              {WORKFLOW.map((w, i) => (
                <li key={w.title} className="flex gap-3 rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-stone-900/5 lg:p-6">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-black text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-stone-900">{w.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-stone-600">{w.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          {/* 타임라인 */}
          <Section eyebrow="PROCESS" title="초안에서 완성까지" desc="초안을 띄워 놓고 써 보면서, 구조와 3D를 한 단계씩 고쳐 나갔어요.">
            <ol className="relative">
              {/* 세로 선 */}
              <span className="absolute top-2 bottom-2 left-[11px] w-0.5 rounded-full bg-accent-light/50" aria-hidden="true" />
              {STEPS.map((step, i) => (
                <li
                  key={i}
                  className="relative pb-14 pl-10 last:pb-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-10 lg:pb-20"
                >
                  <span
                    className="absolute top-1 left-0 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-4 ring-[#f6e6d2]"
                    aria-hidden="true"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                  </span>
                  {/* PC에서는 글이 스크롤 동안 따라오도록 sticky */}
                  <div className="lg:sticky lg:top-10">
                    <span className="inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent-strong">{step.tag}</span>
                    <h3 className="mt-2 text-xl font-black tracking-tight text-stone-900">{step.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-stone-600">{step.body}</p>
                    {step.prompt && (
                      <div className="mt-4 rounded-2xl rounded-tl-md bg-stone-900 px-4 py-3.5 text-sm leading-relaxed text-stone-100">
                        <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-accent-light">요청사항</span>
                        <ul className="space-y-1">
                          {step.prompt.map((line) => (
                            <li key={line} className="flex gap-2">
                              <span className="text-accent-light" aria-hidden="true">·</span>
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
                  {/* 폰 화면은 나란히, 가로로 긴 비교 이미지는 위아래로 */}
                  <div className={`mt-5 flex items-start gap-3 lg:mt-0 ${step.shots.every((s) => s.phone) ? "" : "flex-col"}`}>
                    {step.shots.map((shot) => (
                      <div key={shot.src} className="flex w-full flex-1 justify-center">
                        <ShotImage shot={shot} />
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          {/* 10종 3D */}
          <Section eyebrow="RESULT" title="하나씩 다듬은 3D 아이템 10종" desc="썸네일 이미지를 옆에 두고 형태·색감·재질을 하나씩 맞춘 결과예요.">
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:gap-3">
              {ITEMS.map(([id, name]) => (
                <li key={id} className="relative overflow-hidden rounded-3xl bg-white/80 shadow-sm ring-1 ring-stone-900/5">
                  <img src={`/story/pv-${id}.jpg`} alt={`${name} 3D 모델`} loading="lazy" className="aspect-square w-full scale-[1.35] object-cover" />
                  <div className="relative flex items-center justify-center gap-1.5 pb-3">
                    <img src={`/items/${id}.png`} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
                    <span className="text-sm font-bold text-stone-800">{name}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

        </div>
      </div>

      {/* 밴드 3: 정리 (어두운 배경) */}
      <div className="-mt-10 rounded-t-[40px] bg-stone-900 pb-[max(3rem,env(safe-area-inset-bottom))] lg:-mt-16 lg:rounded-t-[64px]">
        <div className="mx-auto w-full max-w-3xl px-4 lg:max-w-[1200px] lg:px-8 py-16 lg:py-28">
          {/* 배운 것 */}
          <Section dark eyebrow="LEARNED" title="해 보고 알게 된 것" desc="처음 AI 에이전트와 서비스를 만들면서 얻은 작업 요령이에요.">
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
          <Section dark eyebrow="STACK" title="사용한 도구" desc="서비스를 만들고 배포하는 데 쓴 도구예요.">
            <ul className="flex flex-wrap justify-center gap-2 lg:justify-start">
              {STACK.map((s) => (
                <li key={s} className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-bold text-stone-100 ring-1 ring-white/10 lg:px-4 lg:py-2 lg:text-[15px]">
                  {s}
                </li>
              ))}
            </ul>
          </Section>

          {/* 마무리: PC에서는 왼쪽 문구 / 오른쪽 버튼인 가로 배너 */}
          <footer className="mt-16 flex flex-col items-center gap-4 text-center lg:mt-28 lg:flex-row lg:justify-between lg:rounded-[32px] lg:bg-white/[0.06] lg:px-12 lg:py-10 lg:text-left lg:ring-1 lg:ring-white/10">
            <div>
              <p className="text-lg font-black text-white lg:text-3xl lg:tracking-tight">오늘 나는 얼마나 벌었을까?</p>
              <p className="mt-2 hidden text-stone-400 lg:block">연봉만 넣으면 지금 이 순간까지 번 돈이 쏟아져요.</p>
            </div>
            <Link
              href="/"
              className="flex w-full max-w-sm items-center justify-center rounded-full bg-accent py-4 text-[15px] font-bold text-white shadow-md transition hover:bg-accent-strong active:scale-[0.97] lg:w-72 lg:shrink-0"
            >
              지금 확인하러 가기
            </Link>
          </footer>
        </div>
      </div>
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
        <h2 className={`mt-1.5 text-2xl font-black tracking-tight sm:text-3xl lg:leading-snug ${dark ? "text-white" : "text-stone-900"}`}>{title}</h2>
        <p className={`mt-3 hidden text-[15px] leading-relaxed lg:block ${dark ? "text-stone-400" : "text-stone-500"}`}>{desc}</p>
      </div>
      <div className="mt-6 lg:mt-0">{children}</div>
    </section>
  );
}
