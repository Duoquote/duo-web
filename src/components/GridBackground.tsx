export default function GridBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Background image with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/background.jpg)" }}
      >
        <div className="absolute inset-0 bg-background/70" />
      </div>

      {/* Grid lines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(1 0 0 / 3%) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(1 0 0 / 3%) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }}
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(oklch(1 0 0 / 4%) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* Warm glow top */}
      <div
        className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[120%] h-[60%]"
        style={{
          background: "radial-gradient(ellipse at center, oklch(0.645 0.246 16.439 / 6%) 0%, transparent 70%)",
        }}
      />

      {/* Red glow bottom-right */}
      <div
        className="absolute -bottom-[10%] -right-[10%] w-1/2 h-1/2"
        style={{
          background: "radial-gradient(ellipse at center, oklch(0.586 0.253 17.585 / 4%) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
