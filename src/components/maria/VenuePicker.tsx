import { useMemo, useState } from "react";
import { mt, type MLocale } from "../../lib/maria/i18n";
import {
  ATASEHIR_CENTER,
  hoursLabel,
  isOpenDuring,
  travelFrom,
  type Venue,
  type VenueKind,
} from "../../lib/maria/venues";
import { PixelSprite } from "./Sprites";

interface Props {
  locale: MLocale;
  venues: Venue[];
  picked: string | null;
  onPick: (id: string) => void;
  /** Distances are measured from here — the coffee place once one is chosen. */
  origin?: { lat: number; lon: number };
  /** Day-of-week + hour range of the current pick, for the open/closed check. */
  when: { dow: number; start: number; end: number } | null;
  /** Show the kind filter chips (used for the food panel, not for coffee). */
  showFilters?: boolean;
}

const KIND_LABEL: Record<VenueKind, "cat.coffee" | "cat.asian" | "cat.burger" | "cat.quick"> = {
  coffee: "cat.coffee",
  asian: "cat.asian",
  burger: "cat.burger",
  quick: "cat.quick",
};

function StatBar({
  label,
  value,
  max,
  display,
}: {
  label: string;
  value: number;
  max: number;
  display: string;
}) {
  const pct = Math.max(4, Math.min(100, (value / max) * 100));
  return (
    <div className="mz-stat">
      <span className="mz-stat-k">{label}</span>
      <span className="mz-stat-bar">
        <span className="mz-stat-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="mz-stat-v">{display}</span>
    </div>
  );
}

export default function VenuePicker({
  locale,
  venues,
  picked,
  onPick,
  origin,
  when,
  showFilters = false,
}: Props) {
  const [filter, setFilter] = useState<VenueKind | "all">("all");

  const kinds = useMemo(
    () => Array.from(new Set(venues.map((v) => v.kind))) as VenueKind[],
    [venues],
  );

  const shown = filter === "all" ? venues : venues.filter((v) => v.kind === filter);
  const from = origin ?? ATASEHIR_CENTER;

  const tiers: { tier: "core" | "hop"; key: "venue.tier.core" | "venue.tier.hop" }[] = [
    { tier: "core", key: "venue.tier.core" },
    { tier: "hop", key: "venue.tier.hop" },
  ];

  return (
    <>
      {showFilters && kinds.length > 1 && (
        <div className="mz-filters">
          <button
            type="button"
            className="mz-filter"
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
            {mt(locale, "venue.filterAll")}
          </button>
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              className="mz-filter"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
            >
              {mt(locale, KIND_LABEL[k])}
            </button>
          ))}
        </div>
      )}

      {tiers.map(({ tier, key }) => {
        const group = shown.filter((v) => v.tier === tier);
        if (!group.length) return null;
        return (
          <div key={tier}>
            <p className="mz-tier">{mt(locale, key)}</p>
            <div className="mz-cards">
              {group.map((v) => {
                const trip = travelFrom(from, v);
                const open = when ? isOpenDuring(v, when.dow, when.start, when.end) : null;
                const isPicked = picked === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`mz-card${isPicked ? " is-picked" : ""}`}
                    aria-pressed={isPicked}
                    onClick={() => onPick(v.id)}
                  >
                    <span className="mz-card-top">
                      <PixelSprite name={v.kind} size={26} className="mz-card-icon" />
                      <span className="mz-card-name">{v.name}</span>
                    </span>

                    <p className="mz-card-note">{v.note[locale]}</p>

                    <div className="mz-stats">
                      <StatBar
                        label={mt(locale, "venue.rating")}
                        value={v.rating}
                        max={5}
                        display={`${v.rating.toFixed(1)}${
                          v.reviews ? ` · ${v.reviews.toLocaleString(locale)}` : ""
                        }`}
                      />
                      {/* travel is plain text on purpose — a walk and a drive aren't
                          comparable, so a bar would invite the wrong comparison */}
                      <div className="mz-stat">
                        <span className="mz-stat-k">{mt(locale, "venue.distance")}</span>
                        <span className="mz-stat-v">
                          {mt(
                            locale,
                            trip.mode === "walk" ? "venue.walk" : "venue.drive",
                            { min: trip.min },
                          )}
                        </span>
                      </div>
                      {when && (
                        <div className="mz-stat">
                          <span className="mz-stat-k">{mt(locale, "venue.openHours")}</span>
                          <span className="mz-stat-v">
                            {hoursLabel(v, when.dow)}
                            {v.hoursApprox ? " ~" : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    {open !== null && (
                      <span className={`mz-openflag ${open ? "is-open" : "is-shut"}`}>
                        {mt(locale, open ? "venue.openThen" : "venue.closedThen")}
                      </span>
                    )}

                    <a
                      className="mz-maps"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${v.name} ${v.address}`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {v.area} · {mt(locale, "venue.maps")} ↗
                    </a>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
