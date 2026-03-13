import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInvestmentSummary } from "./useInvestments";
import { useEffect } from "react";

interface PortfolioSnapshot {
  id: string;
  user_id: string;
  total_invested: number;
  total_current_value: number;
  total_gain: number;
  snapshot_date: string;
  breakdown: Record<string, { invested: number; current: number; count: number }>;
  created_at: string;
}

export function usePortfolioSnapshots() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["portfolio_snapshots", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("portfolio_snapshots")
        .select("*")
        .eq("user_id", user.id)
        .order("snapshot_date", { ascending: true });

      if (error) throw error;
      return (data as unknown as PortfolioSnapshot[]) ?? [];
    },
    enabled: !!user,
  });
}

export function useRecordPortfolioSnapshot() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { totalInvested, totalCurrentValue, totalGain, byType, investmentCount } = useInvestmentSummary();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user || investmentCount === 0) return null;

      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("portfolio_snapshots")
        .upsert(
          {
            user_id: user.id,
            snapshot_date: today,
            total_invested: totalInvested,
            total_current_value: totalCurrentValue,
            total_gain: totalGain,
            breakdown: byType as unknown as Record<string, unknown>,
          },
          { onConflict: "user_id,snapshot_date" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio_snapshots"] });
    },
  });

  // Auto-record snapshot when investments data is available
  useEffect(() => {
    if (user && investmentCount > 0) {
      mutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, investmentCount, totalCurrentValue]);

  return mutation;
}
