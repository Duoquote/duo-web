import { useEffect, useState } from "react";
import { t, type Locale } from "../lib/i18n";

/** Tracks whether html.retro is set; survives View Transitions + the toggle. */
function useRetro() {
  const [on, setOn] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("retro"),
  );
  useEffect(() => {
    const sync = () =>
      setOn(document.documentElement.classList.contains("retro"));
    sync();
    window.addEventListener("retrochange", sync);
    document.addEventListener("astro:after-swap", sync);
    return () => {
      window.removeEventListener("retrochange", sync);
      document.removeEventListener("astro:after-swap", sync);
    };
  }, []);
  return on;
}

const bevelBtn: React.CSSProperties = {
  background: "#c0c0c0",
  color: "#000",
  border: "2px outset #fff",
  padding: "2px 10px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'MS Sans Serif', sans-serif",
};

export default function RetroDecor({ locale = "en" }: { locale?: Locale }) {
  const on = useRetro();
  const [visits, setVisits] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [popup, setPopup] = useState(false);

  // bump a fake visitor counter (starts absurdly high, like they always did)
  useEffect(() => {
    if (!on) return;
    const prev = parseInt(localStorage.getItem("retro_visits") || "", 10);
    const n = (Number.isFinite(prev) ? prev : 1_089_236) + 1;
    localStorage.setItem("retro_visits", String(n));
    setVisits(n);
  }, [on]);

  // cursor sparkle trail
  useEffect(() => {
    if (!on) return;
    const chars = ["✨", "⭐", "🌟", "💫"];
    let last = 0;
    let i = 0;
    function onMove(e: PointerEvent) {
      const now = Date.now();
      if (now - last < 45) return;
      last = now;
      const s = document.createElement("span");
      s.className = "retro-sparkle";
      s.textContent = chars[i++ % chars.length];
      s.style.left = e.clientX + "px";
      s.style.top = e.clientY + "px";
      document.body.appendChild(s);
      s.animate?.(
        [
          { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
          { transform: "translate(-50%,14px) scale(0.2)", opacity: 0 },
        ],
        { duration: 750, easing: "ease-out" },
      );
      setTimeout(() => s.remove(), 760);
    }
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.querySelectorAll(".retro-sparkle").forEach((el) => el.remove());
    };
  }, [on]);

  // the obligatory "you won a prize" popup — once per browser session
  useEffect(() => {
    if (!on || sessionStorage.getItem("retro_popup")) return;
    const id = window.setTimeout(() => {
      setPopup(true);
      sessionStorage.setItem("retro_popup", "1");
    }, 3500);
    return () => window.clearTimeout(id);
  }, [on]);

  if (!on) return null;

  const noop = (e: React.MouseEvent) => e.preventDefault();

  return (
    <>
      {/* scrolling welcome banner */}
      <div className="retro-marquee-bar">
        <span>{t(locale, "retro.marquee")}</span>
      </div>

      {/* flames in the corner, because why not */}
      <img
        src="/retro/flames.gif"
        alt="fire"
        className="retro-sticker"
        style={{ right: 8, bottom: 8, width: 44 }}
      />

      {/* under construction */}
      <div
        className="retro-sticker"
        style={{ right: 8, bottom: 62, width: 140, textAlign: "center" }}
      >
        <img
          src="/retro/construction.gif"
          alt="under construction"
          style={{ width: 140, display: "block" }}
        />
        <div
          className="retro-blink"
          style={{
            color: "#ffff00",
            fontSize: 10,
            fontWeight: 700,
            background: "#000",
            padding: "1px 2px",
            marginTop: 2,
          }}
        >
          {t(locale, "retro.underConstruction")}
        </div>
      </div>

      {/* Win95-style control panel */}
      {panelOpen && (
        <div className="retro-panel">
          <div className="retro-panel-title">
            <span>{t(locale, "retro.controlPanel")}</span>
            <button onClick={() => setPanelOpen(false)} aria-label="close">
              ×
            </button>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ marginBottom: 3 }}>{t(locale, "retro.visitors")}</div>
            <div className="retro-counter">
              {String(visits).padStart(7, "0")}
            </div>
            <img
              src="/retro/rainbow.gif"
              alt=""
              style={{ width: "100%", height: 8, display: "block", margin: "6px 0" }}
            />
            <div className="retro-jiggle" style={{ fontSize: 22 }}>
              📖✉️💾
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setPopup(true);
              }}
              style={{ display: "block", margin: "3px 0" }}
            >
              {t(locale, "retro.signGuestbook")}
            </a>
            <div className="retro-webring">
              <a href="#" onClick={noop}>
                {t(locale, "retro.webringPrev")}
              </a>
              |
              <a href="#" onClick={noop}>
                {t(locale, "retro.webringRandom")}
              </a>
              |
              <a href="#" onClick={noop}>
                {t(locale, "retro.webringNext")}
              </a>
            </div>
            <div className="retro-badges">
              <div className="retro-badge88" style={{ background: "#000", color: "#0f0" }}>
                BEST VIEWED IN&nbsp;<b>IE6</b>
              </div>
              <div className="retro-badge88" style={{ background: "#0000aa", color: "#ff0" }}>
                MADE WITH
                <br />
                NOTEPAD
              </div>
              <div className="retro-badge88" style={{ background: "#c0c0c0", color: "#000" }}>
                VALID
                <br />
                HTML 4.01
              </div>
              <div className="retro-badge88" style={{ background: "#cc00cc", color: "#fff" }}>
                NETSCAPE
                <br />
                NOW!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* gag "you won" popup */}
      {popup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              width: 320,
              maxWidth: "90vw",
              background: "#c0c0c0",
              border: "3px outset #fff",
              fontFamily: "'MS Sans Serif', sans-serif",
            }}
          >
            <div
              style={{
                background: "linear-gradient(90deg,#000080,#1084d0)",
                color: "#fff",
                fontWeight: 700,
                padding: "3px 6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{t(locale, "retro.popupTitle")}</span>
              <button
                onClick={() => setPopup(false)}
                aria-label="close"
                style={{ ...bevelBtn, padding: "0 6px" }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: 12, color: "#000", fontSize: 12 }}>
              <div className="retro-jiggle" style={{ fontSize: 30, textAlign: "center" }}>
                🎉🏆🎉
              </div>
              <p style={{ margin: "10px 0", textAlign: "center" }}>
                {t(locale, "retro.popupBody")}
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button onClick={() => setPopup(false)} style={bevelBtn}>
                  {t(locale, "retro.popupOk")}
                </button>
                <button onClick={() => setPopup(false)} style={bevelBtn}>
                  {t(locale, "retro.popupClose")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
