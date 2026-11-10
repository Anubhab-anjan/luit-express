// side view of a Luit Express coach on the Brahmaputra valley road
export default function BusArt({ className = '' }) {
  return (
    <svg viewBox="0 0 520 300" className={className} role="img" aria-label="A Luit Express bus driving past hills">
      <circle cx="410" cy="70" r="34" fill="#c8d8e4" />
      <path d="M0 210 L90 120 L160 190 L250 90 L360 200 L440 140 L520 210 Z" fill="#c8d8e4" />
      <path d="M0 225 L70 170 L140 215 L230 150 L330 220 L420 175 L520 225 Z" fill="#52ab98" opacity=".55" />
      <rect x="0" y="212" width="520" height="62" fill="#2b6777" />
      <path d="M0 243 H520" stroke="#c8d8e4" strokeWidth="3" strokeDasharray="22 16" />
      {/* body */}
      <rect x="95" y="118" width="300" height="100" rx="14" fill="#fff" />
      <path d="M95 190 H395 V204 a14 14 0 0 1 -14 14 H109 a14 14 0 0 1 -14 -14 Z" fill="#2b6777" />
      <rect x="95" y="176" width="300" height="9" fill="#52ab98" />
      {[112, 160, 208, 256, 304].map((x) => (
        <rect key={x} x={x} y="132" width="38" height="36" rx="5" fill="#c8d8e4" />
      ))}
      <path d="M352 132 H384 a8 8 0 0 1 8 8 V168 H352 Z" fill="#c8d8e4" />
      <rect x="388" y="188" width="8" height="10" fill="#f2f2f2" />
      <text x="120" y="204" fontSize="13" fontWeight="700" fill="#fff" fontFamily="Bricolage Grotesque, sans-serif">LUIT EXPRESS</text>
      {[160, 335].map((x) => (
        <g key={x}>
          <circle cx={x} cy="220" r="23" fill="#245764" />
          <circle cx={x} cy="220" r="10" fill="#c8d8e4" />
        </g>
      ))}
    </svg>
  );
}
