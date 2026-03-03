import { useState, useRef, useEffect, type ReactNode } from "react";
import { useNotes, type NoteHistoryEntry } from "@/hooks/useNotes";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPanelContext(panelUrl?: string): { hostname: string; faviconUrl: string } {
  if (!panelUrl) return { hostname: "Panel", faviconUrl: "" };
  try {
    const url = new URL(panelUrl);
    const hostname = url.hostname.replace(/^www\./, "");
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`;
    return { hostname, faviconUrl };
  } catch {
    return { hostname: "Panel", faviconUrl: "" };
  }
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return "nunca";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "ahora mismo";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

function formatHistoryDate(savedAt: string): string {
  const d = new Date(savedAt);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();
  const time = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today) return `hoy · ${time}`;
  if (d.toDateString() === yesterday) return `ayer · ${time}`;
  const days = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  return `${days[d.getDay()]} · ${time}`;
}

// ── Markdown parser ───────────────────────────────────────────────────────────

function parseInline(text: string): ReactNode[] {
  // Parsea `código` inline dentro de texto
  const parts: ReactNode[] = [];
  const regex = /`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={key++}>{text.slice(last, m.index)}</span>);
    parts.push(
      <span
        key={key++}
        style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: 10,
          color: "var(--accent2)",
          background: "var(--accent-dim)",
          border: "1px solid rgba(124,106,247,0.15)",
          borderRadius: 3,
          padding: "0 4px",
        }}
      >
        {m[1]}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
  return parts;
}

interface CheckboxLineProps {
  checked: boolean;
  text: string;
  onToggle: () => void;
}

function CheckboxLine({ checked, text, onToggle }: CheckboxLineProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, lineHeight: "24px" }}>
      <div
        onClick={onToggle}
        style={{
          width: 12, height: 12,
          borderRadius: 3,
          border: `1px solid ${checked ? "var(--accent)" : "var(--border2)"}`,
          background: checked ? "var(--accent)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, cursor: "pointer",
          transition: "all 0.15s",
          fontSize: 8, color: "#fff",
        }}
      >
        {checked && "✓"}
      </div>
      <span
        style={{
          fontSize: 11,
          color: checked ? "var(--text3)" : "var(--text2)",
          fontFamily: "'Instrument Sans', sans-serif",
          textDecoration: checked ? "line-through" : "none",
        }}
      >
        {text}
      </span>
    </div>
  );
}

function parseLine(
  line: string,
  idx: number,
  onCheckboxToggle: (idx: number, checked: boolean) => void
): ReactNode {
  // H1
  if (/^#\s+/.test(line)) {
    return (
      <div key={idx} style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: "24px", letterSpacing: "-0.01em" }}>
        {parseInline(line.replace(/^#\s+/, ""))}
      </div>
    );
  }
  // H2
  if (/^##\s+/.test(line)) {
    return (
      <div key={idx} style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", lineHeight: "24px" }}>
        {parseInline(line.replace(/^##\s+/, ""))}
      </div>
    );
  }
  // Checkbox [x] o [ ]
  const cbMatch = line.match(/^\[( |x)\]\s+(.*)/i);
  if (cbMatch) {
    const checked = cbMatch[1].toLowerCase() === "x";
    return (
      <CheckboxLine
        key={idx}
        checked={checked}
        text={cbMatch[2]}
        onToggle={() => onCheckboxToggle(idx, !checked)}
      />
    );
  }
  // Bullet
  if (/^-\s+/.test(line)) {
    return (
      <div
        key={idx}
        style={{
          fontSize: 11, color: "var(--text2)", lineHeight: "24px",
          paddingLeft: 14, position: "relative",
          fontFamily: "'Instrument Sans', sans-serif",
        }}
      >
        <span style={{ position: "absolute", left: 4, color: "var(--accent2)", fontWeight: 700 }}>·</span>
        {parseInline(line.replace(/^-\s+/, ""))}
      </div>
    );
  }
  // Comentario
  if (/^\/\/\s*/.test(line)) {
    return (
      <div
        key={idx}
        style={{
          fontSize: 10.5, color: "var(--text4)", lineHeight: "24px",
          fontFamily: "'Geist Mono', monospace", fontStyle: "italic",
        }}
      >
        {line}
      </div>
    );
  }
  // Link → o http
  if (/^→\s+/.test(line) || /^https?:\/\//.test(line)) {
    return (
      <div
        key={idx}
        style={{
          fontSize: 11, color: "var(--accent2)", lineHeight: "24px",
          textDecoration: "underline", textDecorationStyle: "dotted",
          cursor: "pointer", fontFamily: "'Instrument Sans', sans-serif",
        }}
      >
        {line}
      </div>
    );
  }
  // Línea vacía
  if (line.trim() === "") {
    return <div key={idx} style={{ height: 0 }} />;
  }
  // Párrafo normal
  return (
    <div key={idx} style={{ fontSize: 11, color: "var(--text2)", lineHeight: "24px", fontFamily: "'Instrument Sans', sans-serif" }}>
      {parseInline(line)}
    </div>
  );
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const ClockIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
    <polyline points="12 8 12 12 14 14" />
    <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const PencilIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text3)" }}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// ── Floating Toolbar ──────────────────────────────────────────────────────────

interface ToolbarPos { top: number; left: number }

interface FloatingToolbarProps {
  pos: ToolbarPos;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onAction: (action: string) => void;
}

function FloatingToolbar({ pos, containerRef, onAction }: FloatingToolbarProps) {
  const tbRef = useRef<HTMLDivElement>(null);
  const [adjustedLeft, setAdjustedLeft] = useState(pos.left);

  useEffect(() => {
    if (!tbRef.current || !containerRef.current) return;
    const tbRect = tbRef.current.getBoundingClientRect();
    const cRect = containerRef.current.getBoundingClientRect();
    let left = pos.left;
    if (left - tbRect.width / 2 < cRect.left) left = cRect.left + tbRect.width / 2;
    if (left + tbRect.width / 2 > cRect.right) left = cRect.right - tbRect.width / 2;
    setAdjustedLeft(left);
  }, [pos.left]);

  const btnStyle: React.CSSProperties = {
    width: 26, height: 24,
    borderRadius: 5, border: "none",
    background: "transparent", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--text2)",
    fontSize: 11, fontWeight: 600,
    fontFamily: "'Instrument Sans', sans-serif",
    transition: "all 0.12s",
  };
  const sepStyle: React.CSSProperties = {
    width: 1, height: 16, background: "var(--border)", margin: "0 2px",
  };

  function hoverEnter(e: React.MouseEvent<HTMLButtonElement>) {
    (e.currentTarget as HTMLElement).style.background = "var(--border)";
    (e.currentTarget as HTMLElement).style.color = "var(--text)";
  }
  function hoverLeave(e: React.MouseEvent<HTMLButtonElement>) {
    (e.currentTarget as HTMLElement).style.background = "transparent";
    (e.currentTarget as HTMLElement).style.color = "var(--text2)";
  }

  return (
    <div
      ref={tbRef}
      style={{
        position: "fixed",
        top: pos.top - 32,
        left: adjustedLeft,
        transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 1,
        background: "var(--elevated2)",
        border: "1px solid var(--border2)",
        borderRadius: 8,
        padding: 3,
        boxShadow: "0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
        zIndex: 50,
        animation: "toolbarIn 0.15s cubic-bezier(0.16,1,0.3,1) both",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button style={btnStyle} onMouseEnter={hoverEnter} onMouseLeave={hoverLeave} onClick={() => onAction("bold")}><b>B</b></button>
      <button style={btnStyle} onMouseEnter={hoverEnter} onMouseLeave={hoverLeave} onClick={() => onAction("italic")}><i>I</i></button>
      <button style={{ ...btnStyle, textDecoration: "underline" }} onMouseEnter={hoverEnter} onMouseLeave={hoverLeave} onClick={() => onAction("underline")}>U</button>
      <button style={{ ...btnStyle, fontFamily: "'Geist Mono',monospace", fontSize: 10 }} onMouseEnter={hoverEnter} onMouseLeave={hoverLeave} onClick={() => onAction("code")}>`</button>
      <div style={sepStyle} />
      <button style={{ ...btnStyle, fontSize: 10 }} onMouseEnter={hoverEnter} onMouseLeave={hoverLeave} onClick={() => onAction("h1")}>H1</button>
      <button style={{ ...btnStyle, fontSize: 10 }} onMouseEnter={hoverEnter} onMouseLeave={hoverLeave} onClick={() => onAction("h2")}>H2</button>
      <button style={btnStyle} onMouseEnter={hoverEnter} onMouseLeave={hoverLeave} onClick={() => onAction("hr")}>—</button>
      <div style={sepStyle} />
      {(["#F87171", "#FB923C", "#4ADE80", "#A78BFA"] as const).map((color) => (
        <div
          key={color}
          onClick={() => onAction(`color:${color}`)}
          style={{
            width: 12, height: 12, borderRadius: "50%",
            background: color, cursor: "pointer",
            border: "1.5px solid rgba(255,255,255,0.15)",
            transition: "transform 0.12s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.2)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
        />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface NotesWidgetProps {
  panelId: string;
  panelUrl?: string;
  position?: "top" | "bottom";
  onCollapse?: () => void;
}

export function NotesWidget({ panelId, panelUrl, position = "bottom", onCollapse }: NotesWidgetProps) {
  const { content, pinnedContent, history, isSaving, lastSaved, wordCount, handleChange, handlePin, handleUnpin, loadHistoryEntry, refreshHistory } = useNotes(panelId);

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [showHistory, setShowHistory] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [copyLabel, setCopyLabel] = useState("copiar todo");
  const [isHovering, setIsHovering] = useState(false);
  const [pinConfirmPending, setPinConfirmPending] = useState(false);
  const [toolbarPos, setToolbarPos] = useState<ToolbarPos | null>(null);
  const [lastSavedDisplay, setLastSavedDisplay] = useState("nunca");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const relativeTimeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { hostname, faviconUrl } = getPanelContext(panelUrl);

  // Actualizar display de "editado hace X" cada 30s
  useEffect(() => {
    setLastSavedDisplay(formatRelativeTime(lastSaved));
    if (relativeTimeRef.current) clearInterval(relativeTimeRef.current);
    relativeTimeRef.current = setInterval(() => {
      setLastSavedDisplay(formatRelativeTime(lastSaved));
    }, 30000);
    return () => {
      if (relativeTimeRef.current) clearInterval(relativeTimeRef.current);
    };
  }, [lastSaved]);

  // Save indicator: activar cuando isSaving cambia de true a false
  useEffect(() => {
    if (!isSaving && lastSaved) {
      setShowSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setShowSaved(false), 2000);
    }
  }, [isSaving, lastSaved]);

  // Cerrar history dropdown al click fuera
  useEffect(() => {
    if (!showHistory) return;
    function handler(e: MouseEvent) {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showHistory]);

  // Floating toolbar: detectar selección en modo view
  function handleViewMouseUp() {
    const sel = window.getSelection();
    if (!sel || sel.toString().trim() === "") {
      setToolbarPos(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setToolbarPos({ top: rect.top, left: rect.left + rect.width / 2 });
  }

  // Aplicar formato en el textarea
  function applyFormat(action: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: start, selectionEnd: end, value } = ta;
    const selected = value.slice(start, end);
    let replacement = selected;

    if (action === "bold") replacement = `**${selected}**`;
    else if (action === "italic") replacement = `_${selected}_`;
    else if (action === "underline") replacement = `<u>${selected}</u>`;
    else if (action === "code") replacement = `\`${selected}\``;
    else if (action === "h1") {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      ta.setSelectionRange(lineStart, end);
      replacement = `# ${value.slice(lineStart, end)}`;
    } else if (action === "h2") {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      ta.setSelectionRange(lineStart, end);
      replacement = `## ${value.slice(lineStart, end)}`;
    } else if (action === "hr") {
      replacement = `\n---\n`;
    }

    const newValue = value.slice(0, ta.selectionStart) + replacement + value.slice(ta.selectionEnd);
    handleChange(newValue);
    setToolbarPos(null);
  }

  function handleCheckboxToggle(lineIdx: number, newChecked: boolean) {
    const lines = content.split("\n");
    const line = lines[lineIdx];
    lines[lineIdx] = newChecked
      ? line.replace(/^\[ \]/, "[x]")
      : line.replace(/^\[x\]/i, "[ ]");
    handleChange(lines.join("\n"));
  }

  function handleCopyAll() {
    navigator.clipboard.writeText(content).catch(console.error);
    setCopyLabel("copiado ✓");
    setTimeout(() => setCopyLabel("copiar todo"), 1500);
  }

  function handleExportMd() {
    const date = new Date().toISOString().split("T")[0];
    const label = hostname.replace(/[^a-z0-9]/gi, "-");
    const filename = `stride-notes-${label}-${date}.md`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleHistoryLoad(entry: NoteHistoryEntry) {
    loadHistoryEntry(entry);
    setShowHistory(false);
    setMode("edit");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function enterEdit() {
    setMode("edit");
    setTimeout(() => {
      textareaRef.current?.focus();
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    }, 10);
  }

  const isEmpty = content.trim() === "";

  // ── Render ─────────────────────────────────────────────────────────────────

  const headerBtnStyle: React.CSSProperties = {
    width: 22, height: 22,
    borderRadius: 5, border: "none",
    background: "transparent", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--text3)", transition: "all 0.15s",
    flexShrink: 0,
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        display: "flex", flexDirection: "column",
        height: "100%", width: "100%",
        marginTop:10,
        background: "rgba(15,13,23,0.95)",
        overflow: "hidden",
        position: "relative",
        fontFamily: "'Instrument Sans', sans-serif",
      }}
    >
      {/* Amber gradient line */}
      <div style={{
        position: "absolute",
        ...(position === "top" ? { bottom: 0 } : { top: 0 }),
        left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent 0%, var(--amber) 30%, var(--amber) 70%, transparent 100%)",
        opacity: 0.7,
        pointerEvents: "none",
        zIndex: 1,
      }} />

      {/* ── HEADER ── */}
      <div style={{
        height: 32, display: "flex", alignItems: "center",
        padding: "0 12px", gap: 8,
        background: "rgba(19,17,28,0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(46,43,62,0.6)",
        flexShrink: 0, position: "relative", zIndex: 2,
      }}>
        {/* Dot */}
        <div style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "var(--amber)",
          boxShadow: "0 0 6px var(--amber)",
          flexShrink: 0,
        }} />

        {/* Label */}
        <span style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: 9, fontWeight: 500,
          textTransform: "uppercase", letterSpacing: "0.14em",
          color: "var(--text3)", flex: 1,
        }}>
          notas rápidas
        </span>

        {/* Context pill */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "var(--elevated)",
            border: "1px solid var(--border2)",
            borderRadius: 20,
            padding: "2px 8px 2px 6px",
            fontSize: 9, color: "var(--text2)",
            fontFamily: "'Geist Mono', monospace",
            cursor: "default",
            transition: "all 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--amber)";
            (e.currentTarget as HTMLElement).style.color = "var(--amber)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)";
            (e.currentTarget as HTMLElement).style.color = "var(--text2)";
          }}
        >
          {faviconUrl ? (
            <img src={faviconUrl} width={10} height={10} style={{ borderRadius: 2, objectFit: "cover" }} alt="" />
          ) : (
            <span style={{ fontSize: 10 }}>●</span>
          )}
          {hostname}
        </div>

        {/* Save indicator */}
        {showSaved && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 8.5, color: "var(--green)",
            fontFamily: "'Geist Mono', monospace",
            animation: "fadeIn 0.3s ease",
            flexShrink: 0,
          }}>
            <div style={{
              width: 4, height: 4, borderRadius: "50%",
              background: "var(--green)",
              boxShadow: "0 0 5px var(--green)",
            }} />
            guardado
          </div>
        )}

        {/* History button */}
        <div style={{ position: "relative", flexShrink: 0 }} ref={historyRef}>
          <button
            style={headerBtnStyle}
            title="Historial"
            onClick={async () => {
              await refreshHistory();
              setShowHistory(!showHistory);
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--elevated)";
              (e.currentTarget as HTMLElement).style.color = "var(--text2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--text3)";
            }}
          >
            <HistoryIcon />
          </button>

          {/* History dropdown */}
          {showHistory && (
            <div style={{
              position: "absolute",
              top: 28, right: 0,
              width: 240,
              background: "var(--elevated2)",
              border: "1px solid var(--border2)",
              borderRadius: 10,
              boxShadow: "0 12px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)",
              zIndex: 40,
              overflow: "hidden",
              animation: "dropIn 0.18s cubic-bezier(0.16,1,0.3,1) both",
            }}>
              <div style={{
                padding: "8px 12px 6px",
                fontSize: 8.5, color: "var(--text3)",
                fontFamily: "'Geist Mono', monospace",
                textTransform: "uppercase", letterSpacing: "0.12em",
                borderBottom: "1px solid var(--border)",
              }}>
                historial · {hostname}
              </div>
              {history.length === 0 && (
                <div style={{ padding: "10px 12px", fontSize: 9, color: "var(--text3)", fontFamily: "'Geist Mono', monospace" }}>
                  sin historial aún
                </div>
              )}
              {history.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => handleHistoryLoad(entry)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid rgba(46,43,62,0.5)",
                    transition: "background 0.12s",
                    display: "flex", flexDirection: "column", gap: 2,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(124,106,247,0.06)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div style={{ fontSize: 8.5, color: "var(--text3)", fontFamily: "'Geist Mono', monospace" }}>
                    {formatHistoryDate(entry.saved_at)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {entry.content.slice(0, 50)}
                  </div>
                </div>
              ))}
              <div style={{
                padding: "8px 12px",
                fontSize: 9, color: "var(--text3)",
                fontFamily: "'Geist Mono', monospace",
                textAlign: "center",
              }}>
                ver todo el historial →
              </div>
            </div>
          )}
        </div>

        {/* Pin button — visible si hay nota fijada o hovering */}
        {(pinnedContent !== "" || isHovering) && (
          <button
            style={{
              ...headerBtnStyle,
              color: pinnedContent ? "var(--amber)" : "var(--text3)",
              background: pinnedContent ? "var(--amber-dim)" : "transparent",
              border: pinnedContent ? "1px solid rgba(251,146,60,0.2)" : "none",
            }}
            title={pinnedContent ? "Nota fijada" : "Fijar selección"}
            onClick={() => {
              if (pinnedContent) {
                setPinConfirmPending(true);
              } else {
                const sel = window.getSelection()?.toString().trim();
                if (sel) handlePin(sel);
              }
            }}
          >
            <PinIcon />
          </button>
        )}

        {/* Collapse button */}
        {onCollapse && (
          <button
            style={headerBtnStyle}
            title="Colapsar"
            onClick={onCollapse}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--elevated)";
              (e.currentTarget as HTMLElement).style.color = "var(--text2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--text3)";
            }}
          >
            <ChevronDownIcon />
          </button>
        )}
      </div>

      {/* ── PINNED NOTE ── */}
      {pinnedContent !== "" && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 8,
          padding: "8px 12px",
          background: "rgba(251,146,60,0.04)",
          borderBottom: "1px solid rgba(251,146,60,0.12)",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, marginTop: 1, flexShrink: 0 }}>📌</span>
          <div style={{
            fontSize: 10, color: "var(--amber)",
            fontFamily: "'Geist Mono', monospace",
            lineHeight: 1.5, flex: 1,
            opacity: 0.85,
          }}>
            {pinConfirmPending ? (
              <span>
                ¿Eliminar nota fijada?{" "}
                <span
                  style={{ cursor: "pointer", textDecoration: "underline dotted" }}
                  onClick={() => { handleUnpin(); setPinConfirmPending(false); }}
                >
                  sí
                </span>
                {" · "}
                <span
                  style={{ cursor: "pointer", textDecoration: "underline dotted" }}
                  onClick={() => setPinConfirmPending(false)}
                >
                  no
                </span>
              </span>
            ) : pinnedContent}
          </div>
          <button
            style={{
              width: 14, height: 14,
              borderRadius: 3, border: "none",
              background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text3)", fontSize: 10,
              flexShrink: 0, transition: "all 0.15s",
            }}
            onClick={() => setPinConfirmPending(true)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.1)";
              (e.currentTarget as HTMLElement).style.color = "var(--red)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--text3)";
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── EDITOR AREA ── */}
      <div
        style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 80 }}
        onClick={() => { if (mode === "view") enterEdit(); }}
      >
        {/* Lined paper background */}
        <div style={{
          position: "absolute", inset: 0,
          pointerEvents: "none",
          backgroundImage: "repeating-linear-gradient(to bottom, transparent 0px, transparent 23px, rgba(255,255,255,0.022) 23px, rgba(255,255,255,0.022) 24px)",
          backgroundPosition: "0 12px",
        }} />

        {/* View mode: rendered markdown */}
        {mode === "view" && (
          <div
            style={{
              position: "relative", zIndex: 1,
              padding: "12px 14px",
              height: "100%",
              overflowY: "auto",
              scrollbarWidth: "thin",
              scrollbarColor: "var(--border2) transparent",
              cursor: "text",
            }}
            onMouseUp={handleViewMouseUp}
          >
            {isEmpty ? (
              <div style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                height: "100%", gap: 8,
                opacity: 0.4, pointerEvents: "none",
              }}>
                <PencilIcon />
                <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "'Geist Mono', monospace", letterSpacing: "0.06em" }}>
                  escribe algo...
                </div>
                <div style={{ fontSize: 8.5, color: "var(--text4)", fontFamily: "'Geist Mono', monospace" }}>
                  markdown soportado · se guarda automáticamente
                </div>
              </div>
            ) : (
              <>
                {content.split("\n").map((line, i) =>
                  parseLine(line, i, handleCheckboxToggle)
                )}
                {/* Cursor blink at end */}
                <div style={{ display: "flex", alignItems: "center", lineHeight: "24px" }}>
                  <span style={{
                    display: "inline-block",
                    width: 2, height: 14,
                    background: "var(--accent)",
                    borderRadius: 1,
                    marginLeft: 1,
                    verticalAlign: "middle",
                    animation: "blink 1.1s step-end infinite",
                    boxShadow: "0 0 6px var(--accent)",
                  }} />
                </div>
              </>
            )}
          </div>
        )}

        {/* Edit mode: textarea */}
        {mode === "edit" && (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => setMode("view")}
            onMouseUp={() => {
              const sel = window.getSelection()?.toString().trim();
              if (!sel) setToolbarPos(null);
            }}
            spellCheck={false}
            style={{
              position: "relative", zIndex: 1,
              width: "100%", height: "100%",
              padding: "12px 14px",
              resize: "none",
              border: "none", outline: "none",
              background: "transparent",
              color: "var(--text2)",
              fontSize: 11,
              lineHeight: "24px",
              fontFamily: "'Instrument Sans', sans-serif",
              caretColor: "var(--accent)",
              scrollbarWidth: "thin",
              scrollbarColor: "var(--border2) transparent",
            }}
          />
        )}

        {/* Floating toolbar over view mode */}
        {toolbarPos && mode === "view" && (
          <FloatingToolbar
            pos={toolbarPos}
            containerRef={containerRef}
            onAction={applyFormat}
          />
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        height: 26,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 12px",
        borderTop: "1px solid rgba(46,43,62,0.5)",
        background: "rgba(15,13,23,0.6)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            fontSize: 8.5, color: "var(--text3)",
            fontFamily: "'Geist Mono', monospace",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <ClockIcon />
            {lastSavedDisplay}
          </div>
          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--text4)", flexShrink: 0 }} />
          <div style={{ fontSize: 8.5, color: "var(--text3)", fontFamily: "'Geist Mono', monospace" }}>
            {wordCount} palabras
          </div>
          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--text4)", flexShrink: 0 }} />
          <div style={{ fontSize: 8.5, color: "var(--text3)", fontFamily: "'Geist Mono', monospace" }}>
            {hostname} · panel {panelId.slice(-1) || "?"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={handleCopyAll}
            style={{
              height: 18, padding: "0 7px",
              borderRadius: 4, border: "none",
              background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 8.5,
              color: copyLabel.includes("✓") ? "var(--green)" : "var(--text3)",
              fontFamily: "'Geist Mono', monospace",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!copyLabel.includes("✓")) {
                (e.currentTarget as HTMLElement).style.background = "var(--elevated)";
                (e.currentTarget as HTMLElement).style.color = "var(--text2)";
              }
            }}
            onMouseLeave={(e) => {
              if (!copyLabel.includes("✓")) {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--text3)";
              }
            }}
          >
            <CopyIcon />
            {copyLabel}
          </button>

          <button
            onClick={handleExportMd}
            style={{
              height: 18, padding: "0 7px",
              borderRadius: 4, border: "none",
              background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 8.5, color: "var(--text3)",
              fontFamily: "'Geist Mono', monospace",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--elevated)";
              (e.currentTarget as HTMLElement).style.color = "var(--text2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--text3)";
            }}
          >
            <DownloadIcon />
            exportar .md
          </button>
        </div>
      </div>

      {/* Keyframe animations via style tag */}
      <style>{`
        @keyframes toolbarIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px) scale(0.96); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
