import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrumRack } from "./DrumRack";
import { Dial, Panel, Seg } from "./controls";
import { DEFAULT_ANGLE_SPREAD, PALETTES, PAPERS } from "../../lib/imdotter/palettes";
import { plateAngles } from "../../lib/imdotter/render";
import { resolveBlend } from "../../lib/imdotter/separate";
import { defaultOptions } from "../../lib/imdotter/types";
import type { Ink, RGBAImage, RisoOptions, RisoSettings } from "../../lib/imdotter/types";
import type { RenderRequest, RenderResponse } from "../../lib/imdotter/riso.worker";
import { decodeToImage, downloadCanvas, drawToCanvas, firstImage } from "../../lib/imdotter/image-io";

/** One drum per ink, and the machine only has so many bays. */
const MAX_DRUMS = DEFAULT_ANGLE_SPREAD.length;

export default function Imdotter() {
  const [source, setSource] = useState<RGBAImage | null>(null);
  const [sourceName, setSourceName] = useState("sheet");
  const [inks, setInks] = useState<Ink[]>(PALETTES[0]!.inks);
  const [settings, setSettings] = useState<RisoSettings>(defaultOptions);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<{ ms: number; width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [pass, setPass] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const resultRef = useRef<RGBAImage | null>(null);
  const pendingRef = useRef<RisoOptions | null>(null);
  const inFlightRef = useRef(false);
  const reqRef = useRef(0);
  const latestSourceRef = useRef<RGBAImage | null>(null);

  const options = useMemo<RisoOptions>(() => ({ ...settings, inks }), [settings, inks]);
  const angles = useMemo(() => plateAngles(options), [options]);
  const blend = useMemo(
    () => resolveBlend(settings.blend, settings.paper),
    [settings.blend, settings.paper],
  );

  const set = useCallback(<K extends keyof RisoSettings>(key: K, value: RisoSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  // ─── The press ──────────────────────────────────────────────────────

  useEffect(() => {
    const worker = new Worker(new URL("../../lib/imdotter/riso.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<RenderResponse>) => {
      const msg = e.data;
      if (msg.id !== reqRef.current) return; // a newer request has already gone out
      inFlightRef.current = false;

      if (msg.error) {
        setError(msg.error);
        setRunning(false);
        return;
      }

      const image: RGBAImage = {
        width: msg.width,
        height: msg.height,
        data: new Uint8ClampedArray(msg.buffer),
      };
      resultRef.current = image;
      setStats({ ms: msg.ms, width: msg.width, height: msg.height });
      setError(null);
      setPass((p) => p + 1);

      // Something changed while the press was running; go again with the latest.
      const next = pendingRef.current;
      pendingRef.current = null;
      if (next) send(next, latestSourceRef.current);
      else setRunning(false);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
    // `send` is stable for the life of the worker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = useCallback((opts: RisoOptions, src: RGBAImage | null) => {
    const worker = workerRef.current;
    if (!worker || !src) return;
    const id = ++reqRef.current;
    inFlightRef.current = true;
    setRunning(true);
    // The buffer is transferred, so the source has to be copied every pass.
    const buffer = new Uint8ClampedArray(src.data).buffer;
    const req: RenderRequest = {
      id,
      width: src.width,
      height: src.height,
      buffer,
      options: opts,
    };
    worker.postMessage(req, [buffer]);
  }, []);

  useEffect(() => {
    if (!source) return;
    // Held so a queued re-run started from the worker callback picks up the
    // image that is loaded *now*, not the one that was loaded when it queued.
    latestSourceRef.current = source;
    // Coalesce slider drags: queue the newest options and let the press finish.
    if (inFlightRef.current) pendingRef.current = options;
    else send(options, source);
  }, [source, options, send]);

  // ─── Painting ───────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = showSource ? source : resultRef.current;
    if (canvas && image) drawToCanvas(canvas, image);
  }, [pass, showSource, source]);

  // ─── Getting an image in ────────────────────────────────────────────

  const accept = useCallback(async (blob: Blob, name?: string) => {
    try {
      const image = await decodeToImage(blob);
      resultRef.current = null;
      setStats(null);
      setSource(image);
      setSourceName(name?.replace(/\.[^.]+$/, "") || "sheet");
      setError(null);
    } catch {
      setError("That file could not be read as an image.");
    }
  }, []);

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const file = firstImage(e.clipboardData?.items);
      if (!file) return;
      e.preventDefault();
      void accept(file, file.name);
    }
    function onDragOver(e: DragEvent) {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      setDragging(true);
    }
    function onDragLeave(e: DragEvent) {
      if (e.relatedTarget) return; // still inside the window
      setDragging(false);
    }
    function onDrop(e: DragEvent) {
      e.preventDefault();
      setDragging(false);
      const file = firstImage(e.dataTransfer?.items);
      if (file) void accept(file, file.name);
      else if (e.dataTransfer?.files.length) setError("Drop an image file.");
    }

    window.addEventListener("paste", onPaste);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [accept]);

  const activePalette = PALETTES.find(
    (p) =>
      p.inks.length === inks.length && p.inks.every((ink, i) => ink.id === inks[i]!.id),
  );

  return (
    <div className="machine">
      <header className="topbar">
        <a className="home" href="/" aria-label="Back to dq.ms">
          dq.ms
        </a>
        <span className="wordmark">
          imd<span className="dot" aria-hidden="true" />tter
          <small>risograph press</small>
        </span>
        <div className="topbar-actions">
          <button type="button" className="key" onClick={() => fileRef.current?.click()}>
            Open image
          </button>
          <button
            type="button"
            className="key primary"
            disabled={!stats}
            onClick={() => {
              const canvas = canvasRef.current;
              if (canvas && resultRef.current) {
                drawToCanvas(canvas, resultRef.current);
                downloadCanvas(canvas, `${sourceName}-riso.png`);
              }
            }}
          >
            Save sheet
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void accept(file, file.name);
            e.target.value = "";
          }}
        />
      </header>

      {error ? <p className="error">{error}</p> : null}

      <div className="body">
        <div className="bed">
          {source ? (
            <div className="sheet-wrap">
              <canvas ref={canvasRef} className="sheet" />
              <span className="reg tl" />
              <span className="reg tr" />
              <span className="reg bl" />
              <span className="reg br" />
              {running ? null : <span key={pass} className="pass" aria-hidden="true" />}
              <div className="status">
                <span className={running ? "running" : undefined}>
                  {running ? "Printing" : "Ready"}
                </span>
                {stats ? (
                  <span>
                    {stats.width}×{stats.height} · {stats.ms.toFixed(0)} ms · {inks.length}{" "}
                    {inks.length === 1 ? "pass" : "passes"} · {blend}
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className={dragging ? "tray over" : "tray"}>
              <h1>Load a sheet</h1>
              <p>
                Drop an image here or open one from your device.
                <span className="paste-hint">
                  {" "}
                  You can also paste with <kbd>Ctrl</kbd> <kbd>V</kbd>.
                </span>{" "}
                It gets separated into spot inks and screened into halftone dots.
              </p>
              <button type="button" className="key primary" onClick={() => fileRef.current?.click()}>
                Open image
              </button>
            </div>
          )}
        </div>

        <div className="rail">
          <Panel title="Drums" note={`${inks.length} of ${MAX_DRUMS}`}>
            <div className="presets">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={activePalette?.id === p.id ? "preset on" : "preset"}
                  onClick={() => {
                    setInks(p.inks);
                    if (p.paper) set("paper", p.paper);
                  }}
                >
                  <span className="swatches">
                    {p.inks.map((ink) => (
                      <span key={ink.id} style={{ background: ink.hex }} />
                    ))}
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
            <div style={{ height: 12 }} />
            <DrumRack inks={inks} angles={angles} max={MAX_DRUMS} onChange={setInks} />
          </Panel>

          <Panel title="Paper" note={blend === "additive" ? "ink glows" : "ink absorbs"}>
            <div className="papers">
              {PAPERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.name}
                  aria-label={p.name}
                  className={settings.paper.toLowerCase() === p.hex ? "paper on" : "paper"}
                  style={{ background: p.hex }}
                  onClick={() => set("paper", p.hex)}
                />
              ))}
              <input
                type="color"
                className="paper-custom"
                title="Custom stock"
                aria-label="Custom paper colour"
                value={settings.paper}
                onChange={(e) => set("paper", e.target.value)}
              />
            </div>
            <div style={{ height: 12 }} />
            <Seg
              label="How the ink sits"
              value={settings.blend}
              onChange={(v) => set("blend", v)}
              options={[
                { value: "auto", label: "Auto", title: "Decide from the paper brightness" },
                { value: "multiply", label: "Absorb", title: "Ink on light stock" },
                { value: "additive", label: "Glow", title: "Dots lighting up dark stock" },
              ]}
            />
            <Seg
              label="Plate separation"
              value={settings.separation}
              onChange={(v) => set("separation", v)}
              options={[
                { value: "auto", label: "Best fit", title: "Match the source colour as closely as the inks allow" },
                { value: "channel", label: "R/G/B", title: "One plate per colour channel" },
                { value: "duotone", label: "Tonal", title: "Inks hand over along the tone ramp" },
              ]}
            />
          </Panel>

          <Panel title="Screen">
            <Dial
              label="Dot size"
              value={settings.dotSize}
              min={0}
              max={24}
              step={0.5}
              format={(v) => (v <= 1 ? "off" : `${v.toFixed(1)} px`)}
              onChange={(v) => set("dotSize", v)}
            />
            <Seg
              label="Dot shape"
              value={settings.dotShape}
              onChange={(v) => set("dotShape", v)}
              options={[
                { value: "circle", label: "Round" },
                { value: "square", label: "Square" },
                { value: "diamond", label: "Diamond" },
                { value: "line", label: "Line" },
              ]}
            />
            <Dial
              label="Screen angle"
              value={settings.baseAngle}
              min={0}
              max={90}
              step={1}
              format={(v) => `${v.toFixed(0)}°`}
              onChange={(v) => set("baseAngle", v)}
            />
            <Dial
              label="Edge hardness"
              value={settings.dotSharpness}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => set("dotSharpness", v)}
            />
          </Panel>

          <Panel title="Press">
            <Dial
              label="Misregistration"
              value={settings.registration}
              min={0}
              max={8}
              step={0.1}
              format={(v) => `${v.toFixed(1)} px`}
              onChange={(v) => set("registration", v)}
            />
            <Dial
              label="Ink grain"
              value={settings.grain}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => set("grain", v)}
            />
            <Dial
              label="Paper texture"
              value={settings.paperNoise}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => set("paperNoise", v)}
            />
            <Dial
              label="Ink opacity"
              value={settings.inkOpacity}
              min={0.2}
              max={1}
              step={0.01}
              onChange={(v) => set("inkOpacity", v)}
            />
            <Dial
              label="Total ink limit"
              value={settings.inkLimit}
              min={0.5}
              max={MAX_DRUMS}
              step={0.1}
              format={(v) => `${v.toFixed(1)} plates`}
              onChange={(v) => set("inkLimit", v)}
            />
          </Panel>

          <Panel title="Image">
            <Dial
              label="Brightness"
              value={settings.brightness}
              min={-0.5}
              max={0.5}
              step={0.01}
              onChange={(v) => set("brightness", v)}
            />
            <Dial
              label="Contrast"
              value={settings.contrast}
              min={-0.8}
              max={0.8}
              step={0.01}
              onChange={(v) => set("contrast", v)}
            />
            <Dial
              label="Saturation"
              value={settings.saturation}
              min={0}
              max={2}
              step={0.01}
              onChange={(v) => set("saturation", v)}
            />
            <Dial
              label="Ink strength"
              value={settings.inkGamma}
              min={0.4}
              max={2}
              step={0.01}
              format={(v) => (v < 1 ? `heavy ${v.toFixed(2)}` : `light ${v.toFixed(2)}`)}
              onChange={(v) => set("inkGamma", v)}
            />
            <Seg
              label="Render detail"
              value={String(settings.scale) as "1" | "1.5" | "2"}
              onChange={(v) => set("scale", Number(v))}
              options={[
                { value: "1", label: "1×" },
                { value: "1.5", label: "1.5×" },
                { value: "2", label: "2×" },
              ]}
            />
            <Dial
              label="Seed"
              value={settings.seed}
              min={1}
              max={64}
              step={1}
              format={(v) => `#${v.toFixed(0)}`}
              onChange={(v) => set("seed", v)}
            />
          </Panel>

          <div className="rail-foot">
            <button
              type="button"
              className="key"
              disabled={!source}
              onMouseDown={() => setShowSource(true)}
              onMouseUp={() => setShowSource(false)}
              onMouseLeave={() => setShowSource(false)}
              onTouchStart={() => setShowSource(true)}
              onTouchEnd={() => setShowSource(false)}
            >
              Hold to compare
            </button>
            <button
              type="button"
              className="key"
              onClick={() => {
                setSettings(defaultOptions);
                setInks(PALETTES[0]!.inks);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
