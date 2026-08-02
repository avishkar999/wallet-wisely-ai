import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "financial_summary",
  title: "Financial summary",
  description:
    "Summarize the signed-in user's finances for a period: income, expenses, savings rate, spending by category, total debt and portfolio value.",
  inputSchema: {
    months: z.number().int().min(1).max(24).default(1).describe("How many recent months to include."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ months }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const since = new Date();
    since.setMonth(since.getMonth() - (months ?? 1));
    const sinceDate = since.toISOString().slice(0, 10);

    const [txRes, debtRes, invRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("amount,type,category,transaction_date")
        .gte("transaction_date", sinceDate),
      supabase.from("debts").select("outstanding_amount,interest_rate,minimum_payment"),
      supabase.from("investments").select("invested_amount,current_value"),
    ]);

    const firstError = txRes.error ?? debtRes.error ?? invRes.error;
    if (firstError) return { content: [{ type: "text", text: firstError.message }], isError: true };

    const txs = txRes.data ?? [];
    const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expenses = txs.filter((t) => t.type !== "income").reduce((s, t) => s + Number(t.amount), 0);
    const byCategory: Record<string, number> = {};
    for (const t of txs) {
      if (t.type === "income") continue;
      byCategory[t.category] = (byCategory[t.category] ?? 0) + Number(t.amount);
    }

    const debts = debtRes.data ?? [];
    const totalDebt = debts.reduce((s, d) => s + Number(d.outstanding_amount ?? 0), 0);
    const monthlyEmi = debts.reduce((s, d) => s + Number(d.minimum_payment ?? 0), 0);
    const avgInterest = debts.length
      ? debts.reduce((s, d) => s + Number(d.interest_rate ?? 0), 0) / debts.length
      : 0;

    const investments = invRes.data ?? [];
    const invested = investments.reduce((s, i) => s + Number(i.invested_amount ?? 0), 0);
    const portfolioValue = investments.reduce((s, i) => s + Number(i.current_value ?? 0), 0);

    const summary = {
      period_months: months ?? 1,
      since: sinceDate,
      income,
      expenses,
      net: income - expenses,
      savings_rate_percent: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0,
      spending_by_category: byCategory,
      total_debt: totalDebt,
      monthly_emi: monthlyEmi,
      average_interest_rate: Number(avgInterest.toFixed(2)),
      total_invested: invested,
      portfolio_value: portfolioValue,
      portfolio_gain: portfolioValue - invested,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(summary) }],
      structuredContent: summary,
    };
  },
});
