use serde::{Deserialize, Serialize};

/// Events streamed from the agent loop to the frontend via Tauri events.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AgentStreamEvent {
    /// A chunk of text from the streaming LLM response.
    TextChunk { content: String },
    /// A tool call has started execution.
    ToolCallStart { name: String, arguments: String },
    /// A tool call has completed.
    ToolCallResult {
        name: String,
        success: bool,
        output: String,
    },
    /// Memory was queried for context.
    MemoryRecall {
        query: String,
        results_count: usize,
    },
    /// An LLM provider call has started.
    ProviderCallStart { provider: String, model: String },
    /// An LLM provider call has ended.
    ProviderCallEnd { duration_ms: u64 },
    /// The agent loop has completed.
    Done { session_id: String },
    /// An error occurred during the agent loop.
    Error { message: String },
}
