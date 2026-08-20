import { INK_LIST } from "../../lib/imdotter/palettes";
import type { Ink } from "../../lib/imdotter/types";

/**
 * A Riso prints one ink per drum, and you swap drums by hand between passes.
 * So the palette is a rack, not a swatch list: position is print order, drum 1
 * lays down first, and each drum is stamped with the angle its screen will be
 * ruled at. Everything not loaded sits on the shelf below.
 */
export function DrumRack({
  inks,
  angles,
  max,
  onChange,
}: {
  inks: Ink[];
  angles: number[];
  max: number;
  onChange: (inks: Ink[]) => void;
}) {
  const loaded = new Set(inks.map((i) => i.id));

  function eject(index: number) {
    if (inks.length <= 1) return;
    onChange(inks.filter((_, i) => i !== index));
  }

  function load(ink: Ink) {
    if (inks.length >= max || loaded.has(ink.id)) return;
    onChange([...inks, ink]);
  }

  return (
    <>
      <div className="rack">
        {inks.map((ink, i) => (
          <div
            key={ink.id}
            className="drum"
            title={`${ink.name} — prints ${ordinal(i + 1)}, screened at ${fmt(angles[i])}°`}
          >
            <div className="drum-barrel" style={{ background: ink.hex }}>
              <span className="drum-order">{i + 1}</span>
              <span className="drum-angle">{fmt(angles[i])}°</span>
            </div>
            <span className="drum-name">{ink.name}</span>
            {inks.length > 1 ? (
              <button
                type="button"
                className="drum-eject"
                aria-label={`Unload ${ink.name}`}
                onClick={() => eject(i)}
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
        {inks.length < max ? (
          <button
            type="button"
            className="drum-empty"
            title="Empty drum bay"
            aria-label="Empty drum bay — load an ink from the shelf below"
            onClick={() => {
              const next = INK_LIST.find((i) => !loaded.has(i.id));
              if (next) load(next);
            }}
          >
            +
          </button>
        ) : null}
      </div>

      <div className="shelf">
        {INK_LIST.map((ink) => (
          <button
            key={ink.id}
            type="button"
            className="chip"
            disabled={loaded.has(ink.id) || inks.length >= max}
            onClick={() => load(ink)}
            title={loaded.has(ink.id) ? `${ink.name} is loaded` : `Load ${ink.name}`}
          >
            <i style={{ background: ink.hex }} />
            {ink.name}
          </button>
        ))}
      </div>
    </>
  );
}

function fmt(angle: number | undefined): string {
  if (angle === undefined) return "—";
  return Number.isInteger(angle) ? String(angle) : angle.toFixed(1);
}

function ordinal(n: number): string {
  return ["first", "second", "third", "fourth", "fifth", "sixth"][n - 1] ?? `${n}th`;
}
