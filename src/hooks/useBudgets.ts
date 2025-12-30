import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { format, startOfMonth, subMonths } from "date-fns";

type Budget = Tables<"budgets">;
type BudgetInsert = TablesInsert<"budgets">;

export function useBudgets(month?: Date) {
  const { user } = useAuth();
  const targetMonth = month ? format(startOfMonth(month), "yyyy-MM-dd") : format(startOfMonth(new Date()), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["budgets", user?.id, targetMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("month", targetMonth)
        .order("category");

      if (error) throw error;
      return data as Budget[];
    },
    enabled: !!user,
  });
}

export function useAddBudget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (budget: Omit<BudgetInsert, "user_id">) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("budgets")
        .insert({ ...budget, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Budget> & { id: string }) => {
      const { data, error } = await supabase
        .from("budgets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

export function useRolloverBudgets() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (fromMonth: Date) => {
      if (!user) throw new Error("User not authenticated");

      const fromMonthStr = format(startOfMonth(fromMonth), "yyyy-MM-dd");
      const toMonthStr = format(startOfMonth(new Date()), "yyyy-MM-dd");

      // Get budgets from previous month
      const { data: previousBudgets, error: fetchError } = await supabase
        .from("budgets")
        .select("*")
        .eq("month", fromMonthStr);

      if (fetchError) throw fetchError;
      if (!previousBudgets || previousBudgets.length === 0) return [];

      // Create new budgets for current month
      const newBudgets = previousBudgets.map((b) => ({
        user_id: user.id,
        month: toMonthStr,
        category: b.category,
        budgeted_amount: b.budgeted_amount,
      }));

      const { data, error } = await supabase
        .from("budgets")
        .upsert(newBudgets, { onConflict: "user_id,month,category" })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

export function useBudgetSummary(month?: Date) {
  const { data: budgets, isLoading } = useBudgets(month);
  const { user } = useAuth();
  const targetMonth = month || new Date();

  const { data: transactions } = useQuery({
    queryKey: ["transactions-for-budget", user?.id, format(targetMonth, "yyyy-MM")],
    queryFn: async () => {
      const startOfMonthStr = format(startOfMonth(targetMonth), "yyyy-MM-dd");
      const endOfMonthStr = format(new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("transaction_date", startOfMonthStr)
        .lte("transaction_date", endOfMonthStr)
        .eq("type", "expense");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const budgetByCategory = budgets?.reduce((acc, b) => {
    acc[b.category] = b.budgeted_amount;
    return acc;
  }, {} as Record<string, number>) || {};

  const spentByCategory = transactions?.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalBudgeted = budgets?.reduce((sum, b) => sum + b.budgeted_amount, 0) || 0;
  const totalSpent = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
  const remaining = totalBudgeted - totalSpent;

  const categoryBreakdown = Object.keys({ ...budgetByCategory, ...spentByCategory }).map((category) => ({
    category,
    budgeted: budgetByCategory[category] || 0,
    spent: spentByCategory[category] || 0,
    remaining: (budgetByCategory[category] || 0) - (spentByCategory[category] || 0),
    percentUsed: budgetByCategory[category] 
      ? Math.round((spentByCategory[category] || 0) / budgetByCategory[category] * 100) 
      : 0,
  }));

  return {
    budgets,
    totalBudgeted,
    totalSpent,
    remaining,
    categoryBreakdown,
    isLoading,
  };
}
