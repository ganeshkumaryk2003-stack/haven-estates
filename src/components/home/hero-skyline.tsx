import { cn } from "@/lib/utils";

// Street frieze along the bottom of the hero: the brand idea (doors opening onto homes) carried
// into a skyline. Building and planting colours come from --sky-* tokens, so light mode reads as
// dawn (sun cresting the rooftops, peach horizon) and dark mode as dusk (amber afterglow). Every
// front door is lit in both, with porch light spilling onto the pavement. Decorative, so aria-hidden.

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

// Round-canopy tree: trunk plus three overlapping crowns in two greens.
function Tree({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g>
      <rect x={x - 3 * s} y={GROUND - 44 * s} width={6 * s} height={44 * s} rx="2" fill="var(--sky-trunk)" />
      <circle cx={x - 15 * s} cy={GROUND - 46 * s} r={16 * s} fill="var(--sky-tree-2)" />
      <circle cx={x + 15 * s} cy={GROUND - 48 * s} r={17 * s} fill="var(--sky-tree-2)" />
      <circle cx={x} cy={GROUND - 62 * s} r={22 * s} fill="var(--sky-tree)" />
    </g>
  );
}

// Palm: a leaning trunk with seven fronds fanning out from the crown.
function Palm({ x, h = 100, lean = 10 }: { x: number; h?: number; lean?: number }) {
  const tx = x + lean;
  const ty = GROUND - h;
  return (
    <g fill="none" strokeLinecap="round">
      <path d={`M${x} ${GROUND} Q${x + lean / 2} ${GROUND - h / 2} ${tx} ${ty}`} stroke="var(--sky-trunk)" strokeWidth="6" />
      <path d={`M${tx} ${ty} q-40 -6 -58 22`} stroke="var(--sky-tree)" strokeWidth="5" />
      <path d={`M${tx} ${ty} q40 -6 58 22`} stroke="var(--sky-tree)" strokeWidth="5" />
      <path d={`M${tx} ${ty} q-26 -26 -46 -14`} stroke="var(--sky-tree-2)" strokeWidth="5" />
      <path d={`M${tx} ${ty} q26 -26 46 -14`} stroke="var(--sky-tree-2)" strokeWidth="5" />
      <path d={`M${tx} ${ty} q-6 -30 8 -44`} stroke="var(--sky-tree)" strokeWidth="5" />
      <path d={`M${tx} ${ty} q-38 12 -50 40`} stroke="var(--sky-tree-2)" strokeWidth="4" />
      <path d={`M${tx} ${ty} q38 12 50 40`} stroke="var(--sky-tree-2)" strokeWidth="4" />
      <circle cx={tx} cy={ty} r="5" fill="var(--sky-tree)" />
    </g>
  );
}

// Low hedge or shrub beside a front door.
function Bush({ x, w = 28 }: { x: number; w?: number }) {
  return (
    <g>
      <ellipse cx={x - w * 0.28} cy={GROUND - 8} rx={w * 0.34} ry="10" fill="var(--sky-tree-2)" />
      <ellipse cx={x + w * 0.28} cy={GROUND - 8} rx={w * 0.34} ry="10" fill="var(--sky-tree-2)" />
      <ellipse cx={x} cy={GROUND - 13} rx={w * 0.4} ry="13" fill="var(--sky-tree)" />
    </g>
  );
}

// Soft cloud lit from below by the sunrise (dawn only).
function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g opacity="0.55">
      <ellipse cx={x} cy={y} rx={46 * s} ry={12 * s} fill="#FFFFFF" />
      <ellipse cx={x - 18 * s} cy={y - 6 * s} rx={22 * s} ry={13 * s} fill="#FFFFFF" />
      <ellipse cx={x + 14 * s} cy={y - 8 * s} rx={26 * s} ry={15 * s} fill="#FFFFFF" />
      <ellipse cx={x} cy={y + 5 * s} rx={44 * s} ry={7 * s} fill="#F7C9D2" />
    </g>
  );
}

const DOORS = [135, 335, 525, 635, 745, 985, 1205, 1425];
const SUN = { cx: 635, cy: 262, r: 176 };

export function HeroSkyline({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative w-full", className)}
      style={{
        height: "clamp(150px, 20vw, 290px)",
        background: "linear-gradient(180deg, var(--hero-mid) 0%, var(--hero-glow) 36%, var(--hero-blush) 60%, var(--hero-horizon) 82%, var(--hero-ground) 100%)",
      }}
    >
      <svg viewBox="0 0 1600 300" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" focusable="false">
        <defs>
          <linearGradient id="dk-porch" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F5B840" stopOpacity="0.6" />
            <stop offset="1" stopColor="#F5B840" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="dk-sunglow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFD27A" stopOpacity="0.6" />
            <stop offset="0.55" stopColor="#FFC98A" stopOpacity="0.22" />
            <stop offset="1" stopColor="#FFC98A" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Dawn only: the sun cresting the terraced rooftops, with a wide glow and soft rays. */}
        <g className="dark:hidden">
          <circle cx={SUN.cx} cy={SUN.cy} r="330" fill="url(#dk-sunglow)" />
          <g stroke="#FFE3A6" strokeOpacity="0.28" strokeWidth="3" strokeLinecap="round">
            {[-72, -54, -36, -18, 0, 18, 36, 54, 72].map((deg) => {
              const rad = ((deg - 90) * Math.PI) / 180;
              return <line key={deg} x1={SUN.cx + Math.cos(rad) * 190} y1={SUN.cy + Math.sin(rad) * 190} x2={SUN.cx + Math.cos(rad) * 252} y2={SUN.cy + Math.sin(rad) * 252} />;
            })}
          </g>
          <circle cx={SUN.cx} cy={SUN.cy} r={SUN.r} fill="#FFD98A" />
          <Cloud x={230} y={70} />
          <Cloud x={1000} y={40} s={0.8} />
          <Cloud x={1380} y={90} s={1.1} />
        </g>

        {/* Dusk only: the last stars low over the rooftops. */}
        <g className="hidden dark:block" fill="#FFFFFF" opacity="0.7">
          <circle cx="120" cy="22" r="1.2" />
          <circle cx="300" cy="48" r="1" />
          <circle cx="560" cy="16" r="1.4" />
          <circle cx="720" cy="52" r="1" />
          <circle cx="980" cy="12" r="1.2" />
          <circle cx="1180" cy="40" r="1" />
          <circle cx="1460" cy="18" r="1.3" />
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
        <rect x="0" y={GROUND} width="1600" height="2" fill="var(--sky-trim)" opacity="0.5" />

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

        {/* Planting in front of the homes: palms at the edges, round trees between buildings,
            hedges either side of the bungalow and villa doors. */}
        <Palm x={30} h={110} />
        <Tree x={228} />
        <Bush x={288} />
        <Bush x={382} />
        <Tree x={445} s={0.9} />
        <Palm x={822} h={100} lean={-10} />
        <Bush x={905} w={32} />
        <Bush x={1062} w={32} />
        <Tree x={1102} s={0.85} />
        <Bush x={1158} />
        <Bush x={1252} />
        <Tree x={1318} />
        <Palm x={1562} h={105} lean={8} />
      </svg>
    </div>
  );
}
