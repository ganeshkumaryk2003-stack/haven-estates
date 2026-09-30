import { cn } from "@/lib/utils";

// Sky above the skyline. Dusk (dark mode): a full moon with two faint halo rings and a scatter
// of twinkling stars. Dawn (light mode): the last few stars fading out and a thin crescent moon.
// Decorative only, so everything here is aria-hidden.
//
// The star field is a fixed list (not random) so the server and the client render the same sky.
// [x, y, radius, animation delay in seconds]
const DUSK_STARS: [number, number, number, number][] = [
  [40, 60, 1.4, 0.2], [120, 200, 1, 1.4], [190, 40, 1.8, 2.6], [260, 140, 1.1, 0.8], [330, 90, 1.3, 3.1],
  [410, 230, 1, 1.9], [470, 30, 1.6, 0.5], [540, 170, 1.2, 2.2], [610, 70, 1, 1.1], [690, 250, 1.5, 3.4],
  [750, 120, 1.1, 0.3], [830, 40, 1.9, 2.8], [900, 200, 1, 1.6], [960, 90, 1.3, 0.9], [1040, 160, 1.1, 2.4],
  [1110, 50, 1.7, 1.3], [1180, 240, 1, 3.0], [1250, 120, 1.2, 0.6], [1320, 300, 1, 2.0], [1400, 330, 1.4, 1.2],
  [1480, 60, 1.1, 2.9], [1550, 180, 1.6, 0.4], [80, 330, 1, 2.3], [220, 380, 1.3, 1.0], [360, 300, 1, 3.3],
  [500, 360, 1.5, 0.7], [640, 320, 1, 1.8], [780, 380, 1.2, 2.7], [920, 300, 1, 0.1], [1060, 350, 1.4, 1.5],
  [1200, 390, 1, 3.2], [1340, 420, 1.1, 2.1], [1500, 360, 1.3, 0.9], [150, 480, 1, 1.7], [300, 520, 1.2, 2.5],
  [450, 470, 1, 0.4], [600, 540, 1.1, 3.0], [760, 490, 1.4, 1.2], [880, 560, 1, 2.2], [1020, 500, 1.2, 0.6],
  [1160, 540, 1, 1.9], [1300, 510, 1.3, 2.8], [1440, 560, 1, 0.3], [1580, 480, 1.2, 1.6],
];

// At dawn only the brightest stars are still out, high in the sky.
const DAWN_STARS = DUSK_STARS.filter(([, y, r]) => y < 200 && r >= 1.3);

function Stars({ stars }: { stars: [number, number, number, number][] }) {
  return (
    <>
      {stars.map(([x, y, r, delay]) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={r}
          fill="#FFFFFF"
          opacity={0.75}
          className="motion-safe:animate-twinkle"
          style={{ animationDelay: `${delay}s`, animationDuration: `${2.8 + (delay % 1.5)}s` }}
        />
      ))}
    </>
  );
}

export function HeroSky({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {/* Star field, cropped from the centre on narrow screens so the density stays even. */}
      <svg viewBox="0 0 1600 600" preserveAspectRatio="xMidYMin slice" className="absolute inset-0 h-full w-full" focusable="false">
        <g className="hidden dark:block">
          <Stars stars={DUSK_STARS} />
        </g>
        <g className="opacity-40 dark:hidden">
          <Stars stars={DAWN_STARS} />
        </g>
      </svg>

      {/* Dusk: full moon with halo rings. */}
      <svg viewBox="0 0 200 200" className="absolute top-3 right-3 hidden size-28 sm:top-10 sm:right-12 sm:size-52 dark:block" focusable="false">
        <circle cx="100" cy="100" r="96" fill="none" stroke="#FCE7B8" strokeOpacity="0.08" strokeWidth="2" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="#FCE7B8" strokeOpacity="0.14" strokeWidth="2" />
        <circle cx="100" cy="100" r="44" fill="#FCE7B8" />
        <circle cx="86" cy="88" r="7" fill="#F1D6A0" opacity="0.7" />
        <circle cx="112" cy="110" r="5" fill="#F1D6A0" opacity="0.6" />
        <circle cx="98" cy="122" r="3.5" fill="#F1D6A0" opacity="0.6" />
      </svg>

      {/* Dawn: a thin crescent, almost washed out by the coming light. */}
      <svg viewBox="0 0 120 120" className="absolute top-5 right-5 size-14 sm:top-14 sm:right-24 sm:size-24 dark:hidden" focusable="false">
        <circle cx="60" cy="60" r="52" fill="none" stroke="#FFF4DC" strokeOpacity="0.1" strokeWidth="2" />
        <path d="M60 24A36 36 0 0 1 60 96A26 36 0 0 0 60 24Z" fill="#FFF4DC" opacity="0.9" />
      </svg>
    </div>
  );
}
