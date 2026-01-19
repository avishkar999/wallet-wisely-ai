import { motion } from "framer-motion";
import { TrendingUp, ArrowUpRight, ArrowDownRight, Wallet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInvestmentSummary } from "@/hooks/useInvestments";

export function InvestmentGrowth() {
  const { totalInvested, totalCurrentValue, totalGain, overallChangePercent, byType, isLoading, investmentCount } = useInvestmentSummary();

  const formatCurrency = (amount: number) => {
    if (Math.abs(amount) >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    if (Math.abs(amount) >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const typeColors: Record<string, string> = {
    mutual_fund: "hsl(var(--primary))",
    stock: "hsl(var(--success))",
    fixed_deposit: "hsl(var(--warning))",
    recurring_deposit: "hsl(38 85% 55%)",
    crypto: "hsl(var(--accent))",
    gold: "hsl(45 92% 50%)",
    bonds: "hsl(200 70% 50%)",
    other: "hsl(var(--muted-foreground))",
  };

  const typeLabels: Record<string, string> = {
    mutual_fund: "Mutual Funds",
    stock: "Stocks",
    fixed_deposit: "FD",
    recurring_deposit: "RD",
    crypto: "Crypto",
    gold: "Gold",
    bonds: "Bonds",
    other: "Other",
  };

  if (isLoading) {
    return (
      <div className="glass-premium rounded-2xl p-5">
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const allocations = Object.entries(byType)
    .map(([type, data]) => ({
      type,
      label: typeLabels[type] || type,
      color: typeColors[type] || typeColors.other,
      value: data.current,
      allocation: totalCurrentValue > 0 ? (data.current / totalCurrentValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-premium rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-success/15 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Investments</h3>
            <p className="text-xs text-muted-foreground">Portfolio growth</p>
          </div>
        </div>
        {investmentCount > 0 && (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${overallChangePercent >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
            {overallChangePercent >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5" />
            )}
            <span className="text-xs font-semibold">
              {overallChangePercent >= 0 ? '+' : ''}{overallChangePercent.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {investmentCount === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Wallet className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">No investments yet</p>
          <p className="text-xs text-muted-foreground mb-4">Start building your portfolio</p>
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Investment
          </Button>
        </div>
      ) : (
        <>
          {/* Portfolio Value */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-success/10 to-primary/5 border border-success/15 mb-4">
            <p className="text-xs text-muted-foreground mb-1">Total Value</p>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-foreground">{formatCurrency(totalCurrentValue)}</span>
              <span className={`text-sm font-medium ${totalGain >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}
              </span>
            </div>
          </div>

          {/* Allocation Bar */}
          <div className="mb-3">
            <div className="flex rounded-full h-2.5 overflow-hidden bg-muted/50">
              {allocations.map((item, index) => (
                <motion.div
                  key={item.type}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.allocation}%` }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{ backgroundColor: item.color }}
                />
              ))}
            </div>
          </div>

          {/* Allocation Legend */}
          <div className="grid grid-cols-2 gap-2">
            {allocations.map((item, index) => (
              <motion.div
                key={item.type}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}
                className="flex items-center gap-2"
              >
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground truncate">{item.label}</span>
                <span className="text-xs font-medium text-foreground ml-auto">{item.allocation.toFixed(0)}%</span>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
