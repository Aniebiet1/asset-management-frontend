import { motion, useReducedMotion } from "framer-motion";

/** Alternating bar/gap widths for the asset tag's barcode, in units of BARCODE_UNIT. */
const BARCODE_PATTERN = [2, 1, 1, 1, 3, 1, 1, 2, 2, 1, 1, 1, 3, 2, 1, 1, 2, 1, 1, 1, 3];
const BARCODE_UNIT = 1.8;

const BARCODE_BARS = BARCODE_PATTERN.reduce<{ x: number; bars: { x: number; w: number }[] }>(
  (acc, units, i) => {
    const w = units * BARCODE_UNIT;
    if (i % 2 === 0) acc.bars.push({ x: acc.x, w });
    acc.x += w;
    return acc;
  },
  { x: -22, bars: [] },
).bars;

const ROWS = [
  { y: -20, flagged: false },
  { y: 10, flagged: false },
  { y: 40, flagged: true },
  { y: 70, flagged: false },
];

/**
 * The asset register clipboard + hang tag drawn on the platform sign-in panel. Every fill reads
 * a `--pa-*` variable defined under `.platform-auth` in index.css, so the drawing re-tints with
 * the brand colors and with light/dark mode instead of shipping a fixed-color image.
 */
export function PlatformAuthIllustration({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <svg viewBox="0 0 400 300" className={className} aria-hidden="true" focusable="false">
      {/* Backdrop shapes */}
      <g fill="white" fillOpacity={0.1}>
        <rect x="22" y="112" width="148" height="24" rx="12" />
        <rect x="250" y="138" width="128" height="24" rx="12" />
        <rect x="48" y="216" width="96" height="20" rx="10" />
        <rect x="270" y="80" width="62" height="16" rx="8" />
        <circle cx="356" cy="200" r="9" />
      </g>
      <g stroke="white" strokeOpacity={0.45} strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M71 64h10M76 59v10" />
        <path d="M339 252h10M344 247v10" />
        <circle cx="318" cy="42" r="5" />
      </g>
      <circle cx="40" cy="178" r="3" fill="white" fillOpacity={0.45} />

      {/* Clipboard */}
      <g transform="translate(200 150) rotate(-7)">
        <rect x="-72" y="-94" width="156" height="204" rx="14" fill="black" fillOpacity={0.18} />
        <rect x="-78" y="-102" width="156" height="204" rx="14" fill="var(--pa-board)" />
        <rect x="-64" y="-82" width="128" height="172" rx="6" fill="var(--pa-paper)" />
        <rect x="-13" y="-124" width="26" height="20" rx="9" fill="none" stroke="var(--pa-clip)" strokeWidth="5" />
        <rect x="-30" y="-112" width="60" height="24" rx="7" fill="var(--pa-clip)" />

        <rect x="-48" y="-62" width="58" height="7" rx="3.5" fill="var(--pa-mark)" />
        <rect x="-48" y="-50" width="34" height="4" rx="2" fill="var(--pa-line)" />
        <rect x="26" y="-63" width="22" height="9" rx="4.5" fill="var(--pa-mark)" fillOpacity={0.16} />
        <path d="M-48 -37H48" stroke="var(--pa-line)" strokeWidth="1" />

        {ROWS.map(({ y, flagged }) => (
          <g key={y}>
            {flagged ? (
              <>
                <circle cx="-42" cy={y} r="8" fill="var(--pa-accent)" fillOpacity={0.16} />
                <circle cx="-42" cy={y} r="4" fill="var(--pa-accent)" />
              </>
            ) : (
              <path
                d={`M-48 ${y}l4 4l8 -9`}
                fill="none"
                stroke="var(--pa-mark)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            <rect x="-26" y={y - 6} width="70" height="5" rx="2.5" fill="var(--pa-ink)" fillOpacity={0.55} />
            <rect x="-26" y={y + 3} width="44" height="4" rx="2" fill="var(--pa-line)" />
          </g>
        ))}
      </g>

      {/* Pen leaning against the board */}
      <g transform="translate(100 220) rotate(-64)">
        <rect x="-52" y="-5.5" width="94" height="11" rx="5.5" fill="var(--pa-paper)" />
        <rect x="-62" y="-5.5" width="24" height="11" rx="5.5" fill="var(--pa-accent)" />
        <path d="M40 -5.5L56 0L40 5.5Z" fill="var(--pa-clip)" />
        <path d="M51 -1.8L56 0L51 1.8Z" fill="var(--pa-ink)" />
      </g>

      {/* Asset tag */}
      <g transform="translate(298 208) rotate(10)">
        <motion.g
          animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
          transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
        >
          <path d="M-44 -8L-30 -22H44a8 8 0 0 1 8 8V34a8 8 0 0 1 -8 8H-30L-44 28Z" fill="black" fillOpacity={0.18} />
          <path d="M-48 -14L-34 -28H40a8 8 0 0 1 8 8V20a8 8 0 0 1 -8 8H-34L-48 14Z" fill="var(--pa-paper)" />
          <circle cx="-36" cy="0" r="4.5" fill="var(--pa-board)" />
          {BARCODE_BARS.map((bar) => (
            <rect key={bar.x} x={bar.x} y="-17" width={bar.w} height="22" fill="var(--pa-ink)" />
          ))}
          <rect x="-22" y="11" width="34" height="4" rx="2" fill="var(--pa-ink)" fillOpacity={0.45} />
          <rect x="26" y="10" width="10" height="6" rx="2" fill="var(--pa-accent)" />
        </motion.g>
      </g>
    </svg>
  );
}
