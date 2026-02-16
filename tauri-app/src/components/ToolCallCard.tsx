import { useState } from "react";
import type { ToolCallActivity } from "../hooks/useChat";

interface ToolCallCardProps {
  toolCall: ToolCallActivity;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon =
    toolCall.status === "running" ? (
      <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 tool-running" />
    ) : toolCall.status === "success" ? (
      <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
    ) : (
      <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
    );

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-800 transition-colors"
      >
        {statusIcon}
        <span className="font-mono text-gray-300">{toolCall.name}</span>
        <span className="ml-auto text-gray-500 text-xs">
          {expanded ? "▼" : "▶"}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-gray-700 px-3 py-2 space-y-2">
          <div>
            <span className="text-xs text-gray-500 uppercase">Arguments</span>
            <pre className="text-xs font-mono text-gray-400 mt-1 overflow-x-auto whitespace-pre-wrap">
              {formatJson(toolCall.arguments)}
            </pre>
          </div>
          {toolCall.output && (
            <div>
              <span className="text-xs text-gray-500 uppercase">Output</span>
              <pre className="text-xs font-mono text-gray-400 mt-1 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
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
