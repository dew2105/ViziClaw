import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ToolCallCard } from "./ToolCallCard";
import type { ToolCallActivity } from "../hooks/useChat";

interface StreamingContentProps {
  content: string;
  toolCalls: ToolCallActivity[];
}

export function StreamingContent({
  content,
  toolCalls,
}: StreamingContentProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-800 text-gray-100">
        {toolCalls.length > 0 && (
          <div className="space-y-2 mb-3">
            {toolCalls.map((tc, i) => (
              <ToolCallCard key={`${tc.name}-${i}`} toolCall={tc} />
            ))}
          </div>
        )}
        {content && (
          <div className="prose prose-invert prose-sm max-w-none streaming-cursor">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
        {!content && toolCalls.length === 0 && (
          <span className="streaming-cursor text-gray-400">Thinking</span>
        )}
      </div>
    </div>
  );
}
