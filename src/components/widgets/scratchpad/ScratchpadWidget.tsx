import { useRef } from "react";
import { useScratchpad } from "./useScratchpad";

interface Props {
  // Modo compacto: sin header propio (lo maneja PanelOverlay)
  compact?: boolean;
}

// Insertar texto en la posición del cursor en un textarea
function insertAtCursor(el: HTMLTextAreaElement, before: string, after = "") {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const selected = el.value.substring(start, end);
  const newVal =
    el.value.substring(0, start) + before + selected + after + el.value.substring(end);
  // Disparar evento input para que React actualice el estado
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;
  nativeInputValueSetter?.call(el, newVal);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.selectionStart = start + before.length;
  el.selectionEnd = start + before.length + selected.length;
  el.focus();
}

const TOOLBAR_BTNS = [
  { label: "B",   title: "Negrita",    bold: true,   italic: false, action: (el: HTMLTextAreaElement) => insertAtCursor(el, "**", "**") },
  { label: "I",   title: "Cursiva",    bold: false,  italic: true,  action: (el: HTMLTextAreaElement) => insertAtCursor(el, "_", "_") },
  { label: "—",   title: "Separador",  bold: false,  italic: false, action: (el: HTMLTextAreaElement) => insertAtCursor(el, "\n---\n") },
  { label: "[ ]", title: "Checkbox",   bold: false,  italic: false, action: (el: HTMLTextAreaElement) => insertAtCursor(el, "- [ ] ") },
  { label: "#",   title: "Encabezado", bold: false,  italic: false, action: (el: HTMLTextAreaElement) => insertAtCursor(el, "## ") },
] as const;

export function ScratchpadWidget({ compact = false }: Props) {
  const { content, handleChange, isSaving } = useScratchpad();
  const taRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="flex h-full w-full flex-col bg-transparent">
      {/* Toolbar de formato — siempre visible (en compact o standalone) */}
      <div
        className="flex items-center gap-[2px] flex-shrink-0"
        style={{
          height: compact ? 24 : 28,
          padding: "0 8px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(19,17,28,0.6)",
        }}
      >
        {TOOLBAR_BTNS.map((btn) => (
          <button
            key={btn.label}
            title={btn.title}
            onMouseDown={(e) => {
              e.preventDefault(); // mantener foco en el textarea
              if (taRef.current) btn.action(taRef.current);
            }}
            className="flex items-center justify-center rounded transition-all"
            style={{
              height: compact ? 18 : 20,
              padding: "0 5px",
              fontSize: compact ? 8 : 9,
              fontFamily: "'Geist Mono', monospace",
              fontWeight: btn.bold ? 700 : 400,
              fontStyle: btn.italic ? "italic" : "normal",
              color: "var(--text3)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "var(--elevated)";
              el.style.color = "var(--text2)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "transparent";
              el.style.color = "var(--text3)";
            }}
          >
            {btn.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {isSaving && (
            <span
              style={{
                fontSize: 8, color: "var(--text3)",
                fontFamily: "'Geist Mono', monospace",
              }}
            >
              guardando…
            </span>
          )}
          <span
            style={{
              fontSize: 8, color: "var(--text3)",
              fontFamily: "'Geist Mono', monospace",
            }}
          >
            {wordCount}w
          </span>
        </div>
      </div>

      <textarea
        ref={taRef}
        className="flex-1 resize-none outline-none placeholder:text-muted-foreground leading-relaxed"
        style={{
          background: "transparent",
          padding: compact ? "6px 10px" : "10px 12px",
          fontFamily: "'Geist Mono', monospace",
          fontSize: compact ? 9 : 10,
          color: "var(--text2)",
          border: "none",
        }}
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Escribe aquí tus notas…"
        spellCheck={false}
      />
    </div>
  );
}
