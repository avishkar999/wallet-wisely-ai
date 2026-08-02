import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/integrations/supabase/types";
import { format, startOfMonth } from "date-fns";

export type MonthlySummary = Tables<"monthly_summaries">;

export function useMonthlySummaries() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["monthly_summaries", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_summaries")
        .select("*")
        .order("month", { ascending: false });

      if (error) throw error;
      return data as MonthlySummary[];
    },
    enabled: !!user,
  });
}

export function useDeleteMonthlySummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("monthly_summaries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly_summaries"] });
    },
  });
}

type TxRow = Pick<Tables<"transactions">, "amount" | "type" | "category" | "transaction_date">;

export function buildSummary(monthKey: string, rows: TxRow[]) {
  const income = rows
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const expenses = rows
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const categoryBreakdown = rows
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount || 0);
      return acc;
    }, {} as Record<string, number>);

  const top = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0];
  const balance = income - expenses;

  // Guard against NaN / Infinity before persisting.
  const safe = (n: number) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : 0);

  return {
    month: `${monthKey}-01`,
    total_income: safe(income),
    total_expenses: safe(expenses),
    total_savings: safe(Math.max(balance, 0)),
    remaining_balance: safe(balance),
    savings_rate: income > 0 ? safe((balance / income) * 100) : 0,
    highest_category: top?.[0] ?? null,
    highest_category_amount: safe(top?.[1] ?? 0),
    transaction_count: rows.length,
    category_breakdown: categoryBreakdown,
  };
}

/**
 * Archives every completed (past) month into monthly_summaries on app open.
 * Never deletes transactions — the dashboard simply scopes itself to the
 * current month, so a new cycle naturally starts at zero on the 1st.
 */
export function useMonthlyArchive() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ranFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const currentMonth = format(startOfMonth(new Date()), "yyyy-MM");
    if (ranFor.current === `${user.id}:${currentMonth}`) return;
    ranFor.current = `${user.id}:${currentMonth}`;

    (async () => {
      try {
        const { data: txs, error } = await supabase
          .from("transactions")
          .select("amount, type, category, transaction_date")
          .lt("transaction_date", `${currentMonth}-01`);

        if (error) throw error;
        if (!txs || txs.length === 0) return;

        const byMonth = new Map<string, TxRow[]>();
        for (const t of txs as TxRow[]) {
          const key = t.transaction_date.slice(0, 7);
          if (!byMonth.has(key)) byMonth.set(key, []);
          byMonth.get(key)!.push(t);
        }

        const rows = Array.from(byMonth.entries()).map(([key, list]) => ({
          user_id: user.id,
          ...buildSummary(key, list),
        }));

        const { error: upsertError } = await supabase
          .from("monthly_summaries")
          .upsert(rows, { onConflict: "user_id,month" });

        if (upsertError) throw upsertError;
        queryClient.invalidateQueries({ queryKey: ["monthly_summaries"] });
      } catch (e) {
        console.error("Monthly archive failed:", e);
        ranFor.current = null;
      }
    })();
  }, [user?.id, queryClient]);
}
