import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth } from "date-fns";

/**
 * Hook to handle monthly data resets.
 * When the month changes, this hook resets:
 * - Portfolio alert cooldowns (last_alert_sent_at)
 * - Budget alert cooldowns (last_alert_sent_at)
 * - Subscription reminder cooldowns (reminder_sent_at)
 *
 * The "last reset" marker is stored on the user's account so the reset
 * happens once per month across every device.
 */
export function useMonthlyReset() {
  const { user } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!user?.id || ran.current) return;
    ran.current = true;

    const performMonthlyReset = async () => {
      const currentMonth = format(startOfMonth(new Date()), "yyyy-MM");

      const { data: settings } = await supabase
        .from("user_settings")
        .select("id,last_monthly_reset")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settings?.last_monthly_reset === currentMonth) return;

      try {
        await supabase
          .from("portfolio_alert_settings")
          .update({ last_alert_sent_at: null })
          .eq("user_id", user.id);

        await supabase
          .from("budget_alert_settings")
          .update({ last_alert_sent_at: null })
          .eq("user_id", user.id);

        await supabase
          .from("subscription_decisions")
          .update({ reminder_sent_at: null })
          .eq("user_id", user.id)
          .eq("status", "to_review");

        if (settings) {
          await supabase
            .from("user_settings")
            .update({ last_monthly_reset: currentMonth })
            .eq("user_id", user.id);
        } else {
          await supabase
            .from("user_settings")
            .insert({ user_id: user.id, last_monthly_reset: currentMonth } as never);
        }
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
