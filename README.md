# 오늘 번 돈 (Chickn)

연봉(또는 월급)을 입력하면 **오늘 일하면서 번 돈**을 초 단위로 세고,
그 금액만큼 치킨·커피·로또 같은 3D 오브젝트가 화면 위에서 떨어져 아래에 쌓이는 미니 웹서비스입니다.

외부 API·DB·로그인 없이 전부 브라우저에서 동작합니다. 입력값은 이 브라우저의 `localStorage`에만 저장되고 서버로 전송되지 않습니다.

## 기능

- 월급 ↔ 연봉 입력 연동 (월급 × 12 = 연봉), 출퇴근·점심시간 설정
- 오늘 번 돈을 1초마다 갱신 (점심시간엔 멈춤, 퇴근 후엔 하루치에서 고정)
- 10종 환산 아이템(썸네일 이미지)을 자동으로 흐르는 카드 줄에서 선택 (터치 스와이프, 드래그, Shift+휠, 화살표 버튼, 키보드)
- 선택한 아이템이 rapier 물리로 떨어져 쌓임 · 오브젝트 클릭하면 튀어오름 · "흔들기"
- 처음 접속 시 이미 번 만큼은 0.1초 간격으로 순차 낙하
- 최대 150개까지만 렌더링하고 나머지는 "+N개 더"로 표시

## 계산 방식

| 항목 | 식 |
| --- | --- |
| 월급 | 연봉 ÷ 12 |
| 하루 실근무시간 | (퇴근 − 출근) − 근무시간과 겹치는 점심시간 |
| 시급 | 월급 ÷ (하루 실근무시간 × 21.7일) |
| 오늘 번 돈 | 출근 후 경과한 실근무시간 × 시급 (출근 전 0원, 퇴근 후 하루치 고정) |
| 아이템 개수 | floor(오늘 번 돈의 하루 중 최댓값 ÷ 가격) — 하루 중엔 줄지 않음 |

- 요일은 구분하지 않습니다. 주말에 열어도 평일과 같은 근무시간으로 계산합니다.
- 금액은 매번 현재 시각으로 다시 계산하므로 타이머 오차가 쌓이지 않고, 탭을 비웠다 돌아와도 정확합니다.
- 계산 로직은 `src/lib/earnings.ts`의 순수 함수이며 `src/lib/earnings.test.ts`에서 테스트합니다.

## 실행

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # 단위 테스트 (vitest)
npm run build   # 프로덕션 빌드
```

> 회사망 등에서 `npm install`이 인증서 오류(`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`)로 실패하면
> 시스템 인증서를 PEM으로 내보낸 뒤 `NPM_CONFIG_CAFILE=<pem 경로> npm install`로 설치하세요.

## 기술 스택

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- three, @react-three/fiber, @react-three/drei, @react-three/rapier
- vitest

## 폴더 구조

```
src/
  app/                    레이아웃, 페이지, 전역 스타일, 아이콘
  constants/
    items.ts              ★ 아이템 10종 (이름·단위·가격·카테고리·형태) — 가격은 여기서만 수정
    scene.ts              렌더링 상한(150), 순차 생성 간격
  lib/earnings.ts         계산 순수 함수 (+ 테스트)
  hooks/                  localStorage 저장, 1초 시계, 하루 최댓값, 순차 카운트
  components/
    EarningsApp.tsx       화면 조립
    EarningsDisplay.tsx   금액 + 진행 바
    ItemMarquee.tsx       자동 흐름 카드 캐러셀 (라이브러리 없음, rAF + scrollLeft)
    SettingsSheet.tsx     "월급 입력하기" 바텀시트
    scene/
      DropScene.tsx       Canvas, 카메라, 조명
      StageBounds.tsx     화면 가장자리에 맞춘 보이지 않는 벽·바닥
      ItemPile.tsx        InstancedMesh + 물리 바디, 페이드, 클릭·흔들기
      looks.ts            아이템별 로우폴리 모양 (컵형·박스형·원형)
```

### 자주 바꾸는 값

- 아이템 가격·추가: `src/constants/items.ts` (썸네일은 `public/items/<id>.png`, 원본은 `img/`. 3D 모양은 `scene/looks.ts`의 `LOOKS`에 같은 id로 추가)
- 쌓이는 바닥 높이: `EarningsApp.tsx`의 `FLOOR_RATIO`
- 카드 흐름 속도·재개 시간: `ItemMarquee.tsx` 상단 상수
- 렌더링 상한: `src/constants/scene.ts`의 `MAX_RENDERED_ITEMS`

## 성능

- 아이템 한 종류는 부품을 하나의 지오메트리로 합쳐 `InstancedMesh` 하나로 그립니다 (드로우콜 1개).
- `dpr` 최대 2, 그림자 맵 1024px.
- 카드 흐름은 React 상태 없이 `requestAnimationFrame` 안에서 `scrollLeft`만 바꿉니다.
- `prefers-reduced-motion` 설정이면 카드 자동 흐름을 끕니다.

## Vercel 배포 (Hobby, 무료)

1. GitHub에 새 저장소를 만들고 이 폴더를 push 합니다.
2. [vercel.com](https://vercel.com) → **Add New… → Project** → 저장소 선택.
3. Framework Preset이 **Next.js**로 자동 감지되면 설정 변경 없이 **Deploy**.
   - 환경 변수 없음, Build Command `npm run build`, Output은 기본값.
4. 이후 `main` 브랜치에 push 할 때마다 자동 배포됩니다.
