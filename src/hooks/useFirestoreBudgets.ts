import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  FirestoreBudget,
  FirestoreTransaction,
  subscribeUserBudgets,
  subscribeUserTransactions,
  upsertBudget,
  deleteBudget,
  batchUpsertBudgets,
} from "@/services/firestoreService";
import { toast } from "sonner";

export interface CategoryBudgetStatus {
  id?: string;
  category: string;
  label: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  transactionCount: number;
  status: "safe" | "moderate" | "warning" | "danger" | "unbudgeted";
}

export const STANDARD_CATEGORIES = [
  { key: "housing", label: "Housing & Rent", defaultPercent: 30, color: "text-amber-500", bg: "bg-amber-500/10" },
  { key: "food", label: "Food & Groceries", defaultPercent: 15, color: "text-orange-500", bg: "bg-orange-500/10" },
  { key: "transport", label: "Transportation", defaultPercent: 10, color: "text-blue-500", bg: "bg-blue-500/10" },
  { key: "bills", label: "Utilities & Bills", defaultPercent: 8, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { key: "shopping", label: "Shopping & Retail", defaultPercent: 8, color: "text-pink-500", bg: "bg-pink-500/10" },
  { key: "entertainment", label: "Entertainment", defaultPercent: 5, color: "text-purple-500", bg: "bg-purple-500/10" },
  { key: "health", label: "Health & Fitness", defaultPercent: 6, color: "text-rose-500", bg: "bg-rose-500/10" },
  { key: "recharges", label: "Subscriptions & Tech", defaultPercent: 4, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { key: "education", label: "Learning & Education", defaultPercent: 5, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { key: "travel", label: "Travel & Vacations", defaultPercent: 5, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { key: "other", label: "Personal & Other", defaultPercent: 4, color: "text-zinc-500", bg: "bg-zinc-500/10" },
];

export function useFirestoreBudgets(month: number, year: number) {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<FirestoreBudget[]>([]);
  const [transactions, setTransactions] = useState<FirestoreTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Firestore Real-time subscriptions
  useEffect(() => {
    if (!user?.id) {
      // Demo fallback when not authenticated
      setBudgets([
        { id: `demo_1`, userId: "demo", category: "housing", amount: 20000, month, year, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: `demo_2`, userId: "demo", category: "food", amount: 12000, month, year, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: `demo_3`, userId: "demo", category: "transport", amount: 6000, month, year, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: `demo_4`, userId: "demo", category: "bills", amount: 4500, month, year, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: `demo_5`, userId: "demo", category: "shopping", amount: 7000, month, year, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: `demo_6`, userId: "demo", category: "entertainment", amount: 4000, month, year, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ]);
      setTransactions([
        { id: "demo_tx_1", userId: "demo", amount: 65000, type: "income", category: "income", date: `${year}-${String(month).padStart(2, '0')}-02`, description: "Monthly Salary Credit", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "demo_tx_2", userId: "demo", amount: 20000, type: "expense", category: "housing", date: `${year}-${String(month).padStart(2, '0')}-05`, description: "Apartment Rent", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "demo_tx_3", userId: "demo", amount: 9400, type: "expense", category: "food", date: `${year}-${String(month).padStart(2, '0')}-12`, description: "Weekly Grocery & Supermarket", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "demo_tx_4", userId: "demo", amount: 4200, type: "expense", category: "transport", date: `${year}-${String(month).padStart(2, '0')}-14`, description: "Fuel & Metro Card", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "demo_tx_5", userId: "demo", amount: 4300, type: "expense", category: "bills", date: `${year}-${String(month).padStart(2, '0')}-18`, description: "Electricity & Fiber Internet", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "demo_tx_6", userId: "demo", amount: 6850, type: "expense", category: "shopping", date: `${year}-${String(month).padStart(2, '0')}-20`, description: "Clothing & Home Essentials", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "demo_tx_7", userId: "demo", amount: 4600, type: "expense", category: "entertainment", date: `${year}-${String(month).padStart(2, '0')}-22`, description: "Concert Tickets & Dinner", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubBudgets = subscribeUserBudgets(
      user.id,
      (allBudgets) => {
        // Filter for active month & year
        const currentBudgets = allBudgets.filter((b) => b.month === month && b.year === year);
        setBudgets(currentBudgets);
        setLoading(false);
      },
      (err) => {
        console.warn("Could not load budgets:", err);
        setLoading(false);
      }
    );

    const unsubTx = subscribeUserTransactions(
      user.id,
      (allTx) => {
        // Filter transactions for active month & year
        const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
        const currentTx = allTx.filter((t) => {
          if (!t.date) return false;
          return t.date.startsWith(monthPrefix);
        });
        setTransactions(currentTx);
      },
      (err) => {
        console.warn("Could not load transactions:", err);
      }
    );

    return () => {
      unsubBudgets();
      unsubTx();
    };
  }, [user?.id, month, year]);

  // Aggregate financial metrics
  const summary = useMemo(() => {
    let income = 0;
    let expenses = 0;
    const spendingByCategory: Record<string, { amount: number; count: number }> = {};

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === "income") {
        income += amt;
      } else if (tx.type === "expense") {
        expenses += amt;
        const catKey = (tx.category || "other").toLowerCase().trim();
        if (!spendingByCategory[catKey]) {
          spendingByCategory[catKey] = { amount: 0, count: 0 };
        }
        spendingByCategory[catKey].amount += amt;
        spendingByCategory[catKey].count += 1;
      }
    });

    const budgetMap = new Map<string, FirestoreBudget>();
    let totalBudgeted = 0;
    budgets.forEach((b) => {
      const catKey = (b.category || "other").toLowerCase().trim();
      budgetMap.set(catKey, b);
      totalBudgeted += Number(b.amount) || 0;
    });

    const categoryBreakdown: CategoryBudgetStatus[] = STANDARD_CATEGORIES.map((cfg) => {
      const existing = budgetMap.get(cfg.key);
      const spentInfo = spendingByCategory[cfg.key] || { amount: 0, count: 0 };
      const budgeted = existing ? Number(existing.amount) : 0;
      const spent = spentInfo.amount;
      const remaining = budgeted - spent;
      const percentUsed = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;

      let status: CategoryBudgetStatus["status"] = "unbudgeted";
      if (budgeted > 0) {
        if (percentUsed > 100) status = "danger";
        else if (percentUsed >= 90) status = "warning";
        else if (percentUsed >= 75) status = "moderate";
        else status = "safe";
      }

      return {
        id: existing?.id,
        category: cfg.key,
        label: cfg.label,
        budgeted,
        spent,
        remaining,
        percentUsed,
        transactionCount: spentInfo.count,
        status,
      };
    });

    // Also include any custom categories that user budgeted or spent in
    budgets.forEach((b) => {
      const catKey = b.category.toLowerCase().trim();
      if (!STANDARD_CATEGORIES.some((c) => c.key === catKey)) {
        const spentInfo = spendingByCategory[catKey] || { amount: 0, count: 0 };
        const budgeted = Number(b.amount) || 0;
        const spent = spentInfo.amount;
        const remaining = budgeted - spent;
        const percentUsed = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;

        let status: CategoryBudgetStatus["status"] = "unbudgeted";
        if (budgeted > 0) {
          if (percentUsed > 100) status = "danger";
          else if (percentUsed >= 90) status = "warning";
          else if (percentUsed >= 75) status = "moderate";
          else status = "safe";
        }

        categoryBreakdown.push({
          id: b.id,
          category: catKey,
          label: b.category,
          budgeted,
          spent,
          remaining,
          percentUsed,
          transactionCount: spentInfo.count,
          status,
        });
      }
    });

    const netSavings = income - expenses;
    const savingsRate = income > 0 ? Math.max(-100, Math.min(100, Math.round((netSavings / income) * 100))) : 0;
    const overallUtilization = totalBudgeted > 0 ? Math.round((expenses / totalBudgeted) * 100) : 0;
    const budgetRemaining = totalBudgeted - expenses;

    return {
      income,
      expenses,
      netSavings,
      savingsRate,
      totalBudgeted,
      totalBudgetSpent: expenses,
      budgetRemaining,
      overallUtilization,
      categoryBreakdown,
      overBudgetCategories: categoryBreakdown.filter((c) => c.budgeted > 0 && c.percentUsed > 100),
      warningCategories: categoryBreakdown.filter((c) => c.budgeted > 0 && c.percentUsed >= 80 && c.percentUsed <= 100),
    };
  }, [budgets, transactions]);

  // Helper to save or update budget in Firestore
  const saveCategoryBudget = useCallback(
    async (category: string, amount: number) => {
      if (!user?.id) {
        toast.info("Please sign in with Google to sync your budgets to Firestore.");
        return;
      }

      setSaving(true);
      try {
        const catKey = category.toLowerCase().trim();
        // Deterministic sanitized ID complying with isValidId: ^[a-zA-Z0-9_\-]+$
        const sanitizedCat = catKey.replace(/[^a-zA-Z0-9]/g, "_");
        const docId = `b_${user.id.slice(0, 16)}_${year}_${month}_${sanitizedCat}`;

        const existing = budgets.find((b) => b.category.toLowerCase() === catKey);
        const nowIso = new Date().toISOString();

        const budgetRecord: FirestoreBudget = {
          id: existing?.id || docId,
          userId: user.id,
          category: catKey,
          amount: Math.max(0, Math.round(amount)),
          month,
          year,
          createdAt: existing?.createdAt || nowIso,
          updatedAt: nowIso,
        };

        await upsertBudget(budgetRecord);
        toast.success(`Updated budget for ${category}`);
      } catch (err: any) {
        console.error("Save budget error:", err);
        toast.error("Failed to save budget to Firestore.");
      } finally {
        setSaving(false);
      }
    },
    [user?.id, month, year, budgets]
  );

  // Helper to delete budget from Firestore
  const removeCategoryBudget = useCallback(
    async (budgetId: string) => {
      if (!user?.id) {
        toast.info("Please sign in with Google to manage Firestore budgets.");
        return;
      }
      try {
        await deleteBudget(budgetId);
        toast.success("Budget removed");
      } catch (err) {
        console.error("Delete budget error:", err);
        toast.error("Failed to remove budget.");
      }
    },
    [user?.id]
  );

  // Apply template (e.g., 50/30/20 standard)
  const applyTemplate = useCallback(
    async (templateType: "50-30-20" | "balanced" | "frugal", baseIncome: number) => {
      if (!user?.id) {
        toast.info("Please sign in with Google to save templates to Firestore.");
        return;
      }

      const incomeToUse = baseIncome > 0 ? baseIncome : 50000;
      setSaving(true);

      try {
        const batchBudgets: FirestoreBudget[] = [];
        const nowIso = new Date().toISOString();

        STANDARD_CATEGORIES.forEach((cfg) => {
          let pct = cfg.defaultPercent;
          if (templateType === "frugal") {
            if (cfg.key === "shopping" || cfg.key === "entertainment") pct = Math.max(2, pct - 4);
            if (cfg.key === "food") pct = 12;
          }

          const targetAmount = Math.round((incomeToUse * pct) / 100);
          const sanitizedCat = cfg.key.replace(/[^a-zA-Z0-9]/g, "_");
          const docId = `b_${user.id.slice(0, 16)}_${year}_${month}_${sanitizedCat}`;
          const existing = budgets.find((b) => b.category.toLowerCase() === cfg.key);

          batchBudgets.push({
            id: existing?.id || docId,
            userId: user.id,
            category: cfg.key,
            amount: targetAmount,
            month,
            year,
            createdAt: existing?.createdAt || nowIso,
            updatedAt: nowIso,
          });
        });

        await batchUpsertBudgets(batchBudgets);
        toast.success(`Applied ${templateType.toUpperCase()} budget framework!`);
      } catch (err) {
        console.error("Apply template error:", err);
        toast.error("Failed to apply budget template.");
      } finally {
        setSaving(false);
      }
    },
    [user?.id, month, year, budgets]
  );

  return {
    budgets,
    transactions,
    loading,
    saving,
    summary,
    saveCategoryBudget,
    removeCategoryBudget,
    applyTemplate,
    isAuthenticated: !!user?.id,
  };
}
