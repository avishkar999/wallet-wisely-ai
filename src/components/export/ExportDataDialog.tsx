import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileSpreadsheet,
  Calendar,
  Filter,
  CheckCircle2,
  Layers,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  FileText,
  Sparkles,
} from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useFirestoreBudgets, STANDARD_CATEGORIES } from "@/hooks/useFirestoreBudgets";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import {
  exportTransactionsToCSV,
  exportBudgetReportToCSV,
  exportMultiMonthTrendsToCSV,
  filterTransactionsForExport,
  TransactionExportItem,
  BudgetReportExportData,
  MonthlyTrendItem,
} from "@/utils/exportFinancialData";
import { format, subMonths, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "transactions" | "budgets" | "trends";
}

export function ExportDataDialog({
  open,
  onOpenChange,
  defaultTab = "transactions",
}: ExportDataDialogProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const { data: transactions = [] } = useTransactions();
  const { profile, formatMoney } = useCoinKeeper();

  // Transactions Tab Options
  const [dateRange, setDateRange] = useState<
    "all" | "this_month" | "last_month" | "last_90_days" | "this_year" | "custom"
  >("this_month");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return format(d, "yyyy-MM-dd");
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return format(new Date(), "yyyy-MM-dd");
  });
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [includeSummary, setIncludeSummary] = useState<boolean>(true);

  // Budgets Tab Options
  const now = useMemo(() => new Date(), []);
  const [budgetMonth, setBudgetMonth] = useState<number>(now.getMonth() + 1);
  const [budgetYear, setBudgetYear] = useState<number>(now.getFullYear());
  const { summary: budgetSummary, loading: budgetLoading } = useFirestoreBudgets(
    budgetMonth,
    budgetYear
  );

  // Keep active tab in sync when opened with defaultTab
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
    onOpenChange(isOpen);
  };

  // Extract all categories present in transactions
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    STANDARD_CATEGORIES.forEach((c) => set.add(c.key));
    transactions.forEach((t) => {
      if (t.category) set.add(t.category.toLowerCase().trim());
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Compute filtered transactions for preview & export
  const filteredTransactions = useMemo(() => {
    return filterTransactionsForExport(transactions as TransactionExportItem[], {
      dateRange,
      startDate: customStartDate,
      endDate: customEndDate,
      type: typeFilter,
      category: categoryFilter,
    });
  }, [transactions, dateRange, customStartDate, customEndDate, typeFilter, categoryFilter]);

  // Metrics for filtered transactions
  const txMetrics = useMemo(() => {
    let income = 0;
    let outflow = 0;
    filteredTransactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === "income") {
        income += amt;
      } else {
        outflow += amt;
      }
    });
    return {
      count: filteredTransactions.length,
      income,
      outflow,
      net: income - outflow,
    };
  }, [filteredTransactions]);

  // 6-Month Trend Data for Trends Tab
  const trendData = useMemo<MonthlyTrendItem[]>(() => {
    const results: MonthlyTrendItem[] = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = subMonths(now, i);
      const mKey = format(targetDate, "yyyy-MM");
      const mLabel = format(targetDate, "MMMM yyyy");
      const yr = targetDate.getFullYear();

      let mIncome = 0;
      let mExpense = 0;
      const catSpend: Record<string, number> = {};

      transactions.forEach((tx) => {
        const rawDate = tx.transaction_date || (tx as any).date || "";
        if (rawDate.startsWith(mKey)) {
          const amt = Number(tx.amount) || 0;
          if (tx.type === "income") {
            mIncome += amt;
          } else {
            mExpense += amt;
            const cat = (tx.category || "other").toLowerCase();
            catSpend[cat] = (catSpend[cat] || 0) + amt;
          }
        }
      });

      let topCat = "General";
      let maxSpend = 0;
      Object.entries(catSpend).forEach(([cat, val]) => {
        if (val > maxSpend) {
          maxSpend = val;
          topCat = cat;
        }
      });

      const savings = mIncome - mExpense;
      const rate = mIncome > 0 ? Math.max(0, Math.round((savings / mIncome) * 100)) : 0;

      results.push({
        monthKey: mKey,
        monthLabel: mLabel,
        year: yr,
        income: mIncome,
        expense: mExpense,
        savings,
        savingsRate: rate,
        topCategory: topCat,
      });
    }
    return results;
  }, [transactions, now]);

  // Export handlers
  const handleExportTransactions = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No transactions match the selected filter criteria.");
      return;
    }

    const scopeLabel = `${dateRange.replace("_", " ")} | ${typeFilter} | ${categoryFilter}`;
    const filename = `CoinKeeper_Transactions_${dateRange}_${format(new Date(), "yyyyMMdd")}`;

    exportTransactionsToCSV(filteredTransactions, {
      filename,
      includeSummary,
      currency: profile.currency || "INR",
      filterLabel: scopeLabel,
    });

    toast.success(`Exported ${filteredTransactions.length} transactions to CSV!`);
    onOpenChange(false);
  };

  const handleExportBudgets = () => {
    const monthName = format(new Date(budgetYear, budgetMonth - 1, 1), "MMMM");
    const filename = `CoinKeeper_Budget_Report_${monthName}_${budgetYear}`;

    const reportData: BudgetReportExportData = {
      month: budgetMonth,
      year: budgetYear,
      monthName,
      currency: profile.currency || "INR",
      monthlyIncome: budgetSummary.income,
      totalBudgeted: budgetSummary.totalBudgeted,
      totalExpenses: budgetSummary.expenses,
      netSavings: budgetSummary.netSavings,
      savingsRate: budgetSummary.savingsRate,
      overallPacing: budgetSummary.overallPacing,
      budgetHealth: budgetSummary.budgetHealth,
      categories: budgetSummary.categoryBreakdown.map((cat) => ({
        category: cat.category,
        label: cat.label,
        budgeted: cat.budgeted,
        spent: cat.spent,
        remaining: cat.remaining,
        percentUsed: cat.percentUsed,
        status: cat.status,
        transactionCount: cat.transactionCount,
      })),
    };

    exportBudgetReportToCSV(reportData, { filename });
    toast.success(`Exported ${monthName} ${budgetYear} Budget Report to CSV!`);
    onOpenChange(false);
  };

  const handleExportTrends = () => {
    exportMultiMonthTrendsToCSV(trendData, {
      filename: `CoinKeeper_6Month_Trends_${format(new Date(), "yyyyMM")}`,
      currency: profile.currency || "INR",
    });
    toast.success("Exported 6-Month Financial Trend Retrospective to CSV!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto p-6 bg-card border-border/80">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Download className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg font-bold">Export Financial Data</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Generate clean, RFC-4180 standard CSV files with Excel UTF-8 encoding for spreadsheets,
            tax accounting, and external record keeping.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
          <TabsList className="grid grid-cols-3 w-full bg-secondary/60 p-1">
            <TabsTrigger value="transactions" className="text-xs gap-1.5 font-medium">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="budgets" className="text-xs gap-1.5 font-medium">
              <PieChart className="w-3.5 h-3.5" />
              Budget Reports
            </TabsTrigger>
            <TabsTrigger value="trends" className="text-xs gap-1.5 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              6-Mo Trends
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: TRANSACTIONS CSV */}
          <TabsContent value="transactions" className="space-y-4 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Date Range Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Date Range</Label>
                <Select value={dateRange} onValueChange={(val: any) => setDateRange(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this_month">This Month ({format(now, "MMM yyyy")})</SelectItem>
                    <SelectItem value="last_month">
                      Last Month ({format(subMonths(now, 1), "MMM yyyy")})
                    </SelectItem>
                    <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                    <SelectItem value="this_year">This Year ({now.getFullYear()})</SelectItem>
                    <SelectItem value="all">All Time History</SelectItem>
                    <SelectItem value="custom">Custom Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type Filter */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Transaction Type</Label>
                <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types (Income & Expenses)</SelectItem>
                    <SelectItem value="expense">Outflow / Expenses Only</SelectItem>
                    <SelectItem value="income">Inflow / Income Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Date Inputs if selected */}
            {dateRange === "custom" && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-secondary/30 border border-border/40">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Category Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category Scope</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Include Summary Footer */}
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="summary-check"
                checked={includeSummary}
                onCheckedChange={(c) => setIncludeSummary(Boolean(c))}
              />
              <label
                htmlFor="summary-check"
                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Append Financial Summary Block (Totals, Net Cushion, Averages) at bottom
              </label>
            </div>

            {/* Live Filter Preview Card */}
            <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Live Export Preview
                </span>
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {txMetrics.count} records
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded-lg bg-background/60 border border-border/30">
                  <span className="text-[10px] text-muted-foreground block">Total Inflow</span>
                  <span className="text-xs font-bold text-emerald-500">
                    {formatMoney(txMetrics.income)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-background/60 border border-border/30">
                  <span className="text-[10px] text-muted-foreground block">Total Outflow</span>
                  <span className="text-xs font-bold text-destructive">
                    {formatMoney(txMetrics.outflow)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-background/60 border border-border/30">
                  <span className="text-[10px] text-muted-foreground block">Net Cushion</span>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      txMetrics.net >= 0 ? "text-primary" : "text-destructive"
                    )}
                  >
                    {formatMoney(txMetrics.net)}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground pt-1">
                Columns: Date, Merchant/Payee, Type, Category, Amount ({profile.currency}), Method,
                Tags, UTR, Notes.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleExportTransactions}
              className="w-full bg-primary text-primary-foreground font-semibold gap-2 h-10 shadow-sm"
              disabled={filteredTransactions.length === 0}
            >
              <Download className="w-4 h-4" />
              Download Transactions CSV ({filteredTransactions.length})
            </Button>
          </TabsContent>

          {/* TAB 2: BUDGET REPORTS CSV */}
          <TabsContent value="budgets" className="space-y-4 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Budget Month</Label>
                <Select
                  value={String(budgetMonth)}
                  onValueChange={(val) => setBudgetMonth(Number(val))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => {
                      const m = i + 1;
                      const name = format(new Date(2026, i, 1), "MMMM");
                      return (
                        <SelectItem key={m} value={String(m)}>
                          {name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Year</Label>
                <Select
                  value={String(budgetYear)}
                  onValueChange={(val) => setBudgetYear(Number(val))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Budget Preview Stats */}
            <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/50 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-primary" />
                  {format(new Date(budgetYear, budgetMonth - 1, 1), "MMMM yyyy")} Budget Performance
                </span>
                <Badge
                  variant={budgetSummary.netSavings >= 0 ? "outline" : "destructive"}
                  className="text-[11px]"
                >
                  {budgetSummary.savingsRate}% Savings Rate
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-lg bg-background/60 border border-border/30">
                  <span className="text-[10px] text-muted-foreground block">Income</span>
                  <span className="text-xs font-bold text-emerald-500">
                    {formatMoney(budgetSummary.income)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-background/60 border border-border/30">
                  <span className="text-[10px] text-muted-foreground block">Planned Budget</span>
                  <span className="text-xs font-bold text-foreground">
                    {formatMoney(budgetSummary.totalBudgeted)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-background/60 border border-border/30">
                  <span className="text-[10px] text-muted-foreground block">Actual Outflow</span>
                  <span className="text-xs font-bold text-destructive">
                    {formatMoney(budgetSummary.expenses)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-background/60 border border-border/30">
                  <span className="text-[10px] text-muted-foreground block">Net Cushion</span>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      budgetSummary.netSavings >= 0 ? "text-primary" : "text-destructive"
                    )}
                  >
                    {formatMoney(budgetSummary.netSavings)}
                  </span>
                </div>
              </div>

              {/* Category Rows mini preview */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                <div className="text-[11px] font-semibold text-muted-foreground flex justify-between px-1">
                  <span>Category ({budgetSummary.categoryBreakdown.length})</span>
                  <span>Budget vs Actual</span>
                </div>
                {budgetSummary.categoryBreakdown.map((c) => (
                  <div
                    key={c.category}
                    className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-background/40 hover:bg-background/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium capitalize">{c.label || c.category}</span>
                      {c.percentUsed > 100 && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-destructive/20 text-destructive font-mono">
                          Over
                        </span>
                      )}
                    </div>
                    <div className="text-right font-mono text-[11px]">
                      <span className="text-muted-foreground">{formatMoney(c.budgeted)}</span>
                      <span className="mx-1">→</span>
                      <span
                        className={c.spent > c.budgeted && c.budgeted > 0 ? "text-destructive font-bold" : "text-foreground"}
                      >
                        {formatMoney(c.spent)} ({c.percentUsed}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="button"
              onClick={handleExportBudgets}
              className="w-full bg-primary text-primary-foreground font-semibold gap-2 h-10 shadow-sm"
              disabled={budgetLoading}
            >
              <Download className="w-4 h-4" />
              Download {format(new Date(budgetYear, budgetMonth - 1, 1), "MMMM yyyy")} Budget CSV
            </Button>
          </TabsContent>

          {/* TAB 3: 6-MONTH TRENDS CSV */}
          <TabsContent value="trends" className="space-y-4 pt-3">
            <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/50 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  6-Month Trend Retrospective
                </span>
                <Badge variant="secondary" className="text-[11px] font-mono">
                  {trendData.length} Months
                </Badge>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {trendData.map((t) => (
                  <div
                    key={t.monthKey}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-background/60 border border-border/30"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{t.monthLabel}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Top Outflow: <span className="capitalize">{t.topCategory}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end font-mono text-xs">
                        <span className="text-emerald-500 font-medium">+{formatMoney(t.income, true)}</span>
                        <span className="text-destructive font-medium">-{formatMoney(t.expense, true)}</span>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-semibold",
                          t.savings >= 0 ? "text-primary" : "text-destructive"
                        )}
                      >
                        Net: {formatMoney(t.savings)} ({t.savingsRate}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground">
                Exports Month, Year, Inflow, Outflow, Net Cushion, Savings Rate %, and Top Outflow
                with cumulative and average performance summary rows.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleExportTrends}
              className="w-full bg-primary text-primary-foreground font-semibold gap-2 h-10 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download 6-Month Trends CSV
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
