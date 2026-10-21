"use client";

import { useEffect, useRef } from "react";
import { ITEMS, ItemId } from "@/constants/items";
import { formatWon } from "@/lib/earnings";

/** 자동 흐름 속도 (px/초) */
const AUTO_SPEED = 40;
/** 마지막 조작 후 자동 흐름 재개까지 (ms) */
const RESUME_AFTER_INTERACTION_MS = 2500;
/** 카드 선택 후 자동 흐름 재개까지 (ms) */
const RESUME_AFTER_SELECT_MS = 3000;
/** 화살표·선택으로 이동할 때 부드러운 스크롤 시간 (ms) */
const TWEEN_MS = 450;
/** 탭 복귀 등으로 프레임 간격이 길어져도 한 번에 이만큼 이상 움직이지 않게 (초) */
const MAX_FRAME_DT = 0.1;
/** 이만큼(px) 이상 끌면 드래그로 보고 카드 클릭을 무시 */
const DRAG_THRESHOLD = 6;

const COPIES = [0, 1] as const;

interface Props {
  selectedId: ItemId;
  /** 아이템별 오늘 개수. 아직 계산 전이면 null */
  counts: Record<ItemId, number> | null;
  onSelect: (id: ItemId) => void;
}

/**
 * 자동으로 가로로 흐르는 무한 루프 캐러셀.
 * - 아이템 목록을 두 번 이어 붙이고, scrollLeft가 (0, 한 벌 너비] 범위를 벗어나면 같은 모습의 반대편 위치로 보정한다.
 * - 자동 흐름과 수동 스크롤이 같은 scrollLeft를 쓰므로 서로 충돌하지 않는다.
 * - 애니메이션 상태는 전부 ref에 두고 rAF 안에서 DOM만 직접 바꾼다. (React 리렌더 없음)
 */
export function ItemMarquee({ selectedId, counts, onSelect }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const motion = useRef({
    pos: 0, // 실제 scrollLeft (소수점 유지용)
    loop: 0, // 카드 한 벌의 너비
    pausedUntil: 0,
    hovering: false,
    pointerId: null as number | null,
    lastX: 0,
    dragDistance: 0,
    tween: null as null | { from: number; to: number; start: number },
    reducedMotion: false,
    interacted: false, // 사용자가 한 번이라도 조작했는지
  }).current;

  // ─── 위치 계산 도우미 ───

  const normalize = (x: number) => {
    const { loop } = motion;
    if (loop <= 0) return x;
    while (x <= 0) x += loop;
    while (x > loop) x -= loop;
    return x;
  };

  /** scrollLeft를 쓰고, 루프 경계를 넘었으면 진행 중인 트윈도 같이 옮긴다. */
  const writePos = (x: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const n = normalize(x);
    if (motion.tween && n !== x) {
      motion.tween.from += n - x;
      motion.tween.to += n - x;
    }
    motion.pos = n;
    el.scrollLeft = n;
  };

  const pause = (ms: number) => {
    motion.interacted = true;
    motion.pausedUntil = Math.max(motion.pausedUntil, performance.now() + ms);
  };

  const scrollTo = (x: number) => {
    if (motion.reducedMotion) {
      motion.tween = null;
      writePos(x);
    } else {
      motion.tween = { from: motion.pos, to: x, start: performance.now() };
    }
  };

  const cardEl = (copy: number, index: number) =>
    scrollerRef.current?.querySelector<HTMLElement>(`[data-copy="${copy}"][data-index="${index}"]`) ?? null;

  const centerOf = (card: HTMLElement) => {
    const el = scrollerRef.current!;
    return card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2;
  };

  // ─── 측정 + rAF 루프 ───

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const measure = () => {
      const a = cardEl(0, 0);
      const b = cardEl(1, 0);
      motion.loop = a && b ? b.offsetLeft - a.offsetLeft : 0;
      writePos(motion.pos);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => (motion.reducedMotion = mq.matches);
    onMq();
    mq.addEventListener("change", onMq);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      // delta time: 탭 비활성화 후 돌아와도 튀지 않게 상한을 둔다
      const dt = Math.min((now - last) / 1000, MAX_FRAME_DT);
      last = now;
      const tw = motion.tween;
      if (tw) {
        const k = Math.min(1, (now - tw.start) / TWEEN_MS);
        const eased = 1 - (1 - k) ** 3;
        writePos(tw.from + (tw.to - tw.from) * eased);
        if (k >= 1) motion.tween = null;
      } else if (
        !motion.reducedMotion &&
        !motion.hovering &&
        motion.pointerId === null &&
        now >= motion.pausedUntil
      ) {
        writePos(motion.pos + AUTO_SPEED * dt);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mq.removeEventListener("change", onMq);
    };
    // motion/도우미는 ref 기반이라 한 번만 설정
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 사용자가 조작하기 전에는 선택된 아이템(저장값 포함)을 가운데에 두고 시작
  useEffect(() => {
    if (motion.interacted) return;
    const card = cardEl(0, ITEMS.findIndex((i) => i.id === selectedId));
    if (card) writePos(centerOf(card));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ─── 사용자 조작 ───

  const onScroll = () => {
    const el = scrollerRef.current!;
    // 우리가 쓴 값과 다르면 사용자가 직접 스크롤한 것 (터치 스와이프, 트랙패드, Shift+휠 등)
    if (Math.abs(el.scrollLeft - motion.pos) > 1) {
      motion.tween = null;
      pause(RESUME_AFTER_INTERACTION_MS);
      motion.pos = el.scrollLeft;
      if (normalize(motion.pos) !== motion.pos) writePos(motion.pos);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    motion.tween = null;
    motion.dragDistance = 0;
    pause(RESUME_AFTER_INTERACTION_MS);
    // 터치는 브라우저 기본 스와이프 스크롤을 쓰고, 마우스만 직접 드래그 처리
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    motion.pointerId = e.pointerId;
    motion.lastX = e.clientX;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (motion.pointerId !== e.pointerId) return;
    const dx = e.clientX - motion.lastX;
    motion.lastX = e.clientX;
    motion.dragDistance += Math.abs(dx);
    // 일정 거리 이상 끌었을 때만 캡처 (그냥 클릭은 카드에 그대로 전달)
    if (motion.dragDistance > DRAG_THRESHOLD && !scrollerRef.current!.hasPointerCapture(e.pointerId)) {
      scrollerRef.current!.setPointerCapture(e.pointerId);
    }
    writePos(motion.pos - dx);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (motion.pointerId !== e.pointerId) return;
    motion.pointerId = null;
    pause(RESUME_AFTER_INTERACTION_MS);
  };

  const step = (dir: -1 | 1) => {
    const a = cardEl(0, 0);
    const b = cardEl(0, 1);
    const cardStep = a && b ? b.offsetLeft - a.offsetLeft : 100;
    pause(RESUME_AFTER_INTERACTION_MS);
    scrollTo((motion.tween?.to ?? motion.pos) + dir * cardStep * 2);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    pause(RESUME_AFTER_INTERACTION_MS);
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      step(e.key === "ArrowLeft" ? -1 : 1);
    }
  };

  const selectCard = (id: ItemId, card: HTMLElement) => {
    if (motion.dragDistance > DRAG_THRESHOLD) return; // 드래그 끝의 클릭은 무시
    onSelect(id);
    pause(RESUME_AFTER_SELECT_MS);
    scrollTo(centerOf(card));
  };

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        role="group"
        aria-label="환산 아이템 선택"
        tabIndex={0}
        onScroll={onScroll}
        onPointerEnter={(e) => e.pointerType === "mouse" && (motion.hovering = true)}
        onPointerLeave={(e) => {
          if (e.pointerType !== "mouse") return;
          motion.hovering = false;
          pause(RESUME_AFTER_INTERACTION_MS);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={() => pause(RESUME_AFTER_INTERACTION_MS)}
        onTouchStart={() => pause(RESUME_AFTER_INTERACTION_MS)}
        onKeyDown={onKeyDown}
        className="relative flex gap-3 overflow-x-auto px-4 pt-3 pb-5 outline-none select-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-accent-light [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]"
      >
        {COPIES.map((copy) => (
          // 두 번째 줄은 무한 루프용 복제본: 보조기기·탭 이동에서 통째로 제외 (같은 아이템이 두 번 읽히지 않게).
          // inert는 마우스·터치 클릭까지 막아서 쓰지 않는다 (복제 카드도 눌러서 선택할 수 있어야 함)
          <div key={copy} className="flex shrink-0 gap-3" aria-hidden={copy === 1 ? true : undefined}>
            {ITEMS.map((item, index) => {
              const selected = item.id === selectedId;
              const count = counts ? `${counts[item.id].toLocaleString("ko-KR")}${item.unit}` : "계산 중";
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${item.name} ${formatWon(item.price)}원, 오늘 ${count}`}
                  tabIndex={copy === 1 ? -1 : 0}
                  data-copy={copy}
                  data-index={index}
                  draggable={false}
                  onClick={(e) => selectCard(item.id, e.currentTarget)}
                  className={`group relative flex h-[200px] w-[136px] shrink-0 flex-col items-center overflow-hidden rounded-[28px] px-2 pt-3 pb-4 text-center backdrop-blur-xl transition-[transform,box-shadow,background-color] duration-200 ${
                    selected
                      ? "scale-[1.04] bg-white/70 shadow-[0_8px_18px_-8px_rgba(255,107,74,0.5)] ring-2 ring-accent"
                      : "bg-white/45 shadow-[0_4px_14px_-6px_rgba(60,40,20,0.16)] ring-1 ring-white/80 hover:-translate-y-0.5 hover:bg-white/55"
                  }`}
                >
                  {/* 이미지 뒤 은은한 색 번짐: 상자 없이 흐리게 퍼져서 경계가 보이지 않는다 */}
                  <span
                    className={`pointer-events-none absolute top-4 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full blur-2xl transition-colors duration-300 ${
                      selected ? "bg-[#ffc9b3]/90" : "bg-[#f3e2cf]/80"
                    }`}
                    aria-hidden="true"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={copy === 0 ? item.name : ""}
                    width={100}
                    height={100}
                    draggable={false}
                    decoding="async"
                    className={`relative h-[100px] w-[100px] object-contain drop-shadow-[0_6px_6px_rgba(60,35,15,0.18)] transition-transform duration-300 ${
                      selected ? "scale-110 -rotate-3" : "group-hover:scale-105"
                    }`}
                  />
                  <span className="relative mt-auto w-full truncate text-[13px] leading-tight font-bold text-stone-800">{item.name}</span>
                  <span className="relative mt-0.5 text-[11px] leading-tight text-stone-500 tabular-nums">{formatWon(item.price)}원</span>
                  <span
                    className={`relative mt-2 rounded-full px-2.5 py-0.5 text-[13px] font-extrabold tabular-nums transition-colors ${
                      selected ? "bg-accent text-white" : "bg-white/80 text-accent-strong"
                    }`}
                  >
                    <span className="mr-0.5 text-[10px] font-semibold opacity-80">오늘</span>
                    {counts ? counts[item.id].toLocaleString("ko-KR") : "—"}
                    <span className="ml-0.5 text-[10px] font-semibold">{item.unit}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <ArrowButton dir={-1} onClick={() => step(-1)} />
      <ArrowButton dir={1} onClick={() => step(1)} />
    </div>
  );
}

function ArrowButton({ dir, onClick }: { dir: -1 | 1; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir < 0 ? "이전 아이템" : "다음 아이템"}
      className={`absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-md backdrop-blur hover:bg-white ${
        dir < 0 ? "left-1" : "right-1"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path
          d={dir < 0 ? "M9 2 4 7l5 5" : "M5 2l5 5-5 5"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
