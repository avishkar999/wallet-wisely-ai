import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

type EmergencyFund = Tables<"emergency_fund">;
type EmergencyFundInsert = TablesInsert<"emergency_fund">;

export function useEmergencyFund() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["emergency_fund", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_fund")
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as EmergencyFund | null;
    },
    enabled: !!user,
  });
}

export function useCreateOrUpdateEmergencyFund() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (fund: Omit<EmergencyFundInsert, "user_id">) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("emergency_fund")
        .upsert({ ...fund, user_id: user.id }, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergency_fund"] });
    },
  });
}

export function useEmergencyFundSummary() {
  const { data: fund, isLoading } = useEmergencyFund();

  const progress = fund && fund.goal_amount > 0 
    ? Math.min(100, Math.round((fund.current_amount / fund.goal_amount) * 100)) 
    : 0;

  const remaining = fund 
    ? Math.max(0, fund.goal_amount - fund.current_amount) 
    : 0;

  const monthsToGoal = fund && fund.goal_amount > 0 && fund.target_date
    ? Math.max(0, Math.ceil((new Date(fund.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : null;

  const monthlyContributionNeeded = monthsToGoal && monthsToGoal > 0 
    ? Math.ceil(remaining / monthsToGoal) 
    : 0;

  return {
    fund,
    progress,
    remaining,
    monthsToGoal,
    monthlyContributionNeeded,
    isLoading,
  };
}
