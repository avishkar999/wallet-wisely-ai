import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type SubscriptionStatus = "pending" | "keep" | "to_review" | "cancelled";

export interface SubscriptionDecision {
  id: string;
  user_id: string;
  subscription_name: string;
  status: SubscriptionStatus;
  monthly_amount: number;
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  marked_for_review_at: string | null;
  reminder_days: number | null;
  reminder_sent_at: string | null;
}

export function useSubscriptionDecisions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ["subscription-decisions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("subscription_decisions")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as SubscriptionDecision[];
    },
    enabled: !!user?.id,
  });

  const updateDecision = useMutation({
    mutationFn: async ({
      subscriptionName,
      status,
      monthlyAmount,
      notes,
      reminderDays,
    }: {
      subscriptionName: string;
      status: SubscriptionStatus;
      monthlyAmount: number;
      notes?: string;
      reminderDays?: number;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const decisionData = {
        user_id: user.id,
        subscription_name: subscriptionName,
        status,
        monthly_amount: monthlyAmount,
        notes: notes || null,
        cancelled_at: status === "cancelled" ? new Date().toISOString() : null,
        reminder_days: reminderDays ?? 7,
      };

      const { data, error } = await supabase
        .from("subscription_decisions")
        .upsert(decisionData, {
          onConflict: "user_id,subscription_name",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-decisions"] });
      const statusLabels: Record<SubscriptionStatus, string> = {
        pending: "Pending",
        keep: "Keep",
        to_review: "To Review",
        cancelled: "Cancelled",
      };
      toast.success(`Marked "${variables.subscriptionName}" as ${statusLabels[variables.status]}`);
    },
    onError: (error) => {
      toast.error("Failed to update subscription decision");
      console.error("Error updating decision:", error);
    },
  });

  const deleteDecision = useMutation({
    mutationFn: async (subscriptionName: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("subscription_decisions")
        .delete()
        .eq("user_id", user.id)
        .eq("subscription_name", subscriptionName);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-decisions"] });
      toast.success("Decision removed");
    },
    onError: (error) => {
      toast.error("Failed to remove decision");
      console.error("Error removing decision:", error);
    },
  });

  // Calculate savings from cancelled subscriptions
  const cancelledSavings = decisions
    .filter((d) => d.status === "cancelled")
    .reduce((sum, d) => sum + Number(d.monthly_amount), 0);

  const getDecisionForSubscription = (name: string) => {
    return decisions.find(
      (d) => d.subscription_name.toLowerCase() === name.toLowerCase()
    );
  };

  return {
    decisions,
    isLoading,
    updateDecision,
    deleteDecision,
    cancelledSavings,
    getDecisionForSubscription,
  };
}
