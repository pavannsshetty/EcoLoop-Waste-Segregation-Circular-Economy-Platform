const EcoLoopLogo = ({ height = 44, dark = false, className = '' }) => {
  const ecoColor  = dark ? '#4ade80' : '#15803D';
  const loopColor = dark ? '#86efac' : '#22C55E';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 40"
      height={height}
      width={(height / 40) * 160}
      fill="none"
      className={className}
      aria-label="EcoLoop"
      role="img"
    >
      <defs>
        <linearGradient id="loopGradLogo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={ecoColor} />
          <stop offset="100%" stopColor={loopColor} />
        </linearGradient>
      </defs>

      <path
        d="M 8 20 A 12 12 0 1 1 20 32"
        stroke="url(#loopGradLogo)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <polyline
        points="16,29 20,32 17,36"
        stroke="url(#loopGradLogo)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M 20 14 C 20 14 26 16 26 22 C 26 22 20 22 20 14 Z"
        fill={ecoColor}
        opacity="0.9"
      />
      <path
        d="M 20 14 C 20 14 14 16 14 22 C 14 22 20 22 20 14 Z"
        fill={loopColor}
        opacity="0.75"
      />
      <line x1="20" y1="14" x2="20" y2="22" stroke={ecoColor} strokeWidth="1" strokeLinecap="round" />

      <text
        x="38"
        y="26"
        fontFamily="'Inter', 'Segoe UI', Arial, sans-serif"
        fontSize="18"
        fontWeight="700"
        letterSpacing="-0.3"
      >
        <tspan fill={ecoColor}>Eco</tspan>
        <tspan fill={loopColor}>Loop</tspan>
      </text>
    </svg>
  );
};

export default EcoLoopLogo;
