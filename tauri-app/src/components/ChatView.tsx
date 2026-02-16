import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { ToolCallCard } from "./ToolCallCard";
import { StreamingContent } from "./StreamingContent";
import { ActivityLog } from "./ActivityLog";
import { InputBar } from "./InputBar";
import type { ChatMessage, ToolCallActivity, Activity } from "../hooks/useChat";

interface ChatViewProps {
  messages: ChatMessage[];
  streamingContent: string;
  activeToolCalls: ToolCallActivity[];
  isStreaming: boolean;
  activities: Activity[];
  onSendMessage: (content: string) => void;
}

export function ChatView({
  messages,
  streamingContent,
  activeToolCalls,
  isStreaming,
  activities,
  onSendMessage,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent, activeToolCalls]);

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll p-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-text mb-2">
                ViziClaw
              </h1>
              <p className="text-text-secondary">
                Mission Control for your AI assistant
              </p>
              <p className="text-text-tertiary text-sm mt-2">
                Send a message to get started
              </p>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => {
            if (msg.role === "tool_call" && msg.toolName) {
              return (
                <ToolCallCard
                  key={msg.id}
                  toolCall={{
                    name: msg.toolName,
                    arguments: msg.toolArgs || "{}",
                    status: "success",
                    output: undefined,
                  }}
                />
              );
            }

            if (msg.role === "tool_result" && msg.toolName) {
              return (
                <ToolCallCard
                  key={msg.id}
                  toolCall={{
                    name: msg.toolName,
                    arguments: "{}",
                    status: msg.toolSuccess ? "success" : "error",
                    output: msg.content,
                  }}
                />
              );
            }

            return <MessageBubble key={msg.id} message={msg} />;
          })}

          {isStreaming && activities.length > 0 && (
            <ActivityLog activities={activities} />
          )}

          {isStreaming && (streamingContent || activeToolCalls.length > 0) && (
            <StreamingContent
              content={streamingContent}
              toolCalls={activeToolCalls}
            />
          )}
        </div>
      </div>

      <InputBar onSend={onSendMessage} disabled={isStreaming} />
    </div>
  );
}
