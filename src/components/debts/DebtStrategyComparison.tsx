import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Snowflake,
  Mountain,
  TrendingDown,
  Calendar,
  DollarSign,
  Trophy,
  ArrowRight,
  Info,
} from "lucide-react";
import { useDebtSummary } from "@/hooks/useDebts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface DebtForStrategy {
  id: string;
  name: string;
  balance: number;
  rate: number;
  minPayment: number;
}

interface MonthlySnapshot {
  month: number;
  snowball: number;
  avalanche: number;
}

interface StrategyResult {
  totalMonths: number;
  totalInterest: number;
  payoffOrder: string[];
  monthlyData: MonthlySnapshot[];
}

export function DebtStrategyComparison() {
  const { debts } = useDebtSummary();

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

  const preparedDebts: DebtForStrategy[] = useMemo(() => {
    return debts.map((d) => ({
      id: d.id,
      name: d.name,
      balance: Number(d.outstanding_amount),
      rate: Number(d.interest_rate),
      minPayment: Number(d.minimum_payment),
    }));
  }, [debts]);

  const totalMinPayment = useMemo(
    () => preparedDebts.reduce((sum, d) => sum + d.minPayment, 0),
    [preparedDebts]
  );

  const simulateStrategy = (
    debtsInput: DebtForStrategy[],
    sortFn: (a: DebtForStrategy, b: DebtForStrategy) => number
  ): StrategyResult => {
    if (debtsInput.length === 0) {
      return { totalMonths: 0, totalInterest: 0, payoffOrder: [], monthlyData: [] };
    }

    // Deep clone debts
    let debtsCopy = debtsInput.map((d) => ({ ...d }));
    const payoffOrder: string[] = [];
    const monthlyData: MonthlySnapshot[] = [];
    let totalInterest = 0;
    let month = 0;
    const maxMonths = 360;

    while (debtsCopy.some((d) => d.balance > 0) && month < maxMonths) {
      // Sort by strategy
      debtsCopy.sort(sortFn);

      // Calculate interest for all debts
      debtsCopy.forEach((d) => {
        if (d.balance > 0) {
          const monthlyRate = d.rate / 100 / 12;
          const interest = d.balance * monthlyRate;
          totalInterest += interest;
          d.balance += interest;
        }
      });

      // Make minimum payments on all except target
      let extraPayment = 0;
      debtsCopy.forEach((d, index) => {
        if (d.balance > 0 && index > 0) {
          const payment = Math.min(d.minPayment, d.balance);
          d.balance -= payment;
          if (d.balance <= 0.01) {
            d.balance = 0;
            payoffOrder.push(d.name);
          }
        } else if (d.balance <= 0 && index > 0) {
          // This debt is paid off, add its min payment to extra
          extraPayment += d.minPayment;
        }
      });

      // Apply all available payment to target debt (first in sorted list)
      const target = debtsCopy.find((d) => d.balance > 0);
      if (target) {
        const availablePayment = target.minPayment + extraPayment;
        const payment = Math.min(availablePayment, target.balance);
        target.balance -= payment;
        if (target.balance <= 0.01) {
          target.balance = 0;
          if (!payoffOrder.includes(target.name)) {
            payoffOrder.push(target.name);
          }
        }
      }

      month++;
      const totalBalance = debtsCopy.reduce((sum, d) => sum + d.balance, 0);
      monthlyData.push({
        month,
        snowball: 0, // Will be set by caller
        avalanche: 0, // Will be set by caller
      });
    }

    return {
      totalMonths: month,
      totalInterest,
      payoffOrder,
      monthlyData,
    };
  };

  const { snowballResult, avalancheResult, chartData } = useMemo(() => {
    if (preparedDebts.length === 0) {
      return {
        snowballResult: { totalMonths: 0, totalInterest: 0, payoffOrder: [], monthlyData: [] },
        avalancheResult: { totalMonths: 0, totalInterest: 0, payoffOrder: [], monthlyData: [] },
        chartData: [],
      };
    }

    // Snowball: smallest balance first
    const snowball = simulateStrategy(
      preparedDebts,
      (a, b) => a.balance - b.balance
    );

    // Avalanche: highest interest rate first
    const avalanche = simulateStrategy(
      preparedDebts,
      (a, b) => b.rate - a.rate
    );

    // Build chart data by simulating both strategies together
    const maxMonths = Math.max(snowball.totalMonths, avalanche.totalMonths);
    const chartDataTemp: MonthlySnapshot[] = [];

    // Re-simulate to get balance over time
    const simulateBalanceOverTime = (
      debtsInput: DebtForStrategy[],
      sortFn: (a: DebtForStrategy, b: DebtForStrategy) => number
    ): number[] => {
      let debtsCopy = debtsInput.map((d) => ({ ...d }));
      const balances: number[] = [debtsCopy.reduce((sum, d) => sum + d.balance, 0)];

      for (let m = 0; m < maxMonths; m++) {
        debtsCopy.sort(sortFn);

        debtsCopy.forEach((d) => {
          if (d.balance > 0) {
            const monthlyRate = d.rate / 100 / 12;
            d.balance += d.balance * monthlyRate;
          }
        });

        let extraPayment = 0;
        debtsCopy.forEach((d, index) => {
          if (d.balance > 0 && index > 0) {
            const payment = Math.min(d.minPayment, d.balance);
            d.balance = Math.max(0, d.balance - payment);
          } else if (d.balance <= 0 && index > 0) {
            extraPayment += d.minPayment;
          }
        });

        const target = debtsCopy.find((d) => d.balance > 0);
        if (target) {
          const payment = Math.min(target.minPayment + extraPayment, target.balance);
          target.balance = Math.max(0, target.balance - payment);
        }

        balances.push(debtsCopy.reduce((sum, d) => sum + d.balance, 0));
      }

      return balances;
    };

    const snowballBalances = simulateBalanceOverTime(
      preparedDebts,
      (a, b) => a.balance - b.balance
    );
    const avalancheBalances = simulateBalanceOverTime(
      preparedDebts,
      (a, b) => b.rate - a.rate
    );

    for (let i = 0; i <= maxMonths; i += Math.max(1, Math.floor(maxMonths / 24))) {
      chartDataTemp.push({
        month: i,
        snowball: snowballBalances[i] || 0,
        avalanche: avalancheBalances[i] || 0,
      });
    }

    return {
      snowballResult: snowball,
      avalancheResult: avalanche,
      chartData: chartDataTemp,
    };
  }, [preparedDebts]);

  const interestDifference = snowballResult.totalInterest - avalancheResult.totalInterest;
  const monthsDifference = snowballResult.totalMonths - avalancheResult.totalMonths;
  const winner = interestDifference > 0 ? "avalanche" : interestDifference < 0 ? "snowball" : "tie";

  if (preparedDebts.length < 2) {
    return null;
  }

  const chartConfig = {
    snowball: {
      label: "Snowball",
      color: "hsl(var(--primary))",
    },
    avalanche: {
      label: "Avalanche",
      color: "hsl(var(--success))",
    },
  };

  return (
    <Card variant="glow" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-success/5" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-primary" />
          Snowball vs Avalanche Strategy
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  <strong>Snowball:</strong> Pay smallest debts first for quick wins.
                  <br />
                  <strong>Avalanche:</strong> Pay highest interest first to save money.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strategy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Snowball */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 rounded-xl border ${
              winner === "snowball"
                ? "bg-primary/10 border-primary/30"
                : "bg-secondary/50 border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Snowflake className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">Snowball</span>
              </div>
              {winner === "snowball" && (
                <Badge variant="default" className="gap-1">
                  <Trophy className="w-3 h-3" /> Best
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Pay smallest balance first
            </p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Time to Debt-Free</span>
                <span className="text-sm font-semibold text-foreground">
                  {snowballResult.totalMonths} months
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Total Interest</span>
                <span className="text-sm font-semibold text-destructive">
                  {formatCurrency(snowballResult.totalInterest)}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Payoff Order</p>
              <div className="flex flex-wrap gap-1">
                {snowballResult.payoffOrder.slice(0, 3).map((name, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                    {i + 1}. {name.length > 10 ? name.slice(0, 10) + "..." : name}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Avalanche */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 rounded-xl border ${
              winner === "avalanche"
                ? "bg-success/10 border-success/30"
                : "bg-secondary/50 border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Mountain className="w-5 h-5 text-success" />
                <span className="font-semibold text-foreground">Avalanche</span>
              </div>
              {winner === "avalanche" && (
                <Badge className="gap-1 bg-success text-success-foreground">
                  <Trophy className="w-3 h-3" /> Best
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Pay highest interest first
            </p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Time to Debt-Free</span>
                <span className="text-sm font-semibold text-foreground">
                  {avalancheResult.totalMonths} months
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Total Interest</span>
                <span className="text-sm font-semibold text-destructive">
                  {formatCurrency(avalancheResult.totalInterest)}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Payoff Order</p>
              <div className="flex flex-wrap gap-1">
                {avalancheResult.payoffOrder.slice(0, 3).map((name, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success">
                    {i + 1}. {name.length > 10 ? name.slice(0, 10) + "..." : name}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Comparison Summary */}
        {Math.abs(interestDifference) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl ${
              winner === "avalanche" ? "bg-success/10" : "bg-primary/10"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className={`w-5 h-5 ${winner === "avalanche" ? "text-success" : "text-primary"}`} />
              <span className="font-semibold text-foreground">
                {winner === "avalanche" ? "Avalanche" : "Snowball"} Saves You More!
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Interest Saved</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(Math.abs(interestDifference))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Time Difference</p>
                <p className="text-xl font-bold text-foreground">
                  {Math.abs(monthsDifference)} months
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Balance Over Time Chart */}
        {chartData.length > 0 && (
          <div className="pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-4">
              Debt Balance Over Time
            </p>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `${value}m`}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="snowball"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="avalanche"
                    stroke="hsl(var(--success))"
                    fill="hsl(var(--success))"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}

        {/* Strategy Tips */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs font-medium text-primary mb-1">💡 Snowball Benefits</p>
            <p className="text-[10px] text-muted-foreground">
              Quick wins boost motivation. Great for psychology-driven payoff.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-success/5 border border-success/10">
            <p className="text-xs font-medium text-success mb-1">💰 Avalanche Benefits</p>
            <p className="text-[10px] text-muted-foreground">
              Mathematically optimal. Saves the most money on interest.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
