import React, { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  ArrowUpRight,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions } from "@/hooks/useTransactions";
import { useBudgets } from "@/hooks/useBudgets";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";

export interface BudgetGuardMetrics {
  totalSpent: number;
  monthlyLimit: number;
  percentUsed: number;
  isOver80: boolean;
  isOver100: boolean;
  status: "safe" | "warning_80" | "critical_100";
  currentMonth: string;
  pollNow: (forceToast?: boolean) => void;
  testToast: (threshold: 80 | 100) => void;
  lastChecked: Date;
}

const STORAGE_PREFIX = "walletwisely_budgetguard_toasts_";
const POLL_INTERVAL_MS = 30000; // 30 seconds

/**
 * useBudgetGuard: Core polling hook that continuously checks transaction totals
 * against set budget limits and fires toast notifications when crossing 80% or 100%.
 */
export function useBudgetGuard(): BudgetGuardMetrics {
  const { user } = useAuth();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets();
  const { data: userSettings } = useUserSettings();
  const { profile, formatMoney } = useCoinKeeper();

  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const currentMonthStr = format(new Date(), "yyyy-MM");
  const userId = user?.id || "guest";
  const trackerKey = `${STORAGE_PREFIX}${userId}_${currentMonthStr}`;

  // Helper to read toasted flags
  const getToastedFlags = useCallback((): { 80?: boolean; 100?: boolean } => {
    try {
      const raw = localStorage.getItem(trackerKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [trackerKey]);

  // Helper to mark threshold as toasted
  const setToastedFlag = useCallback(
    (threshold: 80 | 100) => {
      try {
        const current = getToastedFlags();
        current[threshold] = true;
        localStorage.setItem(trackerKey, JSON.stringify(current));
      } catch {
        // ignore
      }
    },
    [getToastedFlags, trackerKey]
  );

  // Compute current month expenses
  const currentMonthExpenses = useMemo(() => {
    return transactions.filter((t) => {
      const date = t.transaction_date || (t as any).date || "";
      return t.type === "expense" && date.startsWith(currentMonthStr);
    });
  }, [transactions, currentMonthStr]);

  const totalSpent = useMemo(() => {
    return currentMonthExpenses.reduce(
      (sum, t) => sum + Math.abs(Number(t.amount) || 0),
      0
    );
  }, [currentMonthExpenses]);

  // Compute total monthly budget limit
  const monthlyLimit = useMemo(() => {
    const totalBudgeted = budgets.reduce(
      (sum, b) => sum + (Number(b.budgeted_amount) || 0),
      0
    );
    if (totalBudgeted > 0) return totalBudgeted;
    if (userSettings?.monthly_budget_goal && userSettings.monthly_budget_goal > 0) {
      return userSettings.monthly_budget_goal;
    }
    if (profile.defaultMonthlyBudget && profile.defaultMonthlyBudget > 0) {
      return profile.defaultMonthlyBudget;
    }
    return 50000;
  }, [budgets, userSettings?.monthly_budget_goal, profile.defaultMonthlyBudget]);

  const percentUsed = monthlyLimit > 0 ? Math.round((totalSpent / monthlyLimit) * 100) : 0;
  const isOver100 = percentUsed >= 100;
  const isOver80 = percentUsed >= 80;

  const status: "safe" | "warning_80" | "critical_100" = isOver100
    ? "critical_100"
    : isOver80
    ? "warning_80"
    : "safe";

  // Core evaluation function
  const evaluate = useCallback(
    (forceToast: boolean = false) => {
      setLastChecked(new Date());
      const toasted = getToastedFlags();

      if (isOver100) {
        if (!toasted[100] || forceToast) {
          toast.error("🚨 BudgetGuard Alert: 100% Monthly Limit Exceeded!", {
            description: `You have spent ${formatMoney(totalSpent)} of your ${formatMoney(monthlyLimit)} limit (${percentUsed}%). Immediate adjustment recommended.`,
            duration: 8000,
            action: {
              label: "Review Budgets",
              onClick: () => {
                window.dispatchEvent(new CustomEvent("walletwisely:navigate", { detail: "budgets" }));
              },
            },
          });
          setToastedFlag(100);
        }
      } else if (isOver80) {
        if (!toasted[80] || forceToast) {
          toast.warning("⚠️ BudgetGuard Alert: 80% Threshold Reached", {
            description: `You've used ${percentUsed}% of your monthly budget (${formatMoney(totalSpent)} / ${formatMoney(monthlyLimit)}). Caution on discretionary spending.`,
            duration: 6500,
            action: {
              label: "View Ledger",
              onClick: () => {
                window.dispatchEvent(new CustomEvent("walletwisely:navigate", { detail: "expenses" }));
              },
            },
          });
          setToastedFlag(80);
        }
      } else if (forceToast) {
        toast.success("🛡️ BudgetGuard: Spending Within Limits", {
          description: `Current spending is at ${percentUsed}% (${formatMoney(totalSpent)} of ${formatMoney(monthlyLimit)}). Budget is healthy!`,
          duration: 5000,
        });
      }
    },
    [
      isOver100,
      isOver80,
      percentUsed,
      totalSpent,
      monthlyLimit,
      formatMoney,
      getToastedFlags,
      setToastedFlag,
    ]
  );

  // Background polling loop
  useEffect(() => {
    if (txLoading || budgetsLoading) return;

    evaluate(false);

    const interval = setInterval(() => {
      evaluate(false);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [txLoading, budgetsLoading, evaluate]);

  // Test simulation trigger
  const testToast = useCallback(
    (threshold: 80 | 100) => {
      const isCrit = threshold === 100;
      const simulatedLimit = monthlyLimit > 0 ? monthlyLimit : 50000;
      const simulatedSpent = isCrit ? Math.round(simulatedLimit * 1.05) : Math.round(simulatedLimit * 0.83);
      const simulatedPercent = Math.round((simulatedSpent / simulatedLimit) * 100);

      if (isCrit) {
        toast.error("🚨 BudgetGuard Alert: 100% Monthly Limit Exceeded!", {
          description: `[Simulation] You have spent ${formatMoney(simulatedSpent)} of your ${formatMoney(simulatedLimit)} limit (${simulatedPercent}%). Immediate adjustment recommended.`,
          duration: 7000,
          action: {
            label: "Review Budgets",
            onClick: () => {
              window.dispatchEvent(new CustomEvent("walletwisely:navigate", { detail: "budgets" }));
            },
          },
        });
      } else {
        toast.warning("⚠️ BudgetGuard Alert: 80% Threshold Reached", {
          description: `[Simulation] You've used ${simulatedPercent}% of your monthly budget (${formatMoney(simulatedSpent)} / ${formatMoney(simulatedLimit)}). Caution on discretionary spending.`,
          duration: 6500,
          action: {
            label: "View Ledger",
            onClick: () => {
              window.dispatchEvent(new CustomEvent("walletwisely:navigate", { detail: "expenses" }));
            },
          },
        });
      }
    },
    [monthlyLimit, formatMoney]
  );

  const pollNow = useCallback(
    (forceToast: boolean = true) => {
      evaluate(forceToast);
    },
    [evaluate]
  );

  return {
    totalSpent,
    monthlyLimit,
    percentUsed,
    isOver80,
    isOver100,
    status,
    currentMonth: currentMonthStr,
    pollNow,
    testToast,
    lastChecked,
  };
}

interface BudgetGuardProps {
  variant?: "banner" | "compact" | "headless";
  onNavigateTab?: (tab: string) => void;
  className?: string;
  showSimulateButtons?: boolean;
}

/**
 * BudgetGuard: Component that renders a protective budget health status banner
 * and continuously polls transaction totals vs budgets, triggering toasts on 80% & 100%.
 */
export function BudgetGuard({
  variant = "banner",
  onNavigateTab,
  className,
  showSimulateButtons = true,
}: BudgetGuardProps) {
  const metrics = useBudgetGuard();
  const { formatMoney } = useCoinKeeper();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const {
    totalSpent,
    monthlyLimit,
    percentUsed,
    isOver80,
    isOver100,
    status,
    pollNow,
    testToast,
    lastChecked,
  } = metrics;

  const handleManualCheck = () => {
    setIsChecking(true);
    pollNow(true);
    setTimeout(() => {
      setIsChecking(false);
    }, 600);
  };

  if (variant === "headless") {
    return null;
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all shadow-sm",
          isOver100
            ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
            : isOver80
            ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
          className
        )}
      >
        {isOver100 ? (
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
        ) : isOver80 ? (
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        )}
        <span className="font-semibold">BudgetGuard:</span>
        <span className="font-mono">{percentUsed}%</span>
      </div>
    );
  }

  // If safe and dismissed, hide banner
  if (isDismissed && !isOver80) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="BudgetGuard Live Protection"
      className={cn(
        "rounded-2xl border p-4 sm:p-5 transition-all shadow-sm backdrop-blur-md relative overflow-hidden",
        isOver100
          ? "bg-rose-500/10 border-rose-500/30 text-foreground"
          : isOver80
          ? "bg-amber-500/10 border-amber-500/30 text-foreground"
          : "bg-card/70 border-border/70 text-foreground",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Side: Status Icon & Details */}
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
              isOver100
                ? "bg-rose-500 text-white shadow-rose-500/20"
                : isOver80
                ? "bg-amber-500 text-white shadow-amber-500/20"
                : "bg-emerald-500/15 text-emerald-500"
            )}
          >
            {isOver100 ? (
              <ShieldAlert className="w-5 h-5" />
            ) : isOver80 ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                <span>BudgetGuard Active</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </h3>

              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-mono font-bold px-2 py-0.5",
                  isOver100
                    ? "border-rose-500/40 text-rose-500 bg-rose-500/15"
                    : isOver80
                    ? "border-amber-500/40 text-amber-500 bg-amber-500/15"
                    : "border-emerald-500/40 text-emerald-500 bg-emerald-500/15"
                )}
              >
                {isOver100
                  ? "🚨 100%+ Limit Exceeded"
                  : isOver80
                  ? "⚠️ 80%+ Threshold Reached"
                  : "🛡️ Secure (Within Limits)"}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {isOver100 ? (
                <span>
                  Current spend is <strong>{formatMoney(totalSpent)}</strong> against your{" "}
                  <strong>{formatMoney(monthlyLimit)}</strong> limit ({percentUsed}%). Toast alerts active.
                </span>
              ) : isOver80 ? (
                <span>
                  You have consumed <strong>{percentUsed}%</strong> of your monthly allowance (
                  {formatMoney(totalSpent)} of {formatMoney(monthlyLimit)}).
                </span>
              ) : (
                <span>
                  Live polling transaction totals against monthly limits (every 30s). Spent{" "}
                  <strong>{formatMoney(totalSpent)}</strong> of <strong>{formatMoney(monthlyLimit)}</strong> (
                  {percentUsed}%).
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Button
            size="sm"
            variant="outline"
            onClick={handleManualCheck}
            disabled={isChecking}
            className="text-xs h-8 gap-1.5 border-border/60 hover:bg-secondary/60"
            title="Poll transaction totals now"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isChecking && "animate-spin text-primary")} />
            <span>{isChecking ? "Checking…" : "Poll Now"}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => onNavigateTab?.("budgets")}
            className={cn(
              "text-xs h-8 font-semibold gap-1.5 shadow-sm",
              isOver100
                ? "bg-rose-500 hover:bg-rose-600 text-white"
                : isOver80
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
          >
            Manage Budget <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            title={isExpanded ? "Collapse simulator" : "Expand simulator"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {!isOver80 && (
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar with 80% and 100% threshold markers */}
      <div className="mt-3.5 pt-3 border-t border-border/40">
        <div className="relative w-full h-3 bg-secondary/80 rounded-full overflow-hidden border border-border/40">
          {/* 80% Warning Marker */}
          <div
            className="absolute top-0 bottom-0 border-r-2 border-amber-500/90 z-20 pointer-events-none"
            style={{ left: "80%" }}
            title="80% Warning Trigger"
          />
          {/* 100% Critical Marker */}
          <div
            className="absolute top-0 bottom-0 border-r-2 border-rose-500/90 z-20 pointer-events-none"
            style={{ left: "100%" }}
            title="100% Exceeded Trigger"
          />
          {/* Spent Progress Bar */}
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

        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5">
          <span>
            Spent: <strong className="text-foreground font-mono">{formatMoney(totalSpent)}</strong>
          </span>
          <span className="font-mono font-bold text-foreground">
            {percentUsed}% of budget used
          </span>
          <span>
            Limit: <strong className="text-foreground font-mono">{formatMoney(monthlyLimit)}</strong>
          </span>
        </div>
      </div>

      {/* Expandable Simulator & Testing Controls */}
      {isExpanded && showSimulateButtons && (
        <div className="mt-3 p-3 rounded-xl bg-background/50 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              <strong>BudgetGuard Simulator:</strong> Trigger sample toasts to verify system behavior.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => testToast(80)}
              className="text-[11px] h-7 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-medium"
            >
              Test 80% Toast
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => testToast(100)}
              className="text-[11px] h-7 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-medium"
            >
              Test 100% Toast
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
