interface TechPatternProps {
  color?: string;
  opacity?: number;
  width: number;
  height: number;
}

export function TechPattern({ color = '#ffffff', opacity = 0.06, width, height }: TechPatternProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        opacity,
        pointerEvents: 'none',
      }}
    >
      {/* Circuit board lines */}
      <path
        d="M20 100 H60 V60 H100 M100 60 V30 H140 M100 60 H140 V100 H180"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M20 140 H50 V170 H90 M90 170 H130 V140 H160 V110"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M60 20 V50 H30 M60 20 H90 V50"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M150 160 H180 V180 M150 160 V190"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Circuit nodes */}
      <circle cx="60" cy="60" r="3" fill={color} />
      <circle cx="100" cy="60" r="3" fill={color} />
      <circle cx="140" cy="100" r="3" fill={color} />
      <circle cx="100" cy="30" r="2.5" fill={color} />
      <circle cx="50" cy="140" r="3" fill={color} />
      <circle cx="90" cy="170" r="3" fill={color} />
      <circle cx="130" cy="140" r="2.5" fill={color} />
      <circle cx="60" cy="20" r="2.5" fill={color} />
      <circle cx="150" cy="160" r="2.5" fill={color} />

      {/* Small squares (chip symbols) */}
      <rect x="135" cy="25" y="25" width="10" height="10" rx="1.5" stroke={color} strokeWidth="1.2" />
      <rect x="25" y="95" width="8" height="8" rx="1.5" stroke={color} strokeWidth="1.2" />
      <rect x="170" y="95" width="8" height="8" rx="1.5" stroke={color} strokeWidth="1.2" />

      {/* Dotted accent lines */}
      <line x1="10" y1="50" x2="10" y2="150" stroke={color} strokeWidth="1" strokeDasharray="3 6" />
      <line x1="190" y1="40" x2="190" y2="160" stroke={color} strokeWidth="1" strokeDasharray="3 6" />
    </svg>
  );
}
