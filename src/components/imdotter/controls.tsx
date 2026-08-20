import type { ReactNode } from "react";

export function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="label">{title}</span>
        {note ? <span className="note">{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function Dial({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const id = `dial-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="dial">
      <div className="dial-top">
        <label className="label" htmlFor={id}>
          {label}
        </label>
        <span className="value">{format ? format(value) : value.toFixed(2)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: Array<{ value: T; label: string; title?: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="dial">
      {label ? (
        <div className="dial-top">
          <span className="label">{label}</span>
        </div>
      ) : null}
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            title={o.title}
            className={o.value === value ? "on" : undefined}
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
