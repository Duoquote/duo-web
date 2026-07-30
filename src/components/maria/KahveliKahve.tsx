import { useCallback, useEffect, useMemo, useState } from "react";
import { M_LOCALES, mt, type MLocale } from "../../lib/maria/i18n";
import {
  buildICS,
  dayOfWeek,
  decodePlan,
  EMPTY_PLAN,
  encodePlan,
  formatDateLong,
  rangeLabel,
  type PlanState,
} from "../../lib/maria/schedule";
import { byId, COFFEE_VENUES, FOOD_VENUES } from "../../lib/maria/venues";
import Gate from "./Gate";
import ScheduleGrid from "./ScheduleGrid";
import { PixelSprite } from "./Sprites";
import VenuePicker from "./VenuePicker";

/** Ambient dust motes — positions are fixed per mount, not re-randomised on render. */
function Dust() {
  const motes = useMemo(
    () =>
      Array.from({ length: 22 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 18,
        dur: 14 + Math.random() * 16,
        scale: 0.6 + Math.random() * 1.6,
      })),
    [],
  );
  return (
    <div className="mz-dust" aria-hidden="true">
      {motes.map((m, i) => (
        <span
          key={i}
          className="mz-mote"
          style={{
            left: `${m.left}%`,
            animationDelay: `${m.delay}s`,
            animationDuration: `${m.dur}s`,
            transform: `scale(${m.scale})`,
          }}
        />
      ))}
    </div>
  );
}

function Hearts() {
  const hearts = useMemo(
    () =>
      Array.from({ length: 9 }, () => ({
        left: 6 + Math.random() * 88,
        delay: Math.random() * 1.4,
        dur: 2 + Math.random() * 1.2,
      })),
    [],
  );
  return (
    <div className="mz-hearts" aria-hidden="true">
      {hearts.map((h, i) => (
        <span
          key={i}
          className="mz-heart"
          style={{
            left: `${h.left}%`,
            animationDelay: `${h.delay}s`,
            animationDuration: `${h.dur}s`,
          }}
        >
          <PixelSprite name="heart" size={13} />
        </span>
      ))}
    </div>
  );
}

export default function KahveliKahve() {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<PlanState>(EMPTY_PLAN);
  const [copied, setCopied] = useState<"plan" | "link" | null>(null);

  // restore a shared link on first paint
  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) return;
    const restored = decodePlan(raw);
    if (restored) setPlan(restored);
  }, []);

  const [base, setBase] = useState("");
  useEffect(() => {
    setBase(window.location.origin + window.location.pathname);
  }, []);

  // keep the address bar in sync so a manual copy also works
  useEffect(() => {
    if (plan === EMPTY_PLAN) return;
    window.history.replaceState(null, "", `#${encodePlan(plan)}`);
  }, [plan]);

  /**
   * Derived from state, never read back off window.location — the hash is written in
   * an effect, so reading location during render yields the *previous* plan and the
   * shared link would lag a selection behind.
   */
  const shareUrl = useMemo(
    () => (base ? `${base}#${encodePlan(plan)}` : ""),
    [base, plan],
  );

  const locale = plan.locale;
  const setLocale = (l: MLocale) => setPlan((p) => ({ ...p, locale: l }));

  // keep the document language in step with the chosen one — screen readers need it,
  // and CSS uppercasing is locale-aware (Turkish maps i → İ)
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const coffee = byId(plan.coffee);
  const food = byId(plan.food);

  const when = useMemo(
    () =>
      plan.date && plan.start != null && plan.end != null
        ? { dow: dayOfWeek(plan.date), start: plan.start, end: plan.end }
        : null,
    [plan.date, plan.start, plan.end],
  );

  const timeDone = when != null;
  const coffeeDone = coffee != null;
  const foodDone = food != null || plan.noFood;
  const allDone = timeDone && coffeeDone && foodDone;

  const filled = [timeDone, coffeeDone, foodDone, allDone].filter(Boolean).length;
  const moodKey = (`mood.${filled}` as "mood.0" | "mood.1" | "mood.2" | "mood.3" | "mood.4");

  const planText = useMemo(() => {
    if (!timeDone) return "";
    const lines = [
      mt(locale, "sum.wa"),
      `${mt(locale, "sum.when")}: ${formatDateLong(plan.date!, locale)}, ${rangeLabel(plan.start!, plan.end!)}`,
      `${mt(locale, "sum.coffee")}: ${coffee ? `${coffee.name} (${coffee.area})` : mt(locale, "sum.none")}`,
      `${mt(locale, "sum.food")}: ${
        food ? `${food.name} (${food.area})` : plan.noFood ? mt(locale, "venue.foodSkipped") : mt(locale, "sum.none")
      }`,
    ];
    return lines.join("\n");
  }, [timeDone, locale, plan.date, plan.start, plan.end, coffee, food, plan.noFood]);

  const copy = useCallback(async (text: string, which: "plan" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked — the text is on screen anyway */
    }
  }, []);

  const downloadICS = useCallback(() => {
    if (!timeDone) return;
    const title = coffee ? `Kahve · ${coffee.name}` : "kahveli kahve date";
    const ics = buildICS({
      date: plan.date!,
      start: plan.start!,
      end: plan.end!,
      title,
      description: planText,
      location: coffee ? `${coffee.name}, ${coffee.address}` : "Ataşehir, İstanbul",
    });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "kahveli-kahve-date.ics";
    a.click();
    URL.revokeObjectURL(url);
  }, [timeDone, plan.date, plan.start, plan.end, coffee, planText]);

  if (!open) return <Gate onUnlock={() => setOpen(true)} />;

  return (
    <>
      <Dust />
      <div className="mz-vignette" aria-hidden="true" />
      <div className="mz-grain" aria-hidden="true" />

      <div className="mz-shell">
        <header className="mz-head">
          <div className="mz-wordmark">
            <img
              src="/maria/hero-cups.png"
              alt=""
              width={74}
              height={88}
              style={{ imageRendering: "pixelated", display: "block" }}
            />
            <div>
              <h1 className="mz-title">{mt(locale, "brand")}</h1>
              <p className="mz-tagline">{mt(locale, "tagline")}</p>
            </div>
          </div>
          <div className="mz-langs" role="group" aria-label={mt(locale, "misc.lang")}>
            {M_LOCALES.map((l) => (
              <button
                key={l.id}
                type="button"
                className="mz-lang"
                aria-pressed={locale === l.id}
                onClick={() => setLocale(l.id)}
              >
                {l.id}
              </button>
            ))}
          </div>
        </header>

        <p className="mz-intro">{mt(locale, "intro")}</p>

        <div className="mz-mood">
          <span className="mz-mood-label">{mt(locale, "mood.label")}</span>
          <span className="mz-mood-track">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`mz-mood-seg${i < filled ? (filled === 4 ? " is-full" : " is-on") : ""}`}
              />
            ))}
          </span>
          <span className="mz-mood-text">{mt(locale, moodKey)}</span>
        </div>

        {/* ---------------------------------------------------------- when */}
        <section className="mz-panel">
          <div className="mz-panel-head">
            <span className="mz-panel-step">1</span>
            <h2 className="mz-panel-title">{mt(locale, "step.when")}</h2>
          </div>
          <div className="mz-panel-body">
            <p className="mz-panel-lead">{mt(locale, "sched.help")}</p>
            <ScheduleGrid
              locale={locale}
              date={plan.date}
              start={plan.start}
              end={plan.end}
              onPick={(date, start, end) => setPlan((p) => ({ ...p, date, start, end }))}
              onClear={() => setPlan((p) => ({ ...p, date: null, start: null, end: null }))}
            />
            <p className="mz-panel-lead" style={{ margin: "12px 0 0", fontSize: 12.5 }}>
              {mt(locale, "sched.earliest")}
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------- coffee */}
        <section className="mz-panel">
          <div className="mz-panel-head">
            <span className="mz-panel-step">2</span>
            <h2 className="mz-panel-title">{mt(locale, "step.coffee")}</h2>
          </div>
          <div className="mz-panel-body">
            <p className="mz-panel-lead">{mt(locale, "venue.coffeeTitle")}</p>
            <VenuePicker
              locale={locale}
              venues={COFFEE_VENUES}
              picked={plan.coffee}
              onPick={(id) =>
                setPlan((p) => ({ ...p, coffee: p.coffee === id ? null : id }))
              }
              when={when}
            />
          </div>
        </section>

        {/* ---------------------------------------------------------- food */}
        <section className="mz-panel">
          <div className="mz-panel-head">
            <span className="mz-panel-step">3</span>
            <h2 className="mz-panel-title">{mt(locale, "step.food")}</h2>
            <span className="mz-panel-opt">{mt(locale, "step.optional")}</span>
          </div>
          <div className="mz-panel-body">
            <p className="mz-panel-lead">{mt(locale, "venue.foodTitle")}</p>
            <VenuePicker
              locale={locale}
              venues={FOOD_VENUES}
              picked={plan.food}
              onPick={(id) =>
                setPlan((p) => ({
                  ...p,
                  food: p.food === id ? null : id,
                  noFood: false,
                }))
              }
              origin={coffee ?? undefined}
              when={when}
              showFilters
            />
            <button
              type="button"
              className={`mz-skip${plan.noFood ? " is-picked" : ""}`}
              aria-pressed={plan.noFood}
              onClick={() =>
                setPlan((p) => ({ ...p, noFood: !p.noFood, food: p.noFood ? p.food : null }))
              }
            >
              {mt(locale, "venue.foodSkip")}
            </button>
          </div>
        </section>

        {/* ---------------------------------------------------------- plan */}
        <section className="mz-plan">
          {allDone && <Hearts />}
          <h2 className="mz-plan-title">{mt(locale, "sum.title")}</h2>

          <div className="mz-rows">
            <div className="mz-row">
              <span className="mz-row-k">{mt(locale, "sum.when")}</span>
              <span className={`mz-row-v${timeDone ? "" : " is-empty"}`}>
                {timeDone
                  ? `${formatDateLong(plan.date!, locale)} · ${rangeLabel(plan.start!, plan.end!)}`
                  : mt(locale, "sum.none")}
              </span>
            </div>
            <div className="mz-row">
              <span className="mz-row-k">{mt(locale, "sum.coffee")}</span>
              <span className={`mz-row-v${coffee ? "" : " is-empty"}`}>
                {coffee ? `${coffee.name} — ${coffee.area}` : mt(locale, "sum.none")}
              </span>
            </div>
            <div className="mz-row">
              <span className="mz-row-k">{mt(locale, "sum.food")}</span>
              <span className={`mz-row-v${food || plan.noFood ? "" : " is-empty"}`}>
                {food
                  ? `${food.name} — ${food.area}`
                  : plan.noFood
                    ? mt(locale, "venue.foodSkipped")
                    : mt(locale, "sum.none")}
              </span>
            </div>
          </div>

          <div className="mz-actions">
            <button
              type="button"
              className="mz-btn"
              disabled={!timeDone}
              onClick={() => copy(planText, "plan")}
            >
              {copied === "plan" ? mt(locale, "sum.copied") : mt(locale, "sum.copy")}
            </button>
            <button
              type="button"
              className="mz-btn"
              disabled={!timeDone}
              onClick={() => copy(shareUrl, "link")}
            >
              {copied === "link" ? mt(locale, "sum.linkCopied") : mt(locale, "sum.link")}
            </button>
            <button type="button" className="mz-btn" disabled={!timeDone} onClick={downloadICS}>
              {mt(locale, "sum.ics")}
            </button>
          </div>

          <p className={`mz-status${allDone ? " is-ready" : ""}`}>
            {allDone ? mt(locale, "sum.ready") : mt(locale, "sum.incomplete")}
          </p>
        </section>

        <p className="mz-foot">
          {mt(locale, "misc.footer")}{" "}
          <button
            type="button"
            className="mz-reset"
            onClick={() => {
              setPlan({ ...EMPTY_PLAN, locale });
              window.history.replaceState(null, "", window.location.pathname);
            }}
          >
            {mt(locale, "misc.reset")}
          </button>
        </p>
      </div>
    </>
  );
}
