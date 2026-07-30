import { useEffect, useRef, useState } from "react";

/**
 * SHA-256 of the passphrase. Stored as a hash so the word itself isn't sitting in
 * the bundle in plain text. This is a soft gate, not real security — see notes in
 * maria.astro.
 */
const PASS_HASH = "a2d97e5e6fc09e42886ccaae4498c5b80b7cb8ed2386ff24a71879ffd8f39654";
const SESSION_KEY = "maria-open";

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function Gate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  // the shake is brief; the message stays until she types again
  const [shake, setShake] = useState(false);
  const [failed, setFailed] = useState(false);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // already unlocked earlier in this tab session
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      onUnlock();
      return;
    }
    inputRef.current?.focus();
  }, [onUnlock]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || checking) return;
    setChecking(true);
    const hex = await sha256Hex(value.trim().toLowerCase());
    setChecking(false);
    if (hex === PASS_HASH) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onUnlock();
    } else {
      setShake(true);
      setFailed(true);
      setValue("");
      window.setTimeout(() => setShake(false), 400);
      inputRef.current?.focus();
    }
  }

  return (
    <div className={`mz-gate${shake ? " is-wrong" : ""}`}>
      <form className="mz-gate-box" onSubmit={submit}>
        <span className="mz-gate-lock">
          <img src="/maria/gate-door.png" alt="" width={116} height={116} />
        </span>
        <h1 className="mz-gate-title">kahveli kahve date</h1>
        {/* lang="en" so Turkish locale-aware uppercasing doesn't turn the i into İ */}
        <p className="mz-gate-hint" lang="en">for maria only</p>

        <div className="mz-gate-row">
          <input
            ref={inputRef}
            className="mz-input"
            type="password"
            value={value}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Password"
            onChange={(e) => {
              setValue(e.target.value);
              setFailed(false);
            }}
          />
          <button type="submit" className="mz-btn" disabled={!value.trim() || checking}>
            →
          </button>
        </div>

        <p className="mz-gate-err" lang="en" role="status">
          {failed ? "that's not it — try again" : ""}
        </p>
      </form>
    </div>
  );
}
