import { format } from "date-fns";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAutoRecurringStatus } from "@/hooks/useAutoRecurring";
import { cn } from "@/lib/utils";

/** Small live indicator showing whether the auto-posting engine is running. */
export function AutoPostStatus({ className }: { className?: string }) {
  const { running, lastRunAt, lastPosted, error } = useAutoRecurringStatus();

  if (running) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground",
          className
        )}
      >
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>Auto-posting due schedules… deleting is paused until this finishes.</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="status"
        className={cn(
          "flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground",
          className
        )}
      >
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <span>Auto-posting failed: {error}</span>
      </div>
    );
  }

  if (!lastRunAt) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground",
        className
      )}
    >
      <CheckCircle2 className="w-4 h-4 text-success" />
      <span>
        Auto-posts up to date · last check {format(lastRunAt, "HH:mm")} ·{" "}
        {lastPosted > 0 ? `${lastPosted} posted` : "nothing was due"}
      </span>
    </div>
  );
}
