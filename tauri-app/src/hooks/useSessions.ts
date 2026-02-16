import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SessionSummary, SessionDetail } from "../types/session";

export function useSessions() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(
    null
  );
  const [inspecting, setInspecting] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const list = await invoke<SessionSummary[]>("list_sessions", {});
      setSessions(list);
    } catch (e) {
      console.error("Failed to load sessions:", e);
    }
  }, []);

  const selectSession = useCallback(async (id: string) => {
    try {
      const detail = await invoke<SessionDetail>("get_session", {
        sessionId: id,
      });
      setSelectedSession(detail);
      setInspecting(true);
    } catch (e) {
      console.error("Failed to load session:", e);
    }
  }, []);

  const deleteSession = useCallback(
    async (id: string) => {
      try {
        await invoke("delete_session", { sessionId: id });
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (selectedSession?.id === id) {
          setSelectedSession(null);
          setInspecting(false);
        }
      } catch (e) {
        console.error("Failed to delete session:", e);
      }
    },
    [selectedSession]
  );

  const closeInspect = useCallback(() => {
    setSelectedSession(null);
    setInspecting(false);
  }, []);

  return {
    sessions,
    selectedSession,
    inspecting,
    loadSessions,
    selectSession,
    deleteSession,
    closeInspect,
  };
}
