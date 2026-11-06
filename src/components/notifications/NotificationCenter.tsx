import React, { useState, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  CheckCheck,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
  ArrowUpRight,
  Flame,
  Info,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import {
  useBudgetNotificationPoller,
  BudgetNotification,
} from "@/hooks/useBudgetNotificationPoller";

interface NotificationCenterProps {
  onNavigateTab?: (tab: string) => void;
  className?: string;
}

export function NotificationCenter({
  onNavigateTab,
  className,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "threshold">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { formatMoney } = useCoinKeeper();

  const {
    notifications,
    unreadCount,
    criticalCount,
    warningCount,
    lastChecked,
    isPolling,
    totalSpent,
    monthlyLimit,
    percentUsed,
    pollNow,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    testTrigger,
  } = useBudgetNotificationPoller();

  const isOver100 = percentUsed >= 100;
  const isOver80 = percentUsed >= 80;

  // Filter notifications based on tab
  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case "unread":
        return notifications.filter((n) => !n.read);
      case "threshold":
        return notifications.filter(
          (n) => n.thresholdLevel === 80 || n.thresholdLevel === 100
        );
      case "all":
      default:
        return notifications;
    }
  }, [notifications, activeFilter]);

  const handleManualCheck = () => {
    setIsRefreshing(true);
    pollNow();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleActionClick = (targetTab: string) => {
    setOpen(false);
    onNavigateTab?.(targetTab);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-8 w-8 rounded-lg hover:bg-secondary/80 focus-visible:ring-1 transition-all",
            className
          )}
          aria-label={`Notifications (${unreadCount} unread)`}
          title="Budget Alerts & Notifications"
        >
          <Bell className="w-4 h-4 text-foreground/80" />

          {/* Indicator Badge with Animated Pulse */}
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[10px] font-bold font-mono text-white shadow-sm",
                criticalCount > 0
                  ? "bg-rose-500"
                  : warningCount > 0
                  ? "bg-amber-500"
                  : "bg-primary"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
              <span
                className={cn(
                  "absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping pointer-events-none",
                  criticalCount > 0
                    ? "bg-rose-500"
                    : warningCount > 0
                    ? "bg-amber-500"
                    : "bg-primary"
                )}
              />
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[390px] sm:w-[420px] p-0 shadow-2xl border-border/80 bg-card/95 backdrop-blur-xl rounded-2xl overflow-hidden z-50 text-foreground"
      >
        {/* 1. Header with live status */}
        <div className="p-3.5 px-4 bg-muted/40 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                criticalCount > 0
                  ? "bg-rose-500/15 text-rose-500"
                  : warningCount > 0
                  ? "bg-amber-500/15 text-amber-500"
                  : "bg-primary/10 text-primary"
              )}
            >
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-foreground">Notification Center</h4>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span>Active Polling (30s)</span>
                <span>·</span>
                <span>Checked {format(lastChecked, "h:mm:ss a")}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleManualCheck}
              disabled={isRefreshing}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Poll now"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-primary")} />
            </Button>
            {notifications.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={markAllAsRead}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-primary" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearAllNotifications}
                  className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 2. Live Spending vs Monthly Budget Gauge Card */}
        <div className="p-3.5 mx-3.5 mt-3 rounded-xl border bg-secondary/30 border-border/50">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <span>Monthly Budget Monitor</span>
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-mono font-bold px-2 py-0.5",
                isOver100
                  ? "border-rose-500/40 text-rose-500 bg-rose-500/10"
                  : isOver80
                  ? "border-amber-500/40 text-amber-500 bg-amber-500/10"
                  : "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
              )}
            >
              {isOver100
                ? "🚨 Exceeded (100%+)"
                : isOver80
                ? "⚠️ Warning (80%+)"
                : "✅ Within Budget"}
            </Badge>
          </div>

          {/* Progress bar with threshold indicators at 80% & 100% */}
          <div className="relative w-full h-3 bg-secondary/80 rounded-full overflow-hidden my-2 border border-border/40">
            {/* 80% tick marker */}
            <div
              className="absolute top-0 bottom-0 border-r-2 border-amber-500/80 z-20 pointer-events-none"
              style={{ left: "80%" }}
              title="80% Threshold Warning Trigger"
            />
            {/* 100% tick marker */}
            <div
              className="absolute top-0 bottom-0 border-r-2 border-rose-500/90 z-20 pointer-events-none"
              style={{ left: "100%" }}
              title="100% Limit Exceeded Trigger"
            />
            {/* Active spent fill */}
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isOver100
                  ? "bg-gradient-to-r from-rose-500 to-rose-600"
                  : isOver80
                  ? "bg-gradient-to-r from-amber-500 to-orange-500"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500"
              )}
              style={{ width: `${Math.min(100, percentUsed)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
            <span>
              Spent: <strong className="text-foreground font-mono">{formatMoney(totalSpent)}</strong>
            </span>
            <span className="font-mono font-bold text-foreground">
              {percentUsed}% Used
            </span>
            <span>
              Limit: <strong className="text-foreground font-mono">{formatMoney(monthlyLimit)}</strong>
            </span>
          </div>
        </div>

        {/* 3. Filter Tabs */}
        <div className="px-3.5 pt-3">
          <Tabs value={activeFilter} onValueChange={(v: any) => setActiveFilter(v)}>
            <TabsList className="grid grid-cols-3 h-8 bg-muted/60 p-0.5 rounded-lg text-xs">
              <TabsTrigger value="all" className="text-[11px] h-7">
                All ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-[11px] h-7">
                Unread ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="threshold" className="text-[11px] h-7">
                Thresholds
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 4. Notification Items List */}
        <div className="p-3.5 space-y-2 max-h-[340px] overflow-y-auto text-xs">
          {filteredNotifications.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center space-y-2 text-muted-foreground">
              <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                {activeFilter === "unread" ? "No unread alerts" : "All Clear!"}
              </p>
              <p className="text-[11px] max-w-xs text-muted-foreground">
                Current monthly spending is within optimal limits. Polling will automatically toast when crossing 80% or 100%.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isCrit = notif.type === "critical";
              const isWarn = notif.type === "warning";

              let timeAgo = "Just now";
              try {
                timeAgo = formatDistanceToNow(new Date(notif.timestamp), {
                  addSuffix: true,
                });
              } catch {
                // ignore
              }

              return (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={cn(
                    "p-3 rounded-xl border transition-all relative group cursor-pointer",
                    !notif.read
                      ? isCrit
                        ? "bg-rose-500/10 border-rose-500/30"
                        : isWarn
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-primary/5 border-primary/20"
                      : "bg-secondary/20 border-border/40 hover:bg-secondary/40"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        isCrit
                          ? "bg-rose-500/20 text-rose-500"
                          : isWarn
                          ? "bg-amber-500/20 text-amber-500"
                          : "bg-primary/20 text-primary"
                      )}
                    >
                      {isCrit ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : isWarn ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Info className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-foreground text-[11px]">
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                        {notif.percentUsed > 0 && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] font-mono px-1.5 py-0 h-4",
                              isCrit
                                ? "border-rose-500/40 text-rose-500 bg-rose-500/10"
                                : "border-amber-500/40 text-amber-500 bg-amber-500/10"
                            )}
                          >
                            {notif.percentUsed}%
                          </Badge>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/30 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {timeAgo}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionClick("budgets");
                            }}
                            className="text-primary hover:underline font-semibold flex items-center gap-0.5"
                          >
                            Budgets <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      className="absolute top-2.5 right-2.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Dismiss notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. Interactive Simulation & Test Suite in Footer */}
        <div className="p-3 bg-muted/40 border-t border-border/50 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[9px] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" /> Test Toast Triggers:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => testTrigger(80)}
                className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30 hover:bg-amber-500/25 transition-all text-[10px]"
                title="Simulate 80% monthly limit toast"
              >
                Trigger 80% Toast
              </button>
              <button
                type="button"
                onClick={() => testTrigger(100)}
                className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold border border-rose-500/30 hover:bg-rose-500/25 transition-all text-[10px]"
                title="Simulate 100% budget limit exceeded toast"
              >
                Trigger 100% Toast
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleActionClick("budgets")}
              className="text-xs h-7 text-primary hover:text-primary gap-1 font-semibold"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Manage Budgets
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs h-7 text-muted-foreground hover:text-foreground"
            >
              Close
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
