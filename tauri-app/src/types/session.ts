export interface SessionSummary {
  id: string;
  title: string;
  provider: string;
  model: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface SessionDetail {
  id: string;
  title: string;
  provider: string;
  model: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  messages: SessionMessage[];
}

export interface SessionMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "tool_call" | "tool_result";
  content: string;
  tool_name?: string;
  tool_args?: string;
  tool_success?: boolean;
  timestamp: string;
  sequence: number;
}
