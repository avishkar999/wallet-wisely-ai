import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBudgetSummary } from "./useBudgets";
import { useProfile } from "./useProfile";
import { toast } from "sonner";

interface BudgetAlertSettings {
  id: string;
  user_id: string;
  email_alerts_enabled: boolean;
  alert_threshold: number;
  alert_email: string | null;
  last_alert_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

type BudgetAlertSettingsInsert = Omit<BudgetAlertSettings, "id" | "user_id" | "created_at" | "updated_at" | "last_alert_sent_at">;

export function useBudgetAlertSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["budget_alert_settings", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("budget_alert_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as BudgetAlertSettings | null;
    },
    enabled: !!user,
  });
}

export function useUpsertBudgetAlertSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: Partial<BudgetAlertSettingsInsert>) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("budget_alert_settings")
        .upsert({ ...settings, user_id: user.id }, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_alert_settings"] });
    },
  });
}

export function useSendBudgetAlert() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: alertSettings } = useBudgetAlertSettings();

  return useMutation({
    mutationFn: async ({ 
      category, 
      budgeted, 
      spent, 
      percentUsed 
    }: { 
      category: string; 
      budgeted: number; 
      spent: number; 
      percentUsed: number;
    }) => {
      if (!user || !alertSettings?.email_alerts_enabled) {
        throw new Error("Email alerts not enabled");
      }

      const email = alertSettings.alert_email || user.email;
      if (!email) throw new Error("No email address configured");

      const response = await supabase.functions.invoke("send-budget-alert", {
        body: {
          email,
          userName: profile?.display_name || user.email?.split("@")[0] || "User",
          category,
          budgeted,
          spent,
          percentUsed,
        },
      });

      if (response.error) throw response.error;

      // Update last alert sent timestamp
      await supabase
        .from("budget_alert_settings")
        .update({ last_alert_sent_at: new Date().toISOString() })
        .eq("user_id", user.id);

      return response.data;
    },
  });
}

export function useCheckBudgetAlerts() {
  const { categoryBreakdown } = useBudgetSummary();
  const { data: alertSettings } = useBudgetAlertSettings();
  const sendAlert = useSendBudgetAlert();

  const checkAndSendAlerts = async () => {
    if (!alertSettings?.email_alerts_enabled) return;

    const threshold = alertSettings.alert_threshold || 80;
    const alertCategories = categoryBreakdown.filter(
      c => c.budgeted > 0 && c.percentUsed >= threshold
    );

    for (const cat of alertCategories) {
      try {
        await sendAlert.mutateAsync({
          category: cat.category,
          budgeted: cat.budgeted,
          spent: cat.spent,
          percentUsed: cat.percentUsed,
        });
        toast.success(`Budget alert sent for ${cat.category}`);
      } catch (error) {
        console.error("Failed to send alert:", error);
      }
    }
  };

  return { checkAndSendAlerts, alertSettings };
}
