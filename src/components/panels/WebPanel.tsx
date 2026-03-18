import { useState, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useBookmarks } from "@/hooks/useBookmarks";
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

function getFaviconUrl(url: string): string | null {
  try {
    const { origin } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`;
  } catch { return null; }
}

interface BookmarkCardProps {
  title: string;
  url: string;
  faviconUrl: string | null;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onRemove: () => void;
}

function BookmarkCard({ title, faviconUrl, onClick, onContextMenu, onRemove }: BookmarkCardProps) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const shortTitle = title.length > 10 ? title.slice(0, 10) + "…" : title;
  const fallbackLetter = title.charAt(0).toUpperCase();

  // Cerrar confirmación al click fuera o Escape
  useEffect(() => {
    if (!showConfirm) return;
    const handleClick = (e: MouseEvent) => {
      if (confirmRef.current && !confirmRef.current.contains(e.target as Node)) setShowConfirm(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowConfirm(false); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [showConfirm]);

  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { if (!showConfirm) setHovered(false); }}
    >
      {/* Tarjeta principal */}
      <button
        onClick={onClick}
        onContextMenu={onContextMenu}
        style={{
          width: 88,
          padding: "12px 8px 9px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 7,
          transition: "background 0.18s, border-color 0.18s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(124,106,245,0.08)";
          e.currentTarget.style.borderColor = "rgba(124,106,245,0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        }}
      >
        <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {faviconUrl && !imgError ? (
            <img
              src={faviconUrl}
              width={28}
              height={28}
              style={{ borderRadius: 6, display: "block" }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: "rgba(124,106,245,0.2)", color: "#a89ef8",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 600,
            }}>
              {fallbackLetter}
            </div>
          )}
        </div>
        <span style={{
          fontSize: 11, color: "rgba(255,255,255,0.45)",
          textAlign: "center", whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis", width: "100%",
        }}>
          {shortTitle}
        </span>
      </button>

      {/* Botón X flotante — visible al hacer hover o cuando el confirm está abierto */}
      {(hovered || showConfirm) && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowConfirm((v) => !v); }}
          title="Eliminar"
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            width: 17,
            height: 17,
            borderRadius: "50%",
            background: showConfirm ? "rgba(248,113,113,0.25)" : "rgba(22,20,36,0.95)",
            border: `1px solid ${showConfirm ? "rgba(248,113,113,0.45)" : "rgba(255,255,255,0.14)"}`,
            color: showConfirm ? "rgba(248,113,113,0.9)" : "rgba(255,255,255,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
            transition: "background 0.15s, border-color 0.15s, color 0.15s",
            padding: 0,
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(248,113,113,0.2)";
            e.currentTarget.style.borderColor = "rgba(248,113,113,0.4)";
            e.currentTarget.style.color = "rgba(248,113,113,0.9)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = showConfirm ? "rgba(248,113,113,0.25)" : "rgba(22,20,36,0.95)";
            e.currentTarget.style.borderColor = showConfirm ? "rgba(248,113,113,0.45)" : "rgba(255,255,255,0.14)";
            e.currentTarget.style.color = showConfirm ? "rgba(248,113,113,0.9)" : "rgba(255,255,255,0.45)";
          }}
        >
          <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
            <line x1="1" y1="1" x2="6" y2="6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="6" y1="1" x2="1" y2="6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      )}

      {/* Popover de confirmación */}
      {showConfirm && (
        <div
          ref={confirmRef}
          style={{
            position: "absolute",
            top: 18,
            right: -6,
            zIndex: 50,
            background: "#1c1929",
            border: "1px solid rgba(248,113,113,0.22)",
            borderRadius: 9,
            padding: "10px 11px",
            width: 148,
            boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
          }}
        >
          {/* Triángulo apuntando al botón X */}
          <div style={{
            position: "absolute",
            top: -5,
            right: 10,
            width: 8,
            height: 8,
            background: "#1c1929",
            borderTop: "1px solid rgba(248,113,113,0.22)",
            borderLeft: "1px solid rgba(248,113,113,0.22)",
            transform: "rotate(45deg)",
          }} />
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 9, lineHeight: 1.4 }}>
            ¿Eliminar de favoritos?
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <button
              onClick={() => setShowConfirm(false)}
              style={{
                flex: 1, padding: "5px 0",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 5,
                color: "rgba(255,255,255,0.35)",
                fontSize: 11, cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              Cancelar
            </button>
            <button
              onClick={() => { setShowConfirm(false); onRemove(); }}
              style={{
                flex: 1, padding: "5px 0",
                background: "rgba(248,113,113,0.12)",
                border: "1px solid rgba(248,113,113,0.28)",
                borderRadius: 5,
                color: "rgba(248,113,113,0.9)",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.22)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.12)"; }}
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type HintState = "split" | "bookmark" | "none";

// Nuevo tab page — aparece cuando el panel WEB no tiene URL configurada
function NewTabPage({ onNavigate }: { onNavigate?: (url: string) => void }) {
  const [query, setQuery] = useState("");
  const { bookmarks, save, remove } = useBookmarks();

  const now = new Date();
  const formatTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const formatDate = (d: Date) =>
    d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const [clock, setClock] = useState(() => formatTime(now));
  const [date, setDate] = useState(() => formatDate(now));

  // Sistema de hints secuenciales — split primero, luego bookmark
  const [hintState, setHintState] = useState<HintState>(() => {
    const splitSeen = localStorage.getItem("stride_split_hint_seen");
    const bookmarkSeen = localStorage.getItem("stride_bookmark_hint_seen");
    if (!splitSeen) return "split";
    if (!bookmarkSeen) return "bookmark";
    return "none";
  });
  const [hintExiting, setHintExiting] = useState(false);

  // Estado del popover "+ Añadir"
  const [addOpen, setAddOpen] = useState(false);
  const [addAnchorPos, setAddAnchorPos] = useState<{ top: number; left: number } | null>(null);
  const [addUrl, setAddUrl] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [urlError, setUrlError] = useState(false);
  const addPopoverRef = useRef<HTMLDivElement>(null);
  const addUrlInputRef = useRef<HTMLInputElement>(null);

  // Estado del context menu (click derecho en bookmark)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setClock(formatTime(d));
      setDate(formatDate(d));
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  // Cerrar popover añadir al click fuera o Escape
  useEffect(() => {
    if (!addOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (addPopoverRef.current && !addPopoverRef.current.contains(e.target as Node)) setAddOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAddOpen(false); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [addOpen]);

  // Cerrar context menu al click fuera o Escape
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setContextMenu(null); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [contextMenu]);

  // Auto-focus input URL al abrir popover
  useEffect(() => {
    if (addOpen) setTimeout(() => addUrlInputRef.current?.focus(), 50);
  }, [addOpen]);

  const handleSubmit = () => {
    const url = resolveInput(query);
    if (url) onNavigate?.(url);
  };

  const handleSaveBookmark = async () => {
    let validUrl = addUrl.trim();
    if (!/^https?:\/\//i.test(validUrl) && validUrl) validUrl = `https://${validUrl}`;
    try {
      new URL(validUrl);
    } catch {
      setUrlError(true);
      return;
    }
    setUrlError(false);
    const title = addTitle.trim() || new URL(validUrl).hostname;
    const faviconUrl = getFaviconUrl(validUrl);
    await save(title, validUrl, faviconUrl ?? undefined);
    setAddUrl("");
    setAddTitle("");
    setAddOpen(false);
  };

  // Dismiss con animación — luego avanza al siguiente hint o cierra
  const dismissSplitHint = () => {
    setHintExiting(true);
    setTimeout(() => {
      localStorage.setItem("stride_split_hint_seen", "1");
      window.dispatchEvent(new CustomEvent("stride:split-hint-dismissed"));
      setHintExiting(false);
      setHintState("bookmark");
    }, 260);
  };

  const dismissBookmarkHint = () => {
    setHintExiting(true);
    setTimeout(() => {
      localStorage.setItem("stride_bookmark_hint_seen", "1");
      window.dispatchEvent(new CustomEvent("stride:bookmark-hint-dismissed"));
      setHintExiting(false);
      setHintState("none");
    }, 260);
  };

  // Abrir popover anclado al elemento disparador
  const openAddPopover = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setAddAnchorPos({ top: rect.bottom + 6, left: rect.left });
    setAddOpen(true);
  };

  const visibleBookmarks = bookmarks.slice(0, 7);
  const showAddCard = bookmarks.length < 7;
  const hasBookmarks = bookmarks.length > 0;

  // Estilos compartidos del panel de hint
  const hintCardStyle: React.CSSProperties = {
    position: "absolute",
    top: 44,
    right: 10,
    zIndex: 50,
    background: "#17152a",
    border: "1px solid rgba(124,106,245,0.22)",
    borderRadius: 11,
    padding: "13px 13px 11px",
    width: 192,
    opacity: hintExiting ? 0 : 1,
    transform: hintExiting ? "translateY(-6px)" : "none",
    transition: "opacity 0.25s, transform 0.25s",
  };

  // Triángulo del hint panel
  const HintTriangle = () => (
    <div style={{
      position: "absolute", top: -5, right: 18, width: 8, height: 8,
      background: "#17152a",
      borderTop: "1px solid rgba(124,106,245,0.22)",
      borderLeft: "1px solid rgba(124,106,245,0.22)",
      transform: "rotate(45deg)",
    }} />
  );

  // Caja de icono del hint
  const IconBox = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      width: 24, height: 24, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: 6,
      background: "rgba(124,106,245,0.1)",
      border: "1px solid rgba(124,106,245,0.18)",
    }}>
      {children}
    </div>
  );

  // Beacon pulsante para botones de acción
  const BeaconDot = ({ delay = "0s" }: { delay?: string }) => (
    <div style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, zIndex: 10, pointerEvents: "none" }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "rgba(124,106,245,0.55)",
        animation: `nt-beacon-pulse 2.5s infinite ease-out ${delay}`,
      }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#7c6af5" }} />
    </div>
  );

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center overflow-auto"
      style={{ background: "var(--base)", position: "relative", padding: "48px 24px 40px", minHeight: 0 }}
    >
      <style>{`
        @keyframes nt-beacon-pulse {
          0%   { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes nt-fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .nt-search-input::placeholder { color: rgba(255,255,255,0.28); }
      `}</style>

      {/* Hint: divide este panel (split) */}
      {hintState === "split" && (
        <div style={hintCardStyle}>
          <HintTriangle />

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#7c6af5", flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.55)" }}>Divide este panel</span>
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 8 }} />

          {/* Fila: Columnas */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
            <IconBox>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="1" y="1" width="5" height="11" rx="1.5" stroke="rgba(124,106,245,0.7)" strokeWidth="1.2"/>
                <rect x="7" y="1" width="5" height="11" rx="1.5" stroke="rgba(124,106,245,0.7)" strokeWidth="1.2"/>
              </svg>
            </IconBox>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>Columnas</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 1 }}>Dos paneles en paralelo</div>
            </div>
          </div>

          {/* Fila: Filas */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
            <IconBox>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="1" y="1" width="11" height="5" rx="1.5" stroke="rgba(124,106,245,0.7)" strokeWidth="1.2"/>
                <rect x="1" y="7" width="11" height="5" rx="1.5" stroke="rgba(124,106,245,0.7)" strokeWidth="1.2"/>
              </svg>
            </IconBox>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>Filas</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 1 }}>Apila dos paneles verticalmente</div>
            </div>
          </div>

          <button
            onClick={dismissSplitHint}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 10, color: "rgba(124,106,245,0.4)", padding: 0,
              width: "100%", textAlign: "left",
            }}
          >
            ya lo sé, ocultar ✕
          </button>
        </div>
      )}

      {/* Hint: agrega tus favoritos (bookmark) */}
      {hintState === "bookmark" && (
        <div style={hintCardStyle}>
          <HintTriangle />

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#7c6af5", flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.55)" }}>Agrega tus favoritos</span>
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 8 }} />

          {/* Fila: Botón + Añadir */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
            <IconBox>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5.5" stroke="rgba(124,106,245,0.7)" strokeWidth="1.2"/>
                <path d="M6.5 4v5M4 6.5h5" stroke="rgba(124,106,245,0.7)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </IconBox>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>Botón + Añadir</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 1 }}>Escribe la URL desde esta pantalla</div>
            </div>
          </div>

          {/* Fila: Estrella en la barra */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
            <IconBox>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(124,106,245,0.6)" stroke="rgba(124,106,245,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </IconBox>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>Estrella en la barra</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 1 }}>Guarda mientras navegas con un click</div>
            </div>
          </div>

          <button
            onClick={dismissBookmarkHint}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 10, color: "rgba(124,106,245,0.4)", padding: 0,
              width: "100%", textAlign: "left",
            }}
          >
            ya lo sé, ocultar ✕
          </button>
        </div>
      )}

      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)",
        width: 500, height: 300,
        background: "radial-gradient(ellipse at center, rgba(124,106,247,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Reloj */}
      <div style={{
        fontSize: 52, fontWeight: 200, color: "rgba(255,255,255,0.92)",
        letterSpacing: -2, lineHeight: 1,
        animation: "nt-fadeUp 0.6s ease both", animationDelay: "0.05s",
        fontFamily: "'Instrument Sans', sans-serif", position: "relative",
      }}>
        {clock}
      </div>

      {/* Fecha */}
      <div style={{
        fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 6,
        letterSpacing: "0.5px",
        animation: "nt-fadeUp 0.6s ease both", animationDelay: "0.1s",
        position: "relative",
      }}>
        {date}
      </div>

      {/* Buscador */}
      <div style={{
        marginTop: 32, width: "100%", maxWidth: 520,
        animation: "nt-fadeUp 0.6s ease both", animationDelay: "0.18s",
        position: "relative",
      }}>
        <div style={{ position: "relative" }}>
          <svg style={{
            position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)",
            opacity: 0.35, pointerEvents: "none",
          }} width={16} height={16} viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.4" />
            <path d="M10 10L14 14" stroke="rgba(255,255,255,0.8)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            className="nt-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="Buscar o escribir una URL…"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(124,106,247,0.25)",
              borderRadius: 14, padding: "13px 18px 13px 44px",
              fontSize: 15, color: "rgba(255,255,255,0.88)",
              outline: "none", fontFamily: "'Instrument Sans', sans-serif",
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

      {/* Sección de favoritos — empty state o grid */}
      <div style={{
        width: "100%", maxWidth: 520, marginTop: 32,
        animation: "nt-fadeUp 0.6s ease both", animationDelay: "0.28s",
        position: "relative",
      }}>
        {!hasBookmarks ? (
          /* Estado vacío — no hay favoritos todavía */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{
              fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.22)",
              letterSpacing: "0.8px", textTransform: "uppercase",
            }}>
              Favoritos
            </div>

            <div style={{ position: "relative" }}>
              <button
                onClick={openAddPopover}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 18px",
                  background: hintState === "bookmark" ? "rgba(124,106,245,0.12)" : "rgba(124,106,245,0.08)",
                  border: `1px dashed ${hintState === "bookmark" ? "rgba(124,106,245,0.5)" : "rgba(124,106,245,0.3)"}`,
                  borderRadius: 10,
                  color: "rgba(124,106,245,0.7)", fontSize: 13,
                  cursor: "pointer",
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(124,106,245,0.14)";
                  e.currentTarget.style.borderColor = "rgba(124,106,245,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = hintState === "bookmark"
                    ? "rgba(124,106,245,0.12)" : "rgba(124,106,245,0.08)";
                  e.currentTarget.style.borderColor = hintState === "bookmark"
                    ? "rgba(124,106,245,0.5)" : "rgba(124,106,245,0.3)";
                }}
              >
                + Añadir favorito
              </button>

              {/* Beacon — visible durante el hint de bookmarks */}
              {hintState === "bookmark" && <BeaconDot delay="0s" />}
            </div>
          </div>
        ) : (
          /* Grid con bookmarks existentes */
          <div>
            <div style={{
              fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.22)",
              letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 12,
            }}>
              Favoritos
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxWidth: 400 }}>
              {visibleBookmarks.map((bm) => (
                <BookmarkCard
                  key={bm.id}
                  title={bm.title}
                  url={bm.url}
                  faviconUrl={bm.favicon_url ?? getFaviconUrl(bm.url)}
                  onClick={() => onNavigate?.(bm.url)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, id: bm.id });
                  }}
                  onRemove={() => remove(bm.id)}
                />
              ))}

              {/* Botón "+ Añadir" — solo si hay espacio (< 7 bookmarks) */}
              {showAddCard && (
                <div style={{ position: "relative" }}>
                  <button
                    onClick={openAddPopover}
                    style={{
                      width: 88, padding: "12px 8px 9px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 10, cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                      transition: "background 0.18s, border-color 0.18s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(124,106,245,0.08)";
                      e.currentTarget.style.borderColor = "rgba(124,106,245,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                    }}
                  >
                    <div style={{
                      width: 28, height: 28,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: 6, border: "1px dashed rgba(255,255,255,0.15)",
                    }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1v12M1 7h12" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <span style={{
                      fontSize: 11, color: "rgba(255,255,255,0.3)",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      width: "100%", textAlign: "center",
                    }}>
                      + Añadir
                    </span>
                  </button>

                  {/* Beacon — staggered 0.5s durante el hint de bookmarks */}
                  {hintState === "bookmark" && <BeaconDot delay="0.5s" />}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Popover para añadir bookmark — posición fija anclada al disparador */}
      {addOpen && addAnchorPos && (
        <div
          ref={addPopoverRef}
          style={{
            position: "fixed",
            top: addAnchorPos.top,
            left: addAnchorPos.left,
            zIndex: 100,
            background: "#1a1728",
            border: "1px solid rgba(124,106,245,0.25)",
            borderRadius: 12, padding: 14, width: 220,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            display: "flex", flexDirection: "column", gap: 8,
          }}
        >
          <div>
            <input
              ref={addUrlInputRef}
              type="text"
              value={addUrl}
              onChange={(e) => { setAddUrl(e.target.value); setUrlError(false); }}
              placeholder="https://…"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${urlError ? "rgba(248,113,113,0.6)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 7, padding: "7px 10px",
                fontSize: 12, color: "rgba(255,255,255,0.85)", outline: "none",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,106,245,0.5)"; }}
              onBlur={(e) => { if (!urlError) e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveBookmark(); }}
            />
            {urlError && (
              <div style={{ fontSize: 10, color: "rgba(248,113,113,0.9)", marginTop: 3 }}>
                URL no válida
              </div>
            )}
          </div>

          <input
            type="text"
            value={addTitle}
            onChange={(e) => setAddTitle(e.target.value)}
            placeholder="Nombre del sitio"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 7, padding: "7px 10px",
              fontSize: 12, color: "rgba(255,255,255,0.85)", outline: "none",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,106,245,0.5)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveBookmark(); }}
          />

          <button
            onClick={handleSaveBookmark}
            style={{
              width: "100%", padding: "9px 0",
              background: "#7c6af5", border: "none",
              borderRadius: 8, color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Guardar
          </button>
        </div>
      )}

      {/* Context menu (click derecho en bookmark) */}
      {contextMenu && (
        <div
          style={{
            position: "fixed", top: contextMenu.y, left: contextMenu.x, zIndex: 200,
            background: "#1a1728", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8, padding: 4,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={async () => {
              await remove(contextMenu.id);
              setContextMenu(null);
            }}
            style={{
              display: "block", width: "100%", padding: "6px 10px",
              background: "transparent", border: "none",
              color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer",
              borderRadius: 6, textAlign: "left", whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Eliminar de favoritos
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 28, fontSize: 11, color: "rgba(255,255,255,0.1)",
        letterSpacing: "0.3px",
        animation: "nt-fadeIn 1s ease both", animationDelay: "0.7s",
        position: "relative",
      }}>
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
