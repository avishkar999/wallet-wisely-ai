import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  category: string | null;
  notes: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

type SavingsGoalInsert = Omit<SavingsGoal, "id" | "user_id" | "created_at" | "updated_at">;
type SavingsGoalUpdate = Partial<SavingsGoalInsert> & { id: string };

export function useSavingsGoals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["savings_goals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SavingsGoal[];
    },
    enabled: !!user,
  });
}

export function useAddSavingsGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (goal: SavingsGoalInsert) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("savings_goals")
        .insert({ ...goal, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings_goals"] });
    },
  });
}

export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SavingsGoalUpdate) => {
      const { data, error } = await supabase
        .from("savings_goals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings_goals"] });
    },
  });
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("savings_goals")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings_goals"] });
    },
  });
}

export function useSavingsGoalsSummary() {
  const { data: goals = [], isLoading } = useSavingsGoals();

  const activeGoals = goals.filter(g => !g.is_completed);
  const completedGoals = goals.filter(g => g.is_completed);
  
  const totalTargetAmount = activeGoals.reduce((sum, g) => sum + Number(g.target_amount), 0);
  const totalCurrentAmount = activeGoals.reduce((sum, g) => sum + Number(g.current_amount), 0);
  const overallProgress = totalTargetAmount > 0 
    ? Math.round((totalCurrentAmount / totalTargetAmount) * 100) 
    : 0;

  return {
    goals,
    activeGoals,
    completedGoals,
    totalTargetAmount,
    totalCurrentAmount,
    overallProgress,
    isLoading,
  };
}
