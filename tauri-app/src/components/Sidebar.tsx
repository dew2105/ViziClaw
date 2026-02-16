import { SessionList } from "./SessionList";
import type { SessionSummary } from "../types/session";

interface SidebarProps {
  sessions: SessionSummary[];
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  activeSessionId: string | null;
}

export function Sidebar({
  sessions,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  activeSessionId,
}: SidebarProps) {
  return (
    <aside className="w-[280px] bg-surface-alt border-r border-border flex flex-col h-screen">
      <div className="p-4 border-b border-border">
        <button
          onClick={onNewChat}
          className="w-full py-2 px-4 bg-charcoal hover:bg-accent-hover text-text-on-dark rounded-lg font-medium transition-colors duration-300 ease-out"
        >
          + New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SessionList
          sessions={sessions}
          onSelect={onSelectSession}
          onDelete={onDeleteSession}
          activeId={activeSessionId}
        />
      </div>
      <div className="p-3 border-t border-border text-xs text-text-tertiary text-center">
        ViziClaw Desktop v0.1.0
      </div>
    </aside>
  );
}
