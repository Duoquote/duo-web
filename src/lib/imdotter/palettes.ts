import type { Ink } from "./types";

/**
 * Riso Kagaku spot inks, plus a few saturated RGB inks for the additive /
 * dark-paper look. Hex values are the widely-circulated screen approximations
 * of the printed ink on white paper.
 */
export const INKS: Record<string, Ink> = {
  black: { id: "black", name: "Black", hex: "#000000" },
  fluorescentPink: { id: "fluorescentPink", name: "Fluorescent Pink", hex: "#ff48b0" },
  brightRed: { id: "brightRed", name: "Bright Red", hex: "#f15060" },
  red: { id: "red", name: "Red", hex: "#ff665e" },
  orange: { id: "orange", name: "Orange", hex: "#ff6c2f" },
  fluorescentOrange: { id: "fluorescentOrange", name: "Fluorescent Orange", hex: "#ff7477" },
  yellow: { id: "yellow", name: "Yellow", hex: "#ffe800" },
  gold: { id: "gold", name: "Gold", hex: "#ac936e" },
  green: { id: "green", name: "Green", hex: "#00a95c" },
  teal: { id: "teal", name: "Teal", hex: "#00838a" },
  aqua: { id: "aqua", name: "Aqua", hex: "#5ec8e5" },
  blue: { id: "blue", name: "Blue", hex: "#0078bf" },
  mediumBlue: { id: "mediumBlue", name: "Medium Blue", hex: "#3255a4" },
  federalBlue: { id: "federalBlue", name: "Federal Blue", hex: "#3d5588" },
  purple: { id: "purple", name: "Purple", hex: "#765ba7" },
  violet: { id: "violet", name: "Violet", hex: "#9d7ad2" },
  burgundy: { id: "burgundy", name: "Burgundy", hex: "#914e72" },
  brown: { id: "brown", name: "Brown", hex: "#925f52" },
  crimson: { id: "crimson", name: "Crimson", hex: "#e45d50" },
  scarlet: { id: "scarlet", name: "Scarlet", hex: "#f65058" },
  grey: { id: "grey", name: "Grey", hex: "#8c8c8c" },
  metallicGold: { id: "metallicGold", name: "Metallic Gold", hex: "#b3a36c" },
  white: { id: "white", name: "White", hex: "#ffffff" },
  screenRed: { id: "screenRed", name: "Screen Red", hex: "#ff2d2d" },
  screenGreen: { id: "screenGreen", name: "Screen Green", hex: "#22e06a" },
  screenBlue: { id: "screenBlue", name: "Screen Blue", hex: "#2f7bff" },
};

export const INK_LIST: Ink[] = Object.values(INKS);

export interface Palette {
  id: string;
  name: string;
  inks: Ink[];
  /** Paper this palette was designed against. */
  paper?: string;
}

/** Curated starting points. Two- and three-colour jobs are the Riso norm. */
export const PALETTES: Palette[] = [
  { id: "classic", name: "Pink / Blue", inks: [INKS.fluorescentPink!, INKS.blue!] },
  { id: "sunset", name: "Yellow / Red / Blue", inks: [INKS.yellow!, INKS.brightRed!, INKS.blue!] },
  {
    id: "cmyk",
    name: "Process (Y/M/C/K)",
    inks: [INKS.yellow!, INKS.fluorescentPink!, INKS.aqua!, INKS.black!],
  },
  { id: "duotoneBlack", name: "Black / Fluoro Pink", inks: [INKS.black!, INKS.fluorescentPink!] },
  { id: "forest", name: "Green / Federal Blue", inks: [INKS.green!, INKS.federalBlue!] },
  { id: "zine", name: "Orange / Teal / Black", inks: [INKS.orange!, INKS.teal!, INKS.black!] },
  { id: "punch", name: "Fluoro Pink / Yellow", inks: [INKS.fluorescentPink!, INKS.yellow!] },
  { id: "cool", name: "Aqua / Purple / Burgundy", inks: [INKS.aqua!, INKS.purple!, INKS.burgundy!] },
  { id: "mono", name: "Black only", inks: [INKS.black!] },
  {
    id: "rgb",
    name: "RGB on dark",
    inks: [INKS.screenRed!, INKS.screenGreen!, INKS.screenBlue!],
    paper: "#12131a",
  },
  {
    id: "neonDark",
    name: "Fluoro on dark",
    inks: [INKS.fluorescentPink!, INKS.aqua!, INKS.yellow!],
    paper: "#2b2f38",
  },
];

export const PAPERS: { id: string; name: string; hex: string }[] = [
  { id: "natural", name: "Natural", hex: "#f5f0e4" },
  { id: "white", name: "White", hex: "#fbfbf8" },
  { id: "cream", name: "Cream", hex: "#f6e9c9" },
  { id: "newsprint", name: "Newsprint", hex: "#e8e2d0" },
  { id: "grey", name: "Grey", hex: "#dcdcd6" },
  { id: "kraft", name: "Kraft", hex: "#d9c3a0" },
  { id: "slate", name: "Slate", hex: "#2b2f38" },
  { id: "ink", name: "Ink", hex: "#12131a" },
  { id: "black", name: "Black", hex: "#000000" },
];

/**
 * Traditional screen angles. Keeping plates ~30 degrees apart minimises moire;
 * weak inks such as yellow conventionally sit on the 0/90 axis.
 */
export const DEFAULT_ANGLE_SPREAD = [15, 75, 0, 45, 30, 60];
