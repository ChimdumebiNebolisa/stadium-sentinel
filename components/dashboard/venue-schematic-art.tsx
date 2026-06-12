/** SVG background layers for the Venue Context schematic (not a seat map). */
export function VenueSchematicArt() {
  return (
    <>
      <defs>
        <linearGradient id="venue-shell-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d8e0ea" />
          <stop offset="52%" stopColor="#c5d0de" />
          <stop offset="100%" stopColor="#b4c2d4" />
        </linearGradient>
        <linearGradient id="venue-stand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8edf4" />
          <stop offset="100%" stopColor="#d2dbe8" />
        </linearGradient>
        <linearGradient id="venue-concourse-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#eef2f7" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="venue-pitch-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3f8f5f" />
          <stop offset="100%" stopColor="#2f7a4f" />
        </linearGradient>
        <filter id="venue-shell-shadow" x="-8%" y="-8%" width="116%" height="116%">
          <feDropShadow dx="0" dy="0.8" stdDeviation="1.1" floodColor="#0f172a" floodOpacity="0.12" />
        </filter>
        <filter id="venue-marker-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M22,12 L78,12 A13,13 0 0,1 91,25 L91,39 A13,13 0 0,1 78,52 L22,52 A13,13 0 0,1 9,39 L9,25 A13,13 0 0,1 22,12 Z"
        fill="url(#venue-shell-gradient)"
        stroke="#a8b8cb"
        strokeWidth="0.55"
        filter="url(#venue-shell-shadow)"
      />
      <path
        d="M24,15 L76,15 A10,10 0 0,1 86,25 L86,39 A10,10 0 0,1 76,49 L24,49 A10,10 0 0,1 14,39 L14,25 A10,10 0 0,1 24,15 Z"
        fill="url(#venue-stand-gradient)"
        stroke="#c7d2e0"
        strokeWidth="0.4"
        opacity="0.92"
      />
      <path
        d="M26,20 L74,20 A9,9 0 0,1 83,29 L83,35 A9,9 0 0,1 74,44 L26,44 A9,9 0 0,1 17,35 L17,29 A9,9 0 0,1 26,20 Z"
        fill="url(#venue-concourse-gradient)"
        stroke="#d7e0eb"
        strokeWidth="0.45"
      />
      <path
        d="M28,22 L72,22 A7,7 0 0,1 79,29 L79,35 A7,7 0 0,1 72,42 L28,42 A7,7 0 0,1 21,35 L21,29 A7,7 0 0,1 28,22 Z"
        fill="#f4f7fb"
        stroke="#e2e8f0"
        strokeWidth="0.35"
        opacity="0.9"
      />

      <rect
        x="35"
        y="27"
        width="30"
        height="10"
        rx="1.2"
        fill="url(#venue-pitch-gradient)"
        stroke="#2d6a47"
        strokeWidth="0.45"
      />
      <line x1="50" y1="27" x2="50" y2="37" stroke="#e8f5ec" strokeWidth="0.35" opacity="0.85" />
      <circle cx="50" cy="32" r="2.4" fill="none" stroke="#e8f5ec" strokeWidth="0.35" opacity="0.8" />
      <rect x="35" y="29.2" width="4.2" height="5.6" fill="none" stroke="#e8f5ec" strokeWidth="0.3" opacity="0.7" />
      <rect x="60.8" y="29.2" width="4.2" height="5.6" fill="none" stroke="#e8f5ec" strokeWidth="0.3" opacity="0.7" />

      <g className="venue-schematic-gate-label" transform="translate(10.5, 31.5)">
        <rect
          x="0"
          y="-2.8"
          width="11.5"
          height="5.6"
          rx="1.2"
          fill="rgba(255,255,255,0.42)"
          stroke="rgba(255,255,255,0.62)"
          strokeWidth="0.3"
        />
        <text x="5.75" y="0.9" textAnchor="middle">
          Gate A
        </text>
      </g>
      <g className="venue-schematic-gate-label" transform="translate(86.5, 23)">
        <rect
          x="0"
          y="-2.8"
          width="10.5"
          height="5.6"
          rx="1.2"
          fill="rgba(255,255,255,0.42)"
          stroke="rgba(255,255,255,0.62)"
          strokeWidth="0.3"
        />
        <text x="5.25" y="0.9" textAnchor="middle">
          Gate B
        </text>
      </g>

      {[
        { label: "A", x: 27.5, y: 19.5 },
        { label: "B", x: 72.5, y: 19.5 },
        { label: "C", x: 27.5, y: 45.5 },
        { label: "D", x: 72.5, y: 45.5 },
      ].map((section) => (
        <g key={section.label} className="venue-schematic-section-label">
          <circle cx={section.x} cy={section.y} r="2.1" fill="rgba(255,255,255,0.5)" stroke="#b8c5d6" strokeWidth="0.3" />
          <text x={section.x} y={section.y + 0.9} textAnchor="middle">
            {section.label}
          </text>
        </g>
      ))}
    </>
  );
}
