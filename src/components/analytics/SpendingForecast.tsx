import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useBudgetSummary } from "@/hooks/useBudgets";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, addMonths } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export function SpendingForecast() {
  const { data: transactions = [], isLoading } = useTransactions();
  const { totalBudgeted } = useBudgetSummary();

  const forecastData = useMemo(() => {
    const now = new Date();
    const historicalMonths = 6;
    const forecastMonths = 3;
    
    // Calculate historical monthly spending
    const monthlySpending: { month: string; actual: number; monthDate: Date }[] = [];
    
    for (let i = historicalMonths - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthTransactions = transactions.filter(t => {
        const date = parseISO(t.transaction_date);
        return date >= monthStart && date <= monthEnd && t.type === "expense";
      });
      
      const total = monthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      
      monthlySpending.push({
        month: format(monthDate, "MMM yy"),
        actual: total,
        monthDate,
      });
    }

    // Calculate trend (simple linear regression)
    const n = monthlySpending.length;
    if (n < 2) return { chartData: [], avgSpending: 0, trend: 0, forecast: [], insights: [] };
    
    const sumX = monthlySpending.reduce((sum, _, i) => sum + i, 0);
    const sumY = monthlySpending.reduce((sum, m) => sum + m.actual, 0);
    const sumXY = monthlySpending.reduce((sum, m, i) => sum + i * m.actual, 0);
    const sumX2 = monthlySpending.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const avgSpending = sumY / n;
    const trend = slope / avgSpending * 100; // Percentage change per month

    // Generate forecast
    const forecast: { month: string; forecast: number; lower: number; upper: number }[] = [];
    const variance = monthlySpending.reduce((sum, m) => {
      const expected = intercept + slope * monthlySpending.indexOf(m);
      return sum + Math.pow(m.actual - expected, 2);
    }, 0) / n;
    const stdDev = Math.sqrt(variance);

    for (let i = 1; i <= forecastMonths; i++) {
      const futureMonth = addMonths(now, i);
      const predictedValue = intercept + slope * (n + i - 1);
      
      forecast.push({
        month: format(futureMonth, "MMM yy"),
        forecast: Math.max(0, predictedValue),
        lower: Math.max(0, predictedValue - stdDev),
        upper: predictedValue + stdDev,
      });
    }

    // Combine historical and forecast data
    const chartData = [
      ...monthlySpending.map(m => ({
        month: m.month,
        actual: m.actual,
        forecast: null as number | null,
        lower: null as number | null,
        upper: null as number | null,
      })),
      // Add last actual point to forecast for smooth transition
      {
        month: monthlySpending[monthlySpending.length - 1]?.month || "",
        actual: monthlySpending[monthlySpending.length - 1]?.actual || 0,
        forecast: monthlySpending[monthlySpending.length - 1]?.actual || 0,
        lower: monthlySpending[monthlySpending.length - 1]?.actual || 0,
        upper: monthlySpending[monthlySpending.length - 1]?.actual || 0,
      },
      ...forecast.map(f => ({
        month: f.month,
        actual: null as number | null,
        forecast: f.forecast,
        lower: f.lower,
        upper: f.upper,
      })),
    ];

    // Generate insights
    const insights: { type: "warning" | "success" | "info"; message: string }[] = [];
    
    if (trend > 5) {
      insights.push({
        type: "warning",
        message: `Spending is trending up by ${trend.toFixed(1)}% monthly. Consider reviewing expenses.`,
      });
    } else if (trend < -5) {
      insights.push({
        type: "success",
        message: `Great job! Spending is trending down by ${Math.abs(trend).toFixed(1)}% monthly.`,
      });
    }

    if (totalBudgeted > 0 && avgSpending > totalBudgeted) {
      insights.push({
        type: "warning",
        message: `Average spending (${formatCurrency(avgSpending)}) exceeds budget (${formatCurrency(totalBudgeted)}).`,
      });
    }

    const nextMonthForecast = forecast[0]?.forecast || 0;
    if (nextMonthForecast > avgSpending * 1.2) {
      insights.push({
        type: "warning",
        message: `Next month's forecast (${formatCurrency(nextMonthForecast)}) is 20%+ above average.`,
      });
    }

    return { chartData, avgSpending, trend, forecast, insights };
  }, [transactions, totalBudgeted]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass rounded-lg p-3 shadow-lg border border-border">
          <p className="text-sm font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.value === null) return null;
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {formatCurrency(entry.value)}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-hover">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Avg Monthly</span>
                <Target className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xl font-bold text-foreground">{formatCurrency(forecastData.avgSpending)}</p>
              <p className="text-xs text-muted-foreground mt-1">Last 6 months</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-hover">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Trend</span>
                {forecastData.trend >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-destructive" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-success" />
                )}
              </div>
              <p className={`text-xl font-bold ${forecastData.trend >= 0 ? "text-destructive" : "text-success"}`}>
                {forecastData.trend >= 0 ? "+" : ""}{forecastData.trend.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Per month</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-hover">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Next Month</span>
                <Lightbulb className="w-4 h-4 text-warning" />
              </div>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(forecastData.forecast[0]?.forecast || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Forecasted</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Forecast Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Spending Forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData.chartData}>
                <defs>
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(174, 72%, 46%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(174, 72%, 46%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                <XAxis dataKey="month" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                
                {totalBudgeted > 0 && (
                  <ReferenceLine 
                    y={totalBudgeted} 
                    stroke="hsl(38, 92%, 50%)" 
                    strokeDasharray="5 5" 
                    label={{ value: "Budget", position: "right", fill: "hsl(38, 92%, 50%)", fontSize: 10 }}
                  />
                )}
                
                <Area
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
                  stroke="hsl(174, 72%, 46%)"
                  fill="url(#actualGradient)"
                  strokeWidth={2}
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="upper"
                  name="Upper Bound"
                  stroke="hsl(262, 83%, 58%)"
                  fill="transparent"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast"
                  stroke="hsl(262, 83%, 58%)"
                  fill="url(#forecastGradient)"
                  strokeWidth={2}
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  name="Lower Bound"
                  stroke="hsl(262, 83%, 58%)"
                  fill="transparent"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Insights */}
      {forecastData.insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-warning" />
                Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {forecastData.insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      insight.type === "warning" 
                        ? "bg-warning/10 border border-warning/20" 
                        : insight.type === "success"
                        ? "bg-success/10 border border-success/20"
                        : "bg-primary/10 border border-primary/20"
                    }`}
                  >
                    {insight.type === "warning" ? (
                      <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    ) : insight.type === "success" ? (
                      <TrendingDown className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    ) : (
                      <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm text-foreground">{insight.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
