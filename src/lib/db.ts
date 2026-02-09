import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDatabase() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'empusa.db');
    db = new Database(dbPath);

    // Initialize the logs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        step INTEGER NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        error TEXT,
        error_code TEXT,
        remedy_attempted TEXT,
        timestamp TEXT NOT NULL,
        state_snapshot TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add new columns if they don't exist (for existing databases)
    try {
      db.exec(`ALTER TABLE logs ADD COLUMN state_snapshot TEXT`);
    } catch (e) {
      // Column already exists, ignore error
    }

    try {
      db.exec(`ALTER TABLE logs ADD COLUMN error_code TEXT`);
    } catch (e) {
      // Column already exists, ignore error
    }

    try {
      db.exec(`ALTER TABLE logs ADD COLUMN remedy_attempted TEXT`);
    } catch (e) {
      // Column already exists, ignore error
    }

    // Create index for faster queries
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_session_id ON logs(session_id);
    `);

    // Sessions table: tracks ACTIVE vs BLOCKED status per session
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        blocked_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Errors table: ingested console errors from scripts
    db.exec(`
      CREATE TABLE IF NOT EXISTS errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        error_message TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_errors_session ON errors(session_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_errors_timestamp ON errors(timestamp);`);

    // Proxy logs: every request that hits the proxy
    db.exec(`
      CREATE TABLE IF NOT EXISTS proxy_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        target_url TEXT NOT NULL,
        method TEXT NOT NULL,
        outcome TEXT NOT NULL,
        status_code INTEGER,
        timestamp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_proxy_session ON proxy_logs(session_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_proxy_timestamp ON proxy_logs(timestamp);`);

    // Add blocked_at column for auto-recovery cooldowns
    try {
      db.exec(`ALTER TABLE sessions ADD COLUMN blocked_at TEXT`);
    } catch {
      // already exists
    }
    try {
      db.exec(`ALTER TABLE sessions ADD COLUMN cooldown_minutes INTEGER DEFAULT 5`);
    } catch {
      // already exists
    }

    // Cost config: per-domain cost estimation
    db.exec(`
      CREATE TABLE IF NOT EXISTS cost_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain_pattern TEXT NOT NULL UNIQUE,
        cost_per_request REAL NOT NULL,
        label TEXT
      )
    `);
    // Seed defaults if empty
    const costCount = (db.prepare(`SELECT COUNT(*) as c FROM cost_config`).get() as { c: number }).c;
    if (costCount === 0) {
      const seed = db.prepare(`INSERT INTO cost_config (domain_pattern, cost_per_request, label) VALUES (?, ?, ?)`);
      seed.run('api.openai.com', 0.03, 'OpenAI');
      seed.run('api.replicate.com', 0.05, 'Replicate');
      seed.run('api.anthropic.com', 0.04, 'Anthropic');
      seed.run('*', 0.01, 'Default');
    }

    // Webhook config
    db.exec(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'slack',
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  return db;
}

export interface LogEntry {
  id: number;
  session_id: string;
  step: number;
  action: string;
  status: 'success' | 'failure' | 'loop_detected';
  error?: string;
  error_code?: string;
  remedy_attempted?: string;
  timestamp: string;
  state_snapshot?: string;
  created_at: string;
}

export function insertLog(
  sessionId: string,
  step: number,
  action: string,
  status: string,
  error?: string,
  timestamp?: string,
  stateSnapshot?: any,
  errorCode?: string,
  remedyAttempted?: string
) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO logs (session_id, step, action, status, error, timestamp, state_snapshot, error_code, remedy_attempted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    sessionId,
    step,
    action,
    status,
    error || null,
    timestamp || new Date().toISOString(),
    stateSnapshot ? JSON.stringify(stateSnapshot) : null,
    errorCode || null,
    remedyAttempted || null
  );
  
  return result.lastInsertRowid;
}

export function getLogsBySession(sessionId: string): LogEntry[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM logs 
    WHERE session_id = ? 
    ORDER BY step ASC
  `);
  
  return stmt.all(sessionId) as LogEntry[];
}

export function getAllSessions() {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT
      session_id,
      COUNT(*) as total_steps,
      SUM(CASE WHEN status = 'loop_detected' THEN 1 ELSE 0 END) as loops,
      MAX(timestamp) as last_activity
    FROM logs
    GROUP BY session_id
    ORDER BY created_at DESC
  `);

  return stmt.all();
}

// --- Proxy & Error Guardrail Functions ---

export function getSessionStatus(sessionId: string): string {
  const db = getDatabase();
  const row = db.prepare(`SELECT status, blocked_at, cooldown_minutes FROM sessions WHERE session_id = ?`)
    .get(sessionId) as { status: string; blocked_at: string | null; cooldown_minutes: number | null } | undefined;

  if (!row) return 'ACTIVE';
  if (row.status !== 'BLOCKED') return row.status;

  // Auto-recovery: check if cooldown has expired
  if (row.blocked_at && row.cooldown_minutes) {
    const blockedTime = new Date(row.blocked_at).getTime();
    const cooldownMs = row.cooldown_minutes * 60_000;
    if (Date.now() - blockedTime >= cooldownMs) {
      // Cooldown expired — auto-unblock
      unblockSession(sessionId);
      insertError(sessionId, `[SYSTEM] Auto-recovered after ${row.cooldown_minutes}m cooldown`, new Date().toISOString());
      return 'ACTIVE';
    }
  }

  return 'BLOCKED';
}

export function getSessionCooldownRemaining(sessionId: string): number | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT blocked_at, cooldown_minutes FROM sessions WHERE session_id = ? AND status = 'BLOCKED'`)
    .get(sessionId) as { blocked_at: string | null; cooldown_minutes: number | null } | undefined;
  if (!row?.blocked_at || !row?.cooldown_minutes) return null;
  const elapsed = Date.now() - new Date(row.blocked_at).getTime();
  const remaining = (row.cooldown_minutes * 60_000) - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

export function ensureSession(sessionId: string) {
  const db = getDatabase();
  db.prepare(`INSERT OR IGNORE INTO sessions (session_id, status) VALUES (?, 'ACTIVE')`).run(sessionId);
}

export function blockSession(sessionId: string, reason: string) {
  const db = getDatabase();
  db.prepare(`
    UPDATE sessions SET status = 'BLOCKED', blocked_reason = ?, blocked_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE session_id = ?
  `).run(reason, new Date().toISOString(), sessionId);
}

export function unblockSession(sessionId: string) {
  const db = getDatabase();
  db.prepare(`
    UPDATE sessions SET status = 'ACTIVE', blocked_reason = NULL, blocked_at = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE session_id = ?
  `).run(sessionId);
}

export function insertError(sessionId: string, errorMessage: string, timestamp: string) {
  const db = getDatabase();
  db.prepare(`INSERT INTO errors (session_id, error_message, timestamp) VALUES (?, ?, ?)`).run(sessionId, errorMessage, timestamp);
}

export function getRecentErrors(sessionId: string, limit: number = 5): Array<{ error_message: string; timestamp: string }> {
  const db = getDatabase();
  return db.prepare(`
    SELECT error_message, timestamp FROM errors
    WHERE session_id = ?
    ORDER BY id DESC LIMIT ?
  `).all(sessionId, limit) as Array<{ error_message: string; timestamp: string }>;
}

export function insertProxyLog(sessionId: string, targetUrl: string, method: string, outcome: string, statusCode: number | null, timestamp: string) {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO proxy_logs (session_id, target_url, method, outcome, status_code, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, targetUrl, method, outcome, statusCode, timestamp);
}

export function getBlockedCount24h(): number {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM proxy_logs
    WHERE outcome = 'BLOCKED' AND timestamp >= datetime('now', '-24 hours')
  `).get() as { count: number };
  return row.count;
}

export function getActiveLoopCount(): number {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM sessions WHERE status = 'BLOCKED'
  `).get() as { count: number };
  return row.count;
}

export interface EventLogEntry {
  id: number;
  type: 'error' | 'blocked' | 'intervention';
  session_id: string;
  message: string;
  timestamp: string;
}

export function getRecentEvents(limit: number = 50): EventLogEntry[] {
  const db = getDatabase();
  const errors = db.prepare(`
    SELECT id, 'error' as type, session_id, error_message as message, timestamp
    FROM errors ORDER BY id DESC LIMIT ?
  `).all(limit) as EventLogEntry[];

  const blocked = db.prepare(`
    SELECT id, 'blocked' as type, session_id, ('Blocked ' || method || ' -> ' || target_url) as message, timestamp
    FROM proxy_logs WHERE outcome = 'BLOCKED' ORDER BY id DESC LIMIT ?
  `).all(limit) as EventLogEntry[];

  const combined = [...errors, ...blocked]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  return combined;
}

export function getBlockedSessions(): Array<{ session_id: string; blocked_reason: string; updated_at: string; blocked_at: string | null; cooldown_minutes: number | null }> {
  const db = getDatabase();
  return db.prepare(`
    SELECT session_id, blocked_reason, updated_at, blocked_at, cooldown_minutes FROM sessions WHERE status = 'BLOCKED' ORDER BY updated_at DESC
  `).all() as Array<{ session_id: string; blocked_reason: string; updated_at: string; blocked_at: string | null; cooldown_minutes: number | null }>;
}

// --- Self-Aware Proxy: upstream failure tracking ---

export function getRecentProxyFailures(sessionId: string, windowMs: number = 60_000): Array<{ status_code: number; target_url: string; timestamp: string }> {
  const db = getDatabase();
  const cutoff = new Date(Date.now() - windowMs).toISOString();
  return db.prepare(`
    SELECT status_code, target_url, timestamp FROM proxy_logs
    WHERE session_id = ? AND outcome = 'FORWARDED' AND status_code >= 400 AND timestamp >= ?
    ORDER BY id DESC LIMIT 10
  `).all(sessionId, cutoff) as Array<{ status_code: number; target_url: string; timestamp: string }>;
}

// --- Cost Estimation ---

export function getCostPerRequest(targetUrl: string): number {
  const db = getDatabase();
  let domain: string;
  try {
    domain = new URL(targetUrl).hostname;
  } catch {
    domain = targetUrl;
  }

  // Try exact domain match first
  const exact = db.prepare(`SELECT cost_per_request FROM cost_config WHERE domain_pattern = ?`).get(domain) as { cost_per_request: number } | undefined;
  if (exact) return exact.cost_per_request;

  // Fallback to wildcard
  const wildcard = db.prepare(`SELECT cost_per_request FROM cost_config WHERE domain_pattern = '*'`).get() as { cost_per_request: number } | undefined;
  return wildcard?.cost_per_request ?? 0.01;
}

export function getMoneySaved24h(): number {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT target_url FROM proxy_logs
    WHERE outcome = 'BLOCKED' AND timestamp >= datetime('now', '-24 hours')
  `).all() as Array<{ target_url: string }>;

  let total = 0;
  for (const row of rows) {
    total += getCostPerRequest(row.target_url);
  }
  return Math.round(total * 100) / 100;
}

export function getCostConfigs(): Array<{ id: number; domain_pattern: string; cost_per_request: number; label: string | null }> {
  const db = getDatabase();
  return db.prepare(`SELECT id, domain_pattern, cost_per_request, label FROM cost_config ORDER BY domain_pattern`).all() as Array<{ id: number; domain_pattern: string; cost_per_request: number; label: string | null }>;
}

export function upsertCostConfig(domainPattern: string, costPerRequest: number, label?: string) {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO cost_config (domain_pattern, cost_per_request, label)
    VALUES (?, ?, ?)
    ON CONFLICT(domain_pattern) DO UPDATE SET cost_per_request = ?, label = ?
  `).run(domainPattern, costPerRequest, label || null, costPerRequest, label || null);
}

// --- Webhooks ---

export function getWebhooks(): Array<{ id: number; url: string; type: string; enabled: number }> {
  const db = getDatabase();
  return db.prepare(`SELECT id, url, type, enabled FROM webhooks ORDER BY id`).all() as Array<{ id: number; url: string; type: string; enabled: number }>;
}

export function getActiveWebhooks(): Array<{ id: number; url: string; type: string }> {
  const db = getDatabase();
  return db.prepare(`SELECT id, url, type FROM webhooks WHERE enabled = 1`).all() as Array<{ id: number; url: string; type: string }>;
}

export function insertWebhook(url: string, type: string = 'slack') {
  const db = getDatabase();
  db.prepare(`INSERT INTO webhooks (url, type) VALUES (?, ?)`).run(url, type);
}

export function deleteWebhook(id: number) {
  const db = getDatabase();
  db.prepare(`DELETE FROM webhooks WHERE id = ?`).run(id);
}

export function toggleWebhook(id: number, enabled: boolean) {
  const db = getDatabase();
  db.prepare(`UPDATE webhooks SET enabled = ? WHERE id = ?`).run(enabled ? 1 : 0, id);
}
