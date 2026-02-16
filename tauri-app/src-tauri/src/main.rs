// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod events;
mod session;
mod streaming;

use commands::AppState;
use session::SessionStore;
use std::sync::Arc;

fn main() {
    let session_store =
        Arc::new(SessionStore::new().expect("Failed to initialize session store"));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState { session_store })
        .invoke_handler(tauri::generate_handler![
            commands::send_message,
            commands::list_sessions,
            commands::get_session,
            commands::delete_session,
            commands::new_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ViziClaw Desktop");
}
