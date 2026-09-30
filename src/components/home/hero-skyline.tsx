import { cn } from "@/lib/utils";

// Street frieze along the bottom of the hero: the brand idea (doors opening onto homes) carried
// into a skyline. Building colours come from --sky-* tokens, so light mode reads as dawn and dark
// mode as dusk; every front door is lit in both, with porch light spilling onto the pavement.
// Decorative only, hence aria-hidden.

const GROUND = 268;

function Windows({ x, y, cols, rows, w, h, gapX, gapY, lit }: { x: number; y: number; cols: number; rows: number; w: number; h: number; gapX: number; gapY: number; lit: number[] }) {
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      cells.push(<rect key={index} x={x + col * gapX} y={y + row * gapY} width={w} height={h} rx="1.5" fill={lit.includes(index) ? "var(--sky-lit-window)" : "var(--sky-glass)"} />);
    }
  }
  return <>{cells}</>;
}

function Door({ cx, w = 26, h = 40 }: { cx: number; w?: number; h?: number }) {
  return <rect x={cx - w / 2} y={GROUND - h} width={w} height={h} rx="2" fill="#FFD27A" />;
}

// Soft trapezoid of porch light falling from the door across the pavement.
function PorchLight({ cx }: { cx: number }) {
  return <polygon points={`${cx - 16},${GROUND} ${cx + 16},${GROUND} ${cx + 46},300 ${cx - 46},300`} fill="url(#dk-porch)" />;
}

const DOORS = [135, 335, 525, 635, 745, 985, 1205, 1425];

export function HeroSkyline({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative w-full", className)}
      style={{
        height: "clamp(150px, 20vw, 290px)",
        background: "linear-gradient(180deg, var(--hero-mid) 0%, var(--hero-glow) 42%, var(--hero-horizon) 80%, var(--hero-ground) 100%)",
      }}
    >
      <svg viewBox="0 0 1600 300" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" focusable="false">
        <defs>
          <linearGradient id="dk-porch" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F5B840" stopOpacity="0.6" />
            <stop offset="1" stopColor="#F5B840" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Dawn only: the sun coming up behind the rooftops. */}
        <g className="dark:hidden">
          <circle cx="1230" cy={GROUND} r="130" fill="#FFE3A6" opacity="0.35" />
          <circle cx="1230" cy={GROUND} r="74" fill="#FFD27A" />
        </g>

        {/* Distant towers, barely there. */}
        <g fill="var(--sky-distant)">
          <rect x="10" y="150" width="44" height="120" />
          <rect x="430" y="60" width="40" height="210" />
          <rect x="796" y="30" width="50" height="240" />
          <rect x="1088" y="90" width="30" height="180" />
          <rect x="1308" y="110" width="36" height="160" />
          <rect x="1530" y="80" width="60" height="190" />
        </g>
        <g fill="#F5B840" opacity="0.4">
          <rect x="440" y="90" width="6" height="8" />
          <rect x="456" y="140" width="6" height="8" />
          <rect x="808" y="70" width="6" height="8" />
          <rect x="830" y="120" width="6" height="8" />
          <rect x="816" y="190" width="6" height="8" />
          <rect x="1546" y="110" width="6" height="8" />
          <rect x="1570" y="170" width="6" height="8" />
        </g>

        {/* Pavement */}
        <rect x="0" y={GROUND} width="1600" height="32" fill="var(--sky-pavement)" />

        {/* Apartment tower A */}
        <rect x="60" y="70" width="150" height={GROUND - 70} fill="var(--sky-face)" />
        <rect x="60" y="70" width="150" height="6" fill="var(--sky-trim)" />
        <Windows x={78} y={92} cols={3} rows={5} w={26} h={22} gapX={48} gapY={30} lit={[1, 3, 6, 8, 11, 13]} />
        <Door cx={135} w={30} h={42} />

        {/* Tiled-roof bungalow 1 */}
        <rect x="250" y="180" width="170" height={GROUND - 180} fill="var(--sky-face-2)" />
        <polygon points="236,182 335,118 434,182" fill="var(--sky-roof)" />
        <rect x="236" y="180" width="198" height="4" fill="var(--sky-trim)" />
        <rect x="392" y="132" width="14" height="30" fill="var(--sky-roof)" />
        <rect x="270" y="205" width="34" height="30" rx="1.5" fill="var(--sky-lit-window)" />
        <rect x="366" y="205" width="34" height="30" rx="1.5" fill="var(--sky-glass)" />
        <Door cx={335} w={28} h={44} />

        {/* Three terraced townhouses */}
        {[470, 580, 690].map((x, index) => (
          <g key={x}>
            <rect x={x} y="130" width="110" height={GROUND - 130} fill={index % 2 === 0 ? "var(--sky-face)" : "var(--sky-face-2)"} />
            <polygon points={`${x},132 ${x + 55},100 ${x + 110},132`} fill="var(--sky-roof)" />
            <rect x={x + 108} y="130" width="2" height={GROUND - 130} fill="var(--sky-trim)" />
            <Windows x={x + 16} y={150} cols={2} rows={2} w={28} h={30} gapX={50} gapY={46} lit={index === 0 ? [0, 3] : index === 1 ? [1] : [0, 2]} />
            <Door cx={x + 55} w={24} h={40} />
          </g>
        ))}

        {/* Modern villa */}
        <rect x="850" y="160" width="230" height={GROUND - 160} fill="var(--sky-face)" />
        <rect x="900" y="112" width="130" height="48" fill="var(--sky-face-2)" />
        <rect x="845" y="156" width="240" height="6" fill="var(--sky-roof)" />
        <rect x="895" y="108" width="140" height="5" fill="var(--sky-roof)" />
        <rect x="920" y="124" width="44" height="26" rx="1.5" fill="var(--sky-lit-window)" />
        <rect x="870" y="185" width="84" height="60" rx="2" fill="var(--sky-glass)" />
        <rect x="1020" y="190" width="40" height="36" rx="1.5" fill="var(--sky-lit-window)" />
        <rect x="955" y="222" width="60" height="5" fill="var(--sky-roof)" />
        <Door cx={985} w={30} h={40} />

        {/* Tiled-roof bungalow 2 */}
        <rect x="1120" y="185" width="170" height={GROUND - 185} fill="var(--sky-face)" />
        <polygon points="1106,187 1205,125 1304,187" fill="var(--sky-roof)" />
        <rect x="1106" y="185" width="198" height="4" fill="var(--sky-trim)" />
        <rect x="1140" y="210" width="34" height="30" rx="1.5" fill="var(--sky-glass)" />
        <rect x="1236" y="210" width="34" height="30" rx="1.5" fill="var(--sky-lit-window)" />
        <Door cx={1205} w={28} h={44} />

        {/* Apartment tower B */}
        <rect x="1340" y="40" width="170" height={GROUND - 40} fill="var(--sky-face-2)" />
        <rect x="1340" y="40" width="170" height="6" fill="var(--sky-trim)" />
        <Windows x={1360} y={62} cols={3} rows={6} w={28} h={22} gapX={56} gapY={30} lit={[0, 4, 5, 9, 11, 14, 16]} />
        <Door cx={1425} w={30} h={42} />

        {/* Porch light spilling from every door */}
        {DOORS.map((cx) => (
          <PorchLight key={cx} cx={cx} />
        ))}
      </svg>
    </div>
  );
}
