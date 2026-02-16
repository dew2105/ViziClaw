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
          className={`activity-pill inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            activity.type === "memory"
              ? "bg-purple-900/50 text-purple-300"
              : activity.type === "provider"
                ? "bg-blue-900/50 text-blue-300"
                : "bg-yellow-900/50 text-yellow-300"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              activity.type === "memory"
                ? "bg-purple-400"
                : activity.type === "provider"
                  ? "bg-blue-400"
                  : "bg-yellow-400"
            }`}
          />
          {activity.label}
        </span>
      ))}
    </div>
  );
}
