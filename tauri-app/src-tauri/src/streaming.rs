use crate::events::AgentStreamEvent;
use crate::session::SessionStore;
use anyhow::{Context, Result};
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::json;
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter};
use viziclaw::agent::{
    build_context, build_tool_instructions, find_tool, parse_tool_calls, MAX_TOOL_ITERATIONS,
};
use viziclaw::memory::{self, Memory};
use viziclaw::providers::ChatMessage;
use viziclaw::security::SecurityPolicy;
use viziclaw::tools;
use viziclaw::Config;

fn emit_event(app: &AppHandle, event: AgentStreamEvent) {
    let _ = app.emit("agent-stream", &event);
}

/// Resolve the provider's API endpoint URL from a provider name.
fn provider_endpoint(provider_name: &str) -> &'static str {
    match provider_name {
        "openrouter" => "https://openrouter.ai/api/v1/chat/completions",
        "openai" => "https://api.openai.com/v1/chat/completions",
        "ollama" => "http://localhost:11434/v1/chat/completions",
        _ => "https://openrouter.ai/api/v1/chat/completions",
    }
}

/// Resolve the API key for a given provider.
fn resolve_api_key(config: &Config, provider_name: &str) -> Option<String> {
    // First: config api_key
    if let Some(ref key) = config.api_key {
        if !key.is_empty() {
            return Some(key.clone());
        }
    }

    // Second: provider-specific env var
    let env_key = match provider_name {
        "openrouter" => "OPENROUTER_API_KEY",
        "openai" => "OPENAI_API_KEY",
        "anthropic" => "ANTHROPIC_API_KEY",
        _ => "VIZICLAW_API_KEY",
    };

    if let Ok(key) = std::env::var(env_key) {
        if !key.is_empty() {
            return Some(key);
        }
    }

    // Third: generic fallbacks
    std::env::var("VIZICLAW_API_KEY")
        .or_else(|_| std::env::var("API_KEY"))
        .ok()
        .filter(|k| !k.is_empty())
}

/// Stream a chat completion using SSE from an OpenAI-compatible endpoint.
/// Returns the full accumulated response text.
async fn stream_chat(
    app: &AppHandle,
    client: &Client,
    endpoint: &str,
    api_key: Option<&str>,
    messages: &[ChatMessage],
    model: &str,
    temperature: f64,
) -> Result<String> {
    let openai_messages: Vec<serde_json::Value> = messages
        .iter()
        .map(|m| {
            json!({
                "role": m.role,
                "content": m.content,
            })
        })
        .collect();

    let body = json!({
        "model": model,
        "messages": openai_messages,
        "temperature": temperature,
        "stream": true,
    });

    let mut req = client.post(endpoint).json(&body);

    if let Some(key) = api_key {
        req = req.header("Authorization", format!("Bearer {key}"));
    }

    let response = req
        .send()
        .await
        .context("Failed to send streaming request")?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        anyhow::bail!("Provider returned {status}: {body}");
    }

    let mut stream = response.bytes_stream();
    let mut full_text = String::new();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.context("Stream chunk error")?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        // Process complete SSE lines from the buffer
        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].trim().to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            if line.is_empty() || line.starts_with(':') {
                continue;
            }

            if let Some(data) = line.strip_prefix("data: ") {
                if data.trim() == "[DONE]" {
                    continue;
                }

                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(content) = parsed
                        .get("choices")
                        .and_then(|c| c.get(0))
                        .and_then(|c| c.get("delta"))
                        .and_then(|d| d.get("content"))
                        .and_then(|c| c.as_str())
                    {
                        if !content.is_empty() {
                            full_text.push_str(content);
                            emit_event(
                                app,
                                AgentStreamEvent::TextChunk {
                                    content: content.to_string(),
                                },
                            );
                        }
                    }
                }
            }
        }
    }

    Ok(full_text)
}

/// Run the streaming agent loop, emitting events to the frontend.
pub async fn run_streaming_agent(
    app: AppHandle,
    session_store: Arc<SessionStore>,
    session_id: String,
    user_message: String,
    provider_override: Option<String>,
    model_override: Option<String>,
) {
    if let Err(e) = run_streaming_agent_inner(
        &app,
        &session_store,
        &session_id,
        &user_message,
        provider_override.as_deref(),
        model_override.as_deref(),
    )
    .await
    {
        emit_event(
            &app,
            AgentStreamEvent::Error {
                message: format!("{e:#}"),
            },
        );
    }
}

async fn run_streaming_agent_inner(
    app: &AppHandle,
    session_store: &SessionStore,
    session_id: &str,
    user_message: &str,
    provider_override: Option<&str>,
    model_override: Option<&str>,
) -> Result<()> {
    // Load config
    let mut config = Config::load_or_init()?;
    config.apply_env_overrides();

    let provider_name = provider_override
        .or(config.default_provider.as_deref())
        .unwrap_or("openrouter");

    let model_name = model_override
        .or(config.default_model.as_deref())
        .unwrap_or("anthropic/claude-sonnet-4-20250514");

    let api_key = resolve_api_key(&config, provider_name);
    let endpoint = provider_endpoint(provider_name);

    // Initialize memory
    let mem: Arc<dyn Memory> = Arc::from(memory::create_memory(
        &config.memory,
        &config.workspace_dir,
        config.api_key.as_deref(),
    )?);

    // Initialize tools
    let security = Arc::new(SecurityPolicy::from_config(
        &config.autonomy,
        &config.workspace_dir,
    ));
    let composio_key = if config.composio.enabled {
        config.composio.api_key.as_deref()
    } else {
        None
    };
    let tools_registry = tools::all_tools(
        &security,
        mem.clone(),
        composio_key,
        &config.browser,
    );

    // Build system prompt
    let skills = viziclaw::skills::load_skills(&config.workspace_dir);
    let tool_descs: Vec<(&str, &str)> = vec![
        ("shell", "Execute terminal commands."),
        ("file_read", "Read file contents."),
        ("file_write", "Write file contents."),
        ("memory_store", "Save to memory."),
        ("memory_recall", "Search memory."),
        ("memory_forget", "Delete a memory entry."),
    ];
    let mut system_prompt = viziclaw::channels::build_system_prompt(
        &config.workspace_dir,
        model_name,
        &tool_descs,
        &skills,
        Some(&config.identity),
    );
    system_prompt.push_str(&build_tool_instructions(&tools_registry));

    // Build context from memory
    let context = build_context(mem.as_ref(), user_message).await;
    let memory_results_count = if context.is_empty() { 0 } else {
        context.lines().filter(|l| l.starts_with("- ")).count()
    };

    emit_event(
        app,
        AgentStreamEvent::MemoryRecall {
            query: user_message.to_string(),
            results_count: memory_results_count,
        },
    );

    let enriched = if context.is_empty() {
        user_message.to_string()
    } else {
        format!("{context}{user_message}")
    };

    // Persist user message
    session_store.add_message(session_id, "user", user_message, None, None, None)?;

    // Build history
    let mut history = vec![
        ChatMessage::system(&system_prompt),
        ChatMessage::user(&enriched),
    ];

    let client = Client::new();

    // Agent loop
    for _iteration in 0..MAX_TOOL_ITERATIONS {
        emit_event(
            app,
            AgentStreamEvent::ProviderCallStart {
                provider: provider_name.to_string(),
                model: model_name.to_string(),
            },
        );

        let start = Instant::now();

        let full_response = stream_chat(
            app,
            &client,
            endpoint,
            api_key.as_deref(),
            &history,
            model_name,
            config.default_temperature,
        )
        .await?;

        emit_event(
            app,
            AgentStreamEvent::ProviderCallEnd {
                duration_ms: start.elapsed().as_millis() as u64,
            },
        );

        let (text, tool_calls) = parse_tool_calls(&full_response);

        if tool_calls.is_empty() {
            // Final response — persist and emit done
            let final_text = if text.is_empty() {
                &full_response
            } else {
                &text
            };
            session_store.add_message(session_id, "assistant", final_text, None, None, None)?;

            // Auto-title: use first ~60 chars of the user message
            if user_message.len() > 0 {
                let title: String = user_message.chars().take(60).collect();
                let _ = session_store.update_title(session_id, &title);
            }

            emit_event(
                app,
                AgentStreamEvent::Done {
                    session_id: session_id.to_string(),
                },
            );
            return Ok(());
        }

        // Execute tool calls
        let mut tool_results_text = String::new();

        for call in &tool_calls {
            let args_str = serde_json::to_string(&call.arguments).unwrap_or_default();

            emit_event(
                app,
                AgentStreamEvent::ToolCallStart {
                    name: call.name.clone(),
                    arguments: args_str.clone(),
                },
            );

            // Persist tool call
            session_store.add_message(
                session_id,
                "tool_call",
                &call.name,
                Some(&call.name),
                Some(&args_str),
                None,
            )?;

            let result = if let Some(tool) = find_tool(&tools_registry, &call.name) {
                match tool.execute(call.arguments.clone()).await {
                    Ok(r) => {
                        let output = if r.success {
                            r.output.clone()
                        } else {
                            format!("Error: {}", r.error.as_deref().unwrap_or(&r.output))
                        };

                        emit_event(
                            app,
                            AgentStreamEvent::ToolCallResult {
                                name: call.name.clone(),
                                success: r.success,
                                output: output.clone(),
                            },
                        );

                        session_store.add_message(
                            session_id,
                            "tool_result",
                            &output,
                            Some(&call.name),
                            None,
                            Some(r.success),
                        )?;

                        output
                    }
                    Err(e) => {
                        let output = format!("Error executing {}: {e}", call.name);
                        emit_event(
                            app,
                            AgentStreamEvent::ToolCallResult {
                                name: call.name.clone(),
                                success: false,
                                output: output.clone(),
                            },
                        );
                        session_store.add_message(
                            session_id,
                            "tool_result",
                            &output,
                            Some(&call.name),
                            None,
                            Some(false),
                        )?;
                        output
                    }
                }
            } else {
                let output = format!("Unknown tool: {}", call.name);
                emit_event(
                    app,
                    AgentStreamEvent::ToolCallResult {
                        name: call.name.clone(),
                        success: false,
                        output: output.clone(),
                    },
                );
                output
            };

            use std::fmt::Write;
            let _ = writeln!(
                tool_results_text,
                "<tool_result name=\"{}\">\n{}\n</tool_result>",
                call.name, result
            );
        }

        // Append to history
        history.push(ChatMessage::assistant(&full_response));
        history.push(ChatMessage::user(format!(
            "[Tool results]\n{tool_results_text}"
        )));
    }

    emit_event(
        app,
        AgentStreamEvent::Error {
            message: format!(
                "Agent exceeded maximum tool iterations ({MAX_TOOL_ITERATIONS})"
            ),
        },
    );

    Ok(())
}
