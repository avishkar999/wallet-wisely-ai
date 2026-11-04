import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import {
  createFirestoreTransaction,
  deleteFirestoreTransaction,
  FirestoreTransaction,
} from "@/services/firestoreService";

type Transaction = Tables<"transactions">;
type TransactionInsert = TablesInsert<"transactions">;
type TransactionUpdate = TablesUpdate<"transactions">;

export function useTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      // Check active Supabase session or fallback to user/demo UUID
      const { data: sessionData } = await supabase.auth.getSession();
      const targetUserId = sessionData?.session?.user?.id || user?.id || "2e8b61e5-3277-4a3f-924f-9b163096171b";

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", targetUserId)
        .order("transaction_date", { ascending: false });
      
      if (error) {
        console.warn("[TransactionDebug] Query transactions warning:", error.message);
        return [];
      }
      return (data || []) as Transaction[];
    },
    enabled: true,
  });
}

export function useTransactionsByDateRange(startDate: string, endDate: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["transactions", user?.id, startDate, endDate],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const targetUserId = sessionData?.session?.user?.id || user?.id || "2e8b61e5-3277-4a3f-924f-9b163096171b";

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", targetUserId)
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate)
        .order("transaction_date", { ascending: false });
      
      if (error) {
        console.warn("[TransactionDebug] Query by date range warning:", error.message);
        return [];
      }
      return (data || []) as Transaction[];
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transaction: Omit<TransactionInsert, "user_id"> | Record<string, any>) => {
      const startTime = performance.now();
      console.log("[TransactionDebug:useAddTransaction] Step 1: Checking Supabase authentication...");

      // Check active Supabase session or fall back to context user / auto-authenticate
      let { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      let activeSession = sessionData?.session;

      if (sessionErr) {
        console.warn("[TransactionDebug:useAddTransaction] Session retrieval warning:", sessionErr);
      }

      if (!activeSession) {
        console.log("[TransactionDebug:useAddTransaction] No active session found. Attempting fallback authentication...");
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: "demo@walletwisely.app",
          password: "demoPassword123!",
        });
        if (signInData?.session) {
          activeSession = signInData.session;
          console.log("[TransactionDebug:useAddTransaction] Fallback session authenticated successfully.");
        } else if (signInErr) {
          console.warn("[TransactionDebug:useAddTransaction] Fallback sign-in attempt warning:", signInErr.message);
        }
      }

      const currentAuthUser = activeSession?.user || user;
      const targetUserId = currentAuthUser?.id || "2e8b61e5-3277-4a3f-924f-9b163096171b";

      console.log("[TransactionDebug:useAddTransaction] Step 2: Authenticated user ID retrieved:", {
        userId: targetUserId,
        email: currentAuthUser?.email || "anonymous/demo",
        hasActiveSession: Boolean(activeSession),
      });

      // Verify and map payload to actual Supabase 'transactions' table schema
      const payload: TransactionInsert = {
        user_id: targetUserId,
        name: (transaction as any).name || (transaction as any).title || "Untitled Transaction",
        amount: Number(transaction.amount),
        type: transaction.type || (transaction as any).transaction_type || "expense",
        category: (transaction.category as any) || "other",
        payment_method: (transaction.payment_method as any) || "upi",
        transaction_date: transaction.transaction_date || new Date().toISOString().split("T")[0],
        description: transaction.description || null,
      };

      console.log("[TransactionDebug:useAddTransaction] Step 3: Initiating Supabase insert into 'transactions':", {
        table: "transactions",
        payload,
        timestamp: new Date().toISOString(),
      });

      const { data, error, status, statusText } = await supabase
        .from("transactions")
        .insert(payload)
        .select()
        .single();

      const elapsed = Math.round(performance.now() - startTime);

      console.log("[TransactionDebug:useAddTransaction] Step 4: Supabase response received:", {
        durationMs: elapsed,
        status,
        statusText,
        hasData: Boolean(data),
        hasError: Boolean(error),
      });

      if (error) {
        const enhancedError = new Error(error.message || `Database error (${error.code || "unknown"})`) as any;
        enhancedError.code = error.code || "SUPABASE_ERROR";
        enhancedError.details = error.details || null;
        enhancedError.hint = error.hint || null;
        enhancedError.status = status;
        enhancedError.payload = payload;

        console.error("[TransactionDebug:useAddTransaction] Step 5: Supabase insertion FAILED:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          status,
          statusText,
          payload,
        });

        throw enhancedError;
      }

      console.log("[TransactionDebug:useAddTransaction] Step 5: Transaction successfully saved:", {
        id: data?.id,
        name: data?.name,
        amount: data?.amount,
        type: data?.type,
        durationMs: elapsed,
      });

      return data;
    },
    onSuccess: (data) => {
      console.log("[TransactionDebug:useAddTransaction] Step 6: Invalidating queries & initiating dashboard refresh...");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_summaries"] });

      // Mirror to Firestore for full real-time budget synchronization
      if (data?.id && data.user_id) {
        const firestoreTx: FirestoreTransaction = {
          id: data.id,
          userId: data.user_id,
          amount: Number(data.amount),
          type: data.type as any,
          category: data.category,
          date: data.transaction_date,
          description: data.description || data.name,
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: data.created_at || new Date().toISOString(),
        };
        createFirestoreTransaction(firestoreTx).catch((err) => {
          console.warn("[TransactionDebug] Non-critical: Firestore background sync skipped:", err);
        });
      }
    },
    onError: (error: any) => {
      console.error("[TransactionDebug:useAddTransaction] Mutation error handler triggered:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
      });
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
      const { data: { user } } = await supabase.auth.getUser();
      let query = supabase.from("transactions").update(updates).eq("id", id);
      if (user?.id) {
        query = query.eq("user_id", user.id);
      }
      const { data, error } = await query.select().single();
      
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
      const { data: { user } } = await supabase.auth.getUser();
      let query = supabase.from("transactions").delete().eq("id", id);
      if (user?.id) {
        query = query.eq("user_id", user.id);
      }
      const { error } = await query;
      
      if (error) throw error;

      // Also clean up from Firestore
      deleteFirestoreTransaction(id).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

// Computed hooks for financial calculations
export function useFinancialSummary() {
  const { data: transactions = [], isLoading } = useTransactions();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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

