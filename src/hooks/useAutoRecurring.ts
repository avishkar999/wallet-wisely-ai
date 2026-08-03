import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfDay, isAfter } from "date-fns";
import { toast } from "sonner";
import { getNextDueDate } from "@/hooks/useRecurringTransactions";

const MAX_CATCHUP_OCCURRENCES = 60;

/**
 * Automatically posts recurring income / expenses / bills / EMI / subscriptions
 * once their due date arrives, catching up on any missed daily, weekly,
 * monthly or yearly occurrences since the last app visit.
 */
export function useAutoRecurring() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ranFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const todayKey = format(new Date(), "yyyy-MM-dd");
    const runKey = `${user.id}:${todayKey}`;
    if (ranFor.current === runKey) return;
    ranFor.current = runKey;

    const run = async () => {
      const today = startOfDay(new Date());

      const { data: recurring, error } = await supabase
        .from("recurring_transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .lte("next_due_date", todayKey);

      if (error || !recurring || recurring.length === 0) return;

      const rows: Record<string, unknown>[] = [];
      const updates: { id: string; next_due_date: string }[] = [];

      for (const item of recurring) {
        let due = startOfDay(new Date(item.next_due_date));
        let count = 0;

        while (!isAfter(due, today) && count < MAX_CATCHUP_OCCURRENCES) {
          rows.push({
            user_id: user.id,
            name: item.title,
            amount: Number(item.amount),
            type: item.type,
            category: item.category,
            payment_method: "auto_pay",
            transaction_date: format(due, "yyyy-MM-dd"),
            description: `Auto-generated recurring (${item.frequency})`,
          });
          due = startOfDay(getNextDueDate(item.frequency, due));
          count++;
        }

        if (count > 0) {
          updates.push({ id: item.id, next_due_date: format(due, "yyyy-MM-dd") });
        }
      }

      if (rows.length === 0) return;

      const { error: insertError } = await supabase.from("transactions").insert(rows as never);
      if (insertError) {
        console.error("Auto recurring insert failed:", insertError);
        return;
      }

      await Promise.all(
        updates.map((u) =>
          supabase
            .from("recurring_transactions")
            .update({ next_due_date: u.next_due_date })
            .eq("id", u.id)
            .eq("user_id", user.id)
        )
      );

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-for-budget"] });
      queryClient.invalidateQueries({ queryKey: ["recurring_transactions"] });

      toast.success(
        `${rows.length} recurring transaction${rows.length > 1 ? "s" : ""} auto-added`
      );
    };

    run().catch((e) => console.error("Auto recurring failed:", e));
  }, [user?.id, queryClient]);
}
