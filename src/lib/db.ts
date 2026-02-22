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
}
