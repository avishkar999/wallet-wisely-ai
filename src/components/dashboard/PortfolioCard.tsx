import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ArrowUpRight, Coins, Landmark, BarChart3, Bitcoin } from "lucide-react";

interface Investment {
  name: string;
  value: number;
  change: number;
  allocation: number;
  icon: React.ElementType;
  color: string;
}

const investments: Investment[] = [
  { name: "Mutual Funds", value: 485000, change: 12.4, allocation: 45, icon: BarChart3, color: "hsl(var(--primary))" },
  { name: "Stocks", value: 320000, change: 8.2, allocation: 30, icon: TrendingUp, color: "hsl(var(--success))" },
  { name: "Fixed Deposits", value: 150000, change: 6.5, allocation: 14, icon: Landmark, color: "hsl(var(--warning))" },
  { name: "Crypto", value: 85000, change: -5.3, allocation: 8, icon: Bitcoin, color: "hsl(var(--accent))" },
  { name: "Gold", value: 32000, change: 3.1, allocation: 3, icon: Coins, color: "hsl(38 92% 50%)" },
];

export function PortfolioCard() {
  const totalValue = investments.reduce((sum, inv) => sum + inv.value, 0);
  const totalChange = investments.reduce((sum, inv) => sum + (inv.value * inv.change / 100), 0);
  const overallChangePercent = (totalChange / (totalValue - totalChange)) * 100;

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

  return (
    <Card variant="elevated">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-primary" />
          Investment Portfolio
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Total Portfolio Value */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-success/10 border border-primary/20"
        >
          <p className="text-xs text-muted-foreground mb-1">Total Portfolio Value</p>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
            <div className="flex items-center gap-1">
              <ArrowUpRight className={`w-4 h-4 ${overallChangePercent >= 0 ? 'text-success' : 'text-destructive'}`} />
              <span className={`text-sm font-semibold ${overallChangePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                {overallChangePercent >= 0 ? '+' : ''}{overallChangePercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Allocation Ring */}
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {investments.map((inv, index) => {
                const previousAllocations = investments.slice(0, index).reduce((sum, i) => sum + i.allocation, 0);
                const circumference = 2 * Math.PI * 40;
                const offset = (previousAllocations / 100) * circumference;
                const dashLength = (inv.allocation / 100) * circumference;
                
                return (
                  <motion.circle
                    key={inv.name}
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
            {investments.slice(0, 4).map((inv, index) => {
              const Icon = inv.icon;
              return (
                <motion.div
                  key={inv.name}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2"
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: inv.color }}
                  />
                  <span className="text-xs text-muted-foreground truncate">{inv.name}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Investment List */}
        <div className="space-y-2">
          {investments.map((inv, index) => {
            const Icon = inv.icon;
            return (
              <motion.div
                key={inv.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 + 0.3 }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${inv.color}20` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: inv.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{inv.name}</p>
                    <p className="text-xs text-muted-foreground">{inv.allocation}% allocation</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(inv.value)}</p>
                  <p className={`text-xs font-medium ${inv.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {inv.change >= 0 ? '+' : ''}{inv.change}%
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
