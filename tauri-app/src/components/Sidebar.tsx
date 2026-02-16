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
    <aside className="w-[280px] bg-gray-900 border-r border-gray-800 flex flex-col h-screen">
      <div className="p-4 border-b border-gray-800">
        <button
          onClick={onNewChat}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
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
      <div className="p-3 border-t border-gray-800 text-xs text-gray-500 text-center">
        ViziClaw Desktop v0.1.0
      </div>
    </aside>
  );
}
