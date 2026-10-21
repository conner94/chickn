// 순수 계산 함수 모음. React/브라우저 API에 의존하지 않는다.

export const WORK_DAYS_PER_MONTH = 21.7;

export interface WorkSettings {
  /** 연봉 (만원 단위) */
  annualSalaryManwon: number;
  /** "HH:MM" */
  workStart: string;
  workEnd: string;
  lunchStart: string;
  lunchEnd: string;
}

export const DEFAULT_SETTINGS: WorkSettings = {
  annualSalaryManwon: 3000,
  workStart: "09:00",
  workEnd: "18:00",
  lunchStart: "12:00",
  lunchEnd: "13:00",
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "HH:MM" → 자정 기준 초. 형식이 잘못되면 NaN */
export function parseTime(hhmm: string): number {
  const m = TIME_RE.exec(hhmm);
  if (!m) return NaN;
  return Number(m[1]) * 3600 + Number(m[2]) * 60;
}

/** Date → 그날 자정 기준 경과 초 (로컬 시간, 밀리초 포함) */
export function secondsOfDay(date: Date): number {
  return (
    date.getHours() * 3600 +
    date.getMinutes() * 60 +
    date.getSeconds() +
    date.getMilliseconds() / 1000
  );
}

/** 두 구간 [a1,a2], [b1,b2]의 겹치는 길이 */
function overlap(a1: number, a2: number, b1: number, b2: number): number {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

/** 입력값 검증. 문제가 없으면 빈 배열 */
export function validateSettings(s: WorkSettings): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(s.annualSalaryManwon) || s.annualSalaryManwon <= 0) {
    errors.push("연봉은 0보다 커야 해요.");
  }
  const [ws, we, ls, le] = [s.workStart, s.workEnd, s.lunchStart, s.lunchEnd].map(parseTime);
  if ([ws, we, ls, le].some(Number.isNaN)) {
    errors.push("시간 형식이 올바르지 않아요.");
    return errors;
  }
  if (we <= ws) errors.push("퇴근 시간은 출근 시간보다 늦어야 해요.");
  if (le < ls) errors.push("점심 종료는 점심 시작보다 늦어야 해요.");
  if (we > ws && workSecondsPerDay(s) <= 0) errors.push("점심시간을 빼면 실근무 시간이 없어요.");
  return errors;
}

/** 하루 실근무 시간(초) = 근무 구간 - 근무 구간과 겹치는 점심시간 */
export function workSecondsPerDay(s: WorkSettings): number {
  const ws = parseTime(s.workStart);
  const we = parseTime(s.workEnd);
  const ls = parseTime(s.lunchStart);
  const le = parseTime(s.lunchEnd);
  return Math.max(0, we - ws - overlap(ws, we, ls, le));
}

/** 월급(원) = 연봉 ÷ 12 */
export function monthlySalary(s: WorkSettings): number {
  return (s.annualSalaryManwon * 10_000) / 12;
}

/** 연봉 ↔ 월급 (둘 다 만원 단위). 월급 = 연봉 ÷ 12 */
export function annualFromMonthly(monthlyManwon: number): number {
  return monthlyManwon * 12;
}

export function monthlyFromAnnual(annualManwon: number): number {
  return annualManwon / 12;
}

/** 만원 단위 입력칸 표시값: 소수 첫째 자리까지, 불필요한 0 제거. 잘못된 값은 빈칸 */
export function formatManwonInput(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 10) / 10);
}

/** 시급(원) = 월급 ÷ (하루 실근무시간 × 21.7일) */
export function hourlyWage(s: WorkSettings): number {
  const hours = workSecondsPerDay(s) / 3600;
  if (hours <= 0) return 0;
  return monthlySalary(s) / (hours * WORK_DAYS_PER_MONTH);
}

/** 하루치 전액(원) */
export function dailyWage(s: WorkSettings): number {
  return (hourlyWage(s) * workSecondsPerDay(s)) / 3600;
}

/** 출근 후 지금까지의 실근무 시간(초). 출근 전 0, 퇴근 후 하루치에서 멈춤 */
export function workedSecondsAt(s: WorkSettings, nowSec: number): number {
  const ws = parseTime(s.workStart);
  const we = parseTime(s.workEnd);
  const ls = parseTime(s.lunchStart);
  const le = parseTime(s.lunchEnd);
  const t = Math.min(Math.max(nowSec, ws), we);
  return Math.max(0, t - ws - overlap(ws, t, ls, le));
}

export type WorkPhase = "before" | "working" | "lunch" | "after";

export function workPhaseAt(s: WorkSettings, nowSec: number): WorkPhase {
  const ws = parseTime(s.workStart);
  const we = parseTime(s.workEnd);
  if (nowSec < ws) return "before";
  if (nowSec >= we) return "after";
  if (nowSec >= parseTime(s.lunchStart) && nowSec < parseTime(s.lunchEnd)) return "lunch";
  return "working";
}

/** 오늘 번 돈(원, 소수점 포함). 표시할 때 내림 처리한다. */
export function earnedAt(s: WorkSettings, nowSec: number): number {
  return (hourlyWage(s) * workedSecondsAt(s, nowSec)) / 3600;
}

/** 아이템 개수 = floor(번 돈 ÷ 가격) */
export function itemCount(earned: number, price: number): number {
  if (price <= 0 || earned <= 0) return 0;
  return Math.floor(earned / price);
}

/** 실근무 시간(초)이 workedSec가 되는 시각(자정 기준 초). 점심시간만큼 뒤로 밀린다. 오늘 안에 안 되면 null */
export function clockAtWorked(s: WorkSettings, workedSec: number): number | null {
  if (workedSec > workSecondsPerDay(s)) return null;
  const ws = parseTime(s.workStart);
  const we = parseTime(s.workEnd);
  // 근무시간 안으로 자른 점심시간
  const ls = Math.min(Math.max(parseTime(s.lunchStart), ws), we);
  const le = Math.min(Math.max(parseTime(s.lunchEnd), ws), we);
  const t = ws + workedSec;
  return t > ls ? t + Math.max(0, le - ls) : t;
}

/**
 * 다음 아이템 1개를 더 획득하기까지 남은 시간(초).
 * counted: 지금까지 센 개수 (하루 최댓값 기준이라 현재 금액보다 앞설 수 있다)
 * 오늘 근무시간 안에 못 받으면 null.
 */
export function secondsUntilNextItem(s: WorkSettings, nowSec: number, counted: number, price: number): number | null {
  const hourly = hourlyWage(s);
  if (hourly <= 0 || price <= 0) return null;
  const targetWorked = (((counted + 1) * price) / hourly) * 3600;
  const at = clockAtWorked(s, targetWorked);
  return at === null ? null : Math.max(0, at - nowSec);
}

/** 남은 시간 표시: "1시간 5분" / "12분 30초" / "45초" */
export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.ceil(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  if (m > 0) return s > 0 ? `${m}분 ${s}초` : `${m}분`;
  return `${s}초`;
}

/** 금액 표시: 원 단위 내림 + 천 단위 콤마 */
export function formatWon(value: number): string {
  return Math.floor(value).toLocaleString("ko-KR");
}

/** 로컬 날짜 키 "YYYY-MM-DD" */
export function localDateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export interface DailyMax {
  date: string;
  max: number;
  /** 이 최댓값을 기록할 때의 설정 (연봉·근무시간). 설정이 바뀌면 새로 시작 */
  settingsKey?: string;
}

/** 금액 계산에 영향을 주는 설정을 한 줄로 */
export function settingsKey(s: WorkSettings): string {
  return [s.annualSalaryManwon, s.workStart, s.workEnd, s.lunchStart, s.lunchEnd].join("|");
}

/**
 * 오늘 번 돈의 최댓값. 시간이 흘러도 개수가 줄지 않게 하는 기준.
 * 날짜나 설정이 바뀌면 새로 시작한다. 바뀐 게 없으면 prev를 그대로 돌려준다.
 */
export function nextDailyMax(prev: DailyMax | null, date: string, earned: number, key = ""): DailyMax {
  // 날짜나 설정(월급 등)이 바뀌면 지금 금액부터 새로 시작
  if (!prev || prev.date !== date || (prev.settingsKey ?? "") !== key) return { date, max: earned, settingsKey: key };
  return earned > prev.max ? { ...prev, max: earned } : prev;
}
