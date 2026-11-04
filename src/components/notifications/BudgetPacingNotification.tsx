import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Bell,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  ShieldAlert,
  X,
  ChevronRight,
  SlidersHorizontal,
  Flame,
  ArrowUpRight,
  Info,
} from "lucide-react";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { useFirestoreBudgets } from "@/hooks/useFirestoreBudgets";
import { useTransactions } from "@/hooks/useTransactions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PacingMetrics {
  totalDaysInMonth: number;
  currentDay: number;
  daysRemaining: number;
  targetBudget: number;
  monthSpend: number;
  monthIncome: number;
  todaySpend: number;
  dailyAllowance: number;
  expectedSpendToDate: number;
  pacingRatio: number;
  pacingPercent: number;
  isOverPacing: boolean;
  isCritical: boolean;
  recommendedDailyAllowance: number;
  todayBurnRatio: number;
  categoryAlerts: {
    category: string;
    label: string;
    budgeted: number;
    spent: number;
    expectedToDate: number;
    ratio: number;
    isOverPacing: boolean;
  }[];
  totalAlertsCount: number;
}

export function useBudgetPacing(): PacingMetrics {
  const { profile } = useCoinKeeper();
  const currentDate = new Date();
  const currentMonthNum = currentDate.getMonth() + 1;
  const currentYearNum = currentDate.getFullYear();

  const { summary: firestoreSummary } = useFirestoreBudgets(currentMonthNum, currentYearNum);
  const { data: transactions = [] } = useTransactions();

  return useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const currentDay = now.getDate();
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const daysRemaining = Math.max(1, totalDaysInMonth - currentDay);

    // 1. Determine Monthly Target Budget
    const budgetedFromDb = firestoreSummary?.totalBudgeted || 0;
    const targetBudget =
      budgetedFromDb > 0 ? budgetedFromDb : profile.defaultMonthlyBudget || 50000;

    // 2. Compute Actual Current Month Spending & Today's Spend from real transactions
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    const todayStr = format(now, "yyyy-MM-dd");

    let monthSpend = 0;
    let monthIncome = 0;
    let todaySpend = 0;
    const categorySpendMap: Record<string, number> = {};

    transactions.forEach((tx) => {
      const txDate = tx.transaction_date || (tx as any).date || "";
      const amt = Math.abs(Number(tx.amount) || 0);

      if (txDate.startsWith(monthPrefix)) {
        if (tx.type === "expense") {
          monthSpend += amt;
          const catKey = (tx.category || "other").toLowerCase().trim();
          categorySpendMap[catKey] = (categorySpendMap[catKey] || 0) + amt;

          if (txDate === todayStr) {
            todaySpend += amt;
          }
        } else if (tx.type === "income") {
          monthIncome += amt;
        }
      }
    });

    // Fallback to firestoreSummary if transactions list had 0 expenses but firestore has logged data
    if (monthSpend === 0 && (firestoreSummary?.expenses || 0) > 0) {
      monthSpend = firestoreSummary.expenses;
    }

    // 3. Mathematical Pacing
    const dailyAllowance = Math.round(targetBudget / totalDaysInMonth);
    const expectedSpendToDate = Math.round((targetBudget / totalDaysInMonth) * currentDay);
    const pacingRatio = expectedSpendToDate > 0 ? monthSpend / expectedSpendToDate : 1;
    const pacingPercent = Math.round(pacingRatio * 100);

    const isOverPacing = pacingRatio > 1.05;
    const isCritical = pacingRatio > 1.25 || monthSpend > targetBudget;

    // Recommended daily allowance for remainder of the month to stay within budget
    const remainingBudget = Math.max(0, targetBudget - monthSpend);
    const recommendedDailyAllowance = Math.round(remainingBudget / daysRemaining);

    // Today's burn ratio compared to nominal daily allowance
    const todayBurnRatio = dailyAllowance > 0 ? todaySpend / dailyAllowance : 0;

    // 4. Category-level pacing breakdown
    const categoryAlerts: PacingMetrics["categoryAlerts"] = [];

    (firestoreSummary?.categoryBreakdown || []).forEach((cat) => {
      if (cat.budgeted > 0) {
        const catExpectedToDate = (cat.budgeted / totalDaysInMonth) * currentDay;
        const catSpent = categorySpendMap[cat.category.toLowerCase()] || cat.spent || 0;
        const catRatio = catExpectedToDate > 0 ? catSpent / catExpectedToDate : 0;

        if (catRatio > 1.15 && catSpent > 500) {
          categoryAlerts.push({
            category: cat.category,
            label: cat.label || cat.category,
            budgeted: cat.budgeted,
            spent: catSpent,
            expectedToDate: Math.round(catExpectedToDate),
            ratio: catRatio,
            isOverPacing: true,
          });
        }
      }
    });

    let totalAlertsCount = 0;
    if (isCritical) totalAlertsCount += 2;
    else if (isOverPacing) totalAlertsCount += 1;
    if (todaySpend > dailyAllowance * 1.2) totalAlertsCount += 1;
    totalAlertsCount += categoryAlerts.length;

    return {
      totalDaysInMonth,
      currentDay,
      daysRemaining,
      targetBudget,
      monthSpend,
      monthIncome,
      todaySpend,
      dailyAllowance,
      expectedSpendToDate,
      pacingRatio,
      pacingPercent,
      isOverPacing,
      isCritical,
      recommendedDailyAllowance,
      todayBurnRatio,
      categoryAlerts,
      totalAlertsCount,
    };
  }, [firestoreSummary, transactions, profile.defaultMonthlyBudget]);
}

interface BudgetPacingNotificationProps {
  onNavigateTab?: (tab: string) => void;
}

export function BudgetPacingNotification({ onNavigateTab }: BudgetPacingNotificationProps) {
  const [open, setOpen] = useState(false);
  const metrics = useBudgetPacing();
  const { formatMoney } = useCoinKeeper();

  const {
    currentDay,
    totalDaysInMonth,
    daysRemaining,
    targetBudget,
    monthSpend,
    todaySpend,
    dailyAllowance,
    expectedSpendToDate,
    pacingPercent,
    isOverPacing,
    isCritical,
    recommendedDailyAllowance,
    categoryAlerts,
    totalAlertsCount,
  } = metrics;

  const spendProgress = Math.min(100, Math.round((monthSpend / targetBudget) * 100));
  const expectedProgress = Math.min(100, Math.round((expectedSpendToDate / targetBudget) * 100));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-lg hover:bg-secondary/80 focus-visible:ring-1"
          aria-label="Budget Pacing and Spending Notifications"
        >
          <Bell className="w-4 h-4 text-foreground/80" />

          {/* Indicator Badge */}
          {totalAlertsCount > 0 && (
            <span
              className={cn(
                "absolute top-1 right-1 flex h-2.5 w-2.5 items-center justify-center",
                isCritical
                  ? "text-rose-500"
                  : isOverPacing
                  ? "text-amber-500"
                  : "text-primary"
              )}
            >
              <span
                className={cn(
                  "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
                  isCritical ? "bg-rose-500" : isOverPacing ? "bg-amber-500" : "bg-primary"
                )}
              />
              <span
                className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  isCritical ? "bg-rose-500" : isOverPacing ? "bg-amber-500" : "bg-primary"
                )}
              />
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-96 p-0 shadow-2xl border-border/80 bg-card/95 backdrop-blur-md rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-3.5 px-4 bg-muted/40 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                isCritical
                  ? "bg-rose-500/15 text-rose-500"
                  : isOverPacing
                  ? "bg-amber-500/15 text-amber-500"
                  : "bg-emerald-500/15 text-emerald-500"
              )}
            >
              {isCritical ? (
                <ShieldAlert className="w-4 h-4" />
              ) : isOverPacing ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">Spending Pacing Radar</h4>
              <p className="text-[10px] text-muted-foreground">
                Day {currentDay} of {totalDaysInMonth} ({daysRemaining} days left)
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-mono px-2 py-0.5",
              isCritical
                ? "border-rose-500/40 text-rose-500 bg-rose-500/10"
                : isOverPacing
                ? "border-amber-500/40 text-amber-500 bg-amber-500/10"
                : "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
            )}
          >
            {isCritical ? "Critical Pace" : isOverPacing ? "Over Pacing" : "On Track"}
          </Badge>
        </div>

        {/* Body Content */}
        <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto text-xs">
          {/* Main Pacing Meter Card */}
          <div
            className={cn(
              "p-3 rounded-lg border",
              isCritical
                ? "bg-rose-500/5 border-rose-500/20"
                : isOverPacing
                ? "bg-amber-500/5 border-amber-500/20"
                : "bg-secondary/40 border-border/50"
            )}
          >
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                Monthly Burn vs Target Pace
              </span>
              <span
                className={cn(
                  "font-mono font-bold text-[11px]",
                  isCritical ? "text-rose-500" : isOverPacing ? "text-amber-500" : "text-emerald-500"
                )}
              >
                {pacingPercent}% of expected
              </span>
            </div>

            {/* Custom Multi-layered Progress Track */}
            <div className="relative w-full h-2.5 bg-secondary/80 rounded-full overflow-hidden my-2">
              {/* Expected marker */}
              <div
                className="absolute top-0 bottom-0 bg-muted-foreground/30 border-r-2 border-foreground/60 z-10 transition-all duration-300"
                style={{ width: `${expectedProgress}%` }}
                title={`Expected by today: ${expectedProgress}%`}
              />
              {/* Actual spent bar */}
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isCritical
                    ? "bg-gradient-to-r from-rose-500 to-rose-600"
                    : isOverPacing
                    ? "bg-gradient-to-r from-amber-500 to-orange-500"
                    : "bg-gradient-to-r from-emerald-500 to-teal-500"
                )}
                style={{ width: `${Math.min(100, spendProgress)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
              <span>Spent: <strong className="text-foreground">{formatMoney(monthSpend)}</strong></span>
              <span>Expected to date: <strong>{formatMoney(expectedSpendToDate)}</strong></span>
              <span>Limit: <strong>{formatMoney(targetBudget)}</strong></span>
            </div>
          </div>

          {/* Today's Burn vs Daily Allowance Card */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/40">
              <div className="flex items-center justify-between text-muted-foreground text-[10px] mb-1">
                <span>Today's Spend</span>
                <Flame className={cn("w-3 h-3", todaySpend > dailyAllowance ? "text-rose-500" : "text-primary")} />
              </div>
              <div className="text-sm font-bold font-mono text-foreground">
                {formatMoney(todaySpend)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Nominal cap: {formatMoney(dailyAllowance)}/day
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/40">
              <div className="flex items-center justify-between text-muted-foreground text-[10px] mb-1">
                <span>Safe Daily Cap</span>
                <Clock className="w-3 h-3 text-accent" />
              </div>
              <div
                className={cn(
                  "text-sm font-bold font-mono",
                  recommendedDailyAllowance < dailyAllowance * 0.7
                    ? "text-rose-500"
                    : "text-foreground"
                )}
              >
                {formatMoney(recommendedDailyAllowance)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                For next {daysRemaining} days
              </p>
            </div>
          </div>

          {/* Actionable Advice Message */}
          <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-[11px] flex items-start gap-2 text-foreground/90 leading-relaxed">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              {isCritical ? (
                <span>
                  <strong>Action Required:</strong> You are <strong>{pacingPercent - 100}% ahead</strong> of your schedule. Cap daily spending at <strong>{formatMoney(recommendedDailyAllowance)}</strong> for the remainder of this month to avoid a deficit.
                </span>
              ) : isOverPacing ? (
                <span>
                  <strong>Advisory:</strong> Your current burn rate is running slightly higher than planned. Slowing discretionary expenses down to <strong>{formatMoney(recommendedDailyAllowance)}/day</strong> will return you to target.
                </span>
              ) : (
                <span>
                  <strong>Pacing Healthy:</strong> You are pacing at <strong>{pacingPercent}%</strong> of your budgeted target. You have an allowance of up to <strong>{formatMoney(recommendedDailyAllowance)}/day</strong> remaining.
                </span>
              )}
            </div>
          </div>

          {/* Category Pacing Alerts if any */}
          {categoryAlerts.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Category Pacing Alerts</span>
                <span className="text-amber-500">{categoryAlerts.length} Over Pacing</span>
              </span>
              <div className="space-y-1">
                {categoryAlerts.slice(0, 3).map((cat) => (
                  <div
                    key={cat.category}
                    className="p-2 rounded-md bg-secondary/40 border border-border/40 flex items-center justify-between text-[11px]"
                  >
                    <div>
                      <span className="font-semibold text-foreground capitalize">{cat.label}</span>
                      <p className="text-[10px] text-muted-foreground">
                        {formatMoney(cat.spent)} spent of {formatMoney(cat.budgeted)} limit
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-500 bg-amber-500/10">
                      +{Math.round((cat.ratio - 1) * 100)}% pace
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-3 bg-muted/40 border-t border-border/50 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              onNavigateTab?.("budgets");
            }}
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
            Dismiss
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface BudgetPacingAlertBannerProps {
  onNavigateTab?: (tab: string) => void;
}

export function BudgetPacingAlertBanner({ onNavigateTab }: BudgetPacingAlertBannerProps) {
  const metrics = useBudgetPacing();
  const { formatMoney } = useCoinKeeper();
  const [dismissed, setDismissed] = useState(false);

  const {
    currentDay,
    totalDaysInMonth,
    daysRemaining,
    targetBudget,
    monthSpend,
    expectedSpendToDate,
    pacingPercent,
    isOverPacing,
    isCritical,
    recommendedDailyAllowance,
  } = metrics;

  // Only render if over pacing and not dismissed
  if (!isOverPacing || dismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      className={cn(
        "p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all shadow-sm",
        isCritical
          ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
          : "bg-amber-500/10 border-amber-500/30 text-amber-500"
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "p-1.5 rounded-lg shrink-0 mt-0.5",
            isCritical ? "bg-rose-500/20 text-rose-500" : "bg-amber-500/20 text-amber-500"
          )}
        >
          {isCritical ? (
            <ShieldAlert className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
        </div>
        <div>
          <div className="font-bold flex items-center gap-1.5">
            <span>
              {isCritical ? "Critical Budget Burn Warning:" : "Spending Pace Advisory:"}
            </span>
            <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-background/50 border border-current/20">
              {pacingPercent}% of expected pace
            </span>
          </div>
          <p className="text-[11px] opacity-90 mt-0.5 leading-normal text-foreground/90">
            Day {currentDay} of {totalDaysInMonth}: you've spent{" "}
            <strong>{formatMoney(monthSpend)}</strong> (expected {formatMoney(expectedSpendToDate)}).
            Limit daily burn to <strong>{formatMoney(recommendedDailyAllowance)}/day</strong> over the remaining {daysRemaining} days to stay under {formatMoney(targetBudget)}.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigateTab?.("budgets")}
          className={cn(
            "text-xs h-7.5 px-3 font-semibold gap-1.5",
            isCritical
              ? "border-rose-500/40 text-rose-500 hover:bg-rose-500/15"
              : "border-amber-500/40 text-amber-500 hover:bg-amber-500/15"
          )}
        >
          Review Budget <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
          title="Dismiss warning for this session"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
