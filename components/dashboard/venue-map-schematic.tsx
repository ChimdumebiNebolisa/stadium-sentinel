export function VenueMapSchematic() {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="pointer-events-none h-full w-full"
    >
      <rect width="100" height="100" fill="#091018" />
      <rect
        x="1.5"
        y="1.5"
        width="97"
        height="97"
        rx="3"
        fill="#0b1219"
        stroke="#1d2a36"
        strokeWidth="0.35"
      />

      <g opacity="0.08" stroke="#9fb0bf" strokeWidth="0.15">
        {Array.from({ length: 18 }).map((_, index) => {
          const coordinate = 5 + index * 5;

          return (
            <g key={coordinate}>
              <line x1={coordinate} y1="2" x2={coordinate} y2="98" />
              <line x1="2" y1={coordinate} x2="98" y2={coordinate} />
            </g>
          );
        })}
      </g>

      <g id="zone-perimeter" data-zone-layer="perimeter">
        <rect
          x="8"
          y="7"
          width="84"
          height="86"
          rx="15"
          fill="#101821"
          stroke="#5a6f84"
          strokeWidth="0.5"
        />
        <rect
          x="13"
          y="12"
          width="74"
          height="76"
          rx="12"
          fill="none"
          stroke="#6b8095"
          strokeWidth="0.26"
          strokeDasharray="1.2 1.3"
          opacity="0.6"
        />
        <text
          x="12.5"
          y="22"
          fill="#c3cfdb"
          fontSize="1.7"
          fontWeight="600"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          Gate B
        </text>
      </g>

      <g id="zone-concourse" data-zone-layer="concourse">
        <rect
          x="18.5"
          y="20"
          width="63"
          height="60"
          rx="10"
          fill="#13202a"
          stroke="#5a748d"
          strokeWidth="0.4"
        />
        <rect
          x="23"
          y="24"
          width="54"
          height="52"
          rx="8"
          fill="none"
          stroke="#849aaf"
          strokeWidth="0.22"
          strokeDasharray="1 1.4"
          opacity="0.45"
        />
        <text
          x="78"
          y="46"
          fill="#c3cfdb"
          fontSize="1.7"
          fontWeight="600"
          textAnchor="end"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          Elevator 4
        </text>
        <text
          x="73.5"
          y="68"
          fill="#c3cfdb"
          fontSize="1.8"
          fontWeight="600"
          textAnchor="end"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          West Concourse
        </text>
      </g>

      <g id="zone-bowl" data-zone-layer="bowl">
        <path
          d="M29 28C33 24 40 22 50 22C60 22 67 24 71 28L76 34C78 37 79 40 79 44V59C79 63 78 66 76 69L71 74C67 78 60 80 50 80C40 80 33 78 29 74L24 69C22 66 21 63 21 59V44C21 40 22 37 24 34Z"
          fill="#17232e"
          stroke="#60778f"
          strokeWidth="0.42"
        />
        <path
          d="M33 31C36 27.5 42 26 50 26C58 26 64 27.5 67 31L71 36C72.5 38 73 40.5 73 44.5V58.5C73 62.5 72.5 65 71 67L67 71C64 74.5 58 76 50 76C42 76 36 74.5 33 71L29 67C27.5 65 27 62.5 27 58.5V44.5C27 40.5 27.5 38 29 36Z"
          fill="none"
          stroke="#879bb0"
          strokeWidth="0.22"
          strokeDasharray="0.8 1.2"
          opacity="0.5"
        />
        <text
          x="50"
          y="31"
          fill="#d1dceb"
          fontSize="2"
          fontWeight="700"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          North Stand
        </text>
        <text
          x="50"
          y="73.5"
          fill="#d1dceb"
          fontSize="2"
          fontWeight="700"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          South Stand
        </text>
        <text
          x="78.5"
          y="56"
          fill="#d1dceb"
          fontSize="1.8"
          fontWeight="700"
          textAnchor="middle"
          transform="rotate(90 78.5 56)"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          East Stand
        </text>
        <text
          x="72"
          y="66.5"
          fill="#d1dceb"
          fontSize="1.8"
          fontWeight="600"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          Section 112
        </text>
      </g>

      <g id="zone-restricted" data-zone-layer="restricted">
        <rect
          x="32"
          y="33"
          width="36"
          height="32"
          rx="2.5"
          fill="#143321"
          stroke="#6ca06d"
          strokeWidth="0.4"
        />
        <line x1="50" y1="33" x2="50" y2="65" stroke="#dbe7d7" strokeWidth="0.26" opacity="0.82" />
        <circle cx="50" cy="49" r="3.4" fill="none" stroke="#dbe7d7" strokeWidth="0.26" opacity="0.82" />
        <rect x="32.8" y="41.2" width="6.2" height="15.4" fill="none" stroke="#dbe7d7" strokeWidth="0.24" opacity="0.82" />
        <rect x="61" y="41.2" width="6.2" height="15.4" fill="none" stroke="#dbe7d7" strokeWidth="0.24" opacity="0.82" />
        <rect x="32.8" y="45.2" width="1.8" height="7.4" fill="none" stroke="#dbe7d7" strokeWidth="0.22" opacity="0.82" />
        <rect x="65.4" y="45.2" width="1.8" height="7.4" fill="none" stroke="#dbe7d7" strokeWidth="0.22" opacity="0.82" />
        <rect x="31.3" y="46.2" width="1.5" height="5.4" fill="none" stroke="#dbe7d7" strokeWidth="0.2" opacity="0.82" />
        <rect x="67.2" y="46.2" width="1.5" height="5.4" fill="none" stroke="#dbe7d7" strokeWidth="0.2" opacity="0.82" />
        <line x1="31.5" y1="49" x2="32.8" y2="49" stroke="#dbe7d7" strokeWidth="0.26" opacity="0.82" />
        <line x1="67.2" y1="49" x2="68.5" y2="49" stroke="#dbe7d7" strokeWidth="0.26" opacity="0.82" />
        <text
          x="50"
          y="49.8"
          fill="#d5f1d5"
          fontSize="2.1"
          fontWeight="700"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          Pitch
        </text>
      </g>

      <g opacity="0.42" stroke="#2d3c4d" strokeWidth="0.5">
        <line x1="18.5" y1="50" x2="81.5" y2="50" />
      </g>
    </svg>
  );
}
