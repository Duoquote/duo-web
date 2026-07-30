import { useCallback, useMemo, useRef, useState } from "react";
import { CAL_NAMES, mt, type MLocale } from "../../lib/maria/i18n";
import {
  mondayWeeks,
  formatDateLong,
  HOURS,
  isRangeFree,
  isSlotFree,
  rangeLabel,
  slotState,
  TRIP_START,
  dayOfWeek,
} from "../../lib/maria/schedule";

interface Props {
  locale: MLocale;
  date: string | null;
  start: number | null;
  end: number | null;
  onPick: (date: string, start: number, end: number) => void;
  onClear: () => void;
}

/** Monday-first weeks. Arrival (Sunday 2 Aug) sits at the end of the first row. */
function useWeeks() {
  return useMemo(() => mondayWeeks(), []);
}

export default function ScheduleGrid({ locale, date, start, end, onPick, onClear }: Props) {
  const weeks = useWeeks();
  const [weekIdx, setWeekIdx] = useState(0);
  // the anchor lives in a ref: the committed selection is what renders, so a drag
  // needs no state of its own
  const drag = useRef<{ date: string; anchor: number } | null>(null);

  // the grid is wider than a phone screen; drop the edge fade once it's scrolled through
  const wrapRef = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(false);
  const onWrapScroll = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  const names = CAL_NAMES[locale];
  const week = weeks[weekIdx];

  const weekLabel = useMemo(() => {
    const first = week[0];
    const last = week[week.length - 1];
    const [, m1, d1] = first.split("-").map(Number);
    const [, m2, d2] = last.split("-").map(Number);
    const a = `${d1} ${names.months[m1 - 1]}`;
    const b = `${d2} ${names.months[m2 - 1]}`;
    return `${a} – ${b}`;
  }, [week, names]);

  const beginDrag = useCallback(
    (iso: string, hour: number) => {
      if (!isSlotFree(iso, hour)) return;
      drag.current = { date: iso, anchor: hour };
      onPick(iso, hour, hour);
    },
    [onPick],
  );

  const extendDrag = useCallback(
    (iso: string, hour: number) => {
      const d = drag.current;
      if (!d || d.date !== iso) return;
      const lo = Math.min(d.anchor, hour);
      const hi = Math.max(d.anchor, hour);
      if (!isRangeFree(iso, lo, hi)) return;
      onPick(iso, lo, hi);
    },
    [onPick],
  );

  const endDrag = useCallback(() => {
    drag.current = null;
  }, []);

  /**
   * Tap/click behaviour, which has to carry range selection on touch since dragging
   * needs pointerEnter (touch never fires it) and there's no shift key on a phone:
   *  - shift-click always extends
   *  - tapping a second hour when exactly one hour is selected extends to it
   *  - otherwise start a fresh single-hour selection
   */
  const activate = useCallback(
    (iso: string, hour: number, shift: boolean) => {
      if (!isSlotFree(iso, hour)) return;
      const sameDay = date === iso && start != null && end != null;
      const singleHourPicked = sameDay && start === end;
      const wantExtend = shift || (singleHourPicked && hour !== start);

      if (wantExtend && sameDay) {
        const lo = Math.min(start!, hour);
        const hi = Math.max(start!, hour);
        if (isRangeFree(iso, lo, hi)) {
          onPick(iso, lo, hi);
          return;
        }
      }
      onPick(iso, hour, hour);
    },
    [date, start, end, onPick],
  );

  /** Nudge the end of the range by an hour — much easier than dragging on a phone. */
  const nudge = useCallback(
    (delta: number) => {
      if (!date || start == null || end == null) return;
      const next = end + delta;
      if (next < start) return;
      if (!isRangeFree(date, start, next)) return;
      onPick(date, start, next);
    },
    [date, start, end, onPick],
  );

  return (
    <div onPointerUp={endDrag} onPointerLeave={endDrag}>
      <div className="mz-weeknav">
        <button
          type="button"
          className="mz-navbtn"
          onClick={() => setWeekIdx((i) => Math.max(0, i - 1))}
          disabled={weekIdx === 0}
        >
          ◀ {mt(locale, "sched.month.prev")}
        </button>
        <span className="mz-weeklabel">{weekLabel}</span>
        <button
          type="button"
          className="mz-navbtn"
          onClick={() => setWeekIdx((i) => Math.min(weeks.length - 1, i + 1))}
          disabled={weekIdx === weeks.length - 1}
        >
          {mt(locale, "sched.month.next")} ▶
        </button>
      </div>

      <div
        className={`mz-gridwrap${atEnd ? " is-scrolled-end" : ""}`}
        ref={wrapRef}
        onScroll={onWrapScroll}
      >
        <table className="mz-grid">
          <thead>
            <tr>
              <th />
              {HOURS.map((h) => (
                <th key={h} scope="col">
                  {String(h).padStart(2, "0")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {week.map((iso) => {
              const dow = dayOfWeek(iso);
              const [, , dd] = iso.split("-").map(Number);
              const locked = iso < TRIP_START;
              return (
                <tr key={iso}>
                  <th
                    scope="row"
                    className={`mz-daycell${dow === 0 || dow === 6 ? " is-weekend" : ""}${
                      locked ? " is-locked" : ""
                    }`}
                  >
                    {names.daysShort[dow]} <b>{dd}</b>
                  </th>
                  {HOURS.map((h) => {
                    const st = slotState(iso, h);
                    const picked =
                      date === iso && start != null && end != null && h >= start && h <= end;
                    const isEdge = date === iso && (h === start || h === end);
                    const cls = [
                      "mz-slot",
                      `s-${st}`,
                      picked ? (isEdge ? "is-picked" : "is-inrange") : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const free = st === "free";
                    const label = `${formatDateLong(iso, locale)} ${String(h).padStart(2, "0")}:00 — ${
                      free
                        ? mt(locale, "sched.legend.free")
                        : st === "guven"
                          ? mt(locale, "sched.legend.guven")
                          : st === "maria"
                            ? mt(locale, "sched.legend.maria")
                            : st === "both"
                              ? `${mt(locale, "sched.legend.guven")} + ${mt(locale, "sched.legend.maria")}`
                              : mt(locale, "sched.legend.locked")
                    }`;
                    return (
                      <td key={h} style={{ padding: 0 }}>
                        <button
                          type="button"
                          className={cls}
                          disabled={!free}
                          aria-label={label}
                          aria-pressed={picked}
                          title={label}
                          // drag-select is mouse-only; touch uses tap-to-extend so
                          // that swiping still pans the grid sideways
                          onPointerDown={(e) => {
                            if (e.pointerType !== "mouse") return;
                            if (e.button !== 0) return;
                            beginDrag(iso, h);
                          }}
                          onPointerEnter={(e) => {
                            if (e.pointerType !== "mouse") return;
                            extendDrag(iso, h);
                          }}
                          onClick={(e) => activate(iso, h, e.shiftKey)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mz-legend">
        <span>
          <i className="mz-swatch k-free" />
          {mt(locale, "sched.legend.free")}
        </span>
        <span>
          <i className="mz-swatch k-guven" />
          {mt(locale, "sched.legend.guven")}
        </span>
        <span>
          <i className="mz-swatch k-maria" />
          {mt(locale, "sched.legend.maria")}
        </span>
        <span>
          <i className="mz-swatch k-locked" />
          {mt(locale, "sched.legend.locked")}
        </span>
      </div>

      <div className="mz-pick">
        {date && start != null && end != null ? (
          <>
            <span className="mz-pick-val">
              {formatDateLong(date, locale)} · {rangeLabel(start, end)}
            </span>
            <span className="mz-stepper">
              <button
                type="button"
                className="mz-navbtn"
                onClick={() => nudge(-1)}
                disabled={end === start}
                aria-label={mt(locale, "sched.shorter")}
              >
                −
              </button>
              <span className="mz-pick-dur">
                {mt(locale, "sched.duration", { h: end - start + 1 })}
              </span>
              <button
                type="button"
                className="mz-navbtn"
                onClick={() => nudge(1)}
                disabled={!isRangeFree(date, start, end + 1)}
                aria-label={mt(locale, "sched.longer")}
              >
                +
              </button>
            </span>
            <button type="button" className="mz-navbtn" onClick={onClear}>
              {mt(locale, "sched.clear")}
            </button>
          </>
        ) : (
          <span className="mz-pick-none">{mt(locale, "sched.pickedNone")}</span>
        )}
      </div>
    </div>
  );
}
