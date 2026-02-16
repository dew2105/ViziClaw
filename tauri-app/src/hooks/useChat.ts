import { useState, useCallback, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import type { AgentStreamEvent } from "../types/events";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool_call" | "tool_result";
  content: string;
  toolName?: string;
  toolArgs?: string;
  toolSuccess?: boolean;
}

export interface ToolCallActivity {
  name: string;
  arguments: string;
  status: "running" | "success" | "error";
  output?: string;
}

export interface Activity {
  id: string;
  label: string;
  type: "memory" | "provider" | "tool";
  timestamp: number;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCallActivity[]>(
    []
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const msgCounter = useRef(0);

  useEffect(() => {
    const unlisten = listen<AgentStreamEvent>("agent-stream", (event) => {
      const data = event.payload;

      switch (data.type) {
        case "TextChunk":
          setStreamingContent((prev) => prev + data.content);
          break;

        case "ToolCallStart":
          setActiveToolCalls((prev) => [
            ...prev,
            {
              name: data.name,
              arguments: data.arguments,
              status: "running",
            },
          ]);
          setActivities((prev) => [
            ...prev,
            {
              id: `tool-${Date.now()}`,
              label: `Running ${data.name}...`,
              type: "tool",
              timestamp: Date.now(),
            },
          ]);
          break;

        case "ToolCallResult":
          setActiveToolCalls((prev) =>
            prev.map((tc) =>
              tc.name === data.name && tc.status === "running"
                ? {
                    ...tc,
                    status: data.success ? "success" : "error",
                    output: data.output,
                  }
                : tc
            )
          );
          break;

        case "MemoryRecall":
          setActivities((prev) => [
            ...prev,
            {
              id: `mem-${Date.now()}`,
              label: `Searching memory... (${data.results_count} results)`,
              type: "memory",
              timestamp: Date.now(),
            },
          ]);
          break;

        case "ProviderCallStart":
          setActivities((prev) => [
            ...prev,
            {
              id: `prov-${Date.now()}`,
              label: `Calling ${data.provider} (${data.model})...`,
              type: "provider",
              timestamp: Date.now(),
            },
          ]);
          break;

        case "ProviderCallEnd":
          // Update the last provider activity
          break;

        case "Done":
          setStreamingContent((prev) => {
            if (prev) {
              setMessages((msgs) => [
                ...msgs,
                {
                  id: `msg-${msgCounter.current++}`,
                  role: "assistant",
                  content: prev,
                },
              ]);
            }
            return "";
          });
          setActiveToolCalls([]);
          setActivities([]);
          setIsStreaming(false);
          setSessionId(data.session_id);
          break;

        case "Error":
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${msgCounter.current++}`,
              role: "assistant",
              content: `Error: ${data.message}`,
            },
          ]);
          setStreamingContent("");
          setActiveToolCalls([]);
          setActivities([]);
          setIsStreaming(false);
          break;
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = {
        id: `msg-${msgCounter.current++}`,
        role: "user",
        content,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setStreamingContent("");
      setActiveToolCalls([]);
      setActivities([]);

      try {
        const sid = await invoke<string>("send_message", {
          sessionId: sessionId,
          message: content,
        });
        setSessionId(sid);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${msgCounter.current++}`,
            role: "assistant",
            content: `Failed to send message: ${e}`,
          },
        ]);
        setIsStreaming(false);
      }
    },
    [sessionId]
  );

  const newSession = useCallback(() => {
    setMessages([]);
    setStreamingContent("");
    setActiveToolCalls([]);
    setActivities([]);
    setIsStreaming(false);
    setSessionId(null);
  }, []);

  return {
    messages,
    streamingContent,
    activeToolCalls,
    isStreaming,
    activities,
    sessionId,
    sendMessage,
    newSession,
  };
}
