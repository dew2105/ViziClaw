import { useState } from "react";
import type { ToolCallActivity } from "../hooks/useChat";

interface ToolCallCardProps {
  toolCall: ToolCallActivity;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon =
    toolCall.status === "running" ? (
      <span className="inline-block w-2 h-2 rounded-full bg-status-running tool-running" />
    ) : toolCall.status === "success" ? (
      <span className="inline-block w-2 h-2 rounded-full bg-status-success" />
    ) : (
      <span className="inline-block w-2 h-2 rounded-full bg-status-error" />
    );

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-hover transition-colors duration-300 ease-out"
      >
        {statusIcon}
        <span className="font-mono text-text">{toolCall.name}</span>
        <span className="ml-auto text-text-tertiary text-xs">
          {expanded ? "▼" : "▶"}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-border px-3 py-2 space-y-2">
          <div>
            <span className="text-xs text-text-tertiary uppercase">Arguments</span>
            <pre className="text-xs font-mono text-text-secondary mt-1 overflow-x-auto whitespace-pre-wrap">
              {formatJson(toolCall.arguments)}
            </pre>
          </div>
          {toolCall.output && (
            <div>
              <span className="text-xs text-text-tertiary uppercase">Output</span>
              <pre className="text-xs font-mono text-text-secondary mt-1 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                {toolCall.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}
