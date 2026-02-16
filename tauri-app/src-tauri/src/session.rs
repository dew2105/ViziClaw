use anyhow::{Context, Result};
use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSummary {
    pub id: String,
    pub title: String,
    pub provider: String,
    pub model: String,
    pub created_at: String,
    pub updated_at: String,
    pub message_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionDetail {
    pub id: String,
    pub title: String,
    pub provider: String,
    pub model: String,
    pub created_at: String,
    pub updated_at: String,
    pub message_count: i64,
    pub messages: Vec<SessionMessage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMessage {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub tool_name: Option<String>,
    pub tool_args: Option<String>,
    pub tool_success: Option<bool>,
    pub timestamp: String,
    pub sequence: i64,
}

pub struct SessionStore {
    conn: Mutex<Connection>,
}

impl SessionStore {
    pub fn new() -> Result<Self> {
        let home = directories::UserDirs::new()
            .map(|u: directories::UserDirs| u.home_dir().to_path_buf())
            .unwrap_or_else(|| PathBuf::from("."));
        let viziclaw_dir = home.join(".viziclaw");
        std::fs::create_dir_all(&viziclaw_dir)?;
        let db_path = viziclaw_dir.join("sessions.db");

        let conn = Connection::open(&db_path)
            .with_context(|| format!("Failed to open sessions.db at {}", db_path.display()))?;

        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL DEFAULT 'New Session',
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                message_count INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS session_messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                tool_name TEXT,
                tool_args TEXT,
                tool_success INTEGER,
                timestamp TEXT NOT NULL,
                sequence INTEGER NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            );",
        )?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn create_session(&self, provider: &str, model: &str) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO sessions (id, title, provider, model, created_at, updated_at) VALUES (?1, 'New Session', ?2, ?3, ?4, ?5)",
            params![id, provider, model, now, now],
        )?;
        Ok(id)
    }

    pub fn add_message(
        &self,
        session_id: &str,
        role: &str,
        content: &str,
        tool_name: Option<&str>,
        tool_args: Option<&str>,
        tool_success: Option<bool>,
    ) -> Result<String> {
        let msg_id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let conn = self.conn.lock().unwrap();

        let sequence: i64 = conn
            .query_row(
                "SELECT COALESCE(MAX(sequence), 0) + 1 FROM session_messages WHERE session_id = ?1",
                params![session_id],
                |row| row.get(0),
            )
            .unwrap_or(1);

        let tool_success_int = tool_success.map(|b| if b { 1 } else { 0 });

        conn.execute(
            "INSERT INTO session_messages (id, session_id, role, content, tool_name, tool_args, tool_success, timestamp, sequence) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![msg_id, session_id, role, content, tool_name, tool_args, tool_success_int, now, sequence],
        )?;

        conn.execute(
            "UPDATE sessions SET message_count = message_count + 1, updated_at = ?1 WHERE id = ?2",
            params![now, session_id],
        )?;

        Ok(msg_id)
    }

    pub fn list_sessions(&self, limit: i64, offset: i64) -> Result<Vec<SessionSummary>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, provider, model, created_at, updated_at, message_count FROM sessions ORDER BY updated_at DESC LIMIT ?1 OFFSET ?2",
        )?;

        let rows = stmt.query_map(params![limit, offset], |row| {
            Ok(SessionSummary {
                id: row.get(0)?,
                title: row.get(1)?,
                provider: row.get(2)?,
                model: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                message_count: row.get(6)?,
            })
        })?;

        let mut sessions = Vec::new();
        for row in rows {
            sessions.push(row?);
        }
        Ok(sessions)
    }

    pub fn get_session(&self, session_id: &str) -> Result<SessionDetail> {
        let conn = self.conn.lock().unwrap();

        let session = conn.query_row(
            "SELECT id, title, provider, model, created_at, updated_at, message_count FROM sessions WHERE id = ?1",
            params![session_id],
            |row| {
                Ok(SessionSummary {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    provider: row.get(2)?,
                    model: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    message_count: row.get(6)?,
                })
            },
        ).with_context(|| format!("Session not found: {session_id}"))?;

        let mut stmt = conn.prepare(
            "SELECT id, session_id, role, content, tool_name, tool_args, tool_success, timestamp, sequence FROM session_messages WHERE session_id = ?1 ORDER BY sequence ASC",
        )?;

        let rows = stmt.query_map(params![session_id], |row| {
            let tool_success_int: Option<i32> = row.get(6)?;
            Ok(SessionMessage {
                id: row.get(0)?,
                session_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                tool_name: row.get(4)?,
                tool_args: row.get(5)?,
                tool_success: tool_success_int.map(|v| v != 0),
                timestamp: row.get(7)?,
                sequence: row.get(8)?,
            })
        })?;

        let mut messages = Vec::new();
        for row in rows {
            messages.push(row?);
        }

        Ok(SessionDetail {
            id: session.id,
            title: session.title,
            provider: session.provider,
            model: session.model,
            created_at: session.created_at,
            updated_at: session.updated_at,
            message_count: session.message_count,
            messages,
        })
    }

    pub fn delete_session(&self, session_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM session_messages WHERE session_id = ?1",
            params![session_id],
        )?;
        conn.execute("DELETE FROM sessions WHERE id = ?1", params![session_id])?;
        Ok(())
    }

    pub fn update_title(&self, session_id: &str, title: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE sessions SET title = ?1 WHERE id = ?2",
            params![title, session_id],
        )?;
        Ok(())
    }
}
