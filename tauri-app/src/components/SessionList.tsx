import type { SessionSummary } from "../types/session";

interface SessionListProps {
  sessions: SessionSummary[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  activeId: string | null;
}

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  } catch {
    return ts;
  }
}

function modelBadge(model: string): string {
  if (model.includes("claude")) return "Claude";
  if (model.includes("gpt-4")) return "GPT-4";
  if (model.includes("gpt-3")) return "GPT-3.5";
  if (model.includes("llama")) return "Llama";
  const parts = model.split("/");
  return parts[parts.length - 1].slice(0, 12);
}

export function SessionList({
  sessions,
  onSelect,
  onDelete,
  activeId,
}: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="p-4 text-text-tertiary text-sm text-center">
        No sessions yet
      </div>
    );
  }

  return (
    <div className="py-2">
      {sessions.map((session) => (
        <div
          key={session.id}
          onClick={() => onSelect(session.id)}
          className={`group px-4 py-3 cursor-pointer hover:bg-surface-hover transition-colors duration-300 ease-out ${
            activeId === session.id ? "bg-surface-active" : ""
          }`}
        >
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-medium text-text truncate flex-1 mr-2">
              {session.title}
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-status-error text-xs transition-opacity duration-300 ease-out"
            >
              &times;
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-1.5 py-0.5 bg-surface-active rounded text-text-secondary">
              {modelBadge(session.model)}
            </span>
            <span className="text-xs text-text-tertiary">
              {formatTimestamp(session.updated_at)}
            </span>
            <span className="text-xs text-text-tertiary">
              {session.message_count} msgs
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
