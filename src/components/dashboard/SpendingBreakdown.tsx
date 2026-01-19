import { motion } from "framer-motion";
import { Utensils, ShoppingBag, Car, Gamepad2, Zap, Heart, Phone, BookOpen, Plane, MoreHorizontal } from "lucide-react";
import { useFinancialSummary } from "@/hooks/useTransactions";

const categoryConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  food: { icon: Utensils, color: "hsl(var(--warning))", label: "Food" },
  shopping: { icon: ShoppingBag, color: "hsl(var(--accent))", label: "Shopping" },
  transport: { icon: Car, color: "hsl(var(--primary))", label: "Transport" },
  entertainment: { icon: Gamepad2, color: "hsl(280 55% 60%)", label: "Fun" },
  bills: { icon: Zap, color: "hsl(200 70% 50%)", label: "Bills" },
  health: { icon: Heart, color: "hsl(var(--destructive))", label: "Health" },
  recharges: { icon: Phone, color: "hsl(var(--success))", label: "Recharges" },
  education: { icon: BookOpen, color: "hsl(250 55% 65%)", label: "Education" },
  travel: { icon: Plane, color: "hsl(168 60% 55%)", label: "Travel" },
  other: { icon: MoreHorizontal, color: "hsl(var(--muted-foreground))", label: "Other" },
};

export function SpendingBreakdown() {
  const { expenses, categoryTotals } = useFinancialSummary();

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toFixed(0)}`;
  };

  // Get top 6 spending categories
  const categories = Object.entries(categoryTotals)
    .filter(([cat]) => cat !== 'income')
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: expenses > 0 ? (amount / expenses) * 100 : 0,
      ...categoryConfig[category] || categoryConfig.other,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const maxAmount = Math.max(...categories.map(c => c.amount), 1);

  if (categories.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-premium rounded-2xl p-5"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4">Spending Breakdown</h3>
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">No spending data yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add expenses to see breakdown</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-premium rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Spending Breakdown</h3>
        <span className="text-xs text-muted-foreground">This month</span>
      </div>

      <div className="space-y-3">
        {categories.map((cat, index) => {
          const Icon = cat.icon;
          const barWidth = (cat.amount / maxAmount) * 100;
          
          return (
            <motion.div
              key={cat.category}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + index * 0.05 }}
              className="group"
            >
              <div className="flex items-center gap-3 mb-1.5">
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${cat.color}15` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                </div>
                <span className="text-xs font-medium text-foreground flex-1">{cat.label}</span>
                <span className="text-xs text-muted-foreground">{cat.percentage.toFixed(0)}%</span>
                <span className="text-xs font-semibold text-foreground w-14 text-right">{formatCurrency(cat.amount)}</span>
              </div>
              <div className="ml-10 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ delay: 0.5 + index * 0.05, duration: 0.5, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
