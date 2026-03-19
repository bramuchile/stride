import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Bold,
  CheckSquare,
  Copy,
  Download,
  FileText,
  Heading2,
  Heading3,
  Italic,
  List,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Type,
} from "lucide-react";
import { useWorkspaces } from "@/hooks/useWorkspaces";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

interface NotesWidgetProps {
  workspaceId: string;
  onCollapse?: () => void;
  onRemovePanel?: () => void;
  canRemove?: boolean;
}

const ACCENT = "#7c6af5";
const FONT_SIZES = [13, 15, 11] as const;

function formatUpdatedAt(ts: number): string {
  if (!ts) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts * 1000));
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

function safeFileName(name: string): string {
  return (name.trim() || "nota").replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").slice(0, 80);
}

function wrapSelection(textarea: HTMLTextAreaElement, before: string, after = "") {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  return {
    value: textarea.value.slice(0, start) + before + selected + after + textarea.value.slice(end),
    start: start + before.length,
    end: start + before.length + selected.length,
  };
}

function prefixLine(textarea: HTMLTextAreaElement, prefix: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const lineStart = textarea.value.lastIndexOf("\n", start - 1) + 1;
  return {
    value: textarea.value.slice(0, lineStart) + prefix + textarea.value.slice(lineStart),
    start: start + prefix.length,
    end: end + prefix.length,
  };
}

export function NotesWidget({
  workspaceId,
  onCollapse,
  onRemovePanel,
  canRemove,
}: NotesWidgetProps) {
  const { data: workspaces = [] } = useWorkspaces();
  const workspace = workspaces.find((item) => item.id === workspaceId);

  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"editor" | "list">("editor");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [fontSizeIndex, setFontSizeIndex] = useState(0);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [loading, setLoading] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<number | null>(null);

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? null,
    [notes, activeNoteId]
  );
  const filteredNotes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? notes.filter((note) => note.title.toLowerCase().includes(term)) : notes;
  }, [notes, search]);

  async function persistWorkspaceState(noteId: string | null) {
    await invoke("set_workspace_widget_state", {
      workspaceId,
      widgetType: "notes",
      stateJson: JSON.stringify(noteId ? { active_note_id: noteId } : {}),
    });
  }

  async function loadNotesAndState() {
    setLoading(true);
    try {
      const [allNotes, stateJson] = await Promise.all([
        invoke<Note[]>("get_notes"),
        invoke<string | null>("get_workspace_widget_state", {
          workspaceId,
          widgetType: "notes",
        }),
      ]);
      setNotes(allNotes);
      const parsed = stateJson ? (JSON.parse(stateJson) as { active_note_id?: string }) : {};
      const selected = allNotes.find((note) => note.id === parsed.active_note_id) ?? null;
      setActiveNoteId(selected?.id ?? null);
      setDraftTitle(selected?.title ?? "");
      setDraftContent(selected?.content ?? "");
      setSaveState("saved");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotesAndState().catch(console.error);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!activeNote) return;
    if (draftTitle === activeNote.title && draftContent === activeNote.content) return;

    setSaveState("saving");
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const updated = await invoke<Note>("update_note", {
          id: activeNote.id,
          title: draftTitle,
          content: draftContent,
        });
        setNotes((current) =>
          [updated, ...current.filter((note) => note.id !== updated.id)].sort(
            (a, b) => b.updated_at - a.updated_at
          )
        );
      } catch (error) {
        console.error(error);
      } finally {
        setSaveState("saved");
      }
    }, 1000);
  }, [activeNote, draftTitle, draftContent]);

  async function selectNote(note: Note) {
    setActiveNoteId(note.id);
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setSaveState("saved");
    setTab("editor");
    await persistWorkspaceState(note.id);
  }

  async function createNote() {
    const note = await invoke<Note>("create_note", { title: "", content: "" });
    setNotes((current) => [note, ...current]);
    await selectNote(note);
  }

  async function deleteActiveNote() {
    if (!activeNoteId) return;
    await invoke("delete_note", { id: activeNoteId });
    setNotes((current) => current.filter((note) => note.id !== activeNoteId));
    setActiveNoteId(null);
    setDraftTitle("");
    setDraftContent("");
    setSaveState("saved");
    await persistWorkspaceState(null);
  }

  function applyAction(action: "bold" | "italic" | "h2" | "h3" | "list" | "check") {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const result =
      action === "bold"
        ? wrapSelection(textarea, "**", "**")
        : action === "italic"
          ? wrapSelection(textarea, "_", "_")
          : action === "h2"
            ? prefixLine(textarea, "## ")
            : action === "h3"
              ? prefixLine(textarea, "### ")
              : action === "list"
                ? prefixLine(textarea, "- ")
                : prefixLine(textarea, "- [ ] ");
    setDraftContent(result.value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.start, result.end);
    });
  }

  async function copyCurrentNote() {
    const payload = [draftTitle.trim(), draftContent.trim()].filter(Boolean).join("\n\n");
    await navigator.clipboard.writeText(payload);
  }

  function downloadMarkdown() {
    const payload = [draftTitle.trim(), draftContent.trim()].filter(Boolean).join("\n\n");
    const blob = new Blob([payload], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(draftTitle)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const editorFontSize = FONT_SIZES[fontSizeIndex];
  const wordCount = countWords(`${draftTitle} ${draftContent}`);
  const statusColor = saveState === "saved" ? "var(--green)" : "var(--amber)";

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "linear-gradient(180deg, #16151f 0%, #0f0e18 100%)", color: "var(--text)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, height: 44, padding: "0 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(15,14,24,0.88)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <FileText size={15} color={ACCENT} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Notas</span>
          <button style={{ border: "1px solid rgba(124,106,245,0.22)", background: "rgba(124,106,245,0.08)", color: "#c7bcff", borderRadius: 999, padding: "3px 10px", fontSize: 10, cursor: "default" }}>
            {workspace?.name ?? "Workspace"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: 3, borderRadius: 999, background: "#1e1c2a", border: "1px solid rgba(255,255,255,0.06)" }}>
          {(["editor", "list"] as const).map((mode) => (
            <button key={mode} onClick={() => setTab(mode)} style={{ border: "none", borderRadius: 999, padding: "5px 10px", fontSize: 11, cursor: "pointer", background: tab === mode ? "rgba(124,106,245,0.12)" : "transparent", color: tab === mode ? "#c7bcff" : "var(--text3)" }}>
              {mode === "editor" ? "Editor" : "Lista"}
            </button>
          ))}
        </div>
        <button onClick={() => createNote().catch(console.error)} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid rgba(124,106,245,0.24)", background: "rgba(124,106,245,0.12)", color: "#f4f1ff", borderRadius: 10, padding: "7px 11px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={13} />
          Nueva
        </button>
        {canRemove && onRemovePanel && (
          <button
            onClick={onRemovePanel}
            title="Cerrar panel"
            style={{
              width: 22,
              height: 22,
              background: "transparent",
              border: "none",
              color: "var(--text3)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4,
              flexShrink: 0,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "rgba(239,68,68,0.12)";
              el.style.color = "var(--red)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "transparent";
              el.style.color = "var(--text3)";
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {(tab === "list" || !sidebarCollapsed) && (
          <aside style={{ width: tab === "list" ? "100%" : 200, minWidth: tab === "list" ? "100%" : 200, display: "flex", flexDirection: "column", borderRight: tab === "list" ? "none" : "1px solid rgba(255,255,255,0.07)", background: "#16151f" }}>
            <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,0.07)", background: "#1e1c2a", borderRadius: 10, padding: "0 10px", height: 34 }}>
                <Search size={14} color="var(--text3)" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar notas" style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: "var(--text)", fontSize: 12 }} />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
              {loading ? (
                <div style={{ padding: 16, color: "var(--text3)", fontSize: 12 }}>Cargando…</div>
              ) : filteredNotes.length === 0 ? (
                <div style={{ padding: 16, color: "var(--text3)", fontSize: 12 }}>No hay notas que coincidan.</div>
              ) : (
                filteredNotes.map((note) => {
                  const isActive = activeNoteId === note.id;
                  return (
                    <button key={note.id} onClick={() => selectNote(note).catch(console.error)} style={{ width: "100%", textAlign: "left", border: "1px solid transparent", background: isActive ? "rgba(124,106,245,0.08)" : "transparent", borderRadius: 12, padding: "10px 10px 9px", marginBottom: 4, cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT, boxShadow: "0 0 0 3px rgba(124,106,245,0.12)", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? ACCENT : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {note.title.trim() || "Sin título"}
                        </span>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 10, color: "var(--text3)" }}>{formatUpdatedAt(note.updated_at)}</div>
                    </button>
                  );
                })
              )}
            </div>
            <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button onClick={() => createNote().catch(console.error)} style={{ width: "100%", height: 36, borderRadius: 10, border: "1px dashed rgba(255,255,255,0.16)", background: "transparent", color: "var(--text2)", cursor: "pointer", fontSize: 12 }}>
                Nueva nota
              </button>
            </div>
          </aside>
        )}

        {tab === "editor" && (
          <section style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#1a1825", flexShrink: 0 }}>
              {[
                { key: "bold", icon: <Bold size={14} /> },
                { key: "italic", icon: <Italic size={14} /> },
                { key: "h2", icon: <Heading2 size={14} /> },
                { key: "h3", icon: <Heading3 size={14} /> },
                { key: "list", icon: <List size={14} /> },
                { key: "check", icon: <CheckSquare size={14} /> },
              ].map((item) => (
                <button key={item.key} onClick={() => applyAction(item.key as "bold" | "italic" | "h2" | "h3" | "list" | "check")} style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid rgba(255,255,255,0.06)", background: "#242133", color: "var(--text2)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  {item.icon}
                </button>
              ))}
              <button onClick={() => setFontSizeIndex((current) => (current + 1) % FONT_SIZES.length)} style={{ height: 30, padding: "0 10px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.06)", background: "#242133", color: "var(--text2)", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11 }}>
                <Type size={14} />
                Aa
              </button>
              <button onClick={() => setSidebarCollapsed((current) => !current)} title={sidebarCollapsed ? "Mostrar lista" : "Ocultar lista"} style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid rgba(255,255,255,0.06)", background: "#242133", color: "var(--text2)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                {sidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
              </button>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: statusColor }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, boxShadow: `0 0 0 4px ${saveState === "saved" ? "rgba(74,222,128,0.12)" : "rgba(251,146,60,0.14)"}`, animation: saveState === "saving" ? "notesPulse 1s infinite" : undefined }} />
                {saveState === "saved" ? "Guardado" : "Guardando..."}
              </div>
              {onCollapse && (
                <button onClick={onCollapse} style={{ marginLeft: 8, border: "none", background: "transparent", color: "var(--text3)", cursor: "pointer", fontSize: 11 }}>
                  Ocultar
                </button>
              )}
            </div>

            {!activeNote ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                <div style={{ textAlign: "center", maxWidth: 260 }}>
                  <FileText size={28} color={ACCENT} style={{ margin: "0 auto 12px" }} />
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Selecciona una nota o crea una nueva</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>El estado activo se guarda por workspace.</div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "16px 18px 12px", flexShrink: 0 }}>
                    <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Título" style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "var(--text)", fontSize: 18, fontWeight: 600 }} />
                  </div>
                  <div style={{ margin: "0 18px", height: 1, background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />
                  <textarea ref={textareaRef} value={draftContent} onChange={(event) => setDraftContent(event.target.value)} placeholder="Empieza a escribir…" style={{ flex: 1, width: "100%", resize: "none", border: "none", outline: "none", background: "transparent", color: "var(--text2)", padding: 18, fontSize: editorFontSize, lineHeight: 1.65, fontFamily: "'Instrument Sans', sans-serif" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "#16151f", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>{wordCount} palabras</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => copyCurrentNote().catch(console.error)} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.07)", background: "#242133", color: "var(--text2)", cursor: "pointer", fontSize: 11 }}>
                      <Copy size={13} />
                      Copiar
                    </button>
                    <button onClick={downloadMarkdown} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.07)", background: "#242133", color: "var(--text2)", cursor: "pointer", fontSize: 11 }}>
                      <Download size={13} />
                      .md
                    </button>
                    <button onClick={() => deleteActiveNote().catch(console.error)} style={{ height: 30, padding: "0 10px", borderRadius: 9, border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.08)", color: "#f59b9b", cursor: "pointer", fontSize: 11 }}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </div>

      <style>{`
        @keyframes notesPulse {
          0% { transform: scale(0.95); opacity: 0.75; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.75; }
        }
      `}</style>
    </div>
  );
}
