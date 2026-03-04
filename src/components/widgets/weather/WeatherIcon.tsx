// Íconos SVG animados para el Weather Widget.
// viewBox 0 0 100 100 — el tamaño externo lo controla la prop `size`.
// animated=true solo en el ícono hero (96px); false en hourly/daily para mejor rendimiento.

interface WeatherIconProps {
  code: number;
  size: number;
  animated?: boolean;
  isDay?: boolean;
}

type IconType =
  | "sunny"
  | "night"
  | "partly-cloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm";

function getIconType(code: number, isDay: boolean): IconType {
  if (code === 0) return isDay ? "sunny" : "night";
  if ([1, 2].includes(code)) return "partly-cloudy";
  if (code === 3) return "overcast";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55].includes(code)) return "drizzle";
  if ([61, 63, 65, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "overcast";
}

// ── Sub-íconos (retornan hijos SVG, sin <svg> wrapper) ────────────────────────

function SunnyIcon({ animated }: { animated: boolean }) {
  const spinStyle = animated
    ? { animation: "wx-spin-slow 20s linear infinite", transformBox: "fill-box" as const, transformOrigin: "center" }
    : {};
  return (
    <>
      <defs>
        <radialGradient id="sun-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
      </defs>
      {/* Rayos */}
      <g style={spinStyle}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 50 + 34 * Math.cos(rad);
          const y1 = 50 + 34 * Math.sin(rad);
          const x2 = 50 + 46 * Math.cos(rad);
          const y2 = 50 + 46 * Math.sin(rad);
          return (
            <line
              key={angle}
              x1={x1} y1={y1}
              x2={x2} y2={y2}
              stroke="#FCD34D"
              strokeWidth="5"
              strokeLinecap="round"
            />
          );
        })}
      </g>
      {/* Disco central */}
      <circle cx="50" cy="50" r="22" fill="url(#sun-grad)" />
    </>
  );
}

function NightIcon() {
  return (
    <>
      {/* Luna creciente — círculo base menos círculo desplazado */}
      <circle cx="50" cy="50" r="28" fill="#93C5FD" opacity="0.9" />
      <circle cx="62" cy="44" r="24" fill="#0F0D17" />
      {/* Estrellas */}
      <circle cx="72" cy="28" r="2.5" fill="#EFF6FF" opacity="0.9" />
      <circle cx="82" cy="50" r="1.8" fill="#EFF6FF" opacity="0.7" />
      <circle cx="65" cy="72" r="1.5" fill="#EFF6FF" opacity="0.6" />
    </>
  );
}

function PartlyCloudyIcon({ animated }: { animated: boolean }) {
  const cloudStyle = animated
    ? { animation: "wx-cloud-drift 4s ease-in-out infinite" }
    : {};
  return (
    <>
      <defs>
        <radialGradient id="sun-small-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#FBBF24" />
        </radialGradient>
        <linearGradient id="cloud-grad-pc" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DBEAFE" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
      </defs>
      {/* Sol pequeño (detrás) */}
      <circle cx="65" cy="35" r="18" fill="url(#sun-small-grad)" opacity="0.95" />
      {/* Nube (delante) */}
      <g style={cloudStyle}>
        <ellipse cx="40" cy="62" rx="22" ry="16" fill="url(#cloud-grad-pc)" />
        <ellipse cx="58" cy="65" rx="20" ry="14" fill="url(#cloud-grad-pc)" />
        <ellipse cx="50" cy="55" rx="18" ry="15" fill="url(#cloud-grad-pc)" />
        <ellipse cx="35" cy="68" rx="14" ry="10" fill="url(#cloud-grad-pc)" />
        <ellipse cx="63" cy="68" rx="14" ry="10" fill="url(#cloud-grad-pc)" />
      </g>
    </>
  );
}

function OvercastIcon() {
  return (
    <>
      <defs>
        <linearGradient id="cloud-grad-ov" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
        <linearGradient id="cloud-grad-ov2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
      </defs>
      {/* Nube de fondo más oscura */}
      <ellipse cx="60" cy="48" rx="24" ry="16" fill="url(#cloud-grad-ov)" opacity="0.5" />
      <ellipse cx="72" cy="52" rx="18" ry="12" fill="url(#cloud-grad-ov)" opacity="0.4" />
      {/* Nube principal */}
      <ellipse cx="38" cy="58" rx="22" ry="15" fill="url(#cloud-grad-ov2)" />
      <ellipse cx="56" cy="60" rx="22" ry="14" fill="url(#cloud-grad-ov2)" />
      <ellipse cx="48" cy="50" rx="20" ry="16" fill="url(#cloud-grad-ov2)" />
      <ellipse cx="33" cy="63" rx="15" ry="11" fill="url(#cloud-grad-ov2)" />
      <ellipse cx="65" cy="63" rx="15" ry="11" fill="url(#cloud-grad-ov2)" />
    </>
  );
}

function FogIcon() {
  return (
    <>
      {/* Barras horizontales con opacidad decreciente */}
      <rect x="15" y="30" width="70" height="8" rx="4" fill="#94A3B8" opacity="0.9" />
      <rect x="20" y="48" width="60" height="8" rx="4" fill="#94A3B8" opacity="0.65" />
      <rect x="15" y="66" width="70" height="8" rx="4" fill="#94A3B8" opacity="0.4" />
    </>
  );
}

function DrizzleIcon({ animated }: { animated: boolean }) {
  const baseDropStyle = (delay: string): React.CSSProperties =>
    animated
      ? { animation: `wx-rain-fall 1.4s ease-in ${delay} infinite` }
      : {};
  return (
    <>
      <defs>
        <linearGradient id="cloud-grad-dz" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BFDBFE" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
        <linearGradient id="drop-grad-dz" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Nube */}
      <ellipse cx="36" cy="46" rx="20" ry="13" fill="url(#cloud-grad-dz)" />
      <ellipse cx="52" cy="48" rx="20" ry="13" fill="url(#cloud-grad-dz)" />
      <ellipse cx="44" cy="40" rx="18" ry="14" fill="url(#cloud-grad-dz)" />
      <ellipse cx="28" cy="52" rx="13" ry="9" fill="url(#cloud-grad-dz)" />
      <ellipse cx="62" cy="52" rx="13" ry="9" fill="url(#cloud-grad-dz)" />
      {/* Gotas finas (más cortas que lluvia normal) */}
      <line x1="30" y1="66" x2="28" y2="74" stroke="url(#drop-grad-dz)" strokeWidth="2.5" strokeLinecap="round" style={baseDropStyle("0s")} />
      <line x1="45" y1="68" x2="43" y2="76" stroke="url(#drop-grad-dz)" strokeWidth="2.5" strokeLinecap="round" style={baseDropStyle("0.35s")} />
      <line x1="60" y1="66" x2="58" y2="74" stroke="url(#drop-grad-dz)" strokeWidth="2.5" strokeLinecap="round" style={baseDropStyle("0.7s")} />
      <line x1="38" y1="78" x2="36" y2="86" stroke="url(#drop-grad-dz)" strokeWidth="2.5" strokeLinecap="round" style={baseDropStyle("0.18s")} />
    </>
  );
}

function RainIcon({ animated }: { animated: boolean }) {
  const baseDropStyle = (delay: string): React.CSSProperties =>
    animated
      ? { animation: `wx-rain-fall 1.2s ease-in ${delay} infinite` }
      : {};
  return (
    <>
      <defs>
        <linearGradient id="cloud-grad-rain" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="drop-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Nube */}
      <ellipse cx="36" cy="44" rx="21" ry="14" fill="url(#cloud-grad-rain)" />
      <ellipse cx="54" cy="47" rx="21" ry="14" fill="url(#cloud-grad-rain)" />
      <ellipse cx="45" cy="38" rx="19" ry="15" fill="url(#cloud-grad-rain)" />
      <ellipse cx="27" cy="50" rx="14" ry="10" fill="url(#cloud-grad-rain)" />
      <ellipse cx="64" cy="50" rx="14" ry="10" fill="url(#cloud-grad-rain)" />
      {/* Gotas de lluvia */}
      <line x1="28" y1="64" x2="26" y2="76" stroke="url(#drop-grad)" strokeWidth="3" strokeLinecap="round" style={baseDropStyle("0s")} />
      <line x1="44" y1="66" x2="42" y2="78" stroke="url(#drop-grad)" strokeWidth="3" strokeLinecap="round" style={baseDropStyle("0.4s")} />
      <line x1="60" y1="64" x2="58" y2="76" stroke="url(#drop-grad)" strokeWidth="3" strokeLinecap="round" style={baseDropStyle("0.8s")} />
    </>
  );
}

function SnowIcon() {
  return (
    <>
      <defs>
        <linearGradient id="cloud-grad-snow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DBEAFE" />
          <stop offset="100%" stopColor="#BFDBFE" />
        </linearGradient>
      </defs>
      {/* Nube */}
      <ellipse cx="36" cy="44" rx="20" ry="13" fill="url(#cloud-grad-snow)" />
      <ellipse cx="54" cy="47" rx="20" ry="13" fill="url(#cloud-grad-snow)" />
      <ellipse cx="45" cy="38" rx="18" ry="14" fill="url(#cloud-grad-snow)" />
      <ellipse cx="27" cy="50" rx="13" ry="9" fill="url(#cloud-grad-snow)" />
      <ellipse cx="63" cy="50" rx="13" ry="9" fill="url(#cloud-grad-snow)" />
      {/* Copos de nieve (puntos) */}
      <circle cx="28" cy="70" r="3.5" fill="#EFF6FF" opacity="0.95" />
      <circle cx="45" cy="75" r="3" fill="#EFF6FF" opacity="0.85" />
      <circle cx="62" cy="70" r="3.5" fill="#EFF6FF" opacity="0.95" />
      <circle cx="36" cy="84" r="2.5" fill="#EFF6FF" opacity="0.7" />
      <circle cx="55" cy="86" r="2.5" fill="#EFF6FF" opacity="0.7" />
    </>
  );
}

function StormIcon({ animated }: { animated: boolean }) {
  const boltStyle: React.CSSProperties = animated
    ? { animation: "wx-lightning-pulse 1.5s ease-in-out infinite" }
    : {};
  return (
    <>
      <defs>
        <linearGradient id="cloud-grad-storm" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6B7280" />
          <stop offset="100%" stopColor="#374151" />
        </linearGradient>
      </defs>
      {/* Nube oscura */}
      <ellipse cx="36" cy="40" rx="22" ry="14" fill="url(#cloud-grad-storm)" />
      <ellipse cx="56" cy="43" rx="22" ry="14" fill="url(#cloud-grad-storm)" />
      <ellipse cx="46" cy="34" rx="20" ry="15" fill="url(#cloud-grad-storm)" />
      <ellipse cx="26" cy="47" rx="15" ry="10" fill="url(#cloud-grad-storm)" />
      <ellipse cx="66" cy="47" rx="15" ry="10" fill="url(#cloud-grad-storm)" />
      {/* Rayo */}
      <polygon
        points="52,56 44,72 50,72 42,88 60,68 52,68"
        fill="#FCD34D"
        style={boltStyle}
      />
    </>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export function WeatherIcon({
  code,
  size,
  animated = false,
  isDay = true,
}: WeatherIconProps) {
  const iconType = getIconType(code, isDay);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: "block" }}
    >
      {iconType === "sunny"         && <SunnyIcon animated={animated} />}
      {iconType === "night"         && <NightIcon />}
      {iconType === "partly-cloudy" && <PartlyCloudyIcon animated={animated} />}
      {iconType === "overcast"      && <OvercastIcon />}
      {iconType === "fog"           && <FogIcon />}
      {iconType === "drizzle"       && <DrizzleIcon animated={animated} />}
      {iconType === "rain"          && <RainIcon animated={animated} />}
      {iconType === "snow"          && <SnowIcon />}
      {iconType === "storm"         && <StormIcon animated={animated} />}
    </svg>
  );
}
