import React from 'react';

interface CoastalPalmTreesProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export function CoastalPalmTrees({
  className = '',
  width = '100%',
  height = '100%',
}: CoastalPalmTreesProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 280 170"
      preserveAspectRatio="xMaxYMax slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-700 ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Ambient Oceanic Horizon Glow (Bottom-Right Corner Light Source) */}
        <radialGradient
          id="coastalCornerAura"
          cx="88%"
          cy="88%"
          r="70%"
          fx="92%"
          fy="92%"
        >
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.22" />
          <stop offset="35%" stopColor="#0284C7" stopOpacity="0.12" />
          <stop offset="70%" stopColor="#0369A1" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#070C15" stopOpacity="0" />
        </radialGradient>

        {/* Low Coastal Sun/Moon Aura */}
        <radialGradient
          id="coastalMoonGlow"
          cx="50%"
          cy="50%"
          r="50%"
          fx="50%"
          fy="50%"
        >
          <stop offset="0%" stopColor="#7DD3FC" stopOpacity="0.25" />
          <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#070C15" stopOpacity="0" />
        </radialGradient>

        {/* Primary Palm Trunk Gradient */}
        <linearGradient id="primaryTrunkGrad" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#0284C7" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0.9" />
        </linearGradient>

        {/* Secondary Palm Trunk Gradient */}
        <linearGradient id="secondaryTrunkGrad" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#0369A1" stopOpacity="0.75" />
          <stop offset="60%" stopColor="#0284C7" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.8" />
        </linearGradient>

        {/* High-Contrast Palm Fronds Gradient - Cyan & Azure */}
        <linearGradient id="frondGradCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.95" />
          <stop offset="30%" stopColor="#38BDF8" stopOpacity="0.85" />
          <stop offset="75%" stopColor="#0284C7" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0369A1" stopOpacity="0.25" />
        </linearGradient>

        {/* Deep Fronds Gradient for Under-layer depth */}
        <linearGradient id="frondGradDeep" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.75" />
          <stop offset="50%" stopColor="#0284C7" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#075985" stopOpacity="0.2" />
        </linearGradient>

        {/* Ocean Wave Sweeps Gradient */}
        <linearGradient id="waveSwellGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.0" />
          <stop offset="40%" stopColor="#38BDF8" stopOpacity="0.35" />
          <stop offset="75%" stopColor="#7DD3FC" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.2" />
        </linearGradient>

        {/* Shoreline Sand Dune Gradient */}
        <linearGradient id="shorelineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0284C7" stopOpacity="0.0" />
          <stop offset="60%" stopColor="#0284C7" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* ========================================================
          1. BACKGROUND ATMOSPHERE & OCEAN HORIZON
          ======================================================== */}
      {/* Corner Oceanic Radial Light */}
      <rect width="280" height="170" fill="url(#coastalCornerAura)" />

      {/* Low Coastal Sun/Moon Halo (Minimal Art) */}
      <circle cx="215" cy="52" r="32" fill="url(#coastalMoonGlow)" />
      <circle
        cx="215"
        cy="52"
        r="18"
        stroke="#7DD3FC"
        strokeWidth="0.75"
        strokeOpacity="0.35"
        strokeDasharray="3 3"
      />

      {/* ========================================================
          2. MINIMALIST OCEANSIDE ART: SOARING SEAGULLS & PIER
          ======================================================== */}
      {/* Soaring Coastal Gulls (Fluid Curved Wings) */}
      {/* Gull 1 - Upper right sky */}
      <path
        d="M 172 26 C 175 22, 179 22, 183 26 C 187 22, 191 22, 194 26"
        stroke="#BAE6FD"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.8"
      />
      {/* Gull 2 - Higher, banking slightly left */}
      <path
        d="M 152 17 C 154.5 14, 157.5 14, 160 17.5 C 162.5 14, 165.5 14, 168 17"
        stroke="#38BDF8"
        strokeWidth="1.0"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.65"
      />
      {/* Gull 3 - Distant ocean horizon */}
      <path
        d="M 198 38 C 200 36, 202 36, 204 38.5 C 206 36, 208 36, 210 38"
        stroke="#38BDF8"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.45"
      />

      {/* Iconic Oceanside Pier Silhouette Line (Minimal Architectural Art) */}
      <line
        x1="120"
        y1="148"
        x2="185"
        y2="148"
        stroke="#38BDF8"
        strokeWidth="0.9"
        strokeOpacity="0.35"
      />
      {/* Pier Pilings */}
      <line x1="128" y1="148" x2="128" y2="153" stroke="#38BDF8" strokeWidth="0.75" strokeOpacity="0.25" />
      <line x1="140" y1="148" x2="140" y2="153" stroke="#38BDF8" strokeWidth="0.75" strokeOpacity="0.25" />
      <line x1="152" y1="148" x2="152" y2="153" stroke="#38BDF8" strokeWidth="0.75" strokeOpacity="0.25" />
      <line x1="164" y1="148" x2="164" y2="153" stroke="#38BDF8" strokeWidth="0.75" strokeOpacity="0.25" />
      <line x1="176" y1="148" x2="176" y2="153" stroke="#38BDF8" strokeWidth="0.75" strokeOpacity="0.25" />
      {/* Small Pier End Lifeguard Tower Silhouette */}
      <path
        d="M 181 148 L 181 144 L 185 144 L 185 148 Z"
        fill="#38BDF8"
        opacity="0.3"
      />

      {/* ========================================================
          3. MINIMALIST OCEAN WAVES & SWELLS
          ======================================================== */}
      {/* Primary Ocean Swell */}
      <path
        d="M 60 156 C 95 150, 130 162, 170 154 C 210 146, 245 160, 280 152"
        stroke="url(#waveSwellGrad)"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Secondary Wave Swell */}
      <path
        d="M 90 163 C 125 158, 160 168, 200 161 C 235 155, 260 164, 280 160"
        stroke="url(#waveSwellGrad)"
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
      />
      {/* Tertiary Beach Break Ripple */}
      <path
        d="M 130 168 C 160 165, 195 171, 230 167 C 255 164, 270 168, 280 166"
        stroke="#7DD3FC"
        strokeWidth="0.8"
        strokeOpacity="0.3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Coastal Shoreline Contour */}
      <path
        d="M 160 170 C 195 165, 240 162, 280 165 L 280 170 Z"
        fill="url(#shorelineGrad)"
      />

      {/* ========================================================
          4. ENLARGED PALM TREES EMERGING FROM RIGHT DOWN SIDE
          Roots originate at bottom right: x=250-280, y=170
          ======================================================== */}

      {/* ----- PALM 1: TALL MAJESTIC CALIFORNIA FAN PALM ----- */}
      {/* Deep Shadow Trunk Underlayer */}
      <path
        d="M 262 170 C 259 135, 248 88, 214 36 C 211 36, 209 37, 207 38 C 242 90, 252 136, 255 170 Z"
        fill="url(#primaryTrunkGrad)"
        opacity="0.9"
      />
      {/* Trunk Highlight Spine */}
      <path
        d="M 258 170 C 255 136, 245 89, 211 37"
        stroke="#BAE6FD"
        strokeWidth="1.0"
        strokeOpacity="0.65"
        fill="none"
      />
      {/* Natural Trunk Segment Rings */}
      <line x1="255" y1="162" x2="260" y2="162" stroke="#BAE6FD" strokeWidth="1.0" strokeOpacity="0.75" />
      <line x1="252" y1="150" x2="257" y2="150" stroke="#BAE6FD" strokeWidth="1.0" strokeOpacity="0.75" />
      <line x1="249" y1="138" x2="254" y2="138" stroke="#BAE6FD" strokeWidth="0.9" strokeOpacity="0.7" />
      <line x1="245" y1="126" x2="250" y2="126" stroke="#BAE6FD" strokeWidth="0.9" strokeOpacity="0.7" />
      <line x1="241" y1="114" x2="246" y2="114" stroke="#BAE6FD" strokeWidth="0.9" strokeOpacity="0.7" />
      <line x1="236" y1="102" x2="241" y2="102" stroke="#BAE6FD" strokeWidth="0.8" strokeOpacity="0.65" />
      <line x1="231" y1="90" x2="235" y2="90" stroke="#BAE6FD" strokeWidth="0.8" strokeOpacity="0.65" />
      <line x1="226" y1="78" x2="230" y2="78" stroke="#BAE6FD" strokeWidth="0.8" strokeOpacity="0.6" />
      <line x1="221" y1="65" x2="225" y2="65" stroke="#BAE6FD" strokeWidth="0.75" strokeOpacity="0.6" />
      <line x1="216" y1="52" x2="219" y2="52" stroke="#BAE6FD" strokeWidth="0.75" strokeOpacity="0.55" />

      {/* --- CROWN OF PALM 1 (Center at x=211, y=36) --- */}
      {/* Frond 1: Giant Arch Sweeping Left (framing top of slogan) */}
      <path
        d="M 211 36 C 175 16, 120 25, 82 54 C 118 42, 172 38, 211 36 Z"
        fill="url(#frondGradCyan)"
      />
      <path
        d="M 211 36 C 175 16, 120 25, 82 54"
        stroke="#BAE6FD"
        strokeWidth="1.2"
        strokeOpacity="0.8"
        fill="none"
      />
      {/* Individual pinnate frond leaflets along Frond 1 */}
      <line x1="170" y1="23" x2="160" y2="35" stroke="#38BDF8" strokeWidth="0.9" strokeOpacity="0.7" />
      <line x1="150" y1="25" x2="138" y2="39" stroke="#38BDF8" strokeWidth="0.9" strokeOpacity="0.7" />
      <line x1="130" y1="31" x2="116" y2="46" stroke="#38BDF8" strokeWidth="0.8" strokeOpacity="0.65" />
      <line x1="110" y1="41" x2="96" y2="54" stroke="#38BDF8" strokeWidth="0.8" strokeOpacity="0.6" />

      {/* Frond 2: Upper High Plume (reaching towards top left) */}
      <path
        d="M 211 36 C 180 6, 142 8, 118 24 C 145 18, 185 24, 211 36 Z"
        fill="url(#frondGradDeep)"
      />
      <path
        d="M 211 36 C 180 6, 142 8, 118 24"
        stroke="#7DD3FC"
        strokeWidth="1.1"
        strokeOpacity="0.75"
        fill="none"
      />
      <line x1="172" y1="12" x2="164" y2="24" stroke="#7DD3FC" strokeWidth="0.85" strokeOpacity="0.65" />
      <line x1="150" y1="12" x2="140" y2="25" stroke="#7DD3FC" strokeWidth="0.85" strokeOpacity="0.65" />

      {/* Frond 3: Pinnacle Crown (soaring high center) */}
      <path
        d="M 211 36 C 205 14, 192 2, 178 0 C 189 12, 198 24, 211 36 Z"
        fill="url(#frondGradCyan)"
      />
      <path
        d="M 211 36 C 205 14, 192 2, 178 0"
        stroke="#BAE6FD"
        strokeWidth="1.1"
        strokeOpacity="0.8"
        fill="none"
      />

      {/* Frond 4: High Right Crest Plume */}
      <path
        d="M 211 36 C 224 12, 238 2, 252 0 C 242 12, 230 24, 211 36 Z"
        fill="url(#frondGradCyan)"
      />
      <path
        d="M 211 36 C 224 12, 238 2, 252 0"
        stroke="#BAE6FD"
        strokeWidth="1.1"
        strokeOpacity="0.8"
        fill="none"
      />

      {/* Frond 5: Upper Right Arch (spreading across upper right edge) */}
      <path
        d="M 211 36 C 238 15, 264 16, 280 26 C 262 26, 240 32, 211 36 Z"
        fill="url(#frondGradDeep)"
      />
      <path
        d="M 211 36 C 238 15, 264 16, 280 26"
        stroke="#7DD3FC"
        strokeWidth="1.1"
        strokeOpacity="0.75"
        fill="none"
      />

      {/* Frond 6: Far Right Drooping Frond */}
      <path
        d="M 211 36 C 244 32, 270 44, 280 62 C 265 50, 242 46, 211 36 Z"
        fill="url(#frondGradCyan)"
      />
      <path
        d="M 211 36 C 244 32, 270 44, 280 62"
        stroke="#BAE6FD"
        strokeWidth="1.1"
        strokeOpacity="0.8"
        fill="none"
      />

      {/* Frond 7: Center-Right Droop */}
      <path
        d="M 211 36 C 238 46, 258 64, 268 88 C 254 68, 236 56, 211 36 Z"
        fill="url(#frondGradDeep)"
      />

      {/* Frond 8: Lower Left Droop (towards slogan) */}
      <path
        d="M 211 36 C 182 45, 155 64, 138 88 C 160 68, 188 54, 211 36 Z"
        fill="url(#frondGradCyan)"
      />
      <path
        d="M 211 36 C 182 45, 155 64, 138 88"
        stroke="#BAE6FD"
        strokeWidth="1.1"
        strokeOpacity="0.8"
        fill="none"
      />

      {/* Frond 9: Center Drooping Palm Leaves */}
      <path
        d="M 211 36 C 200 55, 196 78, 192 102 C 202 78, 208 58, 211 36 Z"
        fill="url(#frondGradDeep)"
      />

      {/* ----- PALM 2: SISTER PALM (EMERGING FROM BOTTOM RIGHT) ----- */}
      {/* Rooted at x=275, y=170, curves to x=252, y=74 */}
      <path
        d="M 276 170 C 274 142, 268 108, 254 74 C 251 74, 249 75, 247 76 C 261 108, 267 142, 270 170 Z"
        fill="url(#secondaryTrunkGrad)"
        opacity="0.85"
      />
      <path
        d="M 272 170 C 270 142, 264 108, 250 75"
        stroke="#7DD3FC"
        strokeWidth="0.85"
        strokeOpacity="0.6"
        fill="none"
      />
      {/* Segment Rings for Sister Palm */}
      <line x1="268" y1="158" x2="273" y2="158" stroke="#7DD3FC" strokeWidth="0.8" strokeOpacity="0.65" />
      <line x1="265" y1="144" x2="270" y2="144" stroke="#7DD3FC" strokeWidth="0.8" strokeOpacity="0.65" />
      <line x1="262" y1="130" x2="267" y2="130" stroke="#7DD3FC" strokeWidth="0.8" strokeOpacity="0.6" />
      <line x1="258" y1="116" x2="263" y2="116" stroke="#7DD3FC" strokeWidth="0.75" strokeOpacity="0.6" />
      <line x1="254" y1="102" x2="258" y2="102" stroke="#7DD3FC" strokeWidth="0.75" strokeOpacity="0.55" />
      <line x1="250" y1="88" x2="254" y2="88" stroke="#7DD3FC" strokeWidth="0.7" strokeOpacity="0.5" />

      {/* --- CROWN OF PALM 2 (Center at x=250, y=75) --- */}
      {/* Frond S1: Arching Left across lower center */}
      <path
        d="M 250 75 C 224 64, 195 72, 175 88 C 202 78, 230 76, 250 75 Z"
        fill="url(#frondGradCyan)"
        opacity="0.9"
      />
      <path
        d="M 250 75 C 224 64, 195 72, 175 88"
        stroke="#BAE6FD"
        strokeWidth="1.0"
        strokeOpacity="0.75"
        fill="none"
      />

      {/* Frond S2: Upper Left Plume */}
      <path
        d="M 250 75 C 230 52, 212 48, 196 52 C 215 56, 235 64, 250 75 Z"
        fill="url(#frondGradDeep)"
        opacity="0.85"
      />

      {/* Frond S3: High Plume */}
      <path
        d="M 250 75 C 245 54, 240 42, 234 35 C 242 46, 247 58, 250 75 Z"
        fill="url(#frondGradCyan)"
        opacity="0.9"
      />

      {/* Frond S4: Upper Right Arch */}
      <path
        d="M 250 75 C 264 56, 275 52, 280 50 C 274 60, 265 68, 250 75 Z"
        fill="url(#frondGradCyan)"
        opacity="0.85"
      />

      {/* Frond S5: Right Drop */}
      <path
        d="M 250 75 C 266 70, 276 80, 280 94 C 274 84, 264 80, 250 75 Z"
        fill="url(#frondGradDeep)"
        opacity="0.85"
      />

      {/* Frond S6: Lower Droop */}
      <path
        d="M 250 75 C 240 92, 232 108, 222 124 C 234 106, 244 92, 250 75 Z"
        fill="url(#frondGradCyan)"
        opacity="0.9"
      />

      {/* ----- PALM 3: YOUNG COASTAL COCONUT SHOOT (BOTTOM RIGHT ANCHOR) ----- */}
      {/* Rooted at x=265, y=170, small trunk to x=248, y=135 */}
      <path
        d="M 264 170 C 262 155, 256 142, 248 135 C 246 136, 245 137, 244 138 C 251 144, 256 156, 258 170 Z"
        fill="url(#secondaryTrunkGrad)"
        opacity="0.75"
      />
      {/* Small Fronds at x=248, y=135 */}
      <path
        d="M 248 135 C 232 125, 214 130, 202 140 C 218 134, 235 133, 248 135 Z"
        fill="url(#frondGradCyan)"
        opacity="0.8"
      />
      <path
        d="M 248 135 C 238 118, 225 112, 215 112 C 228 118, 239 126, 248 135 Z"
        fill="url(#frondGradDeep)"
        opacity="0.75"
      />
      <path
        d="M 248 135 C 258 122, 270 120, 280 122 C 270 126, 260 130, 248 135 Z"
        fill="url(#frondGradCyan)"
        opacity="0.8"
      />
      <path
        d="M 248 135 C 242 146, 236 156, 228 164 C 236 152, 242 144, 248 135 Z"
        fill="url(#frondGradDeep)"
        opacity="0.75"
      />

      {/* ========================================================
          5. SUBTLE COASTAL STARS / SPARKLE ACCENTS
          ======================================================== */}
      {/* Micro-sparkle cross in the night sky */}
      <g opacity="0.6">
        <line x1="140" y1="42" x2="140" y2="48" stroke="#BAE6FD" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="137" y1="45" x2="143" y2="45" stroke="#BAE6FD" strokeWidth="0.8" strokeLinecap="round" />
        <circle cx="140" cy="45" r="0.8" fill="#BAE6FD" />
      </g>
      <g opacity="0.45">
        <line x1="195" y1="12" x2="195" y2="16" stroke="#BAE6FD" strokeWidth="0.6" strokeLinecap="round" />
        <line x1="193" y1="14" x2="197" y2="14" stroke="#BAE6FD" strokeWidth="0.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function MicroPalmTree({
  className = '',
  size = 13,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2C12 2 10.5 5 12 7.5C10 5.5 6 5 4 6.5C6 7.5 8 9 10 9C7.5 9 5 10.5 4 12C6.5 12 9 11.5 11 10.5C9.5 12 8.5 14 8 16C9.5 14.5 11 13 12 11.5C12.5 15.5 12 19 11.5 22H13.5C14 18.5 14 15 13.5 11.5C14.5 13 16 14.5 17.5 16C17 14 16 12 14.5 10.5C16.5 11.5 19 12 21.5 12C20.5 10.5 18 9 15.5 9C17.5 9 19.5 7.5 21.5 6.5C19.5 5 15.5 5.5 13.5 7.5C15 5 13.5 2 13.5 2L12 2Z" />
    </svg>
  );
}

export default CoastalPalmTrees;
