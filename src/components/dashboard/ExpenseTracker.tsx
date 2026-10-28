import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  UploadCloud,
  Lock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { SpendingCategoriesCard } from "./SpendingCategoriesCard";
import { RecentTransactionsCard } from "./RecentTransactionsCard";
import { useFinancialSummary, useTransactions } from "@/hooks/useTransactions";
import { EmptyState } from "@/components/ui/empty-state";
import { FinancialConnectionModal } from "@/components/connection/FinancialConnectionModal";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { useState } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export function ExpenseTracker() {
  const { income: totalIncome, expenses: totalExpenses, balance, savingsRate } = useFinancialSummary();
  const { data: transactions, isLoading } = useTransactions();
  const { openBankImport } = useCoinKeeper();
  const [showConnectModal, setShowConnectModal] = useState(false);
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
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const expenses = monthTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      month: format(date, "MMM"),
      income,
      expenses,
    };
  });

  const currentMonth = monthlyData[monthlyData.length - 1];
  const lastMonth = monthlyData[monthlyData.length - 2];
  const expenseChange = lastMonth.expenses > 0 
    ? (((currentMonth.expenses - lastMonth.expenses) / lastMonth.expenses) * 100).toFixed(1)
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
            <h1 className="text-2xl font-bold text-foreground">Automated Expense Governance</h1>
            <p className="text-sm text-muted-foreground">Track and analyze verified spending from your connected bank feeds</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowConnectModal(true)}>
              <Building2 className="w-4 h-4 mr-2" />
              Connect Financial Account
            </Button>
            <Button variant="outline" onClick={openBankImport}>
              <UploadCloud className="w-4 h-4 mr-2" />
              Import Statement
            </Button>
          </div>
        </div>
        
        <EmptyState
          icon={Building2}
          title="No Financial Feeds Connected"
          description="WalletWisely automatically receives, classifies, and tracks your transactions from connected accounts without manual entry."
          action={
            <Button onClick={() => setShowConnectModal(true)}>
              <Building2 className="w-4 h-4 mr-2" />
              Connect Financial Account
            </Button>
          }
        />
        
        <FinancialConnectionModal
          open={showConnectModal}
          onOpenChange={setShowConnectModal}
          onOpenBankStatementImport={openBankImport}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automated Expense Governance</h1>
          <p className="text-sm text-muted-foreground">Track and analyze verified spending patterns from connected accounts</p>
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
          <Button variant="outline" onClick={openBankImport}>
            <UploadCloud className="w-4 h-4 mr-2" />
            Import Statement
          </Button>
          <Button onClick={() => setShowConnectModal(true)}>
            <Building2 className="w-4 h-4 mr-2" />
            Connect Account
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold text-success mt-1">{formatCurrency(totalIncome)}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-success" />
                  <span>Verified inflows</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                <ArrowDownLeft className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-destructive mt-1">{formatCurrency(totalExpenses)}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  {isExpenseUp ? (
                    <TrendingUp className="w-3 h-3 text-destructive" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-success" />
                  )}
                  <span className={isExpenseUp ? "text-destructive" : "text-success"}>
                    {expenseChange}% vs last month
                  </span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Savings</p>
                <p className={`text-2xl font-bold mt-1 ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(balance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {savingsRate}% savings rate
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Daily Average</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(totalExpenses / 30)}
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>30-day run rate</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 6-Month Comparison Chart */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-lg">6-Month Income vs Expense Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-4 pt-4">
            {monthlyData.map((data, index) => (
              <div key={data.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1.5 h-48">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(data.income / maxValue) * 100}%` }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="w-1/2 max-w-8 bg-success/80 rounded-t-sm hover:bg-success transition-colors"
                    title={`Income: ${formatCurrency(data.income)}`}
                  />
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(data.expenses / maxValue) * 100}%` }}
                    transition={{ delay: index * 0.1 + 0.05, duration: 0.5 }}
                    className="w-1/2 max-w-8 bg-destructive/80 rounded-t-sm hover:bg-destructive transition-colors"
                    title={`Expenses: ${formatCurrency(data.expenses)}`}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{data.month}</span>
              </div>
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

      <FinancialConnectionModal
        open={showConnectModal}
        onOpenChange={setShowConnectModal}
        onOpenBankStatementImport={openBankImport}
      />
    </div>
  );
}
