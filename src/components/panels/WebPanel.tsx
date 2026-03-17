import { useState, useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { Panel } from "@/types";

interface Props {
  panel: Panel;
  onNavigate?: (url: string) => void;
}

// Resuelve input del usuario a URL navegable
function resolveInput(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (!s.includes(" ") && /^[\w.-]+(:\d+)?(\/.*)?$/.test(s) && /\.[a-zA-Z]{2,}/.test(s)) {
    return `https://${s}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(s)}`;
}

// Favoritos estáticos del new tab
const FAVORITES = [
  {
    label: "Google",
    url: "https://www.google.com",
    bg: "#1a1a2e",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" fill="#4285F4" />
        <path d="M10 6a4 4 0 100 8 4 4 0 000-8z" fill="white" opacity="0.9" />
      </svg>
    ),
  },
  {
    label: "GitHub",
    url: "https://github.com",
    bg: "#0d1117",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
        <path d="M10 2C5.58 2 2 5.58 2 10c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0018 10c0-4.42-3.58-8-8-8z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    url: "https://www.youtube.com",
    bg: "#0a0a0a",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="1" y="4" width="18" height="12" rx="3" fill="#FF0000" />
        <path d="M8 7.5l5 2.5-5 2.5V7.5z" fill="white" />
      </svg>
    ),
  },
  {
    label: "+ Añadir",
    url: null as string | null,
    bg: "transparent",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
        <path d="M10 3v14M3 10h14" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      </svg>
    ),
  },
];

// Nuevo tab page — aparece cuando el panel WEB no tiene URL configurada
function NewTabPage({ onNavigate }: { onNavigate?: (url: string) => void }) {
  const [query, setQuery] = useState("");

  const now = new Date();
  const formatTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const formatDate = (d: Date) =>
    d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const [clock, setClock] = useState(() => formatTime(now));
  const [date, setDate] = useState(() => formatDate(now));

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setClock(formatTime(d));
      setDate(formatDate(d));
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = () => {
    const url = resolveInput(query);
    if (url) onNavigate?.(url);
  };

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center overflow-auto"
      style={{
        background: "var(--base)",
        position: "relative",
        padding: "48px 24px 40px",
        minHeight: 0,
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: -120,
          left: "50%",
          transform: "translateX(-50%)",
          width: 500,
          height: 300,
          background:
            "radial-gradient(ellipse at center, rgba(124,106,247,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Reloj */}
      <div
        style={{
          fontSize: 52,
          fontWeight: 200,
          color: "rgba(255,255,255,0.92)",
          letterSpacing: -2,
          lineHeight: 1,
          animation: "nt-fadeUp 0.6s ease both",
          animationDelay: "0.05s",
          fontFamily: "'Instrument Sans', sans-serif",
          position: "relative",
        }}
      >
        {clock}
      </div>

      {/* Fecha */}
      <div
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.35)",
          marginTop: 6,
          letterSpacing: "0.5px",
          animation: "nt-fadeUp 0.6s ease both",
          animationDelay: "0.1s",
          position: "relative",
        }}
      >
        {date}
      </div>

      {/* Buscador */}
      <div
        style={{
          marginTop: 32,
          width: "100%",
          maxWidth: 520,
          animation: "nt-fadeUp 0.6s ease both",
          animationDelay: "0.18s",
          position: "relative",
        }}
      >
        <div style={{ position: "relative" }}>
          <svg
            style={{
              position: "absolute",
              left: 15,
              top: "50%",
              transform: "translateY(-50%)",
              opacity: 0.35,
              pointerEvents: "none",
            }}
            width={16}
            height={16}
            viewBox="0 0 16 16"
            fill="none"
          >
            <circle cx="6.5" cy="6.5" r="4.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.4" />
            <path
              d="M10 10L14 14"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <input
            className="nt-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            placeholder="Buscar o escribir una URL…"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(124,106,247,0.25)",
              borderRadius: 14,
              padding: "13px 18px 13px 44px",
              fontSize: 15,
              color: "rgba(255,255,255,0.88)",
              outline: "none",
              fontFamily: "'Instrument Sans', sans-serif",
              transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(124,106,247,0.65)";
              e.currentTarget.style.background = "rgba(124,106,247,0.08)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,106,247,0.12)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(124,106,247,0.25)";
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      {/* Favoritos */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          marginTop: 32,
          animation: "nt-fadeUp 0.6s ease both",
          animationDelay: "0.28s",
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "rgba(255,255,255,0.22)",
            letterSpacing: "0.8px",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Favoritos
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
          }}
        >
          {FAVORITES.map((fav) => (
            <button
              key={fav.label}
              onClick={() => fav.url && onNavigate?.(fav.url)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 7,
                padding: "14px 8px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
                cursor: fav.url ? "pointer" : "default",
                transition: "background 0.18s, border-color 0.18s, transform 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!fav.url) return;
                e.currentTarget.style.background = "rgba(124,106,247,0.1)";
                e.currentTarget.style.borderColor = "rgba(124,106,247,0.3)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: fav.bg,
                  border: fav.bg === "transparent" ? "1px solid rgba(255,255,255,0.06)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {fav.icon}
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.45)",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  width: "100%",
                }}
              >
                {fav.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 28,
          fontSize: 11,
          color: "rgba(255,255,255,0.1)",
          letterSpacing: "0.3px",
          animation: "nt-fadeIn 1s ease both",
          animationDelay: "0.7s",
          position: "relative",
        }}
      >
        Stride <span style={{ color: "rgba(124,106,247,0.6)" }}>·</span> Nueva página
      </div>
    </div>
  );
}

// El WebView2 real se renderiza detrás de esta UI via Rust.
// Este div toma el espacio restante bajo el PanelHeader.
export function WebPanel({ panel, onNavigate }: Props) {
  const webviewMap = useWorkspaceStore((s) => s.webviewMap);
  const isLoaded = !!webviewMap[panel.id];

  // Sin URL: mostrar new tab page
  if (!panel.url) {
    return <NewTabPage onNavigate={onNavigate} />;
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-transparent">
      {!isLoaded && (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-xs truncate max-w-[180px] opacity-60">{panel.url}</span>
        </div>
      )}
    </div>
  );
}
