/**
 * Hand-drawn pixel sprites for /maria, authored as character maps so every pixel
 * lands on the theme palette exactly. Rendered as crisp-edged SVG rects — no
 * raster assets, no network, scales to any size without blurring.
 */

const PALETTE: Record<string, string> = {
  k: "#3b2f1d", // ink outline
  d: "#2b2a1c", // deep shadow
  p: "#e6d9b8", // parchment
  w: "#f2e8cd", // parchment highlight
  b: "#6b4a2a", // coffee / patty brown
  g: "#7fa650", // moss green
  s: "#4f7590", // steel blue
  a: "#d9924a", // amber
  r: "#e08a9b", // rose
};

const SPRITES: Record<string, string[]> = {
  // a cup on a saucer, with a handle
  coffee: [
    "............",
    "............",
    ".kkkkkkkk...",
    ".kwwwwwwk...",
    ".kbbbbbbkkk.",
    ".kbbbbbbk.k.",
    ".kwwwwwwkkk.",
    "..kwwwwwk...",
    "..kwwwwwk...",
    "...kkkkk....",
    ".kkkkkkkkk..",
    "............",
  ],
  // noodle bowl with chopsticks
  asian: [
    "............",
    "......k...k.",
    ".....k...k..",
    "....k...k...",
    "kkkkkkkkkkk.",
    "kwaaaaaaawk.",
    "kwaaaaaaawk.",
    ".kwwwwwwwk..",
    ".kwwwwwwwk..",
    "..kkkkkkk...",
    "...kkkkk....",
    "............",
  ],
  // stacked burger
  burger: [
    "............",
    "...kkkkkk...",
    "..kaaaaaak..",
    ".kaawaawaak.",
    ".kaaaaaaaak.",
    ".kkkkkkkkkk.",
    ".kgggggggk..",
    ".kbbbbbbbbk.",
    ".kaaaaaaaak.",
    "..kkkkkkkk..",
    "............",
    "............",
  ],
  // skewer over a plate — döner, pilav, dürüm
  quick: [
    ".....k......",
    ".....k......",
    "....kak.....",
    "....kak.....",
    "...kaaak....",
    "...kaaak....",
    "..kkaaakk...",
    "............",
    "kkkkkkkkkkk.",
    "kwwwwwwwwwk.",
    ".kkkkkkkkk..",
    "............",
  ],
  // padlock for the gate
  lock: [
    "............",
    "....kkkk....",
    "...k....k...",
    "...k....k...",
    "..kkkkkkkk..",
    "..kaaaaaak..",
    "..kaakkaak..",
    "..kaakkaak..",
    "..kaaaaaak..",
    "..kkkkkkkk..",
    "............",
    "............",
  ],
  // a little heart, the one cute flourish
  heart: [
    "............",
    "..kkk..kkk..",
    ".krrrkkrrrk.",
    "krrrrrrrrrrk",
    "krrrrrrrrrrk",
    ".krrrrrrrrk.",
    "..krrrrrrk..",
    "...krrrrk...",
    "....krrk....",
    ".....kk.....",
    "............",
    "............",
  ],
};

export type SpriteName = keyof typeof SPRITES | string;

export function PixelSprite({
  name,
  size = 24,
  className,
}: {
  name: SpriteName;
  size?: number;
  className?: string;
}) {
  const rows = SPRITES[name];
  if (!rows) return null;
  const w = rows[0].length;
  const h = rows.length;

  const rects: React.ReactElement[] = [];
  rows.forEach((row, y) => {
    // merge horizontal runs of the same colour into one rect — fewer nodes, same result
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === "." || !PALETTE[ch]) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      rects.push(
        <rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={PALETTE[ch]} />,
      );
      x += run;
    }
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ display: "block", imageRendering: "pixelated" }}
    >
      {rects}
    </svg>
  );
}
