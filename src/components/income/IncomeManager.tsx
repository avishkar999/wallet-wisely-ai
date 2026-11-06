import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Filter,
  Calendar,
  Download,
  Trash2,
  Pencil,
  Eye,
  Repeat,
  Wallet,
  TrendingUp,
  TrendingDown,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Building2,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTransactions, useDeleteTransaction } from "@/hooks/useTransactions";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import {
  PREDEFINED_INCOME_CATEGORIES,
  INCOME_PAYMENT_METHODS,
  getIncomeCategoryConfig,
  formatIncomePaymentMethod,
} from "@/types/income";
import { Tables } from "@/integrations/supabase/types";
import { IncomeDialog } from "./IncomeDialog";
import { IncomeOverviewCharts } from "./IncomeOverviewCharts";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isAfter, isBefore, subDays, startOfMonth, endOfMonth } from "date-fns";
import { exportToCSV } from "@/utils/exportTransactions";

type Transaction = Tables<"transactions">;

export function IncomeManager() {
  const { data: allTransactions = [], isLoading } = useTransactions();
  const { formatMoney, profile } = useCoinKeeper();
  const { toast } = useToast();
  const deleteTransaction = useDeleteTransaction();

  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<"current_month" | "last_30" | "last_90" | "this_year" | "all">("current_month");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");

  // Modals state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [incomeToEdit, setIncomeToEdit] = useState<Transaction | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<Transaction | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Income transactions exclusively
  const incomeTransactions = useMemo(() => {
    return allTransactions.filter((t) => t.type === "income");
  }, [allTransactions]);

  // Expenses for comparative metrics
  const expenseTransactions = useMemo(() => {
    return allTransactions.filter((t) => t.type === "expense");
  }, [allTransactions]);

  // Date filtering helper
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = format(now, "yyyy-MM");

  // Filtered income transactions
  const filteredIncomeTransactions = useMemo(() => {
    return incomeTransactions.filter((tx) => {
      // 1. Search Query
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const nameMatch = (tx.name || "").toLowerCase().includes(query);
        const descMatch = (tx.description || "").toLowerCase().includes(query);
        const catMatch = (tx.category || "").toLowerCase().includes(query);
        if (!nameMatch && !descMatch && !catMatch) return false;
      }

      // 2. Category Filter
      if (categoryFilter !== "all") {
        const config = getIncomeCategoryConfig(tx.category);
        if (config.id !== categoryFilter && config.name.toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Payment Method Filter
      if (paymentMethodFilter !== "all") {
        const pm = (tx.payment_method || "").toLowerCase();
        if (paymentMethodFilter === "bank_transfer" && (pm === "neft" || pm === "bank_transfer")) {
          // match
        } else if (pm !== paymentMethodFilter) {
          return false;
        }
      }

      // 4. Period Filter
      const txDateStr = tx.transaction_date || (tx as any).created_at || "";
      if (periodFilter === "current_month") {
        if (!txDateStr.startsWith(currentMonthKey)) return false;
      } else if (periodFilter === "last_30") {
        const threshold = subDays(now, 30);
        if (new Date(txDateStr) < threshold) return false;
      } else if (periodFilter === "last_90") {
        const threshold = subDays(now, 90);
        if (new Date(txDateStr) < threshold) return false;
      } else if (periodFilter === "this_year") {
        const yearStr = String(now.getFullYear());
        if (!txDateStr.startsWith(yearStr)) return false;
      }

      return true;
    });
  }, [incomeTransactions, searchQuery, categoryFilter, paymentMethodFilter, periodFilter, currentMonthKey, now]);

  // Sorted list
  const sortedIncomeTransactions = useMemo(() => {
    return [...filteredIncomeTransactions].sort((a, b) => {
      const dateA = a.transaction_date || "";
      const dateB = b.transaction_date || "";
      const amtA = Number(a.amount) || 0;
      const amtB = Number(b.amount) || 0;

      switch (sortBy) {
        case "date_desc":
          return dateB.localeCompare(dateA);
        case "date_asc":
          return dateA.localeCompare(dateB);
        case "amount_desc":
          return amtB - amtA;
        case "amount_asc":
          return amtA - amtB;
        default:
          return 0;
      }
    });
  }, [filteredIncomeTransactions, sortBy]);

  // Scoped metrics for the active period (Income, Expenses, Net Savings, Savings Rate)
  const financialMetrics = useMemo(() => {
    // Determine active period expenses
    const periodExpenses = expenseTransactions.filter((tx) => {
      const txDateStr = tx.transaction_date || (tx as any).created_at || "";
      if (periodFilter === "current_month") {
        return txDateStr.startsWith(currentMonthKey);
      } else if (periodFilter === "last_30") {
        return new Date(txDateStr) >= subDays(now, 30);
      } else if (periodFilter === "last_90") {
        return new Date(txDateStr) >= subDays(now, 90);
      } else if (periodFilter === "this_year") {
        return txDateStr.startsWith(String(now.getFullYear()));
      }
      return true;
    });

    const totalIncome = filteredIncomeTransactions.reduce(
      (sum, t) => sum + (Number(t.amount) || 0),
      0
    );

    const totalExpenses = periodExpenses.reduce(
      (sum, t) => sum + (Number(t.amount) || 0),
      0
    );

    const netSavings = totalIncome - totalExpenses;
    // Robust calculation safe against divide-by-zero
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

    // Recurring vs one-time breakdown
    const recurringIncome = filteredIncomeTransactions
      .filter((t) => {
        const tags = (t as any).tags || [];
        return tags.includes("Recurring") || (t as any).is_recurring === true;
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Top income category
    const categoryTotals: Record<string, number> = {};
    filteredIncomeTransactions.forEach((t) => {
      const cfg = getIncomeCategoryConfig(t.category);
      categoryTotals[cfg.name] = (categoryTotals[cfg.name] || 0) + (Number(t.amount) || 0);
    });

    let topSource = "N/A";
    let topSourceAmount = 0;
    Object.entries(categoryTotals).forEach(([catName, amt]) => {
      if (amt > topSourceAmount) {
        topSource = catName;
        topSourceAmount = amt;
      }
    });

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      recurringIncome,
      topSource,
      topSourceAmount,
      transactionCount: filteredIncomeTransactions.length,
    };
  }, [filteredIncomeTransactions, expenseTransactions, periodFilter, currentMonthKey, now]);

  // Handlers
  const handleAddNew = () => {
    setIncomeToEdit(null);
    setDialogOpen(true);
  };

  const handleEdit = (tx: Transaction) => {
    setIncomeToEdit(tx);
    setDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTransaction.mutateAsync(itemToDelete.id);
      toast({
        title: "Income Entry Deleted",
        description: `Successfully removed ${itemToDelete.name}.`,
      });
      setItemToDelete(null);
    } catch (err: any) {
      toast({
        title: "Failed to Delete",
        description: err.message || "An error occurred while deleting income transaction.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredIncomeTransactions.length === 0) {
      toast({
        title: "No Records to Export",
        description: "There are no income entries matching your current filters.",
        variant: "destructive",
      });
      return;
    }
    exportToCSV(filteredIncomeTransactions, `income_ledger_${periodFilter}_${format(now, "yyyyMMdd")}`);
    toast({
      title: "Export Successful",
      description: `Exported ${filteredIncomeTransactions.length} income entries to CSV.`,
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shadow-sm">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              Income Management
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Track, categorise, and analyse your salaries, freelance gigs, business revenue, and investment inflows.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs h-9 gap-1.5 border-border/60 hover:bg-secondary/60"
            title="Export filtered income to CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            onClick={handleAddNew}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add Income</span>
          </Button>
        </div>
      </div>

      {/* 2. Key Financial Metrics Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Income
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-500">
              {formatMoney(financialMetrics.totalIncome)}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {financialMetrics.transactionCount} deposit{financialMetrics.transactionCount === 1 ? "" : "s"} received
            </p>
          </div>
          <div className="pt-2 border-t border-border/30 text-[11px] text-muted-foreground flex justify-between">
            <span>Recurring:</span>
            <span className="font-semibold text-foreground font-mono">
              {formatMoney(financialMetrics.recurringIncome)}
            </span>
          </div>
        </Card>

        {/* Total Expenses */}
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Expenses
            </span>
            <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">
              {formatMoney(financialMetrics.totalExpenses)}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Living & direct outflows in this period
            </p>
          </div>
          <div className="pt-2 border-t border-border/30 text-[11px] text-muted-foreground flex justify-between">
            <span>Period:</span>
            <span className="font-semibold text-foreground capitalize">
              {periodFilter.replace("_", " ")}
            </span>
          </div>
        </Card>

        {/* Net Savings */}
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net Savings
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                financialMetrics.netSavings >= 0
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {financialMetrics.netSavings >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="my-2">
            <h3
              className={`text-2xl sm:text-3xl font-extrabold font-mono ${
                financialMetrics.netSavings >= 0 ? "text-emerald-500" : "text-destructive"
              }`}
            >
              {financialMetrics.netSavings >= 0 ? "+" : ""}
              {formatMoney(financialMetrics.netSavings)}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Income minus total expenses
            </p>
          </div>
          <div className="pt-2 border-t border-border/30 text-[11px] text-muted-foreground flex justify-between">
            <span>Top Source:</span>
            <span className="font-semibold text-foreground truncate max-w-[130px]" title={financialMetrics.topSource}>
              {financialMetrics.topSource}
            </span>
          </div>
        </Card>

        {/* Savings Rate */}
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Savings Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold font-mono text-sky-500">
              {financialMetrics.savingsRate}%
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              (Net Savings ÷ Total Income) × 100
            </p>
          </div>
          <div className="pt-2 border-t border-border/30 text-[11px] text-muted-foreground flex justify-between">
            <span>Condition:</span>
            <span className="font-semibold text-foreground">
              {financialMetrics.savingsRate >= 30
                ? "✨ Excellent"
                : financialMetrics.savingsRate >= 15
                ? "👍 Good Pace"
                : "⚠️ Tight Margin"}
            </span>
          </div>
        </Card>
      </section>

      {/* 3. Visual Overview Charts Section */}
      <IncomeOverviewCharts transactions={allTransactions} />

      {/* 4. Transactions Filter & Control Bar */}
      <Card className="border border-border/70 bg-card/60 backdrop-blur-md p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search by title, description, or category…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-9 h-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="text-xs h-9 w-[160px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all" className="text-xs font-semibold">
                  All Categories
                </SelectItem>
                {PREDEFINED_INCOME_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Payment Method Filter */}
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="text-xs h-9 w-[140px]">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-semibold">
                  All Methods
                </SelectItem>
                {INCOME_PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Period Filter */}
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as any)}>
              <SelectTrigger className="text-xs h-9 w-[150px]">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month" className="text-xs">
                  This Month ({format(now, "MMM yyyy")})
                </SelectItem>
                <SelectItem value="last_30" className="text-xs">
                  Last 30 Days
                </SelectItem>
                <SelectItem value="last_90" className="text-xs">
                  Last 90 Days
                </SelectItem>
                <SelectItem value="this_year" className="text-xs">
                  This Year ({now.getFullYear()})
                </SelectItem>
                <SelectItem value="all" className="text-xs">
                  All Time History
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Filter */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="text-xs h-9 w-[140px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc" className="text-xs">
                  Date: Newest First
                </SelectItem>
                <SelectItem value="date_asc" className="text-xs">
                  Date: Oldest First
                </SelectItem>
                <SelectItem value="amount_desc" className="text-xs">
                  Amount: High to Low
                </SelectItem>
                <SelectItem value="amount_asc" className="text-xs">
                  Amount: Low to High
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* 5. Income Ledger / Transactions Table */}
      <Card className="border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/40 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-500" />
            <CardTitle className="text-sm sm:text-base font-bold text-foreground">
              Income Transactions ({sortedIncomeTransactions.length})
            </CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">
            Total Scoped: <strong className="text-emerald-500 font-mono">{formatMoney(financialMetrics.totalIncome)}</strong>
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {sortedIncomeTransactions.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground space-y-3 px-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <ArrowDownLeft className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">No Income Transactions Found</p>
                <p className="max-w-sm mx-auto">
                  {searchQuery || categoryFilter !== "all" || paymentMethodFilter !== "all"
                    ? "Try adjusting your search query, category, or payment filters."
                    : "No income transactions recorded yet. Click 'Add Income' above to record your first inflow."}
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAddNew}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 mt-2"
              >
                <Plus className="w-3.5 h-3.5" /> Record Income Now
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {sortedIncomeTransactions.map((tx) => {
                const categoryConfig = getIncomeCategoryConfig(tx.category);
                const CategoryIcon = categoryConfig.icon;
                const amt = Number(tx.amount) || 0;
                const tags = (tx as any).tags || [];
                const isRecurring = tags.includes("Recurring") || (tx as any).is_recurring === true;

                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3.5 sm:p-4 hover:bg-secondary/40 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    {/* Left: Icon & Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl ${categoryConfig.bgClass} ${categoryConfig.textClass} border ${categoryConfig.borderClass} flex items-center justify-center shrink-0 shadow-sm`}
                      >
                        <CategoryIcon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground text-sm truncate">
                            {tx.name || "Untitled Income"}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0 px-2 font-medium ${categoryConfig.bgClass} ${categoryConfig.textClass} ${categoryConfig.borderClass}`}
                          >
                            {categoryConfig.name}
                          </Badge>
                          {isRecurring && (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 px-2 font-mono bg-purple-500/10 text-purple-500 border-purple-500/30 flex items-center gap-1"
                            >
                              <Repeat className="w-2.5 h-2.5" />
                              <span>Recurring</span>
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground text-[11px] flex-wrap">
                          <span>
                            {tx.transaction_date
                              ? format(new Date(tx.transaction_date), "dd MMM yyyy")
                              : "No date"}
                          </span>
                          <span>•</span>
                          <span className="font-medium text-foreground">
                            {formatIncomePaymentMethod(tx.payment_method)}
                          </span>
                          {tx.description && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px] text-muted-foreground/80 italic">
                                "{tx.description}"
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-sm sm:text-base font-extrabold font-mono text-emerald-500 block">
                          +{formatMoney(amt)}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          Verified Inflow
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedDetails(tx)}
                          className="w-7 h-7 text-muted-foreground hover:text-foreground"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(tx)}
                          className="w-7 h-7 text-muted-foreground hover:text-primary"
                          title="Edit Income"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setItemToDelete(tx)}
                          className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete Income"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Add/Edit Income Modal */}
      <IncomeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        incomeToEdit={incomeToEdit}
      />

      {/* 7. View Details Dialog */}
      {selectedDetails && (
        <Dialog open={Boolean(selectedDetails)} onOpenChange={(open) => !open && setSelectedDetails(null)}>
          <DialogContent className="max-w-md bg-card/95 backdrop-blur-2xl border-border/80 p-6">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500 uppercase tracking-wider">
                <ArrowDownLeft className="w-4 h-4" />
                <span>Transaction Details</span>
              </div>
              <DialogTitle className="text-xl font-bold text-foreground">
                {selectedDetails.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                ID: {selectedDetails.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 pt-2 text-xs">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <span className="text-xs text-muted-foreground uppercase tracking-wider block font-medium">
                  Inflow Amount
                </span>
                <span className="text-3xl font-extrabold font-mono text-emerald-500 mt-1 block">
                  +{formatMoney(Number(selectedDetails.amount) || 0)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/40">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Category</span>
                  <span className="font-semibold text-foreground capitalize mt-0.5 block">
                    {getIncomeCategoryConfig(selectedDetails.category).name}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Payment Method</span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {formatIncomePaymentMethod(selectedDetails.payment_method)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Date Received</span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {selectedDetails.transaction_date
                      ? format(new Date(selectedDetails.transaction_date), "dd MMMM yyyy")
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Recurring Status</span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {((selectedDetails as any).tags || []).includes("Recurring") || (selectedDetails as any).is_recurring
                      ? "Yes, Recurring"
                      : "One-off Inflow"}
                  </span>
                </div>
              </div>

              {selectedDetails.description && (
                <div className="space-y-1 p-3 rounded-xl bg-secondary/20 border border-border/30">
                  <span className="text-[11px] text-muted-foreground font-semibold block">Notes / Description:</span>
                  <p className="text-foreground leading-relaxed">{selectedDetails.description}</p>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedDetails(null)}
                className="text-xs w-full"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 8. Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(itemToDelete)} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">
              Delete Income Record?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete <strong>{itemToDelete?.name}</strong> (+{formatMoney(Number(itemToDelete?.amount) || 0)})?
              This will update your total income, net savings, and savings rate. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold"
            >
              {isDeleting ? "Deleting…" : "Confirm Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
