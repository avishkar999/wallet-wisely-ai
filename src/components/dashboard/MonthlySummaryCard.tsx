import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  Percent,
  CalendarDays,
  Tag,
  Receipt,
} from "lucide-react";
import { useFinancialSummary } from "@/hooks/useTransactions";
import { useBudgetSummary } from "@/hooks/useBudgets";

const fmt = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const label = (s?: string | null) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—";

export function MonthlySummaryCard() {
  const {
    income,
    expenses,
    balance,
    savingsRate,
    categoryTotals,
    monthTransactionCount,
    isLoading,
  } = useFinancialSummary();
  const { totalBudgeted, totalSpent } = useBudgetSummary();

  const now = new Date();
  const daysElapsed = now.getDate();
  const dailyAverage = daysElapsed > 0 ? expenses / daysElapsed : 0;

  const top = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];


  const stats = [
    { icon: TrendingUp, title: "Income", value: fmt(income), tone: "text-success" },
    { icon: TrendingDown, title: "Expenses", value: fmt(expenses), tone: "text-destructive" },
    { icon: PiggyBank, title: "Savings", value: fmt(Math.max(balance, 0)), tone: "text-foreground" },
    {
      icon: Wallet,
      title: "Remaining budget",
      value: fmt(totalBudgeted - totalSpent),
      tone: totalBudgeted - totalSpent < 0 ? "text-destructive" : "text-foreground",
    },
    { icon: Percent, title: "Savings rate", value: `${savingsRate}%`, tone: "text-foreground" },
    { icon: CalendarDays, title: "Daily average", value: fmt(dailyAverage), tone: "text-foreground" },
    { icon: Tag, title: "Top category", value: label(top?.[0]), tone: "text-foreground" },
    {
      icon: Receipt,
      title: "Transactions",
      value: String(monthTransactionCount),
      tone: "text-foreground",
    },

  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="insight-card rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Monthly Summary</h3>
          <p className="text-xs text-muted-foreground">{format(now, "MMMM yyyy")} · current cycle</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl bg-secondary/40 border border-border/50 p-3"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <s.icon className="w-3.5 h-3.5" />
              <span className="truncate">{s.title}</span>
            </div>
            <p className={`text-sm font-semibold ${s.tone}`}>
              {isLoading ? "…" : s.value}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
