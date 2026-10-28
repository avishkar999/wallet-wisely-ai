import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Utensils, ShoppingBag, Car, Gamepad2, Zap, Heart, Phone, BookOpen, Plane, MoreHorizontal } from "lucide-react";
import { useTransactions, useFinancialSummary } from "@/hooks/useTransactions";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { format, parseISO } from "date-fns";

const categoryConfig: Record<string, { icon: React.ElementType; color: string }> = {
  food: { icon: Utensils, color: "hsl(var(--warning))" },
  shopping: { icon: ShoppingBag, color: "hsl(var(--accent))" },
  transport: { icon: Car, color: "hsl(var(--primary))" },
  entertainment: { icon: Gamepad2, color: "hsl(280 55% 60%)" },
  bills: { icon: Zap, color: "hsl(200 70% 50%)" },
  health: { icon: Heart, color: "hsl(var(--destructive))" },
  recharges: { icon: Phone, color: "hsl(var(--success))" },
  education: { icon: BookOpen, color: "hsl(250 55% 65%)" },
  travel: { icon: Plane, color: "hsl(168 60% 55%)" },
  income: { icon: ArrowUpRight, color: "hsl(var(--success))" },
  other: { icon: MoreHorizontal, color: "hsl(var(--muted-foreground))" },
};

export function RecentActivity() {
  const { data: transactions = [], isLoading } = useTransactions();
  const { income, expenses } = useFinancialSummary();
  const { dashboardCategoryFilter, setDashboardCategoryFilter } = useCoinKeeper();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredTransactions = transactions.filter(t => {
    if (!dashboardCategoryFilter) return true;
    const txnTags: string[] = (t as any).tags || [];
    if (dashboardCategoryFilter.startsWith("#")) {
      const targetTag = dashboardCategoryFilter.slice(1).toLowerCase();
      return txnTags.some(tg => tg.toLowerCase() === targetTag);
    }
    return t.category.toLowerCase() === dashboardCategoryFilter.toLowerCase();
  });

  const recentTransactions = filteredTransactions.slice(0, 5);

  if (isLoading) {
    return (
      <div className="glass-premium rounded-2xl p-5">
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass-premium rounded-2xl p-5"
    >
      {/* Header with Summary */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>Recent Activity</span>
            {dashboardCategoryFilter && (
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {dashboardCategoryFilter}
              </span>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-success">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{formatCurrency(income)}</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{formatCurrency(expenses)}</span>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      {recentTransactions.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border/60 bg-secondary/10">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary">
            <Utensils className="w-5 h-5 opacity-70" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">No transactions recorded yet</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            {dashboardCategoryFilter
              ? `No transactions matched "${dashboardCategoryFilter}".`
              : "Your ledger is clean and ready. Authorised transactions from your connected accounts will appear here automatically."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentTransactions.map((txn, index) => {
            const config = categoryConfig[txn.category] || categoryConfig.other;
            const Icon = config.icon;
            const isIncome = txn.type === "income";
            const tags: string[] = (txn as any).tags || [];
            
            return (
              <motion.div
                key={txn.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer group"
              >
                <div 
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: `${config.color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{txn.name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(txn.transaction_date), "MMM d")} · {txn.category}
                    </p>
                    {tags.length > 0 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground font-mono">
                        #{tags[0]}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-sm font-semibold ${isIncome ? 'text-success' : 'text-foreground'}`}>
                  {isIncome ? '+' : '-'}{formatCurrency(Number(txn.amount))}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}

      {recentTransactions.length > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="w-full mt-3 py-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all transactions →
        </motion.button>
      )}
    </motion.div>
  );
}
