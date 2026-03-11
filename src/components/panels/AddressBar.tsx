import { useEffect, useRef, useState } from "react";
import { ArrowRight, Lock, Globe, Search, Star, X } from "lucide-react";
import type { Bookmark } from "@/hooks/useBookmarks";

interface Props {
  initialUrl: string;
  onNavigate: (url: string) => void;
  onClose: () => void;
  bookmarks: Bookmark[];
}

function resolveInput(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  // Ya tiene protocolo → navegar directo
  if (/^https?:\/\//i.test(s)) return s;
  // Sin espacios + patrón hostname válido + TLD de 2+ letras → URL
  if (!s.includes(" ") && /^[\w.-]+(:\d+)?(\/.*)?$/.test(s) && /\.[a-zA-Z]{2,}/.test(s)) {
    return `https://${s}`;
  }
  // Resto → Google Search
  return `https://www.google.com/search?q=${encodeURIComponent(s)}`;
}

function isSearchQuery(input: string): boolean {
  const s = input.trim();
  if (!s || /^https?:\/\//i.test(s)) return false;
  if (!s.includes(" ") && /^[\w.-]+(:\d+)?(\/.*)?$/.test(s) && /\.[a-zA-Z]{2,}/.test(s)) return false;
  return true;
}

// Barra de direcciones flotante estilo Claude Desktop
export function AddressBar({ initialUrl, onNavigate, onClose, bookmarks }: Props) {
  const [value, setValue] = useState(initialUrl);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtrar sugerencias según el texto actual
  const suggestions = (() => {
    const q = value.trim().toLowerCase();
    if (!q) return bookmarks.slice(0, 6);
    return bookmarks
      .filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q)
      )
      .slice(0, 6);
  })();

  // Foco automático al abrir
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = () => {
    const url = resolveInput(value);
    if (!url) return;
    onNavigate(url);
    onClose();
  };

  const isHttps = value.startsWith("https://");
  const isSearch = isSearchQuery(value);

  return (
    <div className="absolute inset-0 z-50 flex items-center px-3 bg-zinc-900/98 border-b border-zinc-700/60">
      <div className="flex w-full items-center gap-2 rounded-full bg-zinc-800 border border-zinc-600/50 px-3 h-[28px] focus-within:border-zinc-400/70 transition-colors">
        {/* Icono de seguridad / búsqueda */}
        <span className="flex-shrink-0 text-zinc-500">
          {isSearch ? (
            <Search size={11} strokeWidth={2} />
          ) : isHttps ? (
            <Lock size={11} strokeWidth={2} />
          ) : (
            <Globe size={11} strokeWidth={2} />
          )}
        </span>

        {/* Input de URL */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSelectedIndex(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                onNavigate(suggestions[selectedIndex].url);
                onClose();
              } else {
                handleSubmit();
              }
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelectedIndex((i) => Math.max(i - 1, -1));
            }
          }}
          className="flex-1 bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 outline-none min-w-0"
          placeholder="https://"
          spellCheck={false}
        />

        {/* Botón ir */}
        <button
          onClick={handleSubmit}
          className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-600 hover:bg-zinc-500 text-zinc-100 transition-colors"
        >
          <ArrowRight size={10} strokeWidth={2.5} />
        </button>
      </div>

      {/* Botón cerrar */}
      <button
        onClick={onClose}
        className="ml-2 flex-shrink-0 flex h-5 w-5 items-center justify-center rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
        title="Cerrar (Esc)"
      >
        <X size={12} strokeWidth={2} />
      </button>

      {/* Panel de sugerencias */}
      {suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "var(--elevated)",
            border: "1px solid var(--border2)",
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            zIndex: 100,
          }}
        >
          {suggestions.map((b, i) => (
            <button
              key={b.id}
              onClick={() => {
                onNavigate(b.url);
                onClose();
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                background: i === selectedIndex ? "var(--accent-dim)" : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={() => setSelectedIndex(i)}
              onMouseLeave={() => setSelectedIndex(-1)}
            >
              {b.favicon_url ? (
                <img
                  src={b.favicon_url}
                  width={14}
                  height={14}
                  style={{ borderRadius: 3, flexShrink: 0 }}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div style={{ width: 14, height: 14, flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text)",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {b.title}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {b.url}
                </div>
              </div>
              <Star size={10} color="var(--accent)" fill="var(--accent)" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
