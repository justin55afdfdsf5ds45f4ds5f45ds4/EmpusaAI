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
        timestamp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
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
  timestamp: string;
  created_at: string;
}

export function insertLog(
  sessionId: string,
  step: number,
  action: string,
  status: string,
  error?: string,
  timestamp?: string
) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO logs (session_id, step, action, status, error, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    sessionId,
    step,
    action,
    status,
    error || null,
    timestamp || new Date().toISOString()
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
