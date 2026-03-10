import { useState, useEffect, useCallback } from "react";
import { getDb } from "@/lib/db";

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon_url: string | null;
  created_at: string;
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const load = useCallback(async () => {
    const db = await getDb();
    const rows = await db.select<Bookmark[]>(
      "SELECT id, title, url, favicon_url, created_at FROM bookmarks ORDER BY created_at DESC"
    );
    setBookmarks(rows);
  }, []);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const save = async (title: string, url: string, faviconUrl?: string) => {
    const db = await getDb();
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);
    const existing = await db.select<{ id: string }[]>(
      "SELECT id FROM bookmarks WHERE url = ?",
      [url]
    );
    if (existing.length > 0) {
      await db.execute(
        "UPDATE bookmarks SET title = ?, favicon_url = ? WHERE url = ?",
        [title, faviconUrl ?? null, url]
      );
    } else {
      await db.execute(
        "INSERT INTO bookmarks(id, title, url, favicon_url, created_at) VALUES(?, ?, ?, ?, ?)",
        [crypto.randomUUID(), title, url, faviconUrl ?? null, now]
      );
    }
    await load();
  };

  const remove = async (id: string) => {
    const db = await getDb();
    await db.execute("DELETE FROM bookmarks WHERE id = ?", [id]);
    await load();
  };

  const isBookmarked = useCallback(
    (url: string) => bookmarks.some((b) => b.url === url),
    [bookmarks]
  );

  const getBookmark = useCallback(
    (url: string) => bookmarks.find((b) => b.url === url),
    [bookmarks]
  );

  const search = useCallback(
    (query: string) => {
      if (!query.trim()) return bookmarks;
      const q = query.toLowerCase();
      return bookmarks.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q)
      );
    },
    [bookmarks]
  );

  return { bookmarks, save, remove, isBookmarked, getBookmark, search };
}
