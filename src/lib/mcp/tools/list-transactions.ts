import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_transactions",
  title: "List transactions",
  description: "List the signed-in user's recent income and expense transactions, newest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of transactions to return."),
    category: z.string().optional().describe("Optional category filter, e.g. food, bills, income."),
    type: z.enum(["income", "expense"]).optional().describe("Optional transaction type filter."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, category, type }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("transactions")
      .select("id,name,amount,type,category,payment_method,transaction_date,description")
      .order("transaction_date", { ascending: false })
      .limit(limit ?? 20);
    if (category) query = query.eq("category", category);
    if (type) query = query.eq("type", type);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { transactions: data ?? [] },
    };
  },
});
