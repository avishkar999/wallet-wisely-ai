import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  UploadCloud,
  Download,
  Sparkles,
  PieChart,
  Target,
  CreditCard,
  PiggyBank,
  Scan,
  Repeat,
  Sliders,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Flame,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { useFinancialSummary, useTransactions } from "@/hooks/useTransactions";
import { useInvestments } from "@/hooks/useInvestments";
import { useFirestoreBudgets } from "@/hooks/useFirestoreBudgets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MainDashboardLayoutProps {
  onNavigateTab?: (tab: string) => void;
}

export function MainDashboardLayout({ onNavigateTab }: MainDashboardLayoutProps) {
  const {
    profile,
    formatMoney,
    openQuickAdd,
    openBankImport,
    openExportModal,
    moneyPulse,
    setShowOnboardingModal,
    setShowDashboardCustomizer,
  } = useCoinKeeper();

  const { income, expenses, balance, transactionCount, isLoading } = useFinancialSummary();
  const { data: transactions = [] } = useTransactions();
  const { data: investments = [] } = useInvestments();

  const now = useMemo(() => new Date(), []);
  const currentMonthNum = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const { summary: budgetSummary } = useFirestoreBudgets(currentMonthNum, currentYear);

  // Time-of-day greeting
  const greeting = useMemo(() => {
    const hour = now.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, [now]);

  // Total portfolio value
  const totalInvested = useMemo(() => {
    return investments.reduce(
      (sum, inv) => sum + Number(inv.current_value || inv.invested_amount || 0),
      0
    );
  }, [investments]);

  // Savings rate calculation
  const savingsRate = useMemo(() => {
    if (income <= 0) return 0;
    const rate = Math.round(((income - expenses) / income) * 100);
    return Math.max(0, rate);
  }, [income, expenses]);

  // Budget progress percentage
  const budgetProgress = useMemo(() => {
    const targetBudget = budgetSummary.totalBudgeted > 0 
      ? budgetSummary.totalBudgeted 
      : (profile.defaultMonthlyBudget || 45000);
    return Math.min(100, Math.round((expenses / targetBudget) * 100));
  }, [expenses, budgetSummary.totalBudgeted, profile.defaultMonthlyBudget]);

  // Recent 4 transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        const dateA = a.transaction_date || (a as any).date || "";
        const dateB = b.transaction_date || (b as any).date || "";
        return dateB.localeCompare(dateA);
      })
      .slice(0, 4);
  }, [transactions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-6xl mx-auto"
    >
      {/* =========================================================================
          1. WELCOME SECTION (Utilizing existing 'card-hero' CSS utility class)
          ========================================================================= */}
      <section className="card-hero p-6 sm:p-8 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 w-80 h-80 rounded-full bg-primary/10 blur-3xl opacity-70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/4 w-72 h-72 rounded-full bg-accent/10 blur-3xl opacity-50"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Welcome Text & Identity */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-primary font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {greeting}, {profile.persona === "student" ? "Student" : "Avishkar"}
              </span>
              <span className="text-muted-foreground/60 text-xs">·</span>
              <Badge variant="secondary" className="text-[11px] capitalize font-medium bg-secondary/60">
                {profile.persona} Persona
              </Badge>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {format(now, "EEEE, MMMM d, yyyy")}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Welcome to <span className="gradient-text font-serif italic font-normal">CoinKeeper OS</span>
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
              Real-time wealth intelligence and spending governance. Track cashflow pacing,
              monitor category ceilings, and keep your financial pulse in balance.
            </p>

            {/* Micro Pacing Callout */}
            <div className="pt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/50 border border-border/40">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold text-foreground">
                  {moneyPulse.title.replace("Pulse: ", "")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/50 border border-border/40">
                <Clock className="w-3.5 h-3.5 text-accent" />
                <span>
                  {moneyPulse.daysRemainingInMonth} days left in {format(now, "MMMM")}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header CTA Action Buttons */}
          <div className="flex sm:flex-col gap-2 shrink-0">
            <Button
              type="button"
              onClick={() => openQuickAdd("expense")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" /> Add Transaction
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowOnboardingModal(true)}
                className="text-xs h-8 gap-1.5 bg-background/40 border-border/60 hover:bg-background/80 flex-1"
                title="Change Persona or Budget Profile"
              >
                <Sliders className="w-3.5 h-3.5 text-primary" /> Setup
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openExportModal("transactions")}
                className="text-xs h-8 gap-1.5 bg-background/40 border-border/60 hover:bg-background/80 flex-1"
                title="Export Transaction and Budget Reports to CSV"
              >
                <Download className="w-3.5 h-3.5 text-primary" /> Export
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. SUMMARY VIEW OF CURRENT FINANCES (Cards with .card-elevated & .glass)
          ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Financial Overview & Balance
            </h2>
            <p className="text-xs text-muted-foreground">
              Current liquid cushion, monthly velocity, and net wealth posture.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTab?.("monthly")}
            className="text-xs text-primary hover:text-primary/80 gap-1 h-8"
          >
            Detailed Ledger <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Big Balance & Inflow/Outflow Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Main Net Balance Card (Primary) */}
          <div className="card-elevated p-5 md:col-span-2 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground font-mono">
                  Available Net Balance
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                {profile.currency}
              </Badge>
            </div>

            <div className="my-4">
              <h3 className="text-3xl sm:text-5xl font-extrabold font-mono tracking-tight text-foreground">
                {isLoading ? "…" : formatMoney(balance)}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  Net monthly surplus of{" "}
                  <strong className="text-emerald-500">{formatMoney(Math.max(0, balance))}</strong>
                </span>
              </p>
            </div>

            {/* Monthly Budget Progress bar inside balance card */}
            <div className="space-y-1.5 pt-3 border-t border-border/30">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Monthly Budget Cap</span>
                <span className="font-semibold text-foreground font-mono">
                  {budgetProgress}% ({formatMoney(expenses)} of{" "}
                  {formatMoney(
                    budgetSummary.totalBudgeted > 0
                      ? budgetSummary.totalBudgeted
                      : profile.defaultMonthlyBudget || 45000
                  )}
                  )
                </span>
              </div>
              <Progress
                value={budgetProgress}
                className={cn(
                  "h-2 bg-secondary",
                  budgetProgress > 90
                    ? "[&>div]:bg-destructive"
                    : budgetProgress > 75
                    ? "[&>div]:bg-warning"
                    : "[&>div]:bg-primary"
                )}
              />
            </div>
          </div>

          {/* Monthly Inflow (Income) Card */}
          <div className="card-elevated p-5 flex flex-col justify-between glass-hover">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Monthly Inflow
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <span className="text-2xl font-bold font-mono text-emerald-500 block">
                {isLoading ? "…" : formatMoney(income)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Earned this billing cycle
              </span>
            </div>
            <div className="pt-2 border-t border-border/20 text-[11px] text-muted-foreground flex justify-between">
              <span>Savings Rate:</span>
              <span className="font-semibold text-foreground font-mono">{savingsRate}%</span>
            </div>
          </div>

          {/* Monthly Outflow (Expenses) Card */}
          <div className="card-elevated p-5 flex flex-col justify-between glass-hover">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Monthly Outflow
              </span>
              <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <span className="text-2xl font-bold font-mono text-destructive block">
                {isLoading ? "…" : formatMoney(expenses)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {transactionCount} logged transactions
              </span>
            </div>
            <div className="pt-2 border-t border-border/20 text-[11px] text-muted-foreground flex justify-between">
              <span>Daily Burn Rate:</span>
              <span className="font-semibold text-foreground font-mono">
                {formatMoney(moneyPulse.burnRatePerDay)}/day
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. QUICK-ACTION CARDS (Modern high-touch grid with icons & dialog hooks)
          ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Quick Actions
            </h2>
            <p className="text-xs text-muted-foreground">
              Rapid transaction logging, statement imports, OCR receipt scanning, and exports.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action 1: Add Expense / Scan Receipt */}
          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openQuickAdd("expense")}
            className="card-elevated p-4 flex flex-col items-center text-center gap-2.5 glass-hover cursor-pointer border-primary/20 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block group-hover:text-primary transition-colors">
                Add Expense
              </span>
              <span className="text-[10px] text-muted-foreground">Manual or OCR</span>
            </div>
          </motion.button>

          {/* Action 2: Add Income */}
          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openQuickAdd("income")}
            className="card-elevated p-4 flex flex-col items-center text-center gap-2.5 glass-hover cursor-pointer border-success/20 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-success/15 text-success flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block group-hover:text-success transition-colors">
                Log Inflow
              </span>
              <span className="text-[10px] text-muted-foreground">Salary / Stash</span>
            </div>
          </motion.button>

          {/* Action 3: Scan UPI Receipt */}
          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openQuickAdd("expense")}
            className="card-elevated p-4 flex flex-col items-center text-center gap-2.5 glass-hover cursor-pointer border-accent/20 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-accent/15 text-accent flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block group-hover:text-accent transition-colors">
                Scan Receipt
              </span>
              <span className="text-[10px] text-muted-foreground">GPay / PhonePe</span>
            </div>
          </motion.button>

          {/* Action 4: Import Bank Statement */}
          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openBankImport}
            className="card-elevated p-4 flex flex-col items-center text-center gap-2.5 glass-hover cursor-pointer border-border/40 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-secondary/80 text-foreground flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm">
              <UploadCloud className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block group-hover:text-primary transition-colors">
                Import Bank
              </span>
              <span className="text-[10px] text-muted-foreground">CSV or Excel</span>
            </div>
          </motion.button>

          {/* Action 5: Export CSV Data */}
          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openExportModal("transactions")}
            className="card-elevated p-4 flex flex-col items-center text-center gap-2.5 glass-hover cursor-pointer border-border/40 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-secondary/80 text-foreground flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm">
              <Download className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block group-hover:text-emerald-500 transition-colors">
                Export CSV
              </span>
              <span className="text-[10px] text-muted-foreground">Reports & Ledger</span>
            </div>
          </motion.button>

          {/* Action 6: AI Wealth Copilot */}
          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigateTab?.("advisor")}
            className="card-elevated p-4 flex flex-col items-center text-center gap-2.5 glass-hover cursor-pointer border-primary/30 group bg-primary/5"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-primary text-primary-foreground flex items-center justify-center transition-transform group-hover:scale-110 shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block group-hover:text-primary transition-colors">
                AI Copilot
              </span>
              <span className="text-[10px] text-muted-foreground">Real-time Stream</span>
            </div>
          </motion.button>
        </div>
      </section>

      {/* =========================================================================
          4. SECONDARY INTEGRATED ACTIVITY & DISCOVERY MODULE
          ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Transactions Snapshot */}
        <div className="lg:col-span-2 card-elevated p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/30 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Recent Transactions</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab?.("history")}
              className="text-xs text-muted-foreground hover:text-foreground h-7 gap-1"
            >
              View All ({transactions.length}) <ArrowRight className="w-3 h-3" />
            </Button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
              <Receipt className="w-8 h-8 mx-auto opacity-30 text-primary" />
              <p>No transactions logged yet.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openQuickAdd("expense")}
                className="text-xs h-7"
              >
                Log your first expense
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((tx) => {
                const isInc = tx.type === "income";
                const amt = Number(tx.amount) || 0;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                          isInc ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {isInc ? "+" : "-"}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground line-clamp-1">
                          {tx.name || (tx as any).description || "Transaction"}
                        </p>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {tx.category || "General"} · {tx.payment_method || "UPI"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={cn(
                          "font-mono font-bold block",
                          isInc ? "text-emerald-500" : "text-foreground"
                        )}
                      >
                        {isInc ? "+" : "-"}
                        {formatMoney(amt)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {tx.transaction_date ? format(new Date(tx.transaction_date), "MMM d") : "Today"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Wealth & Governance Highlights */}
        <div className="card-elevated p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold text-foreground">Governance Pillars</h3>
              </div>
              <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                Pacing
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div
                onClick={() => onNavigateTab?.("budget")}
                className="p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-foreground block">Category Budgets</span>
                  <span className="text-[10px] text-muted-foreground">
                    {budgetSummary.categoryBreakdown.filter((c) => c.budgeted > 0).length} active limits
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>

              <div
                onClick={() => onNavigateTab?.("subscriptions")}
                className="p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-foreground block">Recurring & Bills</span>
                  <span className="text-[10px] text-muted-foreground">Auto-scan upcoming dues</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>

              <div
                onClick={() => onNavigateTab?.("analytics")}
                className="p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-foreground block">6-Month Retrospective</span>
                  <span className="text-[10px] text-muted-foreground">Income vs expense trends</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs">
            <span className="font-semibold text-primary block">Pro Financial Rule</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Keep fixed essentials below 50% of take-home pay and save at least 20% into diversified SIPs.
            </p>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
