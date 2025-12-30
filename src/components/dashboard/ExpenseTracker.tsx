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
import { useFinancialSummary, useTransactions } from "@/hooks/useTransactions";
import { EmptyState } from "@/components/ui/empty-state";
import { AddTransactionDialog } from "@/components/forms/AddTransactionDialog";
import { useState } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export function ExpenseTracker() {
  const { income: totalIncome, expenses: totalExpenses, balance, savingsRate } = useFinancialSummary();
  const { data: transactions, isLoading } = useTransactions();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate monthly data for the last 6 months
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    const monthTransactions = transactions?.filter(t => {
      const tDate = new Date(t.transaction_date);
      return tDate >= monthStart && tDate <= monthEnd;
    }) || [];

    const income = monthTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = monthTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      month: format(date, "MMM"),
      income,
      expenses,
    };
  });

  const currentMonth = monthlyData[monthlyData.length - 1];
  const lastMonth = monthlyData[monthlyData.length - 2];
  const expenseChange = lastMonth.expenses > 0 
    ? ((currentMonth.expenses - lastMonth.expenses) / lastMonth.expenses * 100).toFixed(1)
    : 0;
  const isExpenseUp = currentMonth.expenses > lastMonth.expenses;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maxValue = Math.max(...monthlyData.map(d => Math.max(d.income, d.expenses)), 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Expense Tracker</h1>
            <p className="text-sm text-muted-foreground">Track and analyze your spending patterns</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>
        
        <EmptyState
          icon={Wallet}
          title="No transactions yet"
          description="Start tracking your finances by adding your first transaction."
          action={
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Transaction
            </Button>
          }
        />
        
        <AddTransactionDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      </div>
    );
  }

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
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
              <p className="text-3xl font-bold text-success">{formatCurrency(totalIncome)}</p>
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
              <p className="text-3xl font-bold text-foreground">{formatCurrency(totalExpenses)}</p>
              <p className={`text-xs mt-1 ${isExpenseUp ? 'text-destructive' : 'text-success'}`}>
                {lastMonth.expenses > 0 ? (
                  <>
                    {isExpenseUp ? '↑' : '↓'} {Math.abs(Number(expenseChange))}% from last month
                  </>
                ) : (
                  'First month of tracking'
                )}
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
              <p className={`text-3xl font-bold ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(balance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {savingsRate > 0 ? `${savingsRate}% savings rate` : 'No savings this month'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Chart */}
      {monthlyData.some(d => d.income > 0 || d.expenses > 0) && (
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
                        className="w-full bg-gradient-to-t from-success/80 to-success rounded-t-md min-h-[2px]"
                      />
                    </div>
                    {/* Expenses bar */}
                    <div className="flex-1 flex flex-col justify-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(data.expenses / maxValue) * 100}%` }}
                        transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                        className="w-full bg-gradient-to-t from-destructive/80 to-destructive rounded-t-md min-h-[2px]"
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
      )}

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingCategoriesCard />
        <RecentTransactionsCard />
      </div>

      <AddTransactionDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  );
}
