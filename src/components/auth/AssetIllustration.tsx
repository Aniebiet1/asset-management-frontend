import type { CSSProperties } from "react";

/**
 * Flat asset-management scene for the tenant login card's brand panel: an asset register on a
 * clipboard, a laptop dashboard, a QR asset tag and a scanner reading a boxed item's barcode.
 *
 * Every color comes from the `--ill-*` tokens `.bg-auth-panel` defines in `index.css`, which are
 * themselves derived from `--org-primary`/`--org-accent` and switch under `.dark`, so the scene
 * re-tints for each org and for light/dark mode without any per-mode branching here. Deliberately
 * carries no logo or wordmark.
 */

const surface: CSSProperties = { fill: "var(--ill-surface)" };
const ink: CSSProperties = { fill: "var(--ill-ink)" };
const muted: CSSProperties = { fill: "var(--ill-muted)" };
const accent: CSSProperties = { fill: "var(--ill-accent)" };
const soft: CSSProperties = { fill: "var(--ill-soft)" };
const shadow: CSSProperties = { fill: "var(--ill-shadow)" };

/** 9x9 QR-ish grid, finder corners drawn separately. '#' = filled module. */
const QR_ROWS = [
  "   # #   ",
  "   ##    ",
  "    #    ",
  "# ## # ##",
  " #  ### #",
  "## #  #  ",
  "   # ## #",
  "    #  # ",
  "   ## ## ",
];
const QR_MODULE = 4.8;

function QrFinder({ x, y }: { x: number; y: number }) {
  const m = QR_MODULE;
  return (
    <g>
      <rect x={x} y={y} width={m * 3} height={m * 3} rx={1.5} style={ink} />
      <rect x={x + m * 0.55} y={y + m * 0.55} width={m * 1.9} height={m * 1.9} rx={1} style={surface} />
      <rect x={x + m} y={y + m} width={m} height={m} style={ink} />
    </g>
  );
}

/** Small glyph inside each register row's icon tile, so the list reads as different asset types. */
function RowGlyph({ kind, y }: { kind: number; y: number }) {
  switch (kind) {
    case 0: // laptop
      return (
        <g style={ink}>
          <rect x={26} y={y + 5} width={12} height={8} rx={1} />
          <rect x={24.5} y={y + 14} width={15} height={2} rx={1} />
        </g>
      );
    case 1: // monitor
      return (
        <g style={ink}>
          <rect x={26} y={y + 4} width={12} height={9} rx={1} />
          <rect x={31} y={y + 13} width={2} height={3} />
          <rect x={28} y={y + 15.5} width={8} height={1.6} rx={0.8} />
        </g>
      );
    case 2: // chair
      return (
        <g style={ink}>
          <rect x={27} y={y + 4} width={10} height={7} rx={2} />
          <rect x={26} y={y + 11} width={12} height={3} rx={1.5} />
          <rect x={31} y={y + 14} width={2} height={3} />
        </g>
      );
    default: // box
      return (
        <g style={ink}>
          <rect x={26} y={y + 6} width={12} height={10} rx={1} opacity={0.55} />
          <rect x={26} y={y + 6} width={12} height={3} rx={1} />
        </g>
      );
  }
}

export function AssetIllustration({ className }: { className?: string }) {
  const rows = [62, 92, 122, 152];

  return (
    <svg viewBox="0 0 440 340" className={className} role="img" aria-label="Illustration of assets being tagged, scanned and tracked">
      {/* Backdrop pills and sparkles */}
      <rect x={110} y={108} width={250} height={30} rx={15} style={soft} />
      <rect x={20} y={142} width={110} height={22} rx={11} style={soft} />
      <rect x={300} y={172} width={120} height={26} rx={13} style={soft} />
      <circle cx={412} cy={150} r={10} style={soft} />
      <circle cx={40} cy={110} r={6} style={soft} />
      <g style={{ stroke: "var(--ill-surface)", strokeWidth: 2, strokeLinecap: "round", opacity: 0.8 }}>
        <path d="M112 54v12M106 60h12" />
        <path d="M402 236v10M397 241h10" />
      </g>
      <circle cx={76} cy={84} r={3} style={surface} opacity={0.85} />
      <circle cx={150} cy={318} r={2.5} style={surface} opacity={0.7} />
      <circle cx={420} cy={98} r={2.5} style={surface} opacity={0.7} />

      {/* Laptop with a dashboard */}
      <g transform="translate(30 168)">
        <g className="auth-float-slow">
          <rect x={4} y={8} width={150} height={96} rx={8} style={shadow} />
          <rect x={0} y={0} width={150} height={96} rx={8} style={ink} />
          <rect x={7} y={7} width={136} height={78} rx={3} style={surface} />
          <rect x={18} y={16} width={40} height={5} rx={2.5} style={ink} />
          <rect x={20} y={56} width={11} height={18} rx={2} style={muted} />
          <rect x={36} y={42} width={11} height={32} rx={2} style={ink} />
          <rect x={52} y={50} width={11} height={24} rx={2} style={muted} />
          <rect x={68} y={34} width={11} height={40} rx={2} style={accent} />
          <circle cx={110} cy={45} r={15} fill="none" style={{ stroke: "var(--ill-muted)", strokeWidth: 6 }} />
          <circle
            cx={110}
            cy={45}
            r={15}
            fill="none"
            transform="rotate(-90 110 45)"
            style={{ stroke: "var(--ill-accent)", strokeWidth: 6, strokeDasharray: "64 200", strokeLinecap: "round" }}
          />
          <rect x={-14} y={96} width={178} height={9} rx={4.5} style={surface} />
          <rect x={60} y={96} width={30} height={4} rx={2} style={muted} />
        </g>
      </g>

      {/* Clipboard asset register */}
      <g transform="translate(170 40)">
        <g className="auth-float">
          <g transform="rotate(-6 75 100)">
            <rect x={8} y={12} width={150} height={200} rx={14} style={shadow} />
            <rect x={0} y={0} width={150} height={200} rx={14} style={ink} />
            <rect x={10} y={18} width={130} height={172} rx={6} style={surface} />
            <rect x={50} y={-6} width={50} height={18} rx={6} style={muted} />
            <rect x={63} y={-12} width={24} height={10} rx={5} style={accent} />
            <rect x={22} y={32} width={60} height={7} rx={3.5} style={ink} />
            <rect x={22} y={44} width={40} height={5} rx={2.5} style={muted} />
            {rows.map((y, i) => (
              <g key={y}>
                <rect x={22} y={y} width={20} height={20} rx={5} style={muted} />
                <RowGlyph kind={i} y={y} />
                <rect x={50} y={y + 3} width={50 - i * 4} height={5} rx={2.5} style={ink} opacity={0.85} />
                <rect x={50} y={y + 12} width={34} height={4} rx={2} style={muted} />
                {i === 2 ? (
                  <circle cx={122} cy={y + 10} r={6.5} fill="none" style={{ stroke: "var(--ill-muted)", strokeWidth: 2 }} />
                ) : (
                  <g>
                    <circle cx={122} cy={y + 10} r={7} style={accent} />
                    <path
                      d={`M118.6 ${y + 10.2}l2.4 2.4 4.4-4.8`}
                      fill="none"
                      style={{ stroke: "var(--ill-surface)", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" }}
                    />
                  </g>
                )}
              </g>
            ))}
          </g>
        </g>
      </g>

      {/* Hanging QR asset tag */}
      <g transform="translate(338 34)">
        <g className="auth-swing">
          <path d="M32 22C20 2-10-8-38-4" fill="none" style={{ stroke: "var(--ill-surface)", strokeWidth: 1.6, opacity: 0.75 }} />
          <rect x={3} y={14} width={64} height={78} rx={10} style={shadow} />
          <rect x={0} y={10} width={64} height={78} rx={10} style={surface} />
          <circle cx={32} cy={22} r={3.5} style={muted} />
          <g transform={`translate(${(64 - QR_MODULE * 9) / 2} 32)`}>
            {QR_ROWS.flatMap((row, r) =>
              row.split("").map((cell, c) =>
                cell === "#" ? (
                  <rect key={`${r}-${c}`} x={c * QR_MODULE} y={r * QR_MODULE} width={QR_MODULE} height={QR_MODULE} style={ink} />
                ) : null,
              ),
            )}
            <QrFinder x={0} y={0} />
            <QrFinder x={QR_MODULE * 6} y={0} />
            <QrFinder x={0} y={QR_MODULE * 6} />
          </g>
        </g>
      </g>

      {/* Boxed asset with a barcode label */}
      <g transform="translate(205 248)">
        <rect x={4} y={20} width={88} height={52} rx={4} style={shadow} />
        <path d="M0 14 14 0h78L78 14Z" style={surface} />
        <path d="M78 14 92 0v52L78 66Z" style={ink} opacity={0.75} />
        <rect x={0} y={14} width={78} height={52} rx={2} style={muted} />
        <rect x={12} y={26} width={42} height={26} rx={2} style={surface} />
        <g style={ink}>
          {[0, 3, 5, 9, 11, 14, 18, 20, 23, 27, 29, 32].map((x, i) => (
            <rect key={x} x={16 + x} y={30} width={i % 3 === 0 ? 2 : 1.2} height={13} />
          ))}
          <rect x={16} y={46} width={22} height={2.4} rx={1.2} opacity={0.6} />
        </g>
        <rect className="auth-scanline" x={10} y={37} width={46} height={1.6} rx={0.8} style={accent} />
      </g>

      {/* Scanner reading the label */}
      <path className="auth-beam" d="M318 247 217 272 261 300 318 259Z" style={accent} />
      <g transform="translate(318 238)">
        <path d="M44 26h16l10 46q1 8-7 8h-6q-6 0-7-6Z" style={ink} />
        <path d="M40 28h6l-2 14q-1 4-4 2Z" style={accent} />
        <rect x={0} y={0} width={78} height={30} rx={11} style={surface} />
        <rect x={-3} y={8} width={8} height={14} rx={3} style={accent} />
        <rect x={22} y={10} width={30} height={4} rx={2} style={muted} />
        <circle cx={62} cy={12} r={3} style={accent} />
      </g>
    </svg>
  );
}
