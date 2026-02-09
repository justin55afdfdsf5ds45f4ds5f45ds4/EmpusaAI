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
