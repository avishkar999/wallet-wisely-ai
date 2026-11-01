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
    mutationFn: async (transaction: Omit<TransactionInsert, "user_id"> | Record<string, any>) => {
      console.log("[TransactionDebug] Supabase authentication checked.");

      // Check active Supabase session or fall back to context user
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      const currentAuthUser = sessionData?.session?.user || user;

      if (!currentAuthUser || !currentAuthUser.id) {
        console.error("[TransactionDebug] No authenticated Supabase user found.", { sessionErr });
        throw new Error("You must be authenticated to add a transaction. Please sign in.");
      }

      console.log("[TransactionDebug] Authenticated user ID retrieved:", currentAuthUser.id);

      // Verify and map payload to actual Supabase 'transactions' table schema
      const payload: TransactionInsert = {
        user_id: currentAuthUser.id,
        name: (transaction as any).name || (transaction as any).title || "Untitled Transaction",
        amount: Number(transaction.amount),
        type: transaction.type || (transaction as any).transaction_type || "expense",
        category: (transaction.category as any) || "other",
        payment_method: (transaction.payment_method as any) || "upi",
        transaction_date: transaction.transaction_date || new Date().toISOString().split("T")[0],
        description: transaction.description || null,
      };

      console.log("[TransactionDebug] Supabase insertion initiated for table 'transactions'. Payload:", {
        user_id: payload.user_id,
        name: payload.name,
        amount: payload.amount,
        type: payload.type,
        category: payload.category,
        payment_method: payload.payment_method,
        transaction_date: payload.transaction_date,
      });

      const { data, error } = await supabase
        .from("transactions")
        .insert(payload)
        .select()
        .single();

      console.log("[TransactionDebug] Supabase response received:", { data, error });

      if (error) {
        console.error("[TransactionDebug] Supabase insertion error:", error);
        throw new Error(error.message || `Database error (${error.code})`);
      }

      console.log("[TransactionDebug] Transaction successfully saved with ID:", data?.id);
      return data;
    },
    onSuccess: (data) => {
      console.log("[TransactionDebug] Dashboard refresh initiated.");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_summaries"] });
    },
  });
}

export function useBatchAddTransactions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      transactions: Array<
        Omit<TransactionInsert, "user_id"> & {
          tags?: string[];
          merchant?: string;
          reference_no?: string;
          raw_description?: string;
        }
      >
    ) => {
      if (!user) throw new Error("Not authenticated");
      if (transactions.length === 0) return [];

      const payload = transactions.map((t) => ({
        ...t,
        user_id: user.id,
      }));

      const { data, error } = await supabase
        .from("transactions")
        .insert(payload);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_summaries"] });
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
    monthTransactionCount: currentMonthTransactions.length,
  };
}

