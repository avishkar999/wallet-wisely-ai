import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  subscription_reminders_enabled: boolean;
  reminder_email: string | null;
  created_at: string;
  updated_at: string;
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as NotificationPreferences | null;
    },
    enabled: !!user?.id,
  });

  const updatePreferences = useMutation({
    mutationFn: async ({
      subscriptionRemindersEnabled,
      reminderEmail,
    }: {
      subscriptionRemindersEnabled?: boolean;
      reminderEmail?: string | null;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const updateData = {
        user_id: user.id,
        subscription_reminders_enabled: subscriptionRemindersEnabled ?? true,
        reminder_email: reminderEmail ?? null,
      };

      const { data, error } = await supabase
        .from("notification_preferences")
        .upsert(updateData, {
          onConflict: "user_id",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Notification preferences updated");
    },
    onError: (error) => {
      toast.error("Failed to update preferences");
      console.error("Error updating preferences:", error);
    },
  });

  const testReminder = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "send-subscription-reminder",
        {
          body: { test: true },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Test reminder sent! (${data.emailsSent || 0} emails)`);
    },
    onError: (error) => {
      toast.error("Failed to send test reminder");
      console.error("Error sending test reminder:", error);
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences,
    testReminder,
    isRemindersEnabled: preferences?.subscription_reminders_enabled ?? true,
    reminderEmail: preferences?.reminder_email ?? null,
  };
}
