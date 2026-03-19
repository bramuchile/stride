import Database from "@tauri-apps/plugin-sql";
import type { DynamicLayout } from "@/types";

// Singleton: una sola conexión a la base de datos
let _db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.load("sqlite:stride.db");
    await runMigrations(_db);
  }
  return _db;
}

async function runMigrations(db: Database): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      layout     TEXT NOT NULL,
      position   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS panels (
      id           TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      type         TEXT NOT NULL,
      url          TEXT,
      widget_id    TEXT,
      position     INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      url         TEXT NOT NULL UNIQUE,
      favicon_url TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Estructura de layout dinámico por workspace (JSON)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS workspace_layouts (
      workspace_id TEXT PRIMARY KEY,
      layout_json  TEXT NOT NULL
    )
  `);

  // Migraciones aditivas — seguras de re-ejecutar
  const migrations = [
    `ALTER TABLE workspaces ADD COLUMN icon TEXT NOT NULL DEFAULT '📁'`,
    `ALTER TABLE panels ADD COLUMN overlay_widget_id TEXT`,
    `ALTER TABLE panels ADD COLUMN overlay_position TEXT`,
    `ALTER TABLE panels ADD COLUMN overlay_height_pct REAL`,
    // Fracción de ancho por panel (0.0–1.0) — persistida al arrastrar el PanelResizer
    `ALTER TABLE panels ADD COLUMN width_frac REAL`,
  ];

  for (const sql of migrations) {
    try {
      await db.execute(sql);
    } catch {
      // Columna ya existe — ignorar
    }
  }

  const noteColumns = await db.select<{ name: string }[]>("PRAGMA table_info(notes)");
  const legacyNotes = noteColumns.some((col) => col.name === "panel_id" || col.name === "pinned_content");
  if (legacyNotes) {
    await db.execute("DROP TABLE IF EXISTS notes");
  }
  await db.execute("DROP TABLE IF EXISTS notes_history");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS workspace_widget_state (
      workspace_id TEXT NOT NULL,
      widget_type TEXT NOT NULL,
      state_json TEXT NOT NULL DEFAULT '{}',
      PRIMARY KEY (workspace_id, widget_type)
    )
  `);

  await db.execute("UPDATE panels SET widget_id = 'notes' WHERE widget_id = 'scratchpad'");
  await db.execute("UPDATE panels SET overlay_widget_id = 'notes' WHERE overlay_widget_id = 'scratchpad'");

  // Migración de datos: eliminar layouts estáticos y forzar re-seed con layouts dinámicos.
  // Guarda: se ejecuta solo una vez gracias al flag 'migration_dynamic_layouts'.
  const migrationRows = await db.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key = 'migration_dynamic_layouts'"
  );
  if (migrationRows.length === 0) {
    await db.execute("DELETE FROM notes");
    await db.execute("DELETE FROM workspace_widget_state");
    await db.execute("DELETE FROM workspace_layouts");
    await db.execute("DELETE FROM panels");
    await db.execute("DELETE FROM workspaces");
    await db.execute("DELETE FROM settings WHERE key = 'seed_v2'");
    await db.execute("DELETE FROM settings WHERE key = 'seed_v3'");
    await db.execute("DELETE FROM settings WHERE key = 'seed_v4'");
    await db.execute("DELETE FROM settings WHERE key = 'onboarding_seeded'");
    await db.execute(
      "INSERT OR IGNORE INTO settings (key, value) VALUES ('migration_dynamic_layouts', 'true')"
    );
  }
}

// --- Helpers para layout dinámico ---

export async function getDynamicLayout(workspaceId: string): Promise<DynamicLayout | null> {
  const db = await getDb();
  const rows = await db.select<{ layout_json: string }[]>(
    "SELECT layout_json FROM workspace_layouts WHERE workspace_id = $1",
    [workspaceId]
  );
  if (rows.length === 0) return null;
  try {
    return JSON.parse(rows[0].layout_json) as DynamicLayout;
  } catch {
    return null;
  }
}

export async function saveDynamicLayout(workspaceId: string, layout: DynamicLayout): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT OR REPLACE INTO workspace_layouts (workspace_id, layout_json) VALUES ($1, $2)",
    [workspaceId, JSON.stringify(layout)]
  );
}
