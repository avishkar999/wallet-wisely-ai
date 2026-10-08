import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { TrendingDown, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, Layers } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, eachMonthOfInterval } from "date-fns";

interface SpendingTrendsLineChartProps {
  className?: string;
  showCardHeader?: boolean;
}

const CATEGORY_NAMES: Record<string, string> = {
  food: "Food & Dining",
  shopping: "Shopping",
  transport: "Transport",
  entertainment: "Entertainment",
  bills: "Bills & Utilities",
  health: "Healthcare",
  recharges: "Recharges",
  education: "Education",
  travel: "Travel",
  income: "Income",
  other: "Other",
};

export function SpendingTrendsLineChart({
  className = "",
  showCardHeader = true,
}: SpendingTrendsLineChartProps) {
  const { data: transactions = [], isLoading } = useTransactions();
  const [showIncome, setShowIncome] = useState(false);
  const [showAverage, setShowAverage] = useState(true);

  // Compute 6 months of historical data
  const { chartData, metrics } = useMemo(() => {
    const now = new Date();
    // Exactly last 6 months including current
    const startDate = startOfMonth(subMonths(now, 5));
    const endDate = endOfMonth(now);
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    // Structure month buckets
    const monthMap: Record<
      string,
      {
        monthLabel: string;
        shortMonth: string;
        fullDate: string;
        spending: number;
        income: number;
        savings: number;
        categories: Record<string, number>;
      }
    > = {};

    months.forEach((m) => {
      const key = format(m, "yyyy-MM");
      monthMap[key] = {
        monthLabel: format(m, "MMM yyyy"),
        shortMonth: format(m, "MMM"),
        fullDate: format(m, "MMMM yyyy"),
        spending: 0,
        income: 0,
        savings: 0,
        categories: {},
      };
    });

    // Populate from transactions
    transactions.forEach((t) => {
      if (!t.transaction_date) return;
      const key = t.transaction_date.slice(0, 7);
      if (monthMap[key]) {
        const amt = Number(t.amount) || 0;
        if (t.type === "expense") {
          monthMap[key].spending += amt;
          monthMap[key].categories[t.category] = (monthMap[key].categories[t.category] || 0) + amt;
        } else if (t.type === "income") {
          monthMap[key].income += amt;
        }
      }
    });

    const dataList = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, val]) => {
        // Find top category for this month
        let topCat = "None";
        let topCatAmount = 0;
        Object.entries(val.categories).forEach(([cat, amount]) => {
          if (amount > topCatAmount) {
            topCatAmount = amount;
            topCat = CATEGORY_NAMES[cat] || cat;
          }
        });

        return {
          month: val.shortMonth,
          fullMonth: val.fullDate,
          spending: Math.round(val.spending),
          income: Math.round(val.income),
          savings: Math.round(val.income - val.spending),
          topCategory: topCat,
          topCategoryAmount: Math.round(topCatAmount),
        };
      });

    // Metrics calculations
    const totalSpending = dataList.reduce((acc, d) => acc + d.spending, 0);
    const totalIncome = dataList.reduce((acc, d) => acc + d.income, 0);
    const avgSpending = dataList.length > 0 ? Math.round(totalSpending / dataList.length) : 0;
    
    // Peak spending month
    let peakMonth = dataList[0] || { month: "-", spending: 0 };
    dataList.forEach((d) => {
      if (d.spending > peakMonth.spending) peakMonth = d;
    });

    // Trend comparison: latest month vs 6-mo average
    const latestMonth = dataList[dataList.length - 1]?.spending || 0;
    const diffFromAvg = avgSpending > 0 ? Math.round(((latestMonth - avgSpending) / avgSpending) * 100) : 0;

    // Month-over-month change (latest vs previous month)
    const prevMonth = dataList[dataList.length - 2]?.spending || 0;
    const momChange = prevMonth > 0 ? Math.round(((latestMonth - prevMonth) / prevMonth) * 100) : 0;

    return {
      chartData: dataList,
      metrics: {
        totalSpending,
        totalIncome,
        avgSpending,
        peakMonth,
        latestMonth,
        diffFromAvg,
        momChange,
      },
    };
  }, [transactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatCompact = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
    return `₹${val}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card/95 backdrop-blur-2xl border border-border/70 rounded-xl p-3.5 shadow-2xl min-w-[210px] text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="font-semibold text-foreground text-sm">{data.fullMonth}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">6M Trend</span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                Monthly Spending:
              </span>
              <span className="font-bold text-foreground font-mono">{formatCurrency(data.spending)}</span>
            </div>

            {showIncome && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" />
                  Monthly Income:
                </span>
                <span className="font-bold text-accent font-mono">{formatCurrency(data.income)}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Net Savings:</span>
              <span
                className={`font-semibold font-mono ${
                  data.savings >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {data.savings >= 0 ? "+" : ""}
                {formatCurrency(data.savings)}
              </span>
            </div>

            {data.topCategory !== "None" && (
              <div className="pt-2 border-t border-border/40 text-[11px] flex items-center justify-between text-muted-foreground">
                <span>Top Outflow:</span>
                <span className="text-foreground font-medium">
                  {data.topCategory} ({formatCurrency(data.topCategoryAmount)})
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="glass-premium rounded-2xl p-6 min-h-[360px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading spending trends...</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className={`glass-premium rounded-2xl p-6 sm:p-8 border border-border/40 text-center ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary">
          <TrendingDown className="w-5 h-5 opacity-70" />
        </div>
        <h4 className="text-base font-semibold text-foreground">6-Month Spending Trends</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          No transactions found in the past 6 months. Once you start recording, a smooth Recharts monotone curve will track your monthly spending trajectory.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`glass-premium rounded-2xl p-5 sm:p-6 border border-border/40 shadow-card ${className}`}
    >
      {/* Header with Title and Segmented Controls */}
      {showCardHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
                6-Month Spending Trends
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>Past 6 months</span>
              <span aria-hidden="true">·</span>
              <span>Smooth Monotone Curve</span>
              <span aria-hidden="true">·</span>
              <span className="text-foreground font-medium font-mono">{formatCurrency(metrics.totalSpending)} total</span>
            </div>
          </div>

          {/* Interactive controls */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-secondary/70 p-1 rounded-xl border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setShowIncome(false)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                !showIncome
                  ? "bg-card text-foreground shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Spending Only
            </button>
            <button
              type="button"
              onClick={() => setShowIncome(true)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                showIncome
                  ? "bg-card text-foreground shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Vs. Income
            </button>
            <button
              type="button"
              onClick={() => setShowAverage(!showAverage)}
              title="Toggle average line"
              className={`px-2.5 py-1.5 rounded-lg font-mono text-[11px] transition-all ${
                showAverage
                  ? "text-warning bg-warning/10 border border-warning/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Avg Line
            </button>
          </div>
        </div>
      )}

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5 p-3 sm:p-4 rounded-xl bg-card/40 border border-border/30">
        <div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">
            Total Spent
          </span>
          <span className="text-base sm:text-xl font-bold text-foreground font-mono mt-0.5 block">
            {formatCurrency(metrics.totalSpending)}
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">Across 6 months</span>
        </div>

        <div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">
            Monthly Average
          </span>
          <span className="text-base sm:text-xl font-bold text-primary font-mono mt-0.5 block">
            {formatCurrency(metrics.avgSpending)}
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">Per month baseline</span>
        </div>

        <div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">
            Peak Month
          </span>
          <span className="text-base sm:text-xl font-bold text-foreground font-mono mt-0.5 block">
            {metrics.peakMonth.month}
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">
            {formatCurrency(metrics.peakMonth.spending)} high
          </span>
        </div>

        <div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">
            Latest vs 6M Avg
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {metrics.diffFromAvg <= 0 ? (
              <ArrowDownRight className="w-4 h-4 text-success" />
            ) : (
              <ArrowUpRight className="w-4 h-4 text-warning" />
            )}
            <span
              className={`text-base sm:text-xl font-bold font-mono ${
                metrics.diffFromAvg <= 0 ? "text-success" : "text-warning"
              }`}
            >
              {Math.abs(metrics.diffFromAvg)}%
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground block mt-0.5">
            {metrics.diffFromAvg <= 0 ? "Lower than average" : "Higher than average"}
          </span>
        </div>
      </div>

      {/* Recharts Line Chart */}
      <div className="w-full h-[270px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 18, right: 14, left: -14, bottom: 4 }}
          >
            <defs>
              <linearGradient id="spendingStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(168, 60%, 55%)" />
                <stop offset="100%" stopColor="hsl(185, 55%, 50%)" />
              </linearGradient>
              <linearGradient id="incomeStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(250, 55%, 65%)" />
                <stop offset="100%" stopColor="hsl(280, 55%, 60%)" />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(228, 20%, 14%)"
              vertical={false}
              opacity={0.7}
            />

            <XAxis
              dataKey="month"
              stroke="hsl(220, 15%, 55%)"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "hsl(228, 20%, 14%)" }}
              dy={8}
            />

            <YAxis
              stroke="hsl(220, 15%, 55%)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCompact(v)}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Average Reference Line */}
            {showAverage && metrics.avgSpending > 0 && (
              <ReferenceLine
                y={metrics.avgSpending}
                stroke="hsl(42, 85%, 55%)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                opacity={0.75}
                label={{
                  value: `Avg: ${formatCompact(metrics.avgSpending)}`,
                  fill: "hsl(42, 85%, 55%)",
                  fontSize: 10,
                  position: "insideTopRight",
                  dy: -8,
                }}
              />
            )}

            {/* Income Line (Optional toggle) */}
            {showIncome && (
              <Line
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="url(#incomeStroke)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{
                  r: 3.5,
                  fill: "hsl(228, 30%, 7%)",
                  stroke: "hsl(250, 55%, 65%)",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: "hsl(250, 55%, 65%)",
                  stroke: "hsl(228, 33%, 4%)",
                  strokeWidth: 3,
                }}
              />
            )}

            {/* Spending Line (Main) */}
            <Line
              type="monotone"
              dataKey="spending"
              name="Spending"
              stroke="url(#spendingStroke)"
              strokeWidth={3}
              dot={{
                r: 4.5,
                fill: "hsl(228, 30%, 7%)",
                stroke: "hsl(168, 60%, 55%)",
                strokeWidth: 2.5,
              }}
              activeDot={{
                r: 7,
                fill: "hsl(168, 60%, 55%)",
                stroke: "hsl(228, 33%, 4%)",
                strokeWidth: 3,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Chart Legend & Context */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-1 border-t border-border/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 rounded-full bg-primary inline-block" />
            <span className="text-foreground font-medium">Monthly Spending</span>
          </div>
          {showIncome && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 border-b-2 border-dashed border-accent inline-block" />
              <span className="text-accent font-medium">Income Baseline</span>
            </div>
          )}
          {showAverage && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 border-b-2 border-dashed border-warning inline-block" />
              <span className="text-warning font-medium">6-Mo Average ({formatCompact(metrics.avgSpending)})</span>
            </div>
          )}
        </div>

        <div className="text-[11px] text-muted-foreground">
          {metrics.momChange === 0
            ? "Stable month-over-month"
            : `${Math.abs(metrics.momChange)}% ${metrics.momChange < 0 ? "decrease" : "increase"} from previous month`}
        </div>
      </div>
    </motion.div>
  );
}
