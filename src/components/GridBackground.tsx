export default function GridBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Background image (filtered in light mode) */}
      <div
        className="absolute inset-0 bg-cover bg-center invert hue-rotate-180 dark:invert-0 dark:hue-rotate-0"
        style={{ backgroundImage: "url(/background.jpg)" }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/70" />

      {/* Grid lines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
            linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }}
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(var(--grid-dot) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* Warm glow top */}
      <div
        className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[120%] h-[60%]"
        style={{
          background: "radial-gradient(ellipse at center, var(--glow-warm) 0%, transparent 70%)",
        }}
      />

      {/* Accent glow bottom-right */}
      <div
        className="absolute -bottom-[10%] -right-[10%] w-1/2 h-1/2"
        style={{
          background: "radial-gradient(ellipse at center, var(--glow-accent) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
