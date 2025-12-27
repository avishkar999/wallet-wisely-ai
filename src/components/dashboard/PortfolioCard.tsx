import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ArrowUpRight, ArrowDownRight, Coins, Landmark, BarChart3, Bitcoin, HelpCircle, Briefcase } from "lucide-react";
import { useInvestmentSummary } from "@/hooks/useInvestments";

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  mutual_fund: { icon: BarChart3, color: "hsl(var(--primary))", label: "Mutual Funds" },
  stock: { icon: TrendingUp, color: "hsl(var(--success))", label: "Stocks" },
  fixed_deposit: { icon: Landmark, color: "hsl(var(--warning))", label: "Fixed Deposits" },
  recurring_deposit: { icon: Landmark, color: "hsl(38 92% 50%)", label: "RD" },
  crypto: { icon: Bitcoin, color: "hsl(var(--accent))", label: "Crypto" },
  gold: { icon: Coins, color: "hsl(45 92% 50%)", label: "Gold" },
  bonds: { icon: Briefcase, color: "hsl(200 70% 50%)", label: "Bonds" },
  other: { icon: BarChart3, color: "hsl(var(--muted-foreground))", label: "Other" },
};

export function PortfolioCard() {
  const { investments, totalInvested, totalCurrentValue, totalGain, overallChangePercent, byType, isLoading, investmentCount } = useInvestmentSummary();

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            Investment Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const typeAllocations = Object.entries(byType).map(([type, data]) => ({
    type,
    ...typeConfig[type] || typeConfig.other,
    ...data,
    allocation: totalCurrentValue > 0 ? Math.round((data.current / totalCurrentValue) * 100) : 0,
    change: data.invested > 0 ? ((data.current - data.invested) / data.invested) * 100 : 0,
  })).sort((a, b) => b.current - a.current);

  return (
    <Card variant="elevated">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-primary" />
          Investment Portfolio
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {investmentCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <HelpCircle className="w-10 h-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No investments yet</p>
            <p className="text-xs text-muted-foreground">Add investments to track your portfolio</p>
          </div>
        ) : (
          <>
            {/* Total Portfolio Value */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-success/10 border border-primary/20"
            >
              <p className="text-xs text-muted-foreground mb-1">Total Portfolio Value</p>
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-bold text-foreground">{formatCurrency(totalCurrentValue)}</p>
                <div className="flex items-center gap-1">
                  {overallChangePercent >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-success" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-destructive" />
                  )}
                  <span className={`text-sm font-semibold ${overallChangePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {overallChangePercent >= 0 ? '+' : ''}{overallChangePercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Allocation Ring */}
            {typeAllocations.length > 0 && (
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {typeAllocations.map((inv, index) => {
                      const previousAllocations = typeAllocations.slice(0, index).reduce((sum, i) => sum + i.allocation, 0);
                      const circumference = 2 * Math.PI * 40;
                      const offset = (previousAllocations / 100) * circumference;
                      const dashLength = (inv.allocation / 100) * circumference;
                      
                      return (
                        <motion.circle
                          key={inv.type}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={inv.color}
                          strokeWidth="12"
                          strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                          strokeDashoffset={-offset}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                        />
                      );
                    })}
                  </svg>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-2">
                  {typeAllocations.slice(0, 4).map((inv, index) => (
                    <motion.div
                      key={inv.type}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-2"
                    >
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: inv.color }}
                      />
                      <span className="text-xs text-muted-foreground truncate">{inv.label}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Investment List */}
            <div className="space-y-2">
              {investments.slice(0, 5).map((inv, index) => {
                const config = typeConfig[inv.type] || typeConfig.other;
                const Icon = config.icon;
                const change = Number(inv.invested_amount) > 0 
                  ? ((Number(inv.current_value) - Number(inv.invested_amount)) / Number(inv.invested_amount)) * 100 
                  : 0;
                
                return (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 + 0.3 }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: config.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{inv.name}</p>
                        <p className="text-xs text-muted-foreground">{config.label}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(inv.current_value))}</p>
                      <p className={`text-xs font-medium ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
