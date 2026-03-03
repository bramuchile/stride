import { useState, useEffect, useRef, useCallback } from "react";
import { getDb } from "@/lib/db";
import { useNotesStore } from "@/store/useNotesStore";

export interface NoteHistoryEntry {
  id: string;
  panel_id: string;
  content: string;
  saved_at: string;
}

interface UseNotesReturn {
  content: string;
  pinnedContent: string;
  history: NoteHistoryEntry[];
  isSaving: boolean;
  lastSaved: Date | null;
  wordCount: number;
  handleChange: (value: string) => void;
  handlePin: (text: string) => void;
  handleUnpin: () => void;
  loadHistoryEntry: (entry: NoteHistoryEntry) => void;
  refreshHistory: () => Promise<void>;
}

function countWords(text: string): number {
  const stripped = text.replace(/[#`\-\[\]→]/g, " ").trim();
  if (!stripped) return 0;
  return stripped.split(/\s+/).filter(Boolean).length;
}

function generateId(): string {
  return crypto.randomUUID();
}

export function useNotes(panelId: string): UseNotesReturn {
  const [content, setContent] = useState("");
  const [pinnedContent, setPinnedContent] = useState("");
  const [history, setHistory] = useState<NoteHistoryEntry[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { savingPanels, setSaving } = useNotesStore();
  const isSaving = savingPanels.has(panelId);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef(content);
  const latestPinnedRef = useRef(pinnedContent);

  // Cargar datos al montar
  useEffect(() => {
    async function load() {
      const db = await getDb();
      const rows = await db.select<{ content: string; pinned_content: string; updated_at: string }[]>(
        "SELECT content, pinned_content, updated_at FROM notes WHERE panel_id = ?",
        [panelId]
      );
      if (rows.length > 0) {
        setContent(rows[0].content);
        setPinnedContent(rows[0].pinned_content);
        latestContentRef.current = rows[0].content;
        latestPinnedRef.current = rows[0].pinned_content;
        setLastSaved(new Date(rows[0].updated_at));
      }
      await loadHistoryFromDb();
    }
    load().catch(console.error);
  }, [panelId]);

  async function loadHistoryFromDb() {
    const db = await getDb();
    const rows = await db.select<NoteHistoryEntry[]>(
      "SELECT id, panel_id, content, saved_at FROM notes_history WHERE panel_id = ? ORDER BY saved_at DESC LIMIT 5",
      [panelId]
    );
    setHistory(rows);
  }

  const refreshHistory = useCallback(async () => {
    await loadHistoryFromDb();
  }, [panelId]);

  async function persist(newContent: string, newPinned: string) {
    setSaving(panelId, true);
    try {
      const db = await getDb();
      const now = new Date().toISOString().replace("T", " ").substring(0, 19);

      await db.execute(
        `INSERT OR REPLACE INTO notes(panel_id, content, pinned_content, updated_at, created_at)
         VALUES(?, ?, ?, ?, COALESCE((SELECT created_at FROM notes WHERE panel_id = ?), ?))`,
        [panelId, newContent, newPinned, now, panelId, now]
      );

      // Solo guardar en historial si hay contenido
      if (newContent.trim()) {
        await db.execute(
          "INSERT INTO notes_history(id, panel_id, content, saved_at) VALUES(?, ?, ?, ?)",
          [generateId(), panelId, newContent, now]
        );
        // Purgar entradas antiguas (mantener máx 10)
        await db.execute(
          `DELETE FROM notes_history WHERE panel_id = ? AND id NOT IN (
             SELECT id FROM notes_history WHERE panel_id = ? ORDER BY saved_at DESC LIMIT 10
           )`,
          [panelId, panelId]
        );
      }

      setLastSaved(new Date());
      await loadHistoryFromDb();
    } finally {
      setSaving(panelId, false);
    }
  }

  const handleChange = useCallback((value: string) => {
    setContent(value);
    latestContentRef.current = value;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persist(latestContentRef.current, latestPinnedRef.current).catch(console.error);
    }, 500);
  }, [panelId]);

  const handlePin = useCallback((text: string) => {
    setPinnedContent(text);
    latestPinnedRef.current = text;
    persist(latestContentRef.current, text).catch(console.error);
  }, [panelId]);

  const handleUnpin = useCallback(() => {
    setPinnedContent("");
    latestPinnedRef.current = "";
    persist(latestContentRef.current, "").catch(console.error);
  }, [panelId]);

  const loadHistoryEntry = useCallback((entry: NoteHistoryEntry) => {
    setContent(entry.content);
    latestContentRef.current = entry.content;
    // No auto-save al cargar historial para evitar sobreescritura inmediata
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const wordCount = countWords(content);

  return {
    content,
    pinnedContent,
    history,
    isSaving,
    lastSaved,
    wordCount,
    handleChange,
    handlePin,
    handleUnpin,
    loadHistoryEntry,
    refreshHistory,
  };
}
