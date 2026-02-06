import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth } from "date-fns";

const LAST_RESET_KEY = "walletwise_last_monthly_reset";

/**
 * Hook to handle monthly data resets.
 * When the month changes, this hook resets:
 * - Portfolio alert cooldowns (last_alert_sent_at)
 * - Budget alert cooldowns (last_alert_sent_at)
 * - Subscription reminder cooldowns (reminder_sent_at)
 */
export function useMonthlyReset() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const performMonthlyReset = async () => {
      const currentMonth = format(startOfMonth(new Date()), "yyyy-MM");
      const lastReset = localStorage.getItem(LAST_RESET_KEY);

      // Skip if already reset this month
      if (lastReset === currentMonth) {
        return;
      }

      console.log("Performing monthly data reset for:", currentMonth);

      try {
        // Reset portfolio alert cooldown
        await supabase
          .from("portfolio_alert_settings")
          .update({ last_alert_sent_at: null })
          .eq("user_id", user.id);

        // Reset budget alert cooldown
        await supabase
          .from("budget_alert_settings")
          .update({ last_alert_sent_at: null })
          .eq("user_id", user.id);

        // Reset subscription reminder cooldowns for the new month
        await supabase
          .from("subscription_decisions")
          .update({ reminder_sent_at: null })
          .eq("user_id", user.id)
          .eq("status", "to_review");

        // Mark reset as complete for this month
        localStorage.setItem(LAST_RESET_KEY, currentMonth);
        console.log("Monthly reset completed successfully");
      } catch (error) {
        console.error("Error during monthly reset:", error);
      }
    };

    performMonthlyReset();
  }, [user?.id]);
}

/**
 * Get the current month key for tracking purposes
 */
export function getCurrentMonthKey(): string {
  return format(startOfMonth(new Date()), "yyyy-MM");
}

/**
 * Check if we're in a new month since the last tracked activity
 */
export function isNewMonth(lastActivityDate: string | null): boolean {
  if (!lastActivityDate) return true;
  
  const lastMonth = format(new Date(lastActivityDate), "yyyy-MM");
  const currentMonth = format(new Date(), "yyyy-MM");
  
  return lastMonth !== currentMonth;
}
