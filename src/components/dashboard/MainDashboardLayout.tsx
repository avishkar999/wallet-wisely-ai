import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  Receipt,
  UploadCloud,
  Download,
  Sparkles,
  Target,
  Sliders,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
  Building2,
  Lock,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { useFinancialSummary, useTransactions } from "@/hooks/useTransactions";
import { useFirestoreBudgets } from "@/hooks/useFirestoreBudgets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  getStoredConsents,
  determineConnectionState,
} from "@/services/financialConnectionService";
import { ConnectionState, ConsentArtifact } from "@/types/connection";
import { FinancialConnectionModal } from "@/components/connection/FinancialConnectionModal";
import { ConnectionManagerDialog } from "@/components/connection/ConnectionManagerDialog";

interface MainDashboardLayoutProps {
  onNavigateTab?: (tab: string) => void;
}

export function MainDashboardLayout({ onNavigateTab }: MainDashboardLayoutProps) {
  const {
    profile,
    formatMoney,
    openBankImport,
    openExportModal,
    moneyPulse,
    setShowOnboardingModal,
  } = useCoinKeeper();

  const { income, expenses, balance, transactionCount, isLoading: isTxLoading } = useFinancialSummary();
  const { data: transactions = [], refetch: refetchTransactions } = useTransactions();

  const [consents, setConsents] = useState<ConsentArtifact[]>([]);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Reload consents
  const refreshConsents = () => {
    setConsents(getStoredConsents());
    refetchTransactions();
  };

  useEffect(() => {
    setConsents(getStoredConsents());
  }, []);

  const connectionState: ConnectionState = useMemo(() => {
    return determineConnectionState(consents, transactions.length, isManualSyncing);
  }, [consents, transactions.length, isManualSyncing]);

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

  // Savings rate calculation strictly from actual synced figures
  const savingsRate = useMemo(() => {
    if (income <= 0) return 0;
    const rate = Math.round(((income - expenses) / income) * 100);
    return Math.max(0, rate);
  }, [income, expenses]);

  // Target Budget configured by user
  const targetBudget = useMemo(() => {
    return budgetSummary.totalBudgeted > 0
      ? budgetSummary.totalBudgeted
      : profile.defaultMonthlyBudget;
  }, [budgetSummary.totalBudgeted, profile.defaultMonthlyBudget]);

  // Budget progress percentage (only valid if targetBudget > 0)
  const budgetProgress = useMemo(() => {
    if (!targetBudget || targetBudget <= 0) return null;
    return Math.min(100, Math.round((expenses / targetBudget) * 100));
  }, [expenses, targetBudget]);

  const remainingBudget = useMemo(() => {
    if (!targetBudget || targetBudget <= 0) return null;
    return targetBudget - expenses;
  }, [expenses, targetBudget]);

  // Filter out internal transfers and reversals from consumption spending
  const eligibleTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const tags: string[] = (t as any).tags || [];
      return !tags.includes("Transfer") && !tags.includes("ExcludedFromBudget");
    });
  }, [transactions]);

  // Recent 4 synced transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        const dateA = a.transaction_date || (a as any).date || "";
        const dateB = b.transaction_date || (b as any).date || "";
        return dateB.localeCompare(dateA);
      })
      .slice(0, 5);
  }, [transactions]);

  const handleSyncAll = () => {
    setIsManualSyncing(true);
    setTimeout(() => {
      setIsManualSyncing(false);
      refreshConsents();
    }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-6xl mx-auto"
    >
      {/* Re-auth Warning Banner if consent is expired */}
      {connectionState === "reauth_required" && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Authorisation Expired:</strong> One or more financial consents require renewal to continue receiving automatic transactions.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowManageModal(true)}
            className="text-xs h-7 border-amber-500/50 hover:bg-amber-500/10 text-amber-500 font-semibold"
          >
            Review Consents
          </Button>
        </div>
      )}

      {/* =========================================================================
          1. WELCOME HERO SECTION (Utilizing existing 'card-hero' CSS utility class)
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
                {greeting}
              </span>
              <span className="text-muted-foreground/60 text-xs">·</span>
              <Badge variant="secondary" className="text-[11px] capitalize font-medium bg-secondary/60">
                {profile.persona} Profile
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-mono",
                  connectionState === "synced"
                    ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/5"
                    : connectionState === "disconnected"
                    ? "border-amber-500/40 text-amber-500"
                    : "border-primary/40 text-primary"
                )}
              >
                {connectionState === "synced" && "Live Feed Synced"}
                {connectionState === "disconnected" && "No Account Connected"}
                {connectionState === "syncing" && "Syncing Feed…"}
                {connectionState === "connected_empty" && "Connected (No Txns)"}
                {connectionState === "reauth_required" && "Re-auth Required"}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Welcome to <span className="gradient-text font-serif italic font-normal">WalletWisely</span>
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
              Automated financial intelligence and expense governance. Connect your bank feed once
              and let WalletWisely classify transactions, track category limits, and compute remaining budget automatically.
            </p>

            {/* Connection Status Indicator */}
            <div className="pt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/50 border border-border/40">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold text-foreground">
                  {consents.length > 0
                    ? `${consents.length} Connected Institution${consents.length > 1 ? "s" : ""}`
                    : "Zero Credentials Stored"}
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

          {/* Header Action Buttons */}
          <div className="flex sm:flex-col gap-2 shrink-0">
            {consents.length === 0 ? (
              <Button
                type="button"
                onClick={() => setShowConnectModal(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 gap-1.5 shadow-md"
              >
                <Building2 className="w-4 h-4" /> Connect Financial Account
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSyncAll}
                disabled={isManualSyncing}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 gap-1.5 shadow-md"
              >
                <RefreshCw className={cn("w-4 h-4", isManualSyncing && "animate-spin")} />
                {isManualSyncing ? "Syncing Feed…" : "Sync Financial Feed"}
              </Button>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowManageModal(true)}
                className="text-xs h-8 gap-1.5 bg-background/40 border-border/60 hover:bg-background/80 flex-1"
                title="Manage Connected Bank Feeds & Consent"
              >
                <Lock className="w-3.5 h-3.5 text-primary" /> Connections
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openExportModal("transactions")}
                className="text-xs h-8 gap-1.5 bg-background/40 border-border/60 hover:bg-background/80 flex-1"
                title="Export Synced Ledger to CSV"
              >
                <Download className="w-3.5 h-3.5 text-primary" /> Export
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. EMPTY STATE WHEN DISCONNECTED (No manual entry; onboarding connection CTA)
          ========================================================================= */}
      {connectionState === "disconnected" && (
        <section className="card-elevated p-8 sm:p-12 text-center rounded-2xl border-dashed border-border/80 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-inner">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-foreground">
              No Financial Account Connected
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              WalletWisely operates on <strong>zero manual transaction entry</strong>. Connect your bank or payment institution
              to automatically receive, normalise, and categorise your spending without entering individual purchases.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <Button
              type="button"
              onClick={() => setShowConnectModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 gap-1.5 shadow-sm"
            >
              <Building2 className="w-4 h-4" /> Connect Financial Account
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={openBankImport}
              className="text-xs h-9 gap-1.5"
            >
              <UploadCloud className="w-4 h-4 text-emerald-500" /> Upload Bank Statement
            </Button>
          </div>

          <div className="pt-4 flex items-center justify-center gap-6 text-[11px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> View-only access
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Never asks for UPI PINs or passwords
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Excludes internal transfers automatically
            </span>
          </div>
        </section>
      )}

      {/* =========================================================================
          3. SYNCING OR CONNECTED_EMPTY STATES
          ========================================================================= */}
      {connectionState === "syncing" && (
        <section className="card-elevated p-8 text-center rounded-2xl space-y-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <h4 className="font-bold text-sm text-foreground">Synchronising Financial Feed…</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Retrieving authorised transactions, normalising merchant descriptions, and separating internal transfers.
          </p>
        </section>
      )}

      {connectionState === "connected_empty" && (
        <section className="card-elevated p-8 text-center rounded-2xl space-y-3">
          <Building2 className="w-10 h-10 text-primary/40 mx-auto" />
          <h4 className="font-bold text-sm text-foreground">Account Connected — No Transactions for This Period</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            WalletWisely cannot yet calculate a meaningful spending summary because no posted transactions were returned for the current period.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={handleSyncAll} className="text-xs h-8">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Feed
            </Button>
            <Button size="sm" variant="outline" onClick={openBankImport} className="text-xs h-8">
              <UploadCloud className="w-3.5 h-3.5 mr-1" /> Import Statement
            </Button>
          </div>
        </section>
      )}

      {/* =========================================================================
          4. SYNCED STATE: REAL FINANCIAL OVERVIEW DERIVED FROM AUTOMATED RECORDS
          ========================================================================= */}
      {connectionState === "synced" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                Financial Overview & Pacing
              </h2>
              <p className="text-xs text-muted-foreground">
                Derived exclusively from authorised synchronised transactions for {format(now, "MMMM yyyy")}.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab?.("history")}
              className="text-xs text-primary hover:text-primary/80 gap-1 h-8"
            >
              Full Ledger ({transactions.length}) <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Financial Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Eligible Monthly Spending */}
            <div className="card-elevated p-5 md:col-span-2 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                  <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground font-mono">
                    Eligible Synced Spending
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-destructive/30 text-destructive">
                  {format(now, "MMMM")}
                </Badge>
              </div>

              <div className="my-4">
                <h3 className="text-3xl sm:text-5xl font-extrabold font-mono tracking-tight text-foreground">
                  {isTxLoading ? "…" : formatMoney(expenses)}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                  <span>
                    Calculated from <strong>{eligibleTransactions.length} eligible</strong> consumer transactions.
                  </span>
                </p>
              </div>

              {/* Remaining Budget vs Configured Budget */}
              <div className="space-y-1.5 pt-3 border-t border-border/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {targetBudget && targetBudget > 0 ? "Remaining Budget" : "Monthly Budget Limit"}
                  </span>
                  <span className="font-semibold text-foreground font-mono">
                    {targetBudget && targetBudget > 0 ? (
                      remainingBudget !== null && remainingBudget >= 0 ? (
                        <span className="text-emerald-500">
                          {formatMoney(remainingBudget)} remaining of {formatMoney(targetBudget)}
                        </span>
                      ) : (
                        <span className="text-destructive">
                          Over budget by {formatMoney(Math.abs(remainingBudget || 0))}
                        </span>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNavigateTab?.("budget")}
                        className="text-primary hover:underline text-xs"
                      >
                        + Set Monthly Budget Cap
                      </button>
                    )}
                  </span>
                </div>
                {budgetProgress !== null && (
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
                )}
              </div>
            </div>

            {/* Income Received */}
            <div className="card-elevated p-5 flex flex-col justify-between glass-hover">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Income Inflow
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div className="my-2">
                <span className="text-2xl font-bold font-mono text-emerald-500 block">
                  {isTxLoading ? "…" : formatMoney(income)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Verified salary / deposits
                </span>
              </div>
              <div className="pt-2 border-t border-border/20 text-[11px] text-muted-foreground flex justify-between">
                <span>Savings Rate:</span>
                <span className="font-semibold text-foreground font-mono">{savingsRate}%</span>
              </div>
            </div>

            {/* Net Surplus / Savings */}
            <div className="card-elevated p-5 flex flex-col justify-between glass-hover">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Net Surplus
                </span>
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="my-2">
                <span
                  className={cn(
                    "text-2xl font-bold font-mono block",
                    balance >= 0 ? "text-foreground" : "text-destructive"
                  )}
                >
                  {isTxLoading ? "…" : formatMoney(balance)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Income minus eligible spending
                </span>
              </div>
              <div className="pt-2 border-t border-border/20 text-[11px] text-muted-foreground flex justify-between">
                <span>Daily Burn:</span>
                <span className="font-semibold text-foreground font-mono">
                  {formatMoney(moneyPulse.burnRatePerDay)}/day
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          5. QUICK ACTIONS (Centered around automated feeds, sync, and governance)
          ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Automated Hub & Governance Actions
            </h2>
            <p className="text-xs text-muted-foreground">
              Manage automated accounts, trigger on-demand sync, configure category rules, or export data.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action 1: Connect Account */}
          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowConnectModal(true)}
            className="card-elevated p-4 flex flex-col items-center text-center gap-2.5 glass-hover cursor-pointer border-primary/20 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block group-hover:text-primary transition-colors">
                Connect Account
              </span>
              <span className="text-[10px] text-muted-foreground">AA Consent Feed</span>
            </div>
          </motion.button>

          {/* Action 2: Sync Financial Feed */}
          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSyncAll}
            disabled={isManualSyncing}
            className="card-elevated p-4 flex flex-col items-center text-center gap-2.5 glass-hover cursor-pointer border-emerald-500/20 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm">
              <RefreshCw className={cn("w-5 h-5", isManualSyncing && "animate-spin")} />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block group-hover:text-emerald-500 transition-colors">
                Sync Now
              </span>
              <span className="text-[10px] text-muted-foreground">Refresh Records</span>
            </div>
          </motion.button>

          {/* Action 3: Statement Ingest */}
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
                Bank Statement
              </span>
              <span className="text-[10px] text-muted-foreground">CSV or Excel</span>
            </div>
          </motion.button>

          {/* Action 4: Set Budget Cap */}
          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigateTab?.("budget")}
            className="card-elevated p-4 flex flex-col items-center text-center gap-2.5 glass-hover cursor-pointer border-accent/20 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-accent/15 text-accent flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block group-hover:text-accent transition-colors">
                Set Budget Cap
              </span>
              <span className="text-[10px] text-muted-foreground">Category Ceilings</span>
            </div>
          </motion.button>

          {/* Action 5: Export CSV */}
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
              <span className="text-[10px] text-muted-foreground">Financial Advisory</span>
            </div>
          </motion.button>
        </div>
      </section>

      {/* =========================================================================
          6. RECENT AUTOMATICALLY RECEIVED TRANSACTIONS & GOVERNANCE PILLARS
          ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Transactions Snapshot */}
        <div className="lg:col-span-2 card-elevated p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/30 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Recent Synchronised Transactions</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab?.("history")}
              className="text-xs text-muted-foreground hover:text-foreground h-7 gap-1"
            >
              View All ({transactions.length}) <ChevronRight className="w-3 h-3" />
            </Button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
              <Receipt className="w-8 h-8 mx-auto opacity-30 text-primary" />
              <p>No transactions received yet.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConnectModal(true)}
                className="text-xs h-7"
              >
                Connect a bank feed
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((tx) => {
                const isInc = tx.type === "income";
                const amt = Number(tx.amount) || 0;
                const isTransfer = ((tx as any).tags || []).includes("Transfer");
                const isUncertain = (tx as any).isUncertain || tx.category === "other";

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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-foreground line-clamp-1">
                            {tx.name || (tx as any).description || "Transaction"}
                          </p>
                          {isTransfer && (
                            <Badge variant="outline" className="text-[9px] font-mono border-blue-500/40 text-blue-500">
                              Transfer Excluded
                            </Badge>
                          )}
                          {isUncertain && (
                            <Badge variant="outline" className="text-[9px] font-mono border-amber-500/40 text-amber-500">
                              Requires Review
                            </Badge>
                          )}
                        </div>
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
                Automated
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
                  <span className="font-semibold text-foreground block">Recurring & Subscriptions</span>
                  <span className="text-[10px] text-muted-foreground">Auto-detected from narratives</span>
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
            <span className="font-semibold text-primary block">Zero Manual Entry Guarantee</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              WalletWisely processes all debits, credits, and UPI references automatically. You never need to enter an expense manually.
            </p>
          </div>
        </div>
      </section>

      {/* Connection Modals */}
      <FinancialConnectionModal
        open={showConnectModal}
        onOpenChange={setShowConnectModal}
        onSuccess={refreshConsents}
        onOpenBankStatementImport={openBankImport}
      />
      <ConnectionManagerDialog
        open={showManageModal}
        onOpenChange={setShowManageModal}
        onAddNewConnection={() => setShowConnectModal(true)}
        onRefreshData={refreshConsents}
      />
    </motion.div>
  );
}
