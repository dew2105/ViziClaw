import type { Activity } from "../hooks/useChat";

interface ActivityLogProps {
  activities: Activity[];
}

export function ActivityLog({ activities }: ActivityLogProps) {
  if (activities.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {activities.map((activity) => (
        <span
          key={activity.id}
          className={`activity-pill inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-text-secondary ${
            activity.type === "memory"
              ? "bg-pill-memory"
              : activity.type === "provider"
                ? "bg-pill-provider"
                : "bg-pill-tool"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              activity.type === "memory"
                ? "bg-accent"
                : activity.type === "provider"
                  ? "bg-silver"
                  : "bg-status-running"
            }`}
          />
          {activity.label}
        </span>
      ))}
    </div>
  );
}
