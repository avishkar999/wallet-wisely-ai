import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Wallet,
  PiggyBank,
  CreditCard,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useDebtSummary } from "@/hooks/useDebts";
import { useInvestmentSummary } from "@/hooks/useInvestments";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export function SummaryReport() {
  const [period, setPeriod] = useState<"1" | "3" | "6" | "12">("3");
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { totalDebt, totalMonthlyPayment, isLoading: debtLoading } = useDebtSummary();
  const { totalInvested, totalCurrentValue, totalGain, isLoading: investmentLoading } = useInvestmentSummary();
  const { data: savingsGoals = [], isLoading: goalsLoading } = useSavingsGoals();

  const isLoading = transactionsLoading || debtLoading || investmentLoading || goalsLoading;

  const periodMonths = parseInt(period);

  // Calculate monthly breakdown
  const monthlyBreakdown = (() => {
    const now = new Date();
    const data: {
      month: string;
      income: number;
      expenses: number;
      savings: number;
      categories: Record<string, number>;
    }[] = [];
    
    for (let i = periodMonths - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthLabel = format(monthStart, "MMM yy");
      
      const monthTransactions = transactions.filter(t => {
        const date = parseISO(t.transaction_date);
        return date >= monthStart && date <= monthEnd;
      });
      
      const income = monthTransactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expenses = monthTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const categories = monthTransactions
        .filter(t => t.type === "expense")
        .reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
          return acc;
        }, {} as Record<string, number>);
      
      data.push({
        month: monthLabel,
        income,
        expenses,
        savings: income - expenses,
        categories
      });
    }
    
    return data;
  })();

  // Aggregate totals
  const totals = {
    income: monthlyBreakdown.reduce((sum, m) => sum + m.income, 0),
    expenses: monthlyBreakdown.reduce((sum, m) => sum + m.expenses, 0),
    savings: monthlyBreakdown.reduce((sum, m) => sum + m.savings, 0),
    avgIncome: monthlyBreakdown.reduce((sum, m) => sum + m.income, 0) / periodMonths,
    avgExpenses: monthlyBreakdown.reduce((sum, m) => sum + m.expenses, 0) / periodMonths,
    avgSavings: monthlyBreakdown.reduce((sum, m) => sum + m.savings, 0) / periodMonths,
  };

  // Category breakdown for pie chart
  const categoryBreakdown = (() => {
    const categories: Record<string, number> = {};
    monthlyBreakdown.forEach(m => {
      Object.entries(m.categories).forEach(([cat, amount]) => {
        categories[cat] = (categories[cat] || 0) + amount;
      });
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      .sort((a, b) => b.value - a.value);
  })();

  // Trend calculations
  const trends = (() => {
    if (monthlyBreakdown.length < 2) return { income: 0, expenses: 0, savings: 0 };
    
    const recent = monthlyBreakdown.slice(-2);
    const [prev, curr] = recent;
    
    return {
      income: prev.income > 0 ? ((curr.income - prev.income) / prev.income) * 100 : 0,
      expenses: prev.expenses > 0 ? ((curr.expenses - prev.expenses) / prev.expenses) * 100 : 0,
      savings: prev.savings !== 0 ? ((curr.savings - prev.savings) / Math.abs(prev.savings)) * 100 : 0,
    };
  })();

  // Savings goals progress
  const goalsProgress = savingsGoals.map(goal => ({
    ...goal,
    progress: goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0
  }));

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))'];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="w-4 h-4" />;
    if (value < 0) return <ArrowDownRight className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = (value: number, isExpense: boolean = false) => {
    if (isExpense) {
      return value > 0 ? "text-destructive" : value < 0 ? "text-success" : "text-muted-foreground";
    }
    return value > 0 ? "text-success" : value < 0 ? "text-destructive" : "text-muted-foreground";
  };

  const handleDownload = () => {
    const report = {
      period: `Last ${periodMonths} months`,
      generatedAt: new Date().toISOString(),
      summary: totals,
      monthlyBreakdown,
      categoryBreakdown,
      investments: { totalInvested, totalCurrentValue, totalGain },
      debts: { totalDebt, totalMonthlyPayment },
      savingsGoals: goalsProgress
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Financial Summary</h3>
            <p className="text-sm text-muted-foreground">Comprehensive overview of your finances</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as "1" | "3" | "6" | "12")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last Month</SelectItem>
              <SelectItem value="3">Last 3 Months</SelectItem>
              <SelectItem value="6">Last 6 Months</SelectItem>
              <SelectItem value="12">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-success" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${getTrendColor(trends.income)}`}>
                {getTrendIcon(trends.income)}
                {Math.abs(trends.income).toFixed(0)}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Total Income</p>
            <p className="text-xl font-semibold text-foreground">{formatCurrency(totals.income)}</p>
            <p className="text-xs text-muted-foreground">Avg: {formatCurrency(totals.avgIncome)}/mo</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-destructive" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${getTrendColor(trends.expenses, true)}`}>
                {getTrendIcon(trends.expenses)}
                {Math.abs(trends.expenses).toFixed(0)}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Total Expenses</p>
            <p className="text-xl font-semibold text-foreground">{formatCurrency(totals.expenses)}</p>
            <p className="text-xs text-muted-foreground">Avg: {formatCurrency(totals.avgExpenses)}/mo</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-primary" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${getTrendColor(trends.savings)}`}>
                {getTrendIcon(trends.savings)}
                {Math.abs(trends.savings).toFixed(0)}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Net Savings</p>
            <p className={`text-xl font-semibold ${totals.savings >= 0 ? "text-success" : "text-destructive"}`}>
              {formatCurrency(totals.savings)}
            </p>
            <p className="text-xs text-muted-foreground">Avg: {formatCurrency(totals.avgSavings)}/mo</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-warning" />
              </div>
              <Badge variant={totalDebt > 0 ? "destructive" : "secondary"} className="text-xs">
                {totalDebt > 0 ? "Active" : "None"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Total Debt</p>
            <p className="text-xl font-semibold text-foreground">{formatCurrency(totalDebt)}</p>
            <p className="text-xs text-muted-foreground">EMI: {formatCurrency(totalMonthlyPayment)}/mo</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Trend */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Income vs Expenses Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Expense Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryBreakdown.slice(0, 6).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investment & Goals Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Investment Performance */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Investment Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-secondary/50 text-center">
                <p className="text-xs text-muted-foreground">Invested</p>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(totalInvested)}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 text-center">
                <p className="text-xs text-muted-foreground">Current Value</p>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(totalCurrentValue)}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 text-center">
                <p className="text-xs text-muted-foreground">Total Returns</p>
                <p className={`text-lg font-semibold ${totalGain >= 0 ? "text-success" : "text-destructive"}`}>
                  {totalGain >= 0 ? "+" : ""}{formatCurrency(totalGain)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Savings Goals Progress */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PiggyBank className="w-4 h-4" />
              Savings Goals Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {goalsProgress.length > 0 ? (
              <div className="space-y-3">
                {goalsProgress.slice(0, 4).map(goal => (
                  <div key={goal.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{goal.name}</span>
                      <span className="text-muted-foreground">{goal.progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, goal.progress)}%` }}
                        className={`h-full rounded-full ${goal.progress >= 100 ? "bg-success" : "bg-primary"}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No savings goals set yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
