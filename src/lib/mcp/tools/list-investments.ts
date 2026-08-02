import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_investments",
  title: "List investments",
  description: "List the signed-in user's investment holdings with invested and current values.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("investments")
      .select("id,name,type,invested_amount,current_value,units,nav,risk_level,purchase_date")
      .order("current_value", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const invested = (data ?? []).reduce((sum, i) => sum + Number(i.invested_amount ?? 0), 0);
    const current = (data ?? []).reduce((sum, i) => sum + Number(i.current_value ?? 0), 0);
    return {
      content: [{ type: "text", text: JSON.stringify({ investments: data ?? [], invested, current }) }],
      structuredContent: {
        investments: data ?? [],
        total_invested: invested,
        total_current_value: current,
        gain: current - invested,
      },
    };
  },
});
