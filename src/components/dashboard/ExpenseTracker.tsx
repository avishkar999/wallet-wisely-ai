import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Wallet, 
  Plus, 
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Calendar
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { SpendingCategoriesCard } from "./SpendingCategoriesCard";
import { RecentTransactionsCard } from "./RecentTransactionsCard";

const monthlyData = [
  { month: "Jul", income: 85000, expenses: 62000 },
  { month: "Aug", income: 85000, expenses: 58000 },
  { month: "Sep", income: 92000, expenses: 71000 },
  { month: "Oct", income: 85000, expenses: 54000 },
  { month: "Nov", income: 85000, expenses: 67000 },
  { month: "Dec", income: 85000, expenses: 64900 },
];

export function ExpenseTracker() {
  const currentMonth = monthlyData[monthlyData.length - 1];
  const lastMonth = monthlyData[monthlyData.length - 2];
  const expenseChange = ((currentMonth.expenses - lastMonth.expenses) / lastMonth.expenses * 100).toFixed(1);
  const isExpenseUp = currentMonth.expenses > lastMonth.expenses;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maxValue = Math.max(...monthlyData.map(d => Math.max(d.income, d.expenses)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expense Tracker</h1>
          <p className="text-sm text-muted-foreground">Track and analyze your spending patterns</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search transactions..." 
              className="pl-9 w-64 bg-secondary border-0"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-success" />
                  <span className="text-sm text-muted-foreground">Total Income</span>
                </div>
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold text-success">{formatCurrency(currentMonth.income)}</p>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-destructive" />
                  <span className="text-sm text-muted-foreground">Total Expenses</span>
                </div>
                {isExpenseUp ? (
                  <TrendingUp className="w-4 h-4 text-destructive" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-success" />
                )}
              </div>
              <p className="text-3xl font-bold text-foreground">{formatCurrency(currentMonth.expenses)}</p>
              <p className={`text-xs mt-1 ${isExpenseUp ? 'text-destructive' : 'text-success'}`}>
                {isExpenseUp ? '↑' : '↓'} {Math.abs(Number(expenseChange))}% from last month
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="glow">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Net Savings</span>
              </div>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(currentMonth.income - currentMonth.expenses)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((currentMonth.income - currentMonth.expenses) / currentMonth.income * 100)}% savings rate
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Chart */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            6-Month Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-4">
            {monthlyData.map((data, index) => (
              <motion.div
                key={data.month}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="flex-1 flex flex-col items-center gap-2"
                style={{ transformOrigin: 'bottom' }}
              >
                <div className="w-full flex gap-1 h-48">
                  {/* Income bar */}
                  <div className="flex-1 flex flex-col justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(data.income / maxValue) * 100}%` }}
                      transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                      className="w-full bg-gradient-to-t from-success/80 to-success rounded-t-md"
                    />
                  </div>
                  {/* Expenses bar */}
                  <div className="flex-1 flex flex-col justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(data.expenses / maxValue) * 100}%` }}
                      transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                      className="w-full bg-gradient-to-t from-destructive/80 to-destructive rounded-t-md"
                    />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{data.month}</span>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-success" />
              <span className="text-xs text-muted-foreground">Income</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-destructive" />
              <span className="text-xs text-muted-foreground">Expenses</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingCategoriesCard />
        <RecentTransactionsCard />
      </div>
    </div>
  );
}
