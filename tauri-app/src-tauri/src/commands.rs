use crate::session::{SessionDetail, SessionStore, SessionSummary};
use crate::streaming;
use std::sync::Arc;
use tauri::{AppHandle, State};

pub struct AppState {
    pub session_store: Arc<SessionStore>,
}

#[tauri::command]
pub async fn send_message(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: Option<String>,
    message: String,
    provider: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    let store = state.session_store.clone();

    let provider_name = provider
        .as_deref()
        .unwrap_or("anthropic")
        .to_string();
    let model_name = model
        .as_deref()
        .unwrap_or("claude-sonnet-4-20250514")
        .to_string();

    // Create or reuse session
    let sid = if let Some(id) = session_id {
        id
    } else {
        store
            .create_session(&provider_name, &model_name)
            .map_err(|e| e.to_string())?
    };

    let session_id_clone = sid.clone();
    let provider_clone = Some(provider_name);
    let model_clone = Some(model_name);

    // Spawn the streaming agent loop in the background
    tokio::spawn(async move {
        streaming::run_streaming_agent(
            app,
            store,
            session_id_clone,
            message,
            provider_clone,
            model_clone,
        )
        .await;
    });

    Ok(sid)
}

#[tauri::command]
pub fn list_sessions(
    state: State<'_, AppState>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<SessionSummary>, String> {
    state
        .session_store
        .list_sessions(limit.unwrap_or(50), offset.unwrap_or(0))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_session(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<SessionDetail, String> {
    state
        .session_store
        .get_session(&session_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_session(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state
        .session_store
        .delete_session(&session_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn new_session(
    state: State<'_, AppState>,
    provider: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    let provider_name = provider.as_deref().unwrap_or("anthropic");
    let model_name = model
        .as_deref()
        .unwrap_or("claude-sonnet-4-20250514");
    state
        .session_store
        .create_session(provider_name, model_name)
        .map_err(|e| e.to_string())
}
