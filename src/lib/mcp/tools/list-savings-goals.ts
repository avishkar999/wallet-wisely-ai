import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_savings_goals",
  title: "List savings goals",
  description: "List the signed-in user's savings goals with progress toward each target.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("savings_goals")
      .select("id,name,category,target_amount,current_amount,target_date,is_completed")
      .order("target_date", { ascending: true });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const goals = (data ?? []).map((g) => ({
      ...g,
      progress_percent:
        Number(g.target_amount) > 0
          ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)
          : 0,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(goals) }],
      structuredContent: { goals },
    };
  },
});
