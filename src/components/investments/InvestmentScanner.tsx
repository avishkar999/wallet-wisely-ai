import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  BarChart3, 
  PieChart,
  Target,
  Plus,
  Sparkles,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

interface Asset {
  name: string;
  value: number;
  change: number;
  units?: number;
  nav?: number;
  category: "good" | "average" | "poor";
}

const mutualFunds: Asset[] = [
  { name: "Axis Bluechip Fund", value: 185000, change: 15.2, units: 234.5, nav: 789.12, category: "good" },
  { name: "HDFC Mid-Cap Opp.", value: 145000, change: 22.8, units: 156.7, nav: 925.34, category: "good" },
  { name: "SBI Small Cap", value: 95000, change: -8.5, units: 89.3, nav: 1064.23, category: "poor" },
  { name: "ICICI Prudential Value", value: 60000, change: 11.3, units: 45.2, nav: 1327.43, category: "average" },
];

const stocks: Asset[] = [
  { name: "Reliance Industries", value: 125000, change: 8.4, units: 50, category: "good" },
  { name: "HDFC Bank", value: 85000, change: -2.1, units: 55, category: "average" },
  { name: "Infosys", value: 65000, change: 12.6, units: 40, category: "good" },
  { name: "TCS", value: 45000, change: 5.2, units: 12, category: "average" },
];

export function InvestmentScanner() {
  const totalMF = mutualFunds.reduce((sum, f) => sum + f.value, 0);
  const totalStocks = stocks.reduce((sum, s) => sum + s.value, 0);
  const totalValue = totalMF + totalStocks + 150000 + 85000 + 32000; // FD + Crypto + Gold

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

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "good":
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success">
            <CheckCircle className="w-3 h-3" />
            Good
          </span>
        );
      case "poor":
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
            <AlertTriangle className="w-3 h-3" />
            Review
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/20 text-warning">
            Average
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Net Worth Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card variant="glow" className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-success/10" />
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Net Worth</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-4xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
                  <div className="flex items-center gap-1 text-success">
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="text-sm font-semibold">+12.4%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">↑ ₹1.2L from last month</p>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Detailed Report
                </Button>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Investment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Asset Allocation */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { name: "Mutual Funds", value: totalMF, percent: 45, color: "hsl(var(--primary))" },
          { name: "Stocks", value: totalStocks, percent: 30, color: "hsl(var(--success))" },
          { name: "Fixed Deposits", value: 150000, percent: 14, color: "hsl(var(--warning))" },
          { name: "Crypto", value: 85000, percent: 8, color: "hsl(var(--accent))" },
          { name: "Gold", value: 32000, percent: 3, color: "hsl(38 92% 50%)" },
        ].map((asset, index) => (
          <motion.div
            key={asset.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card variant="elevated" className="hover:shadow-glow transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div 
                  className="w-3 h-3 rounded-full mb-2"
                  style={{ backgroundColor: asset.color }}
                />
                <p className="text-xs text-muted-foreground">{asset.name}</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(asset.value)}</p>
                <p className="text-xs text-muted-foreground">{asset.percent}%</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Mutual Funds */}
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Mutual Funds
          </CardTitle>
          <span className="text-sm text-muted-foreground">{mutualFunds.length} funds</span>
        </CardHeader>
        <CardContent className="space-y-3">
          {mutualFunds.map((fund, index) => (
            <motion.div
              key={fund.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-foreground">{fund.name}</p>
                  {getCategoryBadge(fund.category)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {fund.units} units @ NAV ₹{fund.nav?.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-foreground">{formatCurrency(fund.value)}</p>
                <p className={`text-xs font-medium flex items-center justify-end gap-1 ${
                  fund.change >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {fund.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {fund.change >= 0 ? '+' : ''}{fund.change}%
                </p>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Stocks */}
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            Stocks
          </CardTitle>
          <span className="text-sm text-muted-foreground">{stocks.length} stocks</span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stocks.map((stock, index) => (
              <motion.div
                key={stock.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">{stock.name}</p>
                    {getCategoryBadge(stock.category)}
                  </div>
                  <p className="text-xs text-muted-foreground">{stock.units} shares</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-foreground">{formatCurrency(stock.value)}</p>
                  <p className={`text-xs font-medium ${stock.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {stock.change >= 0 ? '+' : ''}{stock.change}%
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card variant="glow" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-accent/20 to-transparent rounded-bl-full" />
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-semibold text-foreground">AI Investment Insights</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-success/10">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Portfolio is well-diversified</p>
                  <p className="text-xs text-muted-foreground">Your equity-debt ratio of 75:25 matches your risk profile</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-xl bg-warning/10">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Consider reviewing SBI Small Cap</p>
                  <p className="text-xs text-muted-foreground">Underperforming benchmark by 12% over 6 months</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/10">
                <Target className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Increase SIP by ₹3,000/month</p>
                  <p className="text-xs text-muted-foreground">Could help reach ₹1Cr goal 2 years earlier</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
