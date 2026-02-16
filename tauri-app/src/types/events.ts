export type AgentStreamEvent =
  | { type: "TextChunk"; content: string }
  | { type: "ToolCallStart"; name: string; arguments: string }
  | { type: "ToolCallResult"; name: string; success: boolean; output: string }
  | { type: "MemoryRecall"; query: string; results_count: number }
  | { type: "ProviderCallStart"; provider: string; model: string }
  | { type: "ProviderCallEnd"; duration_ms: number }
  | { type: "Done"; session_id: string }
  | { type: "Error"; message: string };
