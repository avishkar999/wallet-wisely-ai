import { useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  TrendingUp,
  Sparkles,
  Sliders,
  RotateCcw,
  ShieldCheck,
  Target,
  Wallet,
} from "lucide-react";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { useFinancialSummary } from "@/hooks/useTransactions";
import { useInvestments } from "@/hooks/useInvestments";
import { clearAllFinancialData } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface FinancialHeroProps {
  onNavigateTab?: (tab: string) => void;
}

export function FinancialHero({ onNavigateTab }: FinancialHeroProps) {
  const {
    profile,
    formatMoney,
    openQuickAdd,
    setShowOnboardingModal,
    setShowDashboardCustomizer,
  } = useCoinKeeper();

  const { income, expenses, balance, transactionCount, isLoading } = useFinancialSummary();
  const { data: investments = [] } = useInvestments();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const totalInvested = useMemo(() => {
    return investments.reduce((sum, inv) => sum + Number(inv.current_value || inv.invested_amount || 0), 0);
  }, [investments]);

  // Dynamic greeting based on current local hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "GOOD MORNING";
    if (hour < 17) return "GOOD AFTERNOON";
    return "GOOD EVENING";
  }, []);

  const currentMonthDisplay = useMemo(() => {
    return format(new Date(), "MMMM yyyy");
  }, []);

  const displayName = profile.persona === "student" ? "STUDENT" : "AVISHKAR";

  const handleResetToZero = () => {
    if (window.confirm("Completely reset all financial records to ZERO? This cannot be undone.")) {
      clearAllFinancialData();
      queryClient.invalidateQueries();
      toast({
        title: "System Reset to Zero",
        description: "All financial data has been cleared. Starting clean.",
      });
      window.location.reload();
    }
  };

  const isZeroState = transactionCount === 0;

  return (
    <div className="space-y-5">
      {/* 1. SOPHISTICATED GREETING SECTION */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-widest text-primary uppercase font-mono">
              {greeting}, {displayName}
            </span>
            <span className="text-muted-foreground/60 text-xs">·</span>
            <span className="text-xs text-muted-foreground font-medium">
              {currentMonthDisplay}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
            Let’s see how your money is moving.
          </h2>
        </div>

        {/* Quiet contextual actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowOnboardingModal(true)}
            className="text-xs h-8 gap-1.5 border-border/50 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            title="Configure persona, income type, and focus"
          >
            <Sliders className="w-3.5 h-3.5 text-primary" /> Setup
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetToZero}
            className="text-xs h-8 gap-1 border-border/40 text-muted-foreground hover:text-destructive hover:border-destructive/30"
            title="Purge all records to start completely clean"
          >
            <RotateCcw className="w-3 h-3" /> Reset Data
          </Button>
        </div>
      </motion.div>

      {/* 2. MAIN FINANCIAL HERO CARD */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card/90 via-card/60 to-card/95 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl"
      >
        {/* Ambient subtle glow ring */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/10 blur-3xl opacity-80"
        />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Subtle status kicker */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-[11px] font-semibold tracking-wider uppercase text-foreground/80">
              Available Balance
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {profile.currency}
            </span>
          </div>

          {/* Huge Financial Hero Number */}
          <div className="relative my-1">
            <motion.h1
              key={balance}
              initial={{ scale: 0.95, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight font-mono text-foreground"
            >
              {isLoading ? "…" : formatMoney(balance)}
            </motion.h1>
          </div>

          {/* Refined Secondary Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mt-8 pt-6 border-t border-border/40 w-full max-w-3xl">
            {/* Income */}
            <div className="flex flex-col items-center p-3 rounded-2xl bg-secondary/30 border border-border/30">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-success inline-block" />
                <span className="uppercase text-[10px] font-semibold tracking-wider">Income</span>
              </div>
              <span className="text-lg sm:text-2xl font-bold font-mono text-foreground mt-1">
                {isLoading ? "…" : formatMoney(income)}
              </span>
              <span className="text-[11px] text-muted-foreground/70 mt-0.5">This month</span>
            </div>

            {/* Spent */}
            <div className="flex flex-col items-center p-3 rounded-2xl bg-secondary/30 border border-border/30">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
                <span className="uppercase text-[10px] font-semibold tracking-wider">Spent</span>
              </div>
              <span className="text-lg sm:text-2xl font-bold font-mono text-foreground mt-1">
                {isLoading ? "…" : formatMoney(expenses)}
              </span>
              <span className="text-[11px] text-muted-foreground/70 mt-0.5">Outflows</span>
            </div>

            {/* Saved */}
            <div className="flex flex-col items-center p-3 rounded-2xl bg-secondary/30 border border-border/30">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                <span className="uppercase text-[10px] font-semibold tracking-wider">Saved</span>
              </div>
              <span className="text-lg sm:text-2xl font-bold font-mono text-foreground mt-1">
                {isLoading ? "…" : formatMoney(Math.max(0, balance))}
              </span>
              <span className="text-[11px] text-muted-foreground/70 mt-0.5">Net retained</span>
            </div>

            {/* Invested */}
            <div className="flex flex-col items-center p-3 rounded-2xl bg-secondary/30 border border-border/30">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                <span className="uppercase text-[10px] font-semibold tracking-wider">Invested</span>
              </div>
              <span className="text-lg sm:text-2xl font-bold font-mono text-foreground mt-1">
                {isLoading ? "…" : formatMoney(totalInvested)}
              </span>
              <span className="text-[11px] text-muted-foreground/70 mt-0.5">Assets value</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. ZERO-DATA DEDICATED FIRST-USE EXPERIENCE */}
      {isZeroState && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="relative rounded-2xl border border-primary/25 bg-primary/[0.03] p-6 sm:p-8 backdrop-blur-xl"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
                  Your money space is ready.
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Start by adding how money moves through your life.
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                CoinKeeper does not force a predefined lifestyle. Whether you are managing student allowances, freelancing milestones, or executive payroll, record your first inflow and outflow to activate personal cash flows and live pulse analytics.
              </p>
            </div>

            {/* Direct Quick Actions */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                type="button"
                onClick={() => openQuickAdd("income")}
                className="bg-success text-success-foreground hover:bg-success/90 font-semibold text-xs h-10 px-5 gap-1.5 shadow-sm"
              >
                <ArrowDownLeft className="w-4 h-4" /> + Add Income
              </Button>

              <Button
                type="button"
                onClick={() => openQuickAdd("expense")}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs h-10 px-5 gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> + Add Expense
              </Button>
            </div>
          </div>

          {/* Secondary On-ramps */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border/40 text-xs">
            <button
              type="button"
              onClick={() => onNavigateTab?.("budget")}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-card/40 border border-border/40 text-left hover:border-primary/50 transition-colors"
            >
              <Target className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="font-semibold text-foreground block">Set Budget</span>
                <span className="text-[10px] text-muted-foreground">Pick a monthly target</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab?.("goals")}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-card/40 border border-border/40 text-left hover:border-primary/50 transition-colors"
            >
              <PiggyBank className="w-4 h-4 text-success shrink-0" />
              <div>
                <span className="font-semibold text-foreground block">Create Goal</span>
                <span className="text-[10px] text-muted-foreground">Savings milestone</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab?.("accounts")}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-card/40 border border-border/40 text-left hover:border-primary/50 transition-colors"
            >
              <Wallet className="w-4 h-4 text-accent shrink-0" />
              <div>
                <span className="font-semibold text-foreground block">Add Accounts</span>
                <span className="text-[10px] text-muted-foreground">Bank, Cash, UPI</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowOnboardingModal(true)}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-card/40 border border-border/40 text-left hover:border-primary/50 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-warning shrink-0" />
              <div>
                <span className="font-semibold text-foreground block">Persona Setup</span>
                <span className="text-[10px] text-muted-foreground">Custom questions</span>
              </div>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
