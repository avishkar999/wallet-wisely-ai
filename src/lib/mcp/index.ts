import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTransactionsTool from "./tools/list-transactions";
import addTransactionTool from "./tools/add-transaction";
import listDebtsTool from "./tools/list-debts";
import listInvestmentsTool from "./tools/list-investments";
import listSavingsGoalsTool from "./tools/list-savings-goals";
import financialSummaryTool from "./tools/financial-summary";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "money-maestro",
  title: "Money Maestro",
  version: "0.1.0",
  instructions:
    "Tools for Money Maestro, a personal finance tracker. Use `financial_summary` for an overview of income, expenses, savings rate, debt and portfolio. Use `list_transactions`, `list_debts`, `list_investments` and `list_savings_goals` to inspect details, and `add_transaction` to record new income or expenses. All data belongs to the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    financialSummaryTool,
    listTransactionsTool,
    addTransactionTool,
    listDebtsTool,
    listInvestmentsTool,
    listSavingsGoalsTool,
  ],
});
