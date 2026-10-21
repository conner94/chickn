import { describe, expect, it } from "vitest";
import {
  annualFromMonthly,
  formatManwonInput,
  monthlyFromAnnual,
  DEFAULT_SETTINGS,
  WorkSettings,
  dailyWage,
  earnedAt,
  formatWon,
  hourlyWage,
  itemCount,
  clockAtWorked,
  formatDuration,
  secondsUntilNextItem,
  localDateKey,
  nextDailyMax,
  monthlySalary,
  parseTime,
  validateSettings,
  workPhaseAt,
  workSecondsPerDay,
  workedSecondsAt,
} from "./earnings";

const t = (hhmm: string, sec = 0) => parseTime(hhmm) + sec;

// 연봉 4,000만원, 09~18시, 점심 12~13시 → 실근무 8시간
const s: WorkSettings = { ...DEFAULT_SETTINGS, annualSalaryManwon: 4000 };
const MONTHLY = 40_000_000 / 12;
const HOURLY = MONTHLY / (8 * 21.7);

describe("parseTime", () => {
  it("HH:MM을 초로 변환", () => {
    expect(parseTime("00:00")).toBe(0);
    expect(parseTime("09:30")).toBe(9 * 3600 + 30 * 60);
    expect(parseTime("23:59")).toBe(23 * 3600 + 59 * 60);
  });
  it("잘못된 형식은 NaN", () => {
    expect(parseTime("24:00")).toBeNaN();
    expect(parseTime("9:00")).toBeNaN();
    expect(parseTime("")).toBeNaN();
  });
});

describe("급여 계산", () => {
  it("월급 = 연봉 ÷ 12", () => {
    expect(monthlySalary(s)).toBeCloseTo(MONTHLY);
  });
  it("하루 실근무 시간은 점심 제외", () => {
    expect(workSecondsPerDay(s)).toBe(8 * 3600);
  });
  it("근무 시간 밖의 점심은 빼지 않음", () => {
    expect(workSecondsPerDay({ ...s, lunchStart: "19:00", lunchEnd: "20:00" })).toBe(9 * 3600);
  });
  it("근무 시간과 일부만 겹치는 점심은 겹친 만큼만 뺌", () => {
    expect(workSecondsPerDay({ ...s, lunchStart: "08:30", lunchEnd: "09:30" })).toBe(8.5 * 3600);
  });
  it("시급 = 월급 ÷ (실근무시간 × 21.7)", () => {
    expect(hourlyWage(s)).toBeCloseTo(HOURLY);
  });
  it("하루치 = 월급 ÷ 21.7", () => {
    expect(dailyWage(s)).toBeCloseTo(MONTHLY / 21.7);
  });
});

describe("earnedAt (오늘 번 돈)", () => {
  it("출근 전이면 0원", () => {
    expect(earnedAt(s, t("08:59", 59))).toBe(0);
    expect(earnedAt(s, 0)).toBe(0);
  });
  it("출근 정각이면 0원", () => {
    expect(earnedAt(s, t("09:00"))).toBe(0);
  });
  it("오전 근무 중에는 경과 시간만큼", () => {
    expect(earnedAt(s, t("10:30"))).toBeCloseTo(HOURLY * 1.5);
  });
  it("점심시간에는 증가하지 않음", () => {
    const atLunchStart = earnedAt(s, t("12:00"));
    expect(atLunchStart).toBeCloseTo(HOURLY * 3);
    expect(earnedAt(s, t("12:30"))).toBeCloseTo(atLunchStart);
    expect(earnedAt(s, t("13:00"))).toBeCloseTo(atLunchStart);
  });
  it("오후에는 점심시간을 제외하고 계산", () => {
    expect(earnedAt(s, t("15:00"))).toBeCloseTo(HOURLY * 5);
  });
  it("퇴근 후에는 하루치 전액에서 멈춤", () => {
    expect(earnedAt(s, t("18:00"))).toBeCloseTo(dailyWage(s));
    expect(earnedAt(s, t("23:59", 59))).toBeCloseTo(dailyWage(s));
  });
  it("초 단위로 증가", () => {
    const a = earnedAt(s, t("10:00"));
    const b = earnedAt(s, t("10:00", 1));
    expect(b - a).toBeCloseTo(HOURLY / 3600);
  });
  it("workedSecondsAt은 퇴근 후 하루 실근무시간과 같음", () => {
    expect(workedSecondsAt(s, t("20:00"))).toBe(workSecondsPerDay(s));
  });
});

describe("workPhaseAt", () => {
  it("구간별 상태", () => {
    expect(workPhaseAt(s, t("08:00"))).toBe("before");
    expect(workPhaseAt(s, t("10:00"))).toBe("working");
    expect(workPhaseAt(s, t("12:10"))).toBe("lunch");
    expect(workPhaseAt(s, t("13:00"))).toBe("working");
    expect(workPhaseAt(s, t("18:00"))).toBe("after");
  });
});

describe("validateSettings", () => {
  it("기본값은 유효", () => {
    expect(validateSettings(s)).toEqual([]);
  });
  it("연봉 0 이하 / 퇴근이 출근보다 빠름 / 점심 역전", () => {
    expect(validateSettings({ ...s, annualSalaryManwon: 0 })).toHaveLength(1);
    expect(validateSettings({ ...s, workEnd: "08:00" })).toHaveLength(1);
    expect(validateSettings({ ...s, lunchStart: "13:00", lunchEnd: "12:00" })).toHaveLength(1);
  });
  it("점심이 근무 시간 전체를 덮으면 오류", () => {
    expect(validateSettings({ ...s, lunchStart: "08:00", lunchEnd: "19:00" })).toHaveLength(1);
  });
});

describe("itemCount / formatWon", () => {
  it("개수 = floor(번 돈 ÷ 가격)", () => {
    expect(itemCount(39_999, 20_000)).toBe(1);
    expect(itemCount(40_000, 20_000)).toBe(2);
    expect(itemCount(0, 2_000)).toBe(0);
    expect(itemCount(1_000, 0)).toBe(0);
  });
  it("원 단위 내림 + 천 단위 콤마", () => {
    expect(formatWon(1234567.89)).toBe("1,234,567");
    expect(formatWon(0)).toBe("0");
  });
});

describe("nextDailyMax", () => {
  it("같은 날엔 줄어들지 않음", () => {
    const a = nextDailyMax(null, "2026-10-08", 50_000);
    const b = nextDailyMax(a, "2026-10-08", 30_000);
    expect(b).toBe(a);
    expect(nextDailyMax(b, "2026-10-08", 60_000)).toEqual({ date: "2026-10-08", max: 60_000, settingsKey: "" });
  });
  it("설정(월급 등)이 바뀌면 지금 금액부터 새로 시작", () => {
    const high = nextDailyMax(null, "2026-10-08", 900_000, "50000|09:00");
    expect(nextDailyMax(high, "2026-10-08", 90_000, "5000|09:00")).toEqual({
      date: "2026-10-08",
      max: 90_000,
      settingsKey: "5000|09:00",
    });
  });
  it("날짜가 바뀌면 새로 시작", () => {
    expect(nextDailyMax({ date: "2026-10-08", max: 150_000 }, "2026-10-09", 0)).toEqual({
      date: "2026-10-09",
      max: 0,
      settingsKey: "",
    });
  });
  it("localDateKey는 로컬 날짜", () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("연봉 ↔ 월급 동기화", () => {
  it("월급 × 12 = 연봉", () => {
    expect(annualFromMonthly(300)).toBe(3600);
    expect(monthlyFromAnnual(3600)).toBe(300);
  });
  it("입력칸 표시값은 소수 첫째 자리까지", () => {
    expect(formatManwonInput(monthlyFromAnnual(4000))).toBe("333.3");
    expect(formatManwonInput(3600)).toBe("3600");
    expect(formatManwonInput(NaN)).toBe("");
  });
});

describe("다음 획득까지 남은 시간", () => {
  it("clockAtWorked: 점심 전/후", () => {
    expect(clockAtWorked(s, 3600)).toBe(t("10:00"));
    expect(clockAtWorked(s, 3 * 3600)).toBe(t("12:00"));
    expect(clockAtWorked(s, 3 * 3600 + 60)).toBe(t("13:01"));
    expect(clockAtWorked(s, 8 * 3600)).toBe(t("18:00"));
    expect(clockAtWorked(s, 8 * 3600 + 1)).toBeNull();
  });
  it("시급만큼이면 1시간 뒤", () => {
    // 10:00에 0개 → 다음 1개(가격 = 시급)는 실근무 1시간째인 10:00. 1개 센 상태면 11:00
    expect(secondsUntilNextItem(s, t("10:00"), 1, HOURLY)).toBeCloseTo(3600);
  });
  it("점심시간을 건너뛰어 계산", () => {
    // 11:30, 이미 2개(2시간치) → 3개째는 실근무 3시간 = 12:00, 4개째는 실근무 4시간 = 14:00
    expect(secondsUntilNextItem(s, t("11:30"), 2, HOURLY)).toBeCloseTo(30 * 60);
    expect(secondsUntilNextItem(s, t("11:30"), 3, HOURLY)).toBeCloseTo(2.5 * 3600);
  });
  it("오늘 안에 못 받으면 null", () => {
    expect(secondsUntilNextItem(s, t("17:00"), 7, HOURLY)).toBeCloseTo(3600);
    expect(secondsUntilNextItem(s, t("17:00"), 8, HOURLY)).toBeNull();
  });
  it("formatDuration", () => {
    expect(formatDuration(45)).toBe("45초");
    expect(formatDuration(44.2)).toBe("45초");
    expect(formatDuration(750)).toBe("12분 30초");
    expect(formatDuration(600)).toBe("10분");
    expect(formatDuration(3900)).toBe("1시간 5분");
    expect(formatDuration(7200)).toBe("2시간");
  });
});
