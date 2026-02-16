import { useEffect } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";
import { SessionDetail } from "./components/SessionDetail";
import { useChat } from "./hooks/useChat";
import { useSessions } from "./hooks/useSessions";

export default function App() {
  const chat = useChat();
  const sessions = useSessions();

  useEffect(() => {
    sessions.loadSessions();
  }, [sessions.loadSessions]);

  // Refresh session list when a session completes
  useEffect(() => {
    if (!chat.isStreaming && chat.sessionId) {
      sessions.loadSessions();
    }
  }, [chat.isStreaming, chat.sessionId, sessions.loadSessions]);

  return (
    <div className="flex flex-col h-screen bg-surface text-text">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar
          sessions={sessions.sessions}
          onNewChat={() => {
            chat.newSession();
            sessions.closeInspect();
          }}
          onSelectSession={(id) => sessions.selectSession(id)}
          onDeleteSession={(id) => sessions.deleteSession(id)}
          activeSessionId={chat.sessionId}
        />
        <main className="flex-1 flex flex-col min-w-0">
          {sessions.inspecting && sessions.selectedSession ? (
            <SessionDetail
              session={sessions.selectedSession}
              onClose={sessions.closeInspect}
            />
          ) : (
            <ChatView
              messages={chat.messages}
              streamingContent={chat.streamingContent}
              activeToolCalls={chat.activeToolCalls}
              isStreaming={chat.isStreaming}
              activities={chat.activities}
              onSendMessage={chat.sendMessage}
            />
          )}
        </main>
      </div>
    </div>
  );
}
