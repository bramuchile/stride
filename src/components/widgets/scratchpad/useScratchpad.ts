import { useCallback, useEffect, useState } from "react";
import { getDb } from "@/lib/db";

const SETTING_KEY = "scratchpad_content";

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, ms: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function useScratchpad() {
  const [content, setContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Cargar contenido al montar el componente
  useEffect(() => {
    getDb()
      .then((db) =>
        db.select<{ value: string }[]>(
          "SELECT value FROM settings WHERE key = $1",
          [SETTING_KEY]
        )
      )
      .then((rows) => {
        if (rows[0]) setContent(rows[0].value);
      })
      .catch(console.error);
  }, []);

  // Guardar con debounce para no saturar SQLite
  const persist = useCallback(
    debounce(async (text: string) => {
      setIsSaving(true);
      try {
        const db = await getDb();
        await db.execute(
          "INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)",
          [SETTING_KEY, text]
        );
      } finally {
        setIsSaving(false);
      }
    }, 800),
    []
  );

  const handleChange = (text: string) => {
    setContent(text);
    persist(text);
  };

  return { content, handleChange, isSaving };
}
