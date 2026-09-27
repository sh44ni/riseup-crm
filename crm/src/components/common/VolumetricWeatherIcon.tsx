import React from 'react';
import { WeatherConditionKey } from '@/api/weatherApi';

export interface VolumetricWeatherIconProps {
  condition: WeatherConditionKey;
  size?: number;
  className?: string;
}

/**
 * High-end Volumetric 3D Weather Icon
 * Styled after modern Apple / Google tactile meteorological design
 * with warm volumetric gradients, depth shadows, and soft ambient glows.
 */
export function VolumetricWeatherIcon({
  condition,
  size = 48,
  className = '',
}: VolumetricWeatherIconProps) {
  const uid = React.useId().replace(/:/g, '');

  switch (condition) {
    // 1. CLEAR NIGHT
    case 'clear_night':
      return (
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          className={`shrink-0 select-none ${className}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`moonGrad_${uid}`} x1="14" y1="10" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C7D2FE" />
              <stop offset="45%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
            <linearGradient id={`starGrad_${uid}`} x1="42" y1="12" x2="54" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <filter id={`moonShadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#4338CA" floodOpacity="0.45" />
            </filter>
          </defs>
          {/* Crescent Moon */}
          <path
            d="M38 12C25.8497 12 16 21.8497 16 34C16 46.1503 25.8497 56 38 56C42.7937 56 47.2343 54.467 50.8413 51.8749C40.6726 50.8841 32.6667 42.3789 32.6667 32C32.6667 21.6211 40.6726 13.1159 50.8413 12.1251C47.2343 9.53298 42.7937 8 38 8V12Z"
            fill={`url(#moonGrad_${uid})`}
            filter={`url(#moonShadow_${uid})`}
          />
          {/* Crater accents */}
          <circle cx="28" cy="30" r="3" fill="#6366F1" fillOpacity="0.4" />
          <circle cx="34" cy="42" r="2" fill="#6366F1" fillOpacity="0.3" />
          {/* Twinkling Star */}
          <path
            d="M48 10L49.5 14.5L54 16L49.5 17.5L48 22L46.5 17.5L42 16L46.5 14.5L48 10Z"
            fill={`url(#starGrad_${uid})`}
            filter="drop-shadow(0 2px 4px rgba(245,158,11,0.5))"
          />
        </svg>
      );

    // 2. PARTLY CLOUDY (Exact match to user reference image!)
    case 'partly_cloudy':
      return (
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          className={`shrink-0 select-none ${className}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Rich Amber/Orange Sun Gradient */}
            <linearGradient id={`sunGrad_${uid}`} x1="20" y1="8" x2="48" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFB300" />
              <stop offset="45%" stopColor="#FF8F00" />
              <stop offset="85%" stopColor="#F57C00" />
              <stop offset="100%" stopColor="#E65100" />
            </linearGradient>
            {/* Pillowy White Volumetric Cloud Gradient */}
            <linearGradient id={`cloudGrad_${uid}`} x1="16" y1="26" x2="48" y2="54" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="65%" stopColor="#F8FAFC" />
              <stop offset="90%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
            <filter id={`sunGlow_${uid}`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#E65100" floodOpacity="0.4" />
            </filter>
            <filter id={`cloudShadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.22" />
            </filter>
          </defs>

          {/* 3D Scalloped Sun (Volumetric corona petals behind cloud) */}
          <g filter={`url(#sunGlow_${uid})`}>
            {/* Scalloped corona petals shape matching reference image */}
            <circle cx="36" cy="22" r="14" fill={`url(#sunGrad_${uid})`} />
            <circle cx="36" cy="11" r="5" fill={`url(#sunGrad_${uid})`} />
            <circle cx="45" cy="15" r="5" fill={`url(#sunGrad_${uid})`} />
            <circle cx="48" cy="24" r="5" fill={`url(#sunGrad_${uid})`} />
            <circle cx="44" cy="33" r="5" fill={`url(#sunGrad_${uid})`} />
            <circle cx="35" cy="36" r="5" fill={`url(#sunGrad_${uid})`} />
            <circle cx="26" cy="32" r="5" fill={`url(#sunGrad_${uid})`} />
            <circle cx="23" cy="22" r="5" fill={`url(#sunGrad_${uid})`} />
            <circle cx="28" cy="14" r="5" fill={`url(#sunGrad_${uid})`} />
            {/* Inner warm sun specular highlight */}
            <circle cx="33" cy="18" r="7" fill="#FFE082" fillOpacity="0.35" />
          </g>

          {/* Pillowy Soft Volumetric Cloud in Front */}
          <g filter={`url(#cloudShadow_${uid})`}>
            {/* Smooth rounded cloud puff lobes */}
            <path
              d="M20 50C15.5817 50 12 46.4183 12 42C12 37.95 15.006 34.603 19.0065 34.07C20.4076 27.247 26.4357 22 33.6 22C41.774 22 48.4 28.626 48.4 36.8C51.622 37.669 54 40.589 54 44C54 47.866 50.866 51 47 51L20 50Z"
              fill={`url(#cloudGrad_${uid})`}
            />
            {/* Cloud specular top rim shine */}
            <path
              d="M33.6 24C27.5 24 22.3 28.5 20.8 34.5C21.6 34.2 22.5 34 23.5 34C28 34 32 37 33 41.5C34.5 41.2 36 41 37.5 41C43 41 47.5 45.2 47.9 50.5C50.8 49.8 52.8 47.2 52.8 44C52.8 40.7 50.6 37.9 47.4 37.1C47.1 29.8 41.1 24 33.6 24Z"
              fill="#FFFFFF"
              fillOpacity="0.6"
            />
          </g>
        </svg>
      );

    // 3. CLOUDY (Overcast)
    case 'cloudy':
      return (
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          className={`shrink-0 select-none ${className}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`backCloudGrad_${uid}`} x1="20" y1="16" x2="48" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#64748B" />
            </linearGradient>
            <linearGradient id={`frontCloudGrad_${uid}`} x1="14" y1="26" x2="48" y2="54" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
            <filter id={`cloudShadow2_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.22" />
            </filter>
          </defs>
          {/* Back Cloud */}
          <path
            d="M26 38C22.6863 38 20 35.3137 20 32C20 28.9625 22.2545 26.4522 25.2549 26.0525C26.3057 20.9352 30.8268 17 36.2 17C42.3305 17 47.3 21.9695 47.3 28.1C49.7165 28.7517 51.5 30.9417 51.5 33.5C51.5 36.3995 49.1495 38.75 46.25 38.75L26 38Z"
            fill={`url(#backCloudGrad_${uid})`}
          />
          {/* Front Cloud */}
          <path
            d="M18 52C13.5817 52 10 48.4183 10 44C10 39.95 13.006 36.603 17.0065 36.07C18.4076 29.247 24.4357 24 31.6 24C39.774 24 46.4 30.626 46.4 38.8C49.622 39.669 52 42.589 52 46C52 49.866 48.866 53 45 53L18 52Z"
            fill={`url(#frontCloudGrad_${uid})`}
            filter={`url(#cloudShadow2_${uid})`}
          />
        </svg>
      );

    // 4. RAIN
    case 'rain':
      return (
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          className={`shrink-0 select-none ${className}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`rainCloudGrad_${uid}`} x1="16" y1="18" x2="48" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#CBD5E1" />
              <stop offset="50%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#64748B" />
            </linearGradient>
            <linearGradient id={`dropGrad_${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <filter id={`rainShadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.25" />
            </filter>
          </defs>
          {/* Main Cloud */}
          <path
            d="M18 42C13.5817 42 10 38.4183 10 34C10 29.95 13.006 26.603 17.0065 26.07C18.4076 19.247 24.4357 14 31.6 14C39.774 14 46.4 20.626 46.4 28.8C49.622 29.669 52 32.589 52 36C52 39.866 48.866 43 45 43L18 42Z"
            fill={`url(#rainCloudGrad_${uid})`}
            filter={`url(#rainShadow_${uid})`}
          />
          {/* Glossy Raindrops */}
          <path d="M22 47L19 54" stroke={`url(#dropGrad_${uid})`} strokeWidth="3" strokeLinecap="round" />
          <path d="M32 48L29 57" stroke={`url(#dropGrad_${uid})`} strokeWidth="3" strokeLinecap="round" />
          <path d="M42 47L39 55" stroke={`url(#dropGrad_${uid})`} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    // 5. THUNDERSTORM
    case 'thunderstorm':
      return (
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          className={`shrink-0 select-none ${className}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`stormCloudGrad_${uid}`} x1="16" y1="14" x2="48" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#64748B" />
              <stop offset="70%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>
            <linearGradient id={`boltGrad_${uid}`} x1="30" y1="32" x2="36" y2="58" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFF59D" />
              <stop offset="40%" stopColor="#FFEB3B" />
              <stop offset="100%" stopColor="#F57F17" />
            </linearGradient>
            <filter id={`boltGlow_${uid}`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#F57F17" floodOpacity="0.75" />
            </filter>
          </defs>
          {/* Dark Storm Cloud */}
          <path
            d="M18 40C13.5817 40 10 36.4183 10 32C10 27.95 13.006 24.603 17.0065 24.07C18.4076 17.247 24.4357 12 31.6 12C39.774 12 46.4 18.626 46.4 26.8C49.622 27.669 52 30.589 52 34C52 37.866 48.866 41 45 41L18 40Z"
            fill={`url(#stormCloudGrad_${uid})`}
          />
          {/* Glowing Lightning Bolt */}
          <path
            d="M34 30L26 43H33L30 56L42 41H35L38 30H34Z"
            fill={`url(#boltGrad_${uid})`}
            filter={`url(#boltGlow_${uid})`}
          />
        </svg>
      );

    // 6. SNOW
    case 'snow':
      return (
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          className={`shrink-0 select-none ${className}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`snowCloudGrad_${uid}`} x1="16" y1="18" x2="48" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E2E8F0" />
              <stop offset="60%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>
            <filter id={`snowShadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.2" />
            </filter>
          </defs>
          <path
            d="M18 40C13.5817 40 10 36.4183 10 32C10 27.95 13.006 24.603 17.0065 24.07C18.4076 17.247 24.4357 12 31.6 12C39.774 12 46.4 18.626 46.4 26.8C49.622 27.669 52 30.589 52 34C52 37.866 48.866 41 45 41L18 40Z"
            fill={`url(#snowCloudGrad_${uid})`}
            filter={`url(#snowShadow_${uid})`}
          />
          {/* Crystalline Snowflakes */}
          <circle cx="21" cy="49" r="2.5" fill="#7DD3FC" />
          <circle cx="32" cy="54" r="3" fill="#BAE6FD" />
          <circle cx="43" cy="49" r="2.5" fill="#7DD3FC" />
        </svg>
      );

    // 7. FOG / MIST
    case 'fog':
      return (
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          className={`shrink-0 select-none ${className}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`fogGrad_${uid}`} x1="16" y1="20" x2="48" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>
          </defs>
          {/* Cloud top */}
          <path
            d="M20 34C16.6863 34 14 31.3137 14 28C14 24.9625 16.2545 22.4522 19.2549 22.0525C20.3057 16.9352 24.8268 13 30.2 13C36.3305 13 41.3 17.9695 41.3 24.1C43.7165 24.7517 45.5 26.9417 45.5 29.5C45.5 32.3995 43.1495 34.75 40.25 34.75L20 34Z"
            fill={`url(#fogGrad_${uid})`}
          />
          {/* Rounded Mist Bands */}
          <rect x="14" y="38" width="36" height="4" rx="2" fill="#2DD4BF" fillOpacity="0.85" />
          <rect x="18" y="45" width="28" height="4" rx="2" fill="#5EEAD4" fillOpacity="0.85" />
          <rect x="22" y="52" width="20" height="3.5" rx="1.75" fill="#99F6E4" fillOpacity="0.8" />
        </svg>
      );

    // 8. WINDY / BREEZE
    case 'windy':
      return (
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          className={`shrink-0 select-none ${className}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`windGrad_${uid}`} x1="12" y1="20" x2="52" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#5EEAD4" />
              <stop offset="100%" stopColor="#0D9488" />
            </linearGradient>
          </defs>
          <path
            d="M12 24H42C45.3137 24 48 21.3137 48 18C48 14.6863 45.3137 12 42 12C38.6863 12 36 14.6863 36 18"
            stroke={`url(#windGrad_${uid})`}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M16 34H48C51.3137 34 54 31.3137 54 28C54 24.6863 51.3137 22 48 22C44.6863 22 42 24.6863 42 28"
            stroke={`url(#windGrad_${uid})`}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M10 44H36C39.3137 44 42 46.6863 42 50C42 53.3137 39.3137 56 36 56C32.6863 56 30 53.3137 30 50"
            stroke={`url(#windGrad_${uid})`}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      );

    // 9. SUNNY (Vibrant, warm, rich volumetric 3D sun)
    case 'sunny':
    default:
      return (
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          className={`shrink-0 select-none ${className}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Rich multi-stop warm golden-orange gradient */}
            <radialGradient
              id={`sunnyRadial_${uid}`}
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(26 24) rotate(48) scale(26)"
            >
              <stop offset="0%" stopColor="#FFF176" />
              <stop offset="30%" stopColor="#FFD54F" />
              <stop offset="65%" stopColor="#FF9800" />
              <stop offset="100%" stopColor="#F57C00" />
            </radialGradient>
            <linearGradient id={`rayGrad_${uid}`} x1="32" y1="6" x2="32" y2="58" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFA000" />
              <stop offset="100%" stopColor="#FF6D00" />
            </linearGradient>
            <filter id={`sunnyGlow_${uid}`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#FF6D00" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Scalloped / Puffy Corona Petals (Matching the reference aesthetic!) */}
          <g filter={`url(#sunnyGlow_${uid})`}>
            {/* Puffy Petals Circle */}
            <circle cx="32" cy="12" r="6" fill={`url(#rayGrad_${uid})`} />
            <circle cx="46" cy="18" r="6" fill={`url(#rayGrad_${uid})`} />
            <circle cx="52" cy="32" r="6" fill={`url(#rayGrad_${uid})`} />
            <circle cx="46" cy="46" r="6" fill={`url(#rayGrad_${uid})`} />
            <circle cx="32" cy="52" r="6" fill={`url(#rayGrad_${uid})`} />
            <circle cx="18" cy="46" r="6" fill={`url(#rayGrad_${uid})`} />
            <circle cx="12" cy="32" r="6" fill={`url(#rayGrad_${uid})`} />
            <circle cx="18" cy="18" r="6" fill={`url(#rayGrad_${uid})`} />

            {/* Central Sun Sphere */}
            <circle cx="32" cy="32" r="18" fill={`url(#sunnyRadial_${uid})`} />
            {/* Inner specular shine */}
            <circle cx="27" cy="26" r="8" fill="#FFFFFF" fillOpacity="0.3" />
          </g>
        </svg>
      );
  }
}
