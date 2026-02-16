import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
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
              <h1 className="text-2xl font-bold text-gray-400 mb-2">
                ViziClaw
              </h1>
              <p className="text-gray-500">
                Mission Control for your AI assistant
              </p>
              <p className="text-gray-600 text-sm mt-2">
                Send a message to get started
              </p>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

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
