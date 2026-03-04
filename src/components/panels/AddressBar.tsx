import { useEffect, useRef, useState } from "react";
import { ArrowRight, Lock, Globe, Search } from "lucide-react";

interface Props {
  initialUrl: string;
  onNavigate: (url: string) => void;
  onClose: () => void;
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
export function AddressBar({ initialUrl, onNavigate, onClose }: Props) {
  const [value, setValue] = useState(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  // Foco automático al abrir
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Cerrar con Escape, navegar con Enter
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
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
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

      {/* Hint Escape */}
      <span className="ml-2 flex-shrink-0 text-[10px] text-zinc-600 font-mono">
        Esc
      </span>
    </div>
  );
}
