import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Investment = Tables<"investments">;
type InvestmentInsert = TablesInsert<"investments">;
type InvestmentUpdate = TablesUpdate<"investments">;

export function useInvestments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["investments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Investment[];
    },
    enabled: !!user,
  });
}

export function useAddInvestment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (investment: Omit<InvestmentInsert, "user_id">) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("investments")
        .insert({ ...investment, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
    },
  });
}

export function useUpdateInvestment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: InvestmentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("investments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
    },
  });
}

export function useDeleteInvestment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("investments")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
    },
  });
}

export function useInvestmentSummary() {
  const { data: investments = [], isLoading } = useInvestments();

  const totalInvested = investments.reduce((sum, i) => sum + Number(i.invested_amount), 0);
  const totalCurrentValue = investments.reduce((sum, i) => sum + Number(i.current_value), 0);
  const totalGain = totalCurrentValue - totalInvested;
  const overallChangePercent = totalInvested > 0 
    ? ((totalGain / totalInvested) * 100)
    : 0;

  // Group by type
  const byType = investments.reduce((acc, inv) => {
    if (!acc[inv.type]) {
      acc[inv.type] = { invested: 0, current: 0, count: 0 };
    }
    acc[inv.type].invested += Number(inv.invested_amount);
    acc[inv.type].current += Number(inv.current_value);
    acc[inv.type].count += 1;
    return acc;
  }, {} as Record<string, { invested: number; current: number; count: number }>);

  return {
    investments,
    totalInvested,
    totalCurrentValue,
    totalGain,
    overallChangePercent,
    byType,
    isLoading,
    investmentCount: investments.length,
  };
}
