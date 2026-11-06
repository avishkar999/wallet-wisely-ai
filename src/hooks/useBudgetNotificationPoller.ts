import { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions } from "@/hooks/useTransactions";
import { useBudgets } from "@/hooks/useBudgets";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";

export interface BudgetNotification {
  id: string;
  type: "critical" | "warning" | "info" | "success";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  category?: string;
  percentUsed: number;
  amountSpent: number;
  budgetLimit: number;
  thresholdLevel: 80 | 100 | "category_80" | "category_100";
}

const STORAGE_KEY_PREFIX = "walletwisely_budget_notifications_";
const TOAST_TRACKER_PREFIX = "walletwisely_toasted_thresholds_";
const POLL_INTERVAL_MS = 30000; // 30 seconds

export function useBudgetNotificationPoller() {
  const { user } = useAuth();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets();
  const { data: userSettings } = useUserSettings();
  const { profile, formatMoney } = useCoinKeeper();

  const [notifications, setNotifications] = useState<BudgetNotification[]>([]);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [isPolling, setIsPolling] = useState<boolean>(true);

  const userId = user?.id || "guest";
  const currentMonthStr = format(new Date(), "yyyy-MM");
  const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
  const toastTrackerKey = `${TOAST_TRACKER_PREFIX}${userId}_${currentMonthStr}`;

  // 1. Load persisted notifications on mount or user change
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setNotifications(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Helper to persist notifications
  const persistNotifications = useCallback((items: BudgetNotification[]) => {
    setNotifications(items);
    try {
      localStorage.setItem(storageKey, JSON.stringify(items.slice(0, 50))); // Keep last 50
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Helper to get already toasted thresholds for current month
  const getToastedFlags = useCallback((): { 80?: boolean; 100?: boolean; categories?: Record<string, number> } => {
    try {
      const raw = localStorage.getItem(toastTrackerKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [toastTrackerKey]);

  // Helper to set toasted threshold
  const setToastedFlag = useCallback((key: "80" | "100", category?: string) => {
    try {
      const current = getToastedFlags();
      if (category) {
        current.categories = current.categories || {};
        current.categories[category] = key === "100" ? 100 : 80;
      } else {
        current[key] = true;
      }
      localStorage.setItem(toastTrackerKey, JSON.stringify(current));
    } catch {
      // ignore
    }
  }, [getToastedFlags, toastTrackerKey]);

  // 2. Budget vs Spending Core Evaluator
  const evaluateBudgetThresholds = useCallback((manualTrigger: boolean = false) => {
    setLastChecked(new Date());

    // Compute current month expenses from transactions
    const currentMonthExpenses = transactions.filter((t) => {
      const date = t.transaction_date || (t as any).date || "";
      return t.type === "expense" && date.startsWith(currentMonthStr);
    });

    const totalSpent = currentMonthExpenses.reduce(
      (sum, t) => sum + Math.abs(Number(t.amount) || 0),
      0
    );

    // Compute category expenses
    const categorySpendMap: Record<string, number> = {};
    currentMonthExpenses.forEach((t) => {
      const cat = (t.category || "other").toLowerCase();
      categorySpendMap[cat] = (categorySpendMap[cat] || 0) + Math.abs(Number(t.amount) || 0);
    });

    // Compute total budget limit
    const totalBudgetedCategories = budgets.reduce(
      (sum, b) => sum + (Number(b.budgeted_amount) || 0),
      0
    );

    const monthlyLimit =
      totalBudgetedCategories > 0
        ? totalBudgetedCategories
        : (userSettings?.monthly_budget_goal && userSettings.monthly_budget_goal > 0)
        ? userSettings.monthly_budget_goal
        : (profile.defaultMonthlyBudget && profile.defaultMonthlyBudget > 0)
        ? profile.defaultMonthlyBudget
        : 50000;

    const percentUsed = monthlyLimit > 0 ? Math.round((totalSpent / monthlyLimit) * 100) : 0;
    const toasted = getToastedFlags();

    const newAlerts: BudgetNotification[] = [];

    // --- Threshold Check: 100% Monthly Limit Exceeded ---
    if (percentUsed >= 100) {
      const alertId = `limit-100-${currentMonthStr}`;
      const title = "🚨 Monthly Budget Exceeded!";
      const message = `You've exceeded 100% of your set limit! Spent ${formatMoney(totalSpent)} of ${formatMoney(monthlyLimit)} (${percentUsed}%).`;

      newAlerts.push({
        id: alertId,
        type: "critical",
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        percentUsed,
        amountSpent: totalSpent,
        budgetLimit: monthlyLimit,
        thresholdLevel: 100,
      });

      if (!toasted[100] || manualTrigger) {
        toast.error(title, {
          description: message,
          duration: 7000,
          action: {
            label: "View Budgets",
            onClick: () => {
              window.dispatchEvent(new CustomEvent("walletwisely:navigate", { detail: "budgets" }));
            },
          },
        });
        setToastedFlag("100");
      }
    }
    // --- Threshold Check: 80% Monthly Limit Warning ---
    else if (percentUsed >= 80) {
      const alertId = `limit-80-${currentMonthStr}`;
      const title = "⚠️ Budget Limit Warning (80% Reached)";
      const message = `You've used ${percentUsed}% of your monthly limit (${formatMoney(totalSpent)} of ${formatMoney(monthlyLimit)}). Keep an eye on non-essential spending.`;

      newAlerts.push({
        id: alertId,
        type: "warning",
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        percentUsed,
        amountSpent: totalSpent,
        budgetLimit: monthlyLimit,
        thresholdLevel: 80,
      });

      if (!toasted[80] || manualTrigger) {
        toast.warning(title, {
          description: message,
          duration: 6000,
          action: {
            label: "Review Spend",
            onClick: () => {
              window.dispatchEvent(new CustomEvent("walletwisely:navigate", { detail: "expenses" }));
            },
          },
        });
        setToastedFlag("80");
      }
    } else if (manualTrigger) {
      toast.success("Budget Health: Optimal", {
        description: `You've spent ${formatMoney(totalSpent)} of ${formatMoney(monthlyLimit)} (${percentUsed}%). All systems within limits!`,
      });
    }

    // --- Category-level threshold evaluation ---
    budgets.forEach((b) => {
      const catBudget = Number(b.budgeted_amount) || 0;
      if (catBudget <= 0) return;

      const catSpent = categorySpendMap[b.category.toLowerCase()] || 0;
      const catPercent = Math.round((catSpent / catBudget) * 100);

      if (catPercent >= 100) {
        const catId = `cat-100-${b.category}-${currentMonthStr}`;
        newAlerts.push({
          id: catId,
          type: "critical",
          title: `Over Budget: ${b.category}`,
          message: `${b.category} spending is at ${catPercent}% (${formatMoney(catSpent)} of ${formatMoney(catBudget)}).`,
          timestamp: new Date().toISOString(),
          read: false,
          category: b.category,
          percentUsed: catPercent,
          amountSpent: catSpent,
          budgetLimit: catBudget,
          thresholdLevel: "category_100",
        });
      } else if (catPercent >= 80) {
        const catId = `cat-80-${b.category}-${currentMonthStr}`;
        newAlerts.push({
          id: catId,
          type: "warning",
          title: `80% Cap Warning: ${b.category}`,
          message: `${b.category} spending is at ${catPercent}% (${formatMoney(catSpent)} of ${formatMoney(catBudget)}).`,
          timestamp: new Date().toISOString(),
          read: false,
          category: b.category,
          percentUsed: catPercent,
          amountSpent: catSpent,
          budgetLimit: catBudget,
          thresholdLevel: "category_80",
        });
      }
    });

    // Merge new alerts with existing notifications without duplicates
    if (newAlerts.length > 0) {
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const toAdd = newAlerts.filter((n) => !existingIds.has(n.id));
        if (toAdd.length === 0) return prev;
        const merged = [...toAdd, ...prev];
        try {
          localStorage.setItem(storageKey, JSON.stringify(merged.slice(0, 50)));
        } catch {
          // ignore
        }
        return merged;
      });
    }

    return {
      totalSpent,
      monthlyLimit,
      percentUsed,
      activeAlertsCount: newAlerts.length,
    };
  }, [
    transactions,
    budgets,
    userSettings,
    profile.defaultMonthlyBudget,
    currentMonthStr,
    formatMoney,
    getToastedFlags,
    setToastedFlag,
    storageKey,
  ]);

  // 3. Periodic Background Polling
  useEffect(() => {
    if (!isPolling) return;

    // Run check initially once data has loaded
    if (!txLoading && !budgetsLoading) {
      evaluateBudgetThresholds(false);
    }

    // Set recurring timer
    const interval = setInterval(() => {
      evaluateBudgetThresholds(false);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isPolling, txLoading, budgetsLoading, evaluateBudgetThresholds]);

  // 4. Notification management actions
  const markAsRead = useCallback(
    (id: string) => {
      const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      persistNotifications(updated);
    },
    [notifications, persistNotifications]
  );

  const markAllAsRead = useCallback(() => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    persistNotifications(updated);
  }, [notifications, persistNotifications]);

  const deleteNotification = useCallback(
    (id: string) => {
      const updated = notifications.filter((n) => n.id !== id);
      persistNotifications(updated);
    },
    [notifications, persistNotifications]
  );

  const clearAllNotifications = useCallback(() => {
    persistNotifications([]);
  }, [persistNotifications]);

  const pollNow = useCallback(() => {
    return evaluateBudgetThresholds(true);
  }, [evaluateBudgetThresholds]);

  // Test notification triggers for live inspection
  const testTrigger = useCallback(
    (threshold: 80 | 100) => {
      const isCritical = threshold === 100;
      const testLimit = 50000;
      const testSpent = isCritical ? 52500 : 41000;
      const testPercent = Math.round((testSpent / testLimit) * 100);

      const title = isCritical
        ? "🚨 [Simulation] Monthly Budget Exceeded!"
        : "⚠️ [Simulation] Budget Warning (80% Reached)";
      const message = isCritical
        ? `You've exceeded 100% of your set limit! Spent ${formatMoney(testSpent)} of ${formatMoney(testLimit)} (${testPercent}%).`
        : `You've used ${testPercent}% of your monthly limit (${formatMoney(testSpent)} of ${formatMoney(testLimit)}).`;

      if (isCritical) {
        toast.error(title, {
          description: message,
          duration: 6000,
        });
      } else {
        toast.warning(title, {
          description: message,
          duration: 6000,
        });
      }

      const testItem: BudgetNotification = {
        id: `sim-${threshold}-${Date.now()}`,
        type: isCritical ? "critical" : "warning",
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        percentUsed: testPercent,
        amountSpent: testSpent,
        budgetLimit: testLimit,
        thresholdLevel: threshold,
      };

      persistNotifications([testItem, ...notifications]);
    },
    [formatMoney, notifications, persistNotifications]
  );

  // Computed metrics for UI
  const unreadCount = notifications.filter((n) => !n.read).length;
  const criticalCount = notifications.filter((n) => n.type === "critical" && !n.read).length;
  const warningCount = notifications.filter((n) => n.type === "warning" && !n.read).length;

  // Monthly summary stats
  const currentMonthExpenses = transactions.filter((t) => {
    const date = t.transaction_date || (t as any).date || "";
    return t.type === "expense" && date.startsWith(currentMonthStr);
  });
  const totalSpent = currentMonthExpenses.reduce(
    (sum, t) => sum + Math.abs(Number(t.amount) || 0),
    0
  );
  const totalBudgetedCategories = budgets.reduce(
    (sum, b) => sum + (Number(b.budgeted_amount) || 0),
    0
  );
  const monthlyLimit =
    totalBudgetedCategories > 0
      ? totalBudgetedCategories
      : (userSettings?.monthly_budget_goal && userSettings.monthly_budget_goal > 0)
      ? userSettings.monthly_budget_goal
      : (profile.defaultMonthlyBudget && profile.defaultMonthlyBudget > 0)
      ? profile.defaultMonthlyBudget
      : 50000;
  const percentUsed = monthlyLimit > 0 ? Math.round((totalSpent / monthlyLimit) * 100) : 0;

  return {
    notifications,
    unreadCount,
    criticalCount,
    warningCount,
    lastChecked,
    isPolling,
    setIsPolling,
    totalSpent,
    monthlyLimit,
    percentUsed,
    pollNow,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    testTrigger,
  };
}
