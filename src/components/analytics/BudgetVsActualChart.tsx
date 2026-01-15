import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BarChart3, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";
import { useBudgetSummary } from "@/hooks/useBudgets";
import { format, subMonths, addMonths, startOfMonth } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Progress } from "@/components/ui/progress";

const categoryLabels: Record<string, string> = {
  food: "Food",
  shopping: "Shopping",
  transport: "Transport",
  entertainment: "Entertainment",
  bills: "Bills",
  health: "Health",
  recharges: "Recharges",
  education: "Education",
  travel: "Travel",
  other: "Other",
};

export function BudgetVsActualChart() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { categoryBreakdown, totalBudgeted, totalSpent, remaining, isLoading } = useBudgetSummary(selectedMonth);

  const chartData = useMemo(() => {
    return categoryBreakdown
      .filter(c => c.budgeted > 0 || c.spent > 0)
      .map(c => ({
        category: categoryLabels[c.category] || c.category,
        budgeted: c.budgeted,
        spent: c.spent,
        remaining: c.remaining,
        percentUsed: c.percentUsed,
        overBudget: c.spent > c.budgeted,
      }))
      .sort((a, b) => b.spent - a.spent);
  }, [categoryBreakdown]);

  const overBudgetCategories = chartData.filter(c => c.overBudget);
  const underBudgetCategories = chartData.filter(c => !c.overBudget && c.budgeted > 0);
  const overallPercentUsed = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

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
      const data = payload[0]?.payload;
      return (
        <div className="glass rounded-lg p-3 shadow-lg border border-border">
          <p className="text-sm font-medium text-foreground mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-success">
              Budget: {formatCurrency(data?.budgeted || 0)}
            </p>
            <p className={`text-sm ${data?.overBudget ? "text-destructive" : "text-primary"}`}>
              Spent: {formatCurrency(data?.spent || 0)}
            </p>
            <p className={`text-sm ${data?.remaining >= 0 ? "text-muted-foreground" : "text-destructive"}`}>
              {data?.remaining >= 0 ? "Remaining" : "Over"}: {formatCurrency(Math.abs(data?.remaining || 0))}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const handlePrevMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    const next = addMonths(selectedMonth, 1);
    if (next <= new Date()) {
      setSelectedMonth(next);
    }
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
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Budget vs Actual</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-foreground min-w-[100px] text-center">
            {format(selectedMonth, "MMMM yyyy")}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleNextMonth}
            disabled={addMonths(selectedMonth, 1) > new Date()}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overall Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Overall Budget Usage</p>
                <p className="text-2xl font-bold text-foreground">{overallPercentUsed}%</p>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                remaining >= 0 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
              }`}>
                {remaining >= 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-sm font-medium">{formatCurrency(remaining)} left</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">{formatCurrency(Math.abs(remaining))} over</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Progress 
                value={Math.min(overallPercentUsed, 100)} 
                className={`h-4 ${overallPercentUsed > 100 ? "[&>div]:bg-destructive" : ""}`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Spent: {formatCurrency(totalSpent)}</span>
                <span>Budget: {formatCurrency(totalBudgeted)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Comparison Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Category Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    stroke="hsl(215, 20%, 55%)" 
                    fontSize={12} 
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="category" 
                    stroke="hsl(215, 20%, 55%)" 
                    fontSize={12} 
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="budgeted" name="Budget" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} barSize={16} />
                  <Bar dataKey="spent" name="Spent" radius={[0, 4, 4, 0]} barSize={16}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.overBudget ? "hsl(0, 72%, 51%)" : "hsl(174, 72%, 46%)"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-lg font-medium text-foreground">No budget data</p>
                <p className="text-sm text-muted-foreground">Set up budgets to see comparisons</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Over Budget */}
        {overBudgetCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass border-destructive/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <TrendingUp className="w-4 h-4" />
                  Over Budget ({overBudgetCategories.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overBudgetCategories.map((cat, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                      <div>
                        <p className="text-sm font-medium text-foreground">{cat.category}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(cat.spent)} / {formatCurrency(cat.budgeted)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-destructive">
                        +{formatCurrency(Math.abs(cat.remaining))}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Under Budget */}
        {underBudgetCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass border-success/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-success">
                  <TrendingDown className="w-4 h-4" />
                  Under Budget ({underBudgetCategories.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {underBudgetCategories.slice(0, 5).map((cat, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                      <div>
                        <p className="text-sm font-medium text-foreground">{cat.category}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(cat.spent)} / {formatCurrency(cat.budgeted)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-success">
                        {formatCurrency(cat.remaining)} left
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
