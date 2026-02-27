export interface HashState {
  inputFormat: string;
  outputFormat: string;
}

const DEFAULT_HASH: HashState = { inputFormat: "x", outputFormat: "mp4" };

export function parseHash(hash: string): HashState {
  const cleaned = hash.replace(/^#/, "").toLowerCase();
  const match = cleaned.match(/^([a-z0-9]+)-to-([a-z0-9]+)$/);
  if (!match) return DEFAULT_HASH;
  return { inputFormat: match[1], outputFormat: match[2] };
}

export function buildHash(state: HashState): string {
  return `#${state.inputFormat}-to-${state.outputFormat}`;
}

export function setHash(state: HashState): void {
  const hash = buildHash(state);
  window.history.replaceState(null, "", hash);
}
