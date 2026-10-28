import { useState, useEffect, useMemo, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
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

const getSandboxDefaultBudgets = (month: number, year: number): FirestoreBudget[] => [
  { id: `demo_1`, userId: "sandbox", category: "housing", amount: 20000, month, year, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: `demo_2`, userId: "sandbox", category: "food", amount: 12000, month, year, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: `demo_3`, userId: "sandbox", category: "transport", amount: 6000, month, year, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: `demo_4`, userId: "sandbox", category: "bills", amount: 4500, month, year, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: `demo_5`, userId: "sandbox", category: "shopping", amount: 7000, month, year, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: `demo_6`, userId: "sandbox", category: "entertainment", amount: 4000, month, year, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const getSandboxDefaultTransactions = (month: number, year: number): FirestoreTransaction[] => [
  { id: "demo_tx_1", userId: "sandbox", amount: 65000, type: "income", category: "income", date: `${year}-${String(month).padStart(2, '0')}-02`, description: "Monthly Salary Credit", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "demo_tx_2", userId: "sandbox", amount: 20000, type: "expense", category: "housing", date: `${year}-${String(month).padStart(2, '0')}-05`, description: "Apartment Rent", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "demo_tx_3", userId: "sandbox", amount: 9400, type: "expense", category: "food", date: `${year}-${String(month).padStart(2, '0')}-12`, description: "Weekly Grocery & Supermarket", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "demo_tx_4", userId: "sandbox", amount: 4200, type: "expense", category: "transport", date: `${year}-${String(month).padStart(2, '0')}-14`, description: "Fuel & Metro Card", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "demo_tx_5", userId: "sandbox", amount: 4300, type: "expense", category: "bills", date: `${year}-${String(month).padStart(2, '0')}-18`, description: "Electricity & Fiber Internet", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "demo_tx_6", userId: "demo", amount: 6850, type: "expense", category: "shopping", date: `${year}-${String(month).padStart(2, '0')}-20`, description: "Clothing & Home Essentials", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "demo_tx_7", userId: "demo", amount: 4600, type: "expense", category: "entertainment", date: `${year}-${String(month).padStart(2, '0')}-22`, description: "Concert Tickets & Dinner", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export function useFirestoreBudgets(month: number, year: number) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [budgets, setBudgets] = useState<FirestoreBudget[]>([]);
  const [transactions, setTransactions] = useState<FirestoreTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Listen directly to Firebase Auth readiness & state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. Data Fetching Constraint: Only attach onSnapshot listeners if auth is ready and user is authenticated
  useEffect(() => {
    if (!firebaseUser) {
      // Guest Sandbox mode: load local sandbox data without querying Firestore unauthenticated
      const storageKey = `coinkeeper_sandbox_budgets_${year}_${month}`;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setBudgets(JSON.parse(saved));
        } else {
          setBudgets(getSandboxDefaultBudgets(month, year));
        }
      } catch {
        setBudgets(getSandboxDefaultBudgets(month, year));
      }
      setTransactions(getSandboxDefaultTransactions(month, year));
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubBudgets = subscribeUserBudgets(
      firebaseUser.uid,
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
      firebaseUser.uid,
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
  }, [firebaseUser, month, year]);

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
          category: b.category,
          label: b.category.charAt(0).toUpperCase() + b.category.slice(1),
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
    const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0;
    const budgetRemaining = totalBudgeted - expenses;
    const overallUtilization = totalBudgeted > 0 ? Math.round((expenses / totalBudgeted) * 100) : 0;

    let overallPacing: "under_budget" | "on_track" | "warning" | "over_budget" = "on_track";
    if (totalBudgeted > 0) {
      if (expenses > totalBudgeted) overallPacing = "over_budget";
      else if (overallUtilization >= 90) overallPacing = "warning";
      else if (overallUtilization <= 70) overallPacing = "under_budget";
    }

    let budgetHealth = "Balanced";
    if (overallPacing === "over_budget") budgetHealth = "Critical";
    else if (overallPacing === "warning") budgetHealth = "Attention";
    else if (savingsRate >= 20) budgetHealth = "Healthy";

    return {
      income,
      expenses,
      netSavings,
      savingsRate,
      overallPacing,
      budgetHealth,
      totalBudgeted,
      totalBudgetSpent: expenses,
      budgetRemaining,
      overallUtilization,
      categoryBreakdown,
      overBudgetCategories: categoryBreakdown.filter((c) => c.budgeted > 0 && c.percentUsed > 100),
      warningCategories: categoryBreakdown.filter((c) => c.budgeted > 0 && c.percentUsed >= 80 && c.percentUsed <= 100),
    };
  }, [budgets, transactions]);

  // Helper to save or update budget
  const saveCategoryBudget = useCallback(
    async (category: string, amount: number) => {
      const catKey = category.toLowerCase().trim();
      const roundedAmt = Math.max(0, Math.round(amount));

      // Guest Sandbox mode when not authenticated with Firebase
      if (!firebaseUser) {
        setBudgets((prev) => {
          const existing = prev.find((b) => b.category.toLowerCase() === catKey);
          let next: FirestoreBudget[];
          if (existing) {
            next = prev.map((b) =>
              b.category.toLowerCase() === catKey ? { ...b, amount: roundedAmt } : b
            );
          } else {
            next = [
              ...prev,
              {
                id: `local_${Date.now()}_${catKey}`,
                userId: "sandbox",
                category: catKey,
                amount: roundedAmt,
                month,
                year,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ];
          }
          try {
            localStorage.setItem(
              `coinkeeper_sandbox_budgets_${year}_${month}`,
              JSON.stringify(next)
            );
          } catch (e) {
            console.debug("Local storage write failed:", e);
          }
          return next;
        });
        toast.success(`Updated budget for ${category} (Sandbox mode)`);
        return;
      }

      setSaving(true);
      try {
        // Deterministic sanitized ID complying with isValidId: ^[a-zA-Z0-9_\-]+$
        const sanitizedCat = catKey.replace(/[^a-zA-Z0-9]/g, "_");
        const docId = `b_${firebaseUser.uid.slice(0, 16)}_${year}_${month}_${sanitizedCat}`;

        const existing = budgets.find((b) => b.category.toLowerCase() === catKey);
        const nowIso = new Date().toISOString();

        const budgetRecord: FirestoreBudget = {
          id: existing?.id || docId,
          userId: firebaseUser.uid,
          category: catKey,
          amount: roundedAmt,
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
    [firebaseUser, month, year, budgets]
  );

  // Helper to delete budget
  const removeCategoryBudget = useCallback(
    async (budgetId: string) => {
      if (!firebaseUser) {
        setBudgets((prev) => {
          const next = prev.filter((b) => b.id !== budgetId);
          try {
            localStorage.setItem(
              `coinkeeper_sandbox_budgets_${year}_${month}`,
              JSON.stringify(next)
            );
          } catch (e) {
            console.debug("Local storage write failed:", e);
          }
          return next;
        });
        toast.success("Budget removed (Sandbox mode)");
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
    [firebaseUser, month, year]
  );

  // Apply template (e.g., 50/30/20 standard)
  const applyTemplate = useCallback(
    async (templateType: "50-30-20" | "balanced" | "frugal", baseIncome: number) => {
      const incomeToUse = baseIncome > 0 ? baseIncome : 50000;
      const nowIso = new Date().toISOString();

      if (!firebaseUser) {
        const localBudgets: FirestoreBudget[] = STANDARD_CATEGORIES.map((cfg) => {
          let pct = cfg.defaultPercent;
          if (templateType === "frugal") {
            if (cfg.key === "shopping" || cfg.key === "entertainment") pct = Math.max(2, pct - 4);
            if (cfg.key === "food") pct = 12;
          }
          const targetAmount = Math.round((incomeToUse * pct) / 100);
          return {
            id: `local_${cfg.key}`,
            userId: "sandbox",
            category: cfg.key,
            amount: targetAmount,
            month,
            year,
            createdAt: nowIso,
            updatedAt: nowIso,
          };
        });

        setBudgets(localBudgets);
        try {
          localStorage.setItem(
            `coinkeeper_sandbox_budgets_${year}_${month}`,
            JSON.stringify(localBudgets)
          );
        } catch (e) {
          console.debug("Local storage write failed:", e);
        }
        toast.success(`Applied ${templateType.toUpperCase()} budget framework (Sandbox mode)!`);
        return;
      }

      setSaving(true);
      try {
        const batchBudgets: FirestoreBudget[] = [];

        STANDARD_CATEGORIES.forEach((cfg) => {
          let pct = cfg.defaultPercent;
          if (templateType === "frugal") {
            if (cfg.key === "shopping" || cfg.key === "entertainment") pct = Math.max(2, pct - 4);
            if (cfg.key === "food") pct = 12;
          }

          const targetAmount = Math.round((incomeToUse * pct) / 100);
          const sanitizedCat = cfg.key.replace(/[^a-zA-Z0-9]/g, "_");
          const docId = `b_${firebaseUser.uid.slice(0, 16)}_${year}_${month}_${sanitizedCat}`;
          const existing = budgets.find((b) => b.category.toLowerCase() === cfg.key);

          batchBudgets.push({
            id: existing?.id || docId,
            userId: firebaseUser.uid,
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
    [firebaseUser, month, year, budgets]
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
    isAuthenticated: Boolean(firebaseUser),
  };
}
