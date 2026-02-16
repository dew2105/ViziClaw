import { MessageBubble } from "./MessageBubble";
import { ToolCallCard } from "./ToolCallCard";
import type { SessionDetail as SessionDetailType } from "../types/session";

interface SessionDetailProps {
  session: SessionDetailType;
  onClose: () => void;
  onContinue: () => void;
}

export function SessionDetail({ session, onClose, onContinue }: SessionDetailProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-surface-alt px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text">
              {session.title}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
              <span className="px-2 py-0.5 bg-surface-active rounded text-text-secondary">
                {session.model}
              </span>
              <span>{session.provider}</span>
              <span>
                {new Date(session.created_at).toLocaleDateString()}{" "}
                {new Date(session.created_at).toLocaleTimeString()}
              </span>
              <span>{session.message_count} messages</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onContinue}
              className="px-3 py-1.5 text-sm bg-accent text-white hover:bg-accent-hover rounded-lg transition-colors duration-300 ease-out"
            >
              Continue conversation
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-text-tertiary hover:text-text hover:bg-surface-hover rounded-lg transition-colors duration-300 ease-out"
            >
              Back to chat
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {session.messages.map((msg) => {
            if (msg.role === "tool_call" && msg.tool_name) {
              return (
                <ToolCallCard
                  key={msg.id}
                  toolCall={{
                    name: msg.tool_name,
                    arguments: msg.tool_args || "{}",
                    status: "success",
                    output: undefined,
                  }}
                />
              );
            }

            if (msg.role === "tool_result" && msg.tool_name) {
              return (
                <ToolCallCard
                  key={msg.id}
                  toolCall={{
                    name: msg.tool_name,
                    arguments: "{}",
                    status: msg.tool_success ? "success" : "error",
                    output: msg.content,
                  }}
                />
              );
            }

            return (
              <MessageBubble
                key={msg.id}
                message={{
                  id: msg.id,
                  role: msg.role as "user" | "assistant",
                  content: msg.content,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
