import { cn } from "@/lib/utils";

// The logo's D drawn as a real doorway: a door leaf swung open toward the viewer and a small,
// sunny room behind it. Used on the home CTA (white D on the blue panel) and the auth pages
// (door-blue D on the sky panel). Decorative, so aria-hidden.
export function HeroDoorway({ tone = "white", className }: { tone?: "white" | "door"; className?: string }) {
  const dFill = tone === "white" ? "#FFFFFF" : "var(--door)";
  return (
    <svg viewBox="0 0 200 300" aria-hidden="true" focusable="false" className={cn("h-[300px] w-auto", className)}>
      <defs>
        <linearGradient id="dk-leaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FAF3E7" />
          <stop offset="1" stopColor="#E6C47F" />
        </linearGradient>
        <linearGradient id="dk-wedge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F5B840" stopOpacity="0.55" />
          <stop offset="1" stopColor="#F5B840" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* The D */}
      <path d="M20 10H100a90 130 0 0 1 0 260H20Z" fill={dFill} />

      {/* Room seen through the opening */}
      <rect x="50" y="40" width="70" height="160" fill="#FBF0DC" />
      <rect x="50" y="200" width="70" height="60" fill="#C08A5A" />
      <g stroke="#A9754A" strokeWidth="1">
        <line x1="50" y1="212" x2="120" y2="212" />
        <line x1="50" y1="224" x2="120" y2="224" />
        <line x1="50" y1="236" x2="120" y2="236" />
        <line x1="50" y1="248" x2="120" y2="248" />
      </g>
      {/* Window with sky */}
      <rect x="66" y="66" width="34" height="44" rx="2" fill="#BFD8F5" stroke="#FFFFFF" strokeWidth="3" />
      <line x1="83" y1="66" x2="83" y2="110" stroke="#FFFFFF" strokeWidth="2" />
      <line x1="66" y1="88" x2="100" y2="88" stroke="#FFFFFF" strokeWidth="2" />
      {/* Floor lamp */}
      <line x1="60" y1="130" x2="60" y2="200" stroke="#7A5A3A" strokeWidth="2" />
      <polygon points="50,132 70,132 66,116 54,116" fill="#F5B840" />
      <ellipse cx="60" cy="200" rx="7" ry="2" fill="#7A5A3A" />
      {/* Sofa with a yellow cushion */}
      <rect x="76" y="164" width="40" height="14" rx="4" fill="var(--door)" />
      <rect x="74" y="176" width="44" height="20" rx="4" fill="var(--door)" />
      <rect x="98" y="178" width="14" height="12" rx="2" fill="#F5B840" />
      <rect x="78" y="196" width="4" height="6" fill="#1E3A8F" />
      <rect x="110" y="196" width="4" height="6" fill="#1E3A8F" />

      {/* Door leaf, swung open toward the viewer, hinged on the left jamb */}
      <polygon points="50,40 22,58 22,278 50,260" fill="url(#dk-leaf)" />
      <circle cx="31" cy="162" r="2.2" fill="#1E3A8F" />
      <line x1="26" y1="72" x2="26" y2="264" stroke="#D9B46B" strokeWidth="1" opacity="0.6" />

      {/* Porch light across the floor */}
      <polygon points="50,260 120,260 156,300 14,300" fill="url(#dk-wedge)" />

      {/* Doormat */}
      <rect x="58" y="270" width="54" height="10" rx="2" fill="#B98A57" />
      <g stroke="#A9754A" strokeWidth="1">
        <line x1="64" y1="272" x2="64" y2="278" />
        <line x1="76" y1="272" x2="76" y2="278" />
        <line x1="88" y1="272" x2="88" y2="278" />
        <line x1="100" y1="272" x2="100" y2="278" />
      </g>

      {/* Potted plant beside the door */}
      <rect x="150" y="248" width="24" height="24" rx="3" fill="#B5623A" />
      <rect x="148" y="244" width="28" height="6" rx="2" fill="#C9744A" />
      <ellipse cx="162" cy="236" rx="12" ry="9" fill="#4C8C5A" />
      <ellipse cx="152" cy="228" rx="8" ry="7" fill="#5A9E68" />
      <ellipse cx="172" cy="228" rx="8" ry="7" fill="#3F7A4C" />
      <ellipse cx="162" cy="220" rx="7" ry="8" fill="#5A9E68" />
    </svg>
  );
}
