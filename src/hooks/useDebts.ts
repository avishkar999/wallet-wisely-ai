import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Debt = Tables<"debts">;
type DebtInsert = TablesInsert<"debts">;
type DebtUpdate = TablesUpdate<"debts">;

export function useDebts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["debts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("debts")
        .select("*")
        .eq("user_id", user.id)
        .order("interest_rate", { ascending: false });
      
      if (error) throw error;
      return data as Debt[];
    },
    enabled: !!user,
  });
}

export function useAddDebt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (debt: Omit<DebtInsert, "user_id">) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("debts")
        .insert({ ...debt, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
    },
  });
}

export function useUpdateDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: DebtUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("debts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
    },
  });
}

export function useDeleteDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("debts")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
    },
  });
}

export function useDebtSummary() {
  const { data: debts = [], isLoading } = useDebts();

  const totalDebt = debts.reduce((sum, d) => sum + Number(d.outstanding_amount), 0);
  const totalMonthlyPayment = debts.reduce((sum, d) => sum + Number(d.minimum_payment), 0);
  const avgInterestRate = debts.length > 0
    ? debts.reduce((sum, d) => sum + Number(d.interest_rate), 0) / debts.length
    : 0;

  // Sort for strategies
  const sortedByInterest = [...debts].sort((a, b) => Number(b.interest_rate) - Number(a.interest_rate));
  const sortedByAmount = [...debts].sort((a, b) => Number(a.outstanding_amount) - Number(b.outstanding_amount));

  // Estimate debt-free date (simplified)
  const monthsToPayoff = totalMonthlyPayment > 0
    ? Math.ceil(totalDebt / totalMonthlyPayment)
    : 0;

  const debtFreeDate = new Date();
  debtFreeDate.setMonth(debtFreeDate.getMonth() + monthsToPayoff);

  return {
    debts,
    totalDebt,
    totalMonthlyPayment,
    avgInterestRate,
    sortedByInterest,
    sortedByAmount,
    debtFreeDate,
    isLoading,
    debtCount: debts.length,
  };
}
