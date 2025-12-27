import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;
type TransactionInsert = TablesInsert<"transactions">;
type TransactionUpdate = TablesUpdate<"transactions">;

export function useTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
  });
}

export function useTransactionsByDateRange(startDate: string, endDate: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["transactions", user?.id, startDate, endDate],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate)
        .order("transaction_date", { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user && !!startDate && !!endDate,
  });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transaction: Omit<TransactionInsert, "user_id">) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("transactions")
        .insert({ ...transaction, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TransactionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

// Computed hooks for financial calculations
export function useFinancialSummary() {
  const { data: transactions = [], isLoading } = useTransactions();

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthTransactions = transactions.filter(t => 
    t.transaction_date.startsWith(currentMonth)
  );

  const income = currentMonthTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expenses = currentMonthTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = income - expenses;
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;

  // Category breakdown
  const categoryTotals = currentMonthTransactions
    .filter(t => t.type === "expense")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  return {
    income,
    expenses,
    balance,
    savingsRate,
    categoryTotals,
    isLoading,
    transactionCount: transactions.length,
  };
}
