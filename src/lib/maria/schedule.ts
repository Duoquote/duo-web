// Availability rules, date helpers, share-link codec and .ics builder for /maria.
// Calendar dates are handled as plain "YYYY-MM-DD" strings so the page behaves the
// same whether it's opened from Istanbul or Warsaw.

import { CAL_NAMES, type MLocale } from "./i18n";

/** First day I'm actually in Istanbul — a Sunday. Nothing before this is selectable. */
export const TRIP_START = "2026-08-02";
/** How far ahead the grid runs. */
export const HORIZON_DAYS = 56;

/** Visible hour range. Slot `h` means h:00 → (h+1):00. */
export const FIRST_HOUR = 8;
export const LAST_HOUR = 23;

/** Both blocks are hard — unselectable — and only apply on these weekdays. */
export const WORK_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri
export const GUVEN_WORK = { from: 8, to: 17 };
export const MARIA_WORK = { from: 10, to: 19 };

export const ISTANBUL_UTC_OFFSET = 3; // fixed year-round since 2016

export type SlotState = "free" | "guven" | "maria" | "both" | "locked";

// ---------------------------------------------------------------- date helpers

export function toISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse "YYYY-MM-DD" as a UTC-noon instant, which keeps getUTCDay() stable. */
export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(iso: string): number {
  return fromISO(iso).getUTCDay();
}

export function isWeekend(iso: string): boolean {
  const d = dayOfWeek(iso);
  return d === 0 || d === 6;
}

export const TRIP_END = addDays(TRIP_START, HORIZON_DAYS - 1);

/** Every selectable date, in order. */
export function allDates(): string[] {
  return Array.from({ length: HORIZON_DAYS }, (_, i) => addDays(TRIP_START, i));
}

/**
 * Monday-aligned weeks covering the horizon (TR/PL/EU convention).
 *
 * The trip starts Sunday 2 Aug 2026, which falls at the *end* of a Monday-first week,
 * so the first row also contains the days before arrival. Those come back too and
 * render as locked — which is what makes the "nothing before 2 August" rule visible
 * instead of just asserted.
 */
export function mondayWeeks(): string[][] {
  const backToMonday = (dayOfWeek(TRIP_START) + 6) % 7; // Sunday -> 6
  let monday = addDays(TRIP_START, -backToMonday);
  const weeks: string[][] = [];
  while (monday <= TRIP_END) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(monday, i)));
    monday = addDays(monday, 7);
  }
  return weeks;
}

/** Group the horizon into calendar months, for the month-by-month view. */
export function datesByMonth(): { key: string; year: number; month: number; dates: string[] }[] {
  const groups: { key: string; year: number; month: number; dates: string[] }[] = [];
  for (const iso of allDates()) {
    const [y, m] = iso.split("-").map(Number);
    const key = `${y}-${m}`;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, year: y, month: m - 1, dates: [] };
      groups.push(g);
    }
    g.dates.push(iso);
  }
  return groups;
}

export function formatDateLong(iso: string, locale: MLocale): string {
  const [y, m, d] = iso.split("-").map(Number);
  const names = CAL_NAMES[locale];
  const dow = names.days[dayOfWeek(iso)];
  const month = names.months[m - 1];
  if (locale === "en") return `${dow}, ${month} ${d}, ${y}`;
  if (locale === "pl") return `${dow}, ${d} ${month} ${y}`;
  return `${d} ${month} ${y}, ${dow}`; // tr
}

export const hourLabel = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;

/** A selected range start..end renders as "19:00 – 21:00". */
export function rangeLabel(start: number, end: number): string {
  return `${hourLabel(start)} – ${hourLabel(end + 1)}`;
}

// ------------------------------------------------------------- slot availability

const inBlock = (h: number, b: { from: number; to: number }) => h >= b.from && h < b.to;

export function slotState(iso: string, hour: number): SlotState {
  if (iso < TRIP_START || iso > TRIP_END) return "locked";
  if (hour < FIRST_HOUR || hour > LAST_HOUR) return "locked";
  if (!WORK_DAYS.includes(dayOfWeek(iso))) return "free";
  const g = inBlock(hour, GUVEN_WORK);
  const m = inBlock(hour, MARIA_WORK);
  if (g && m) return "both";
  if (g) return "guven";
  if (m) return "maria";
  return "free";
}

export const isSlotFree = (iso: string, hour: number) => slotState(iso, hour) === "free";

export const HOURS = Array.from(
  { length: LAST_HOUR - FIRST_HOUR + 1 },
  (_, i) => FIRST_HOUR + i,
);

/** True when every hour from start..end (inclusive) is free on that date. */
export function isRangeFree(iso: string, start: number, end: number): boolean {
  const [a, b] = start <= end ? [start, end] : [end, start];
  for (let h = a; h <= b; h++) if (!isSlotFree(iso, h)) return false;
  return true;
}

/** Contiguous free windows on a date, as [startHour, endHour] inclusive pairs. */
export function freeWindows(iso: string): [number, number][] {
  const out: [number, number][] = [];
  let run: number | null = null;
  for (const h of HOURS) {
    if (isSlotFree(iso, h)) {
      if (run === null) run = h;
    } else if (run !== null) {
      out.push([run, h - 1]);
      run = null;
    }
  }
  if (run !== null) out.push([run, LAST_HOUR]);
  return out;
}

export const hasAnyFreeSlot = (iso: string) => freeWindows(iso).length > 0;

// ------------------------------------------------------------------ share codec

export interface PlanState {
  date: string | null;
  start: number | null;
  end: number | null;
  coffee: string | null;
  food: string | null;
  noFood: boolean;
  locale: MLocale;
}

export const EMPTY_PLAN: PlanState = {
  date: null,
  start: null,
  end: null,
  coffee: null,
  food: null,
  noFood: false,
  locale: "tr",
};

const b64urlEncode = (s: string) =>
  btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const b64urlDecode = (s: string) =>
  decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));

export function encodePlan(p: PlanState): string {
  const tuple = [p.date ?? "", p.start ?? "", p.end ?? "", p.coffee ?? "", p.food ?? "", p.noFood ? 1 : 0, p.locale];
  return b64urlEncode(JSON.stringify(tuple));
}

export function decodePlan(raw: string): PlanState | null {
  try {
    const t = JSON.parse(b64urlDecode(raw));
    if (!Array.isArray(t)) return null;
    const [date, start, end, coffee, food, noFood, locale] = t;
    const p: PlanState = {
      date: date || null,
      start: start === "" ? null : Number(start),
      end: end === "" ? null : Number(end),
      coffee: coffee || null,
      food: food || null,
      noFood: Boolean(noFood),
      locale: (["tr", "en", "pl"].includes(locale) ? locale : "tr") as MLocale,
    };
    // never trust a link into a blocked slot
    if (p.date && p.start != null && p.end != null && !isRangeFree(p.date, p.start, p.end)) {
      return { ...p, date: null, start: null, end: null };
    }
    return p;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------------- .ics file

function icsStamp(iso: string, hour: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  // local Istanbul time → UTC
  const dt = new Date(Date.UTC(y, m - 1, d, hour - ISTANBUL_UTC_OFFSET, 0, 0));
  return dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildICS(opts: {
  date: string;
  start: number;
  end: number;
  title: string;
  description: string;
  location: string;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//dq.ms//kahveli kahve date//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:kahveli-${opts.date}-${opts.start}@dq.ms`,
    `DTSTAMP:${icsStamp(opts.date, opts.start)}`,
    `DTSTART:${icsStamp(opts.date, opts.start)}`,
    `DTEND:${icsStamp(opts.date, opts.end + 1)}`,
    `SUMMARY:${escapeICS(opts.title)}`,
    `DESCRIPTION:${escapeICS(opts.description)}`,
    `LOCATION:${escapeICS(opts.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

const escapeICS = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
