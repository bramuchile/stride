import Database from "@tauri-apps/plugin-sql";

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

  // Tabla de notas por panel
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      panel_id       TEXT PRIMARY KEY,
      content        TEXT NOT NULL DEFAULT '',
      pinned_content TEXT NOT NULL DEFAULT '',
      updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Historial de versiones por panel (máx 10 por panel_id)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes_history (
      id       TEXT PRIMARY KEY,
      panel_id TEXT NOT NULL,
      content  TEXT NOT NULL,
      saved_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Migraciones aditivas — seguras de re-ejecutar
  const migrations = [
    `ALTER TABLE workspaces ADD COLUMN icon TEXT NOT NULL DEFAULT '📁'`,
    `ALTER TABLE panels ADD COLUMN overlay_widget_id TEXT`,
    `ALTER TABLE panels ADD COLUMN overlay_position TEXT`,
    `ALTER TABLE panels ADD COLUMN overlay_height_pct REAL`,
  ];

  for (const sql of migrations) {
    try {
      await db.execute(sql);
    } catch {
      // Columna ya existe — ignorar
    }
  }
}
