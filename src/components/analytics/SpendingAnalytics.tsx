import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTransactions } from "@/hooks/useTransactions";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, eachMonthOfInterval } from "date-fns";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, BarChart3, PieChart, LineChart as LucideLineChart, Layers, ArrowUpRight, ArrowDownRight, Target, Lightbulb } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
  LineChart as RechartsLineChart,
} from "recharts";
import { SpendingForecast } from "./SpendingForecast";
import { BudgetVsActualChart } from "./BudgetVsActualChart";
import { SpendingTrendsLineChart } from "./SpendingTrendsLineChart";

const categoryLabels: Record<string, string> = {
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

const COLORS = [
  "hsl(174, 72%, 46%)",
  "hsl(262, 83%, 58%)",
  "hsl(38, 92%, 50%)",
  "hsl(142, 76%, 36%)",
  "hsl(0, 72%, 51%)",
  "hsl(200, 72%, 50%)",
  "hsl(280, 72%, 50%)",
  "hsl(320, 72%, 50%)",
  "hsl(60, 72%, 50%)",
  "hsl(100, 72%, 40%)",
];

export function SpendingAnalytics() {
  const { data: transactions = [], isLoading } = useTransactions();
  const [timeRange, setTimeRange] = useState<string>("6");
  const [chartType, setChartType] = useState<"line" | "composed" | "area" | "bar">("line");

  const monthsToShow = parseInt(timeRange);

  // Process data for charts
  const { monthlyData, categoryData, trendData, stats } = useMemo(() => {
    const now = new Date();
    const startDate = startOfMonth(subMonths(now, monthsToShow - 1));
    const endDate = endOfMonth(now);
    
    // Generate all months in range
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    
    // Initialize monthly totals
    const monthlyTotals: Record<string, { income: number; expense: number; savings: number }> = {};
    months.forEach(month => {
      const key = format(month, "yyyy-MM");
      monthlyTotals[key] = { income: 0, expense: 0, savings: 0 };
    });

    // Category totals for the entire period
    const categoryTotals: Record<string, number> = {};

    // Process transactions
    transactions.forEach(t => {
      const date = parseISO(t.transaction_date);
      const monthKey = format(date, "yyyy-MM");
      
      if (monthlyTotals[monthKey]) {
        const amount = Number(t.amount);
        if (t.type === "income") {
          monthlyTotals[monthKey].income += amount;
        } else {
          monthlyTotals[monthKey].expense += amount;
          categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amount;
        }
      }
    });

    // Calculate savings for each month
    Object.keys(monthlyTotals).forEach(key => {
      monthlyTotals[key].savings = monthlyTotals[key].income - monthlyTotals[key].expense;
    });

    // Convert to array for charts
    const monthlyDataArray = Object.entries(monthlyTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: format(parseISO(month + "-01"), "MMM yyyy"),
        shortMonth: format(parseISO(month + "-01"), "MMM"),
        income: data.income,
        expense: data.expense,
        savings: data.savings,
      }));

    // Category data for pie chart
    const categoryDataArray = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .map(([category, amount], index) => ({
        name: categoryLabels[category] || category,
        value: amount,
        color: COLORS[index % COLORS.length],
      }));

    // Calculate trends
    const currentMonthKey = format(now, "yyyy-MM");
    const lastMonthKey = format(subMonths(now, 1), "yyyy-MM");
    
    const currentExpense = monthlyTotals[currentMonthKey]?.expense || 0;
    const lastExpense = monthlyTotals[lastMonthKey]?.expense || 0;
    const expenseChange = lastExpense > 0 ? ((currentExpense - lastExpense) / lastExpense) * 100 : 0;

    const currentIncome = monthlyTotals[currentMonthKey]?.income || 0;
    const lastIncome = monthlyTotals[lastMonthKey]?.income || 0;
    const incomeChange = lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0;

    const totalExpense = Object.values(monthlyTotals).reduce((sum, m) => sum + m.expense, 0);
    const totalIncome = Object.values(monthlyTotals).reduce((sum, m) => sum + m.income, 0);
    const avgMonthlyExpense = totalExpense / monthsToShow;
    const avgMonthlyIncome = totalIncome / monthsToShow;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    return {
      monthlyData: monthlyDataArray,
      categoryData: categoryDataArray,
      trendData: {
        expenseChange,
        incomeChange,
      },
      stats: {
        totalExpense,
        totalIncome,
        avgMonthlyExpense,
        avgMonthlyIncome,
        savingsRate,
        currentExpense,
        currentIncome,
      },
    };
  }, [transactions, monthsToShow]);

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
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Spending Analytics</h2>
        <p className="text-muted-foreground">Track your financial trends over time</p>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Forecast
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Budget
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          {/* Controls */}
          <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1 bg-secondary rounded-lg p-1">
            <Button
              variant={chartType === "line" ? "default" : "ghost"}
              size="sm"
              onClick={() => setChartType("line")}
              title="Line Chart"
            >
              <LucideLineChart className="w-4 h-4" />
            </Button>
            <Button
              variant={chartType === "composed" ? "default" : "ghost"}
              size="sm"
              onClick={() => setChartType("composed")}
              title="Composed Chart"
            >
              <Layers className="w-4 h-4" />
            </Button>
            <Button
              variant={chartType === "area" ? "default" : "ghost"}
              size="sm"
              onClick={() => setChartType("area")}
              title="Area Chart"
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            <Button
              variant={chartType === "bar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setChartType("bar")}
              title="Bar Chart"
            >
              <PieChart className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-hover">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Current Month</span>
                {trendData.expenseChange <= 0 ? (
                  <span className="flex items-center text-xs text-success">
                    <ArrowDownRight className="w-3 h-3 mr-1" />
                    {Math.abs(trendData.expenseChange).toFixed(1)}%
                  </span>
                ) : (
                  <span className="flex items-center text-xs text-destructive">
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    {trendData.expenseChange.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-xl font-bold text-foreground">{formatCurrency(stats.currentExpense)}</p>
              <p className="text-xs text-muted-foreground mt-1">Spending</p>
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
                <span className="text-sm text-muted-foreground">Current Income</span>
                {trendData.incomeChange >= 0 ? (
                  <span className="flex items-center text-xs text-success">
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    {trendData.incomeChange.toFixed(1)}%
                  </span>
                ) : (
                  <span className="flex items-center text-xs text-destructive">
                    <ArrowDownRight className="w-3 h-3 mr-1" />
                    {Math.abs(trendData.incomeChange).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-xl font-bold text-success">{formatCurrency(stats.currentIncome)}</p>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
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
                <span className="text-sm text-muted-foreground">Avg. Monthly</span>
                <TrendingDown className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold text-foreground">{formatCurrency(stats.avgMonthlyExpense)}</p>
              <p className="text-xs text-muted-foreground mt-1">Expense</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-hover">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Savings Rate</span>
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <p className={`text-xl font-bold ${stats.savingsRate >= 0 ? "text-success" : "text-destructive"}`}>
                {stats.savingsRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Overall</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expense Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Income vs Expense Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "line" ? (
                  <RechartsLineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" vertical={false} opacity={0.6} />
                    <XAxis dataKey="shortMonth" stroke="hsl(215, 20%, 55%)" fontSize={12} tickLine={false} />
                    <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      name="Spending"
                      stroke="hsl(168, 60%, 55%)"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "hsl(228, 30%, 7%)", stroke: "hsl(168, 60%, 55%)", strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: "hsl(168, 60%, 55%)", stroke: "hsl(228, 33%, 4%)", strokeWidth: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="income"
                      name="Income"
                      stroke="hsl(250, 55%, 65%)"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: "hsl(228, 30%, 7%)", stroke: "hsl(250, 55%, 65%)", strokeWidth: 1.5 }}
                      activeDot={{ r: 5, fill: "hsl(250, 55%, 65%)", stroke: "hsl(228, 33%, 4%)", strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="savings"
                      name="Savings"
                      stroke="hsl(142, 76%, 45%)"
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      dot={false}
                    />
                  </RechartsLineChart>
                ) : chartType === "composed" ? (
                  <ComposedChart data={monthlyData}>
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                    <XAxis dataKey="shortMonth" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                    <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="savings" name="Savings" stroke="hsl(174, 72%, 46%)" strokeWidth={2} dot={{ fill: "hsl(174, 72%, 46%)", strokeWidth: 2 }} />
                  </ComposedChart>
                ) : chartType === "area" ? (
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="incomeArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                    <XAxis dataKey="shortMonth" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                    <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="income" name="Income" stroke="hsl(142, 76%, 36%)" fill="url(#incomeArea)" strokeWidth={2} />
                    <Area type="monotone" dataKey="expense" name="Expense" stroke="hsl(0, 72%, 51%)" fill="url(#expenseArea)" strokeWidth={2} />
                  </AreaChart>
                ) : (
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                    <XAxis dataKey="shortMonth" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                    <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="glass h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="w-5 h-5 text-accent" />
                Category Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        background: "hsl(222, 47%, 9%)",
                        border: "1px solid hsl(222, 30%, 18%)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend
                      layout="vertical"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No expense data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Monthly Comparison Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Month</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Income</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Expense</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Savings</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.slice().reverse().map((month, index) => {
                    const rate = month.income > 0 ? (month.savings / month.income) * 100 : 0;
                    return (
                      <tr key={index} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-foreground">{month.month}</td>
                        <td className="py-3 px-4 text-sm text-right text-success">{formatCurrency(month.income)}</td>
                        <td className="py-3 px-4 text-sm text-right text-destructive">{formatCurrency(month.expense)}</td>
                        <td className={`py-3 px-4 text-sm text-right font-medium ${month.savings >= 0 ? "text-primary" : "text-destructive"}`}>
                          {formatCurrency(month.savings)}
                        </td>
                        <td className={`py-3 px-4 text-sm text-right ${rate >= 0 ? "text-success" : "text-destructive"}`}>
                          {rate.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
        </TabsContent>

        <TabsContent value="forecast">
          <SpendingForecast />
        </TabsContent>

        <TabsContent value="budget">
          <BudgetVsActualChart />
        </TabsContent>
      </Tabs>
    </div>
  );
}
