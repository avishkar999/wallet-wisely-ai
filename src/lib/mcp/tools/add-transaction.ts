import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const CATEGORIES = [
  "food",
  "shopping",
  "transport",
  "entertainment",
  "bills",
  "health",
  "recharges",
  "education",
  "travel",
  "income",
  "other",
] as const;

const PAYMENT_METHODS = [
  "upi",
  "debit_card",
  "credit_card",
  "cash",
  "neft",
  "auto_pay",
  "other",
] as const;

export default defineTool({
  name: "add_transaction",
  title: "Add transaction",
  description: "Record a new income or expense transaction for the signed-in user.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Short label, e.g. 'Groceries'."),
    amount: z.number().positive().describe("Amount in rupees."),
    type: z.enum(["income", "expense"]).describe("Whether this is income or an expense."),
    category: z.enum(CATEGORIES).default("other").describe("Transaction category."),
    payment_method: z.enum(PAYMENT_METHODS).default("upi").describe("Payment method used."),
    transaction_date: z.string().optional().describe("Date in YYYY-MM-DD format. Defaults to today."),
    description: z.string().optional().describe("Optional note."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: ctx.getUserId(),
        name: input.name,
        amount: input.amount,
        type: input.type,
        category: input.category ?? "other",
        payment_method: input.payment_method ?? "upi",
        transaction_date: input.transaction_date ?? new Date().toISOString().slice(0, 10),
        description: input.description ?? null,
      })
      .select();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data?.[0] ?? null) }],
      structuredContent: { transaction: data?.[0] ?? null },
    };
  },
});
