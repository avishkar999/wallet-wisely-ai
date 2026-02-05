 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { toast } from "sonner";
 
 interface PortfolioAlertSettings {
   id: string;
   user_id: string;
   drift_threshold: number;
   alerts_enabled: boolean;
   alert_email: string | null;
   last_alert_sent_at: string | null;
   created_at: string;
   updated_at: string;
 }
 
 interface DriftData {
   type: string;
   label: string;
   currentPercent: number;
   targetPercent: number;
   difference: number;
 }
 
 export function usePortfolioAlerts() {
   const { user } = useAuth();
   const queryClient = useQueryClient();
 
   const { data: settings, isLoading } = useQuery({
     queryKey: ["portfolio-alert-settings", user?.id],
     queryFn: async () => {
       if (!user?.id) return null;
 
       const { data, error } = await supabase
         .from("portfolio_alert_settings")
         .select("*")
         .eq("user_id", user.id)
         .maybeSingle();
 
       if (error) throw error;
       return data as PortfolioAlertSettings | null;
     },
     enabled: !!user?.id,
   });
 
   const updateSettings = useMutation({
     mutationFn: async ({
       alertsEnabled,
       driftThreshold,
       alertEmail,
     }: {
       alertsEnabled?: boolean;
       driftThreshold?: number;
       alertEmail?: string | null;
     }) => {
       if (!user?.id) throw new Error("Not authenticated");
 
       const updateData = {
         user_id: user.id,
         alerts_enabled: alertsEnabled ?? true,
         drift_threshold: driftThreshold ?? 5,
         alert_email: alertEmail ?? null,
       };
 
       const { data, error } = await supabase
         .from("portfolio_alert_settings")
         .upsert(updateData, { onConflict: "user_id" })
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["portfolio-alert-settings"] });
       toast.success("Alert settings updated");
     },
     onError: (error) => {
       toast.error("Failed to update alert settings");
       console.error("Error updating portfolio alert settings:", error);
     },
   });
 
   const sendDriftAlert = useMutation({
     mutationFn: async ({
       driftData,
       maxDrift,
     }: {
       driftData: DriftData[];
       maxDrift: number;
     }) => {
       if (!user?.id) throw new Error("Not authenticated");
 
       const { data, error } = await supabase.functions.invoke(
         "send-portfolio-drift-alert",
         {
           body: { userId: user.id, driftData, maxDrift },
         }
       );
 
       if (error) throw error;
       return data;
     },
     onSuccess: (data) => {
       if (data?.emailSent) {
         toast.success("Portfolio drift alert sent!");
       } else if (data?.skipped) {
         const reasons: Record<string, string> = {
           alerts_disabled: "Alerts are disabled",
           below_threshold: "Drift is below your threshold",
           cooldown: "Already sent an alert recently",
         };
         toast.info(reasons[data.reason] || "Alert skipped");
       }
     },
     onError: (error) => {
       toast.error("Failed to send drift alert");
       console.error("Error sending drift alert:", error);
     },
   });
 
   return {
     settings,
     isLoading,
     updateSettings,
     sendDriftAlert,
     isAlertsEnabled: settings?.alerts_enabled ?? true,
     driftThreshold: settings?.drift_threshold ?? 5,
     alertEmail: settings?.alert_email ?? null,
   };
 }