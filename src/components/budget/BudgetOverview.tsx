import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Plus,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  UtensilsCrossed,
  Home,
  Car,
  Receipt,
  ShoppingBag,
  Gamepad2,
  Heart,
  Smartphone,
  GraduationCap,
  Plane,
  MoreHorizontal,
  Cloud,
  RefreshCw,
  Search,
  Filter,
  Info,
  DollarSign,
  SlidersHorizontal,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFirestoreBudgets, CategoryBudgetStatus, STANDARD_CATEGORIES } from "@/hooks/useFirestoreBudgets";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Map category icons
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  housing: Home,
  food: UtensilsCrossed,
  transport: Car,
  bills: Receipt,
  shopping: ShoppingBag,
  entertainment: Gamepad2,
  health: Heart,
  recharges: Smartphone,
  education: GraduationCap,
  travel: Plane,
  other: MoreHorizontal,
};

const CATEGORY_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  housing: { bar: "bg-amber-500", text: "text-amber-500", bg: "bg-amber-500/10" },
  food: { bar: "bg-orange-500", text: "text-orange-500", bg: "bg-orange-500/10" },
  transport: { bar: "bg-blue-500", text: "text-blue-500", bg: "bg-blue-500/10" },
  bills: { bar: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10" },
  shopping: { bar: "bg-pink-500", text: "text-pink-500", bg: "bg-pink-500/10" },
  entertainment: { bar: "bg-purple-500", text: "text-purple-500", bg: "bg-purple-500/10" },
  health: { bar: "bg-rose-500", text: "text-rose-500", bg: "bg-rose-500/10" },
  recharges: { bar: "bg-cyan-500", text: "text-cyan-500", bg: "bg-cyan-500/10" },
  education: { bar: "bg-indigo-500", text: "text-indigo-500", bg: "bg-indigo-500/10" },
  travel: { bar: "bg-emerald-500", text: "text-emerald-500", bg: "bg-emerald-500/10" },
  other: { bar: "bg-slate-500", text: "text-slate-500", bg: "bg-slate-500/10" },
};

interface AIInsightData {
  category: string;
  recommendedPercentMin: number;
  recommendedPercentMax: number;
  recommendedAmountMin: number;
  recommendedAmountMax: number;
  inflationNote: string;
  tips: string[];
  summary?: string;
  source?: string;
  groundedWithSearch?: boolean;
}

export function BudgetOverview() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const {
    loading,
    saving,
    summary,
    saveCategoryBudget,
    removeCategoryBudget,
    applyTemplate,
    isAuthenticated,
  } = useFirestoreBudgets(selectedMonth, selectedYear);

  const { profile } = useCoinKeeper();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "overbudget" | "budgeted" | "unbudgeted">("all");

  // Editing dialog state
  const [editingCategory, setEditingCategory] = useState<CategoryBudgetStatus | null>(null);
  const [editAmountInput, setEditAmountInput] = useState<string>("");

  // AI Benchmark Modal state
  const [benchmarkCategory, setBenchmarkCategory] = useState<string | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState<AIInsightData | null>(null);

  // Month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleResetToCurrent = () => {
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
  };

  const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
  });

  // Currency Formatter
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: profile.currency || "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Days in month calculation for pacing
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const isCurrentMonth = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();
  const currentDay = isCurrentMonth ? now.getDate() : daysInMonth;
  const daysRemaining = isCurrentMonth ? Math.max(0, daysInMonth - currentDay) : 0;
  const dailyRemainingBudget =
    summary.budgetRemaining > 0 && daysRemaining > 0
      ? Math.round(summary.budgetRemaining / daysRemaining)
      : 0;

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return summary.categoryBreakdown.filter((item) => {
      const matchesSearch =
        item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filterMode === "overbudget") return item.budgeted > 0 && item.percentUsed > 100;
      if (filterMode === "budgeted") return item.budgeted > 0;
      if (filterMode === "unbudgeted") return item.budgeted === 0 && item.spent > 0;
      return true;
    });
  }, [summary.categoryBreakdown, searchTerm, filterMode]);

  // Open Edit Dialog
  const openEditDialog = (item: CategoryBudgetStatus) => {
    setEditingCategory(item);
    setEditAmountInput(item.budgeted > 0 ? String(item.budgeted) : "");
  };

  const handleSaveEdit = async () => {
    if (!editingCategory) return;
    const amount = Number(editAmountInput);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid positive budget amount.");
      return;
    }
    await saveCategoryBudget(editingCategory.category, amount);
    setEditingCategory(null);
  };

  // Fetch AI Benchmark with Search Grounding via server endpoint
  const handleOpenBenchmark = async (categoryKey: string) => {
    setBenchmarkCategory(categoryKey);
    setBenchmarkLoading(true);
    setBenchmarkData(null);

    try {
      const response = await fetch("/api/budget/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: categoryKey,
          monthlyIncome: summary.income > 0 ? summary.income : 60000,
          currency: profile.currency || "INR",
          location: "India / Metropolitan",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch benchmark analysis");
      }

      const data = await response.json();
      setBenchmarkData(data);
    } catch (err: any) {
      console.warn("AI Benchmark fetch error, using fallback:", err);
      // Fallback data
      setBenchmarkData({
        category: categoryKey,
        recommendedPercentMin: 10,
        recommendedPercentMax: 18,
        recommendedAmountMin: Math.round(((summary.income || 50000) * 10) / 100),
        recommendedAmountMax: Math.round(((summary.income || 50000) * 18) / 100),
        inflationNote: "Standard household budget guideline suggests keeping this between 10% and 18% of take-home pay.",
        tips: ["Set weekly expense alerts", "Audit highest single receipts", "Transfer budget cushion to savings"],
        source: "Standard Financial Benchmark",
        groundedWithSearch: false,
      });
    } finally {
      setBenchmarkLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/60 border border-border/60 p-4 sm:p-5 rounded-2xl backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Target className="w-6 h-6 text-primary" />
              Budget Overview
            </h1>
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] font-mono gap-1 border",
                isAuthenticated
                  ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                  : "border-amber-500/30 text-amber-500 bg-amber-500/10"
              )}
            >
              <Cloud className="w-3 h-3" />
              {isAuthenticated ? "Firestore Synced" : "Guest Sandbox"}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time Firestore tracking of monthly cashflow and category spending limits.
          </p>
        </div>

        {/* Month Selector & Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Stepper */}
          <div className="flex items-center bg-secondary/50 rounded-xl p-1 border border-border/50">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handlePrevMonth}
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <button
              onClick={handleResetToCurrent}
              className="px-3 text-xs sm:text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
              title="Click to jump to current month"
            >
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>
                {monthName} {selectedYear}
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleNextMonth}
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick Preset Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium">
                <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                Templates
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">Quick Frameworks</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => applyTemplate("50-30-20", summary.income)}
                className="text-xs cursor-pointer"
              >
                <div>
                  <p className="font-semibold">50/30/20 Standard</p>
                  <p className="text-[10px] text-muted-foreground">Needs 50%, Wants 30%, Savings 20%</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => applyTemplate("frugal", summary.income)}
                className="text-xs cursor-pointer"
              >
                <div>
                  <p className="font-semibold">Aggressive Frugal</p>
                  <p className="text-[10px] text-muted-foreground">Minimal shopping & dining caps</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => applyTemplate("balanced", summary.income)}
                className="text-xs cursor-pointer"
              >
                <div>
                  <p className="font-semibold">Balanced Living</p>
                  <p className="text-[10px] text-muted-foreground">Balanced caps for metro lifestyles</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 2. Monthly Income vs Expenses Top Hero Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income Card */}
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Monthly Inflow</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-emerald-500 mt-2">
              {formatMoney(summary.income)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>Total income logged for {monthName}</span>
            </p>
          </CardContent>
        </Card>

        {/* Expenses Card */}
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/5 rounded-full blur-xl pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Monthly Outflow</span>
              <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-destructive mt-2">
              {formatMoney(summary.expenses)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {summary.income > 0
                ? `${Math.round((summary.expenses / summary.income) * 100)}% of income spent`
                : "Total expenses logged"}
            </p>
          </CardContent>
        </Card>

        {/* Net Remaining / Savings Cushion */}
        <Card
          className={cn(
            "border-border/60 bg-card/80 backdrop-blur-sm relative overflow-hidden",
            summary.netSavings < 0 && "border-destructive/40 bg-destructive/5"
          )}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Net Cashflow</span>
              <div
                className={cn(
                  "p-2 rounded-xl",
                  summary.netSavings >= 0
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <p
              className={cn(
                "text-2xl font-bold tracking-tight mt-2",
                summary.netSavings >= 0 ? "text-foreground" : "text-destructive"
              )}
            >
              {summary.netSavings >= 0 ? "+" : ""}
              {formatMoney(summary.netSavings)}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] font-mono px-1.5 py-0 h-4",
                  summary.savingsRate >= 20
                    ? "text-emerald-500 bg-emerald-500/10"
                    : summary.savingsRate > 0
                    ? "text-primary bg-primary/10"
                    : "text-destructive bg-destructive/10"
                )}
              >
                {summary.savingsRate}% Savings Rate
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Total Budgeted vs Spent */}
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Budget Utilization</span>
              <div className="p-2 rounded-xl bg-secondary text-foreground">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {formatMoney(summary.totalBudgetSpent)}
              </p>
              <span className="text-xs font-medium text-muted-foreground">
                / {formatMoney(summary.totalBudgeted)}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="h-2 w-full bg-secondary/80 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    summary.overallUtilization > 100
                      ? "bg-destructive"
                      : summary.overallUtilization >= 85
                      ? "bg-amber-500"
                      : "bg-primary"
                  )}
                  style={{ width: `${Math.min(100, summary.overallUtilization)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {summary.overallUtilization}% allocated used ·{" "}
                {summary.budgetRemaining >= 0
                  ? `${formatMoney(summary.budgetRemaining)} cushion`
                  : `${formatMoney(Math.abs(summary.budgetRemaining))} over limit`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Pacing & Budget Health Alert Strip */}
      {isCurrentMonth && summary.totalBudgeted > 0 && (
        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <div>
              <span className="font-semibold text-foreground">
                Day {currentDay} of {daysInMonth} ({daysRemaining} days left)
              </span>
              <span className="text-muted-foreground ml-2">
                Expected burn rate: {Math.round((currentDay / daysInMonth) * 100)}% · Actual spend:{" "}
                {summary.overallUtilization}%
              </span>
            </div>
          </div>
          {dailyRemainingBudget > 0 && (
            <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
              <span>Safe daily allowance:</span>
              <span className="text-foreground font-semibold bg-background/80 px-2 py-0.5 rounded-md border border-border/50">
                {formatMoney(dailyRemainingBudget)} / day
              </span>
            </div>
          )}
        </div>
      )}

      {/* 4. Over-Budget Warnings */}
      {summary.overBudgetCategories.length > 0 && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 space-y-2">
          <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>{summary.overBudgetCategories.length} Categories Exceeded Budget Limit</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {summary.overBudgetCategories.map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between p-2.5 rounded-xl bg-background/70 border border-destructive/20 text-xs"
              >
                <span className="font-medium truncate">{cat.label}</span>
                <span className="text-destructive font-bold font-mono">
                  +{formatMoney(Math.abs(cat.remaining))} over ({cat.percentUsed}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Main Category Spending Progress Bars */}
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Category Spending & Limits
              </CardTitle>
              <CardDescription className="text-xs">
                Visual progress bars comparing actual transactions against monthly Firestore budget allocations.
              </CardDescription>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-8 text-xs w-40 sm:w-48 bg-secondary/40"
                />
              </div>

              <select
                aria-label="Filter Categories"
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as any)}
                className="h-8 text-xs rounded-md bg-secondary/40 border border-border/50 px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All ({summary.categoryBreakdown.length})</option>
                <option value="budgeted">Budgeted Only</option>
                <option value="overbudget">Over Budget Only</option>
                <option value="unbudgeted">Unbudgeted Activity</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <Layers className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-sm">No spending categories match the current filter.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setFilterMode("all");
                }}
                className="text-xs"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredCategories.map((item, idx) => {
                const Icon = CATEGORY_ICONS[item.category] || MoreHorizontal;
                const colors = CATEGORY_COLORS[item.category] || {
                  bar: "bg-primary",
                  text: "text-primary",
                  bg: "bg-primary/10",
                };

                const isOver = item.budgeted > 0 && item.percentUsed > 100;
                const isWarning = item.budgeted > 0 && item.percentUsed >= 85 && item.percentUsed <= 100;
                const isUnbudgeted = item.budgeted === 0;

                return (
                  <motion.div
                    key={item.category}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className={cn(
                      "p-4 rounded-xl border transition-all duration-200 relative group",
                      isOver
                        ? "bg-destructive/5 border-destructive/30 hover:border-destructive/50"
                        : "bg-secondary/20 border-border/50 hover:border-border hover:bg-secondary/30"
                    )}
                  >
                    {/* Top Row: Icon, Label, Quick Action */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2.5 rounded-xl shrink-0", colors.bg, colors.text)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{item.label}</span>
                            {item.transactionCount > 0 && (
                              <span className="text-[10px] text-muted-foreground px-1.5 py-0.2 rounded bg-secondary">
                                {item.transactionCount} {item.transactionCount === 1 ? "txn" : "txns"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {isUnbudgeted ? (
                              <span className="text-amber-500 font-medium">No budget limit set</span>
                            ) : (
                              <span>
                                {formatMoney(item.spent)} of {formatMoney(item.budgeted)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* AI Benchmark Tool Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenBenchmark(item.category)}
                          title="View Live Market Benchmark & Tips"
                          className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </Button>

                        {/* Edit Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(item)}
                          title="Set or Adjust Budget"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          {item.budgeted > 0 ? (
                            <Edit2 className="w-3.5 h-3.5" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-primary" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar & Percentage Pill */}
                    {item.budgeted > 0 ? (
                      <div className="space-y-1.5 mt-2">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span
                            className={cn(
                              "font-semibold",
                              isOver
                                ? "text-destructive"
                                : isWarning
                                ? "text-amber-500"
                                : "text-muted-foreground"
                            )}
                          >
                            {item.percentUsed}% used
                          </span>
                          <span
                            className={cn(
                              "font-semibold",
                              item.remaining >= 0 ? "text-emerald-500" : "text-destructive"
                            )}
                          >
                            {item.remaining >= 0
                              ? `${formatMoney(item.remaining)} left`
                              : `${formatMoney(Math.abs(item.remaining))} over`}{" "}
                          </span>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="h-2.5 w-full bg-secondary/80 rounded-full overflow-hidden relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, item.percentUsed)}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className={cn(
                              "h-full rounded-full transition-all",
                              isOver
                                ? "bg-destructive"
                                : isWarning
                                ? "bg-amber-500"
                                : colors.bar
                            )}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/30">
                        <span className="text-xs text-muted-foreground">
                          Spent: <strong className="text-foreground">{formatMoney(item.spent)}</strong>
                        </span>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => openEditDialog(item)}
                          className="h-6 text-xs text-primary p-0"
                        >
                          + Set limit
                        </Button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Edit Budget Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-primary" />
              Set Budget Limit for {editingCategory?.label}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Changes are immediately synced to your cloud Firestore database for {monthName} {selectedYear}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Monthly Budget Amount ({profile.currency || "INR"})</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  ₹
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 15000"
                  value={editAmountInput}
                  onChange={(e) => setEditAmountInput(e.target.value)}
                  className="pl-8 text-base font-semibold"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground">Quick Presets:</span>
              <div className="flex flex-wrap gap-2">
                {[5000, 10000, 15000, 20000, 30000].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditAmountInput(String(preset))}
                    className="h-7 text-xs font-mono"
                  >
                    {formatMoney(preset)}
                  </Button>
                ))}
              </div>
            </div>

            {editingCategory && editingCategory.spent > 0 && (
              <div className="p-3 rounded-lg bg-secondary/50 text-xs text-muted-foreground flex items-center justify-between">
                <span>Already spent this month:</span>
                <strong className="text-foreground">{formatMoney(editingCategory.spent)}</strong>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between gap-2">
            {editingCategory?.id ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (editingCategory.id) {
                    await removeCategoryBudget(editingCategory.id);
                    setEditingCategory(null);
                  }
                }}
                className="text-xs text-destructive hover:bg-destructive/10"
              >
                Clear Budget
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingCategory(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveEdit}
                disabled={saving}
                className="bg-primary text-primary-foreground font-semibold"
              >
                {saving ? "Saving..." : "Save to Firestore"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. AI Benchmark & Google Search Grounded Modal */}
      <Dialog open={!!benchmarkCategory} onOpenChange={(open) => !open && setBenchmarkCategory(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  AI Spending Benchmark:{" "}
                  <span className="capitalize">{benchmarkCategory}</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Grounded with real-time financial market standards via Gemini 3.8 Flash.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {benchmarkLoading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-7 h-7 text-primary animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground">
                Grounding benchmark data with Google Search for recent inflation & cost of living...
              </p>
            </div>
          ) : benchmarkData ? (
            <div className="space-y-4 py-2">
              {/* Benchmark Percentage Card */}
              <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Recommended Income Allocation:</span>
                  <Badge variant="outline" className="font-mono text-primary border-primary/30">
                    {benchmarkData.recommendedPercentMin}% - {benchmarkData.recommendedPercentMax}%
                  </Badge>
                </div>

                <div className="flex items-baseline justify-between text-xs pt-1">
                  <span className="text-muted-foreground">Suggested Monthly Spend:</span>
                  <span className="text-sm font-bold text-foreground font-mono">
                    {formatMoney(benchmarkData.recommendedAmountMin)} -{" "}
                    {formatMoney(benchmarkData.recommendedAmountMax)}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground pt-1 border-t border-border/40">
                  {benchmarkData.inflationNote}
                </p>
              </div>

              {/* Actionable Tips */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Tactical Savings Tips:
                </span>
                <div className="space-y-1.5">
                  {benchmarkData.tips.map((tip, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-background/80 border border-border/50 text-xs text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-primary font-bold">{idx + 1}.</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source attribution */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                <span className="flex items-center gap-1">
                  <ExternalLink className="w-3 h-3 text-primary" />
                  {benchmarkData.source || "Grounded with Google Search"}
                </span>
                {benchmarkData.groundedWithSearch && (
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                    Search Grounded
                  </Badge>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBenchmarkCategory(null)}
            >
              Close
            </Button>
            {benchmarkCategory && benchmarkData && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const target = benchmarkData.recommendedAmountMax;
                  setEditAmountInput(String(target));
                  setEditingCategory(
                    summary.categoryBreakdown.find((c) => c.category === benchmarkCategory) || null
                  );
                  setBenchmarkCategory(null);
                }}
                className="bg-primary text-primary-foreground text-xs"
              >
                Apply Recommended Limit ({formatMoney(benchmarkData.recommendedAmountMax)})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
