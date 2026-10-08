import { useState, useMemo } from "react";
import { format, parseISO, subMonths } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  TrendingDown,
  TrendingUp,
  Award,
  Wallet,
  Zap,
  Target,
  Share2,
} from "lucide-react";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { useTransactions } from "@/hooks/useTransactions";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";

export function MonthlyWrappedModal() {
  const {
    showMonthlyWrappedModal,
    setShowMonthlyWrappedModal,
    currentSelectedMonth,
    formatMoney,
    getCurrentMonthCycle,
  } = useCoinKeeper();

  const { data: transactions = [] } = useTransactions();
  const { data: goals = [] } = useSavingsGoals();
  const cycle = getCurrentMonthCycle();

  const [currentSlide, setCurrentSlide] = useState(0);

  const monthDate = parseISO(`${currentSelectedMonth}-01`);
  const prevMonthDate = subMonths(monthDate, 1);
  const prevMonthKey = format(prevMonthDate, "yyyy-MM");

  // Calculate wrapped metrics
  const wrappedData = useMemo(() => {
    const currentTx = transactions.filter((t) =>
      t.transaction_date?.startsWith(currentSelectedMonth)
    );
    const prevTx = transactions.filter((t) =>
      t.transaction_date?.startsWith(prevMonthKey)
    );

    const earned = currentTx
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const spent = currentTx
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const prevSpent = prevTx
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const saved = Math.max(0, earned - spent);
    const savingsRate = earned > 0 ? Math.round((saved / earned) * 100) : 0;

    // Spending change
    const spendingChangePct =
      prevSpent > 0 ? Math.round(((spent - prevSpent) / prevSpent) * 100) : 0;

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    let biggestExpense = { name: "None", amount: 0 };

    currentTx
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const amt = Number(t.amount || 0);
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
        if (amt > biggestExpense.amount) {
          biggestExpense = { name: t.name, amount: amt };
        }
      });

    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCategories[0] || ["General", 0];

    // Top Goal
    const activeGoals = [...goals].sort((a, b) => (b.current_amount || 0) - (a.current_amount || 0));
    const topGoal = activeGoals[0] || null;

    return {
      earned,
      spent,
      saved,
      savingsRate,
      spendingChangePct,
      topCategoryName: topCategory[0],
      topCategoryAmount: topCategory[1],
      biggestExpense,
      topGoal,
      budget: cycle.budget,
      isUnderBudget: spent <= cycle.budget,
    };
  }, [transactions, currentSelectedMonth, prevMonthKey, goals, cycle]);

  const totalSlides = 5;

  return (
    <Dialog open={showMonthlyWrappedModal} onOpenChange={setShowMonthlyWrappedModal}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-border/70 rounded-3xl shadow-2xl">
        <div className="relative min-h-[500px] flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-b from-card via-card/90 to-background">
          {/* Progress bar across slides */}
          <div className="flex items-center gap-1.5 mb-6">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  idx <= currentSlide ? "bg-primary" : "bg-muted/40"
                }`}
              />
            ))}
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => setShowMonthlyWrappedModal(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors z-20"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Slides content */}
          <div className="my-auto py-4">
            <AnimatePresence mode="wait">
              {/* Slide 0: Title & Summary */}
              {currentSlide === 0 && (
                <motion.div
                  key="slide0"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.04 }}
                  className="text-center space-y-4"
                >
                  <div className="inline-flex p-3 rounded-2xl bg-gradient-primary shadow-glow mb-2 text-primary-foreground">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs uppercase font-mono tracking-widest text-primary font-bold">
                      CoinKeeper Wrapped
                    </span>
                    <h2 className="text-3xl font-extrabold text-foreground mt-1">
                      {format(monthDate, "MMMM yyyy")}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your personalized monthly money story
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4 text-left">
                    <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/40">
                      <span className="text-[11px] text-muted-foreground block font-medium">Earned</span>
                      <span className="text-lg font-bold font-mono text-accent">
                        {formatMoney(wrappedData.earned)}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/40">
                      <span className="text-[11px] text-muted-foreground block font-medium">Spent</span>
                      <span className="text-lg font-bold font-mono text-foreground">
                        {formatMoney(wrappedData.spent)}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/40">
                      <span className="text-[11px] text-muted-foreground block font-medium">Net Saved</span>
                      <span className="text-lg font-bold font-mono text-success">
                        {formatMoney(wrappedData.saved)}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/40">
                      <span className="text-[11px] text-muted-foreground block font-medium">Savings Rate</span>
                      <span className="text-lg font-bold font-mono text-primary">
                        {wrappedData.savingsRate}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Slide 1: Top Category */}
              {currentSlide === 1 && (
                <motion.div
                  key="slide1"
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  className="space-y-4 text-center"
                >
                  <span className="text-xs font-mono uppercase tracking-widest text-warning font-semibold">
                    Primary Outflow
                  </span>
                  <h3 className="text-2xl font-bold text-foreground">
                    Where did the money go?
                  </h3>
                  <div className="py-6">
                    <div className="w-20 h-20 rounded-3xl bg-warning/10 text-warning border border-warning/30 flex items-center justify-center mx-auto mb-3 shadow-glow">
                      <Wallet className="w-9 h-9" />
                    </div>
                    <span className="text-lg font-bold text-foreground capitalize block">
                      {wrappedData.topCategoryName}
                    </span>
                    <span className="text-3xl font-extrabold font-mono text-foreground mt-1 block">
                      {formatMoney(wrappedData.topCategoryAmount)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    This was your single highest outflow category for {format(monthDate, "MMMM")}.
                  </p>
                </motion.div>
              )}

              {/* Slide 2: Biggest Expense */}
              {currentSlide === 2 && (
                <motion.div
                  key="slide2"
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  className="space-y-4 text-center"
                >
                  <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">
                    Single Largest Expense
                  </span>
                  <h3 className="text-2xl font-bold text-foreground">
                    Your Peak Transaction
                  </h3>
                  <div className="p-6 rounded-2xl bg-secondary/50 border border-border/50 max-w-xs mx-auto my-4 text-left">
                    <span className="text-xs text-muted-foreground block">Transaction</span>
                    <span className="text-base font-bold text-foreground block mt-0.5">
                      {wrappedData.biggestExpense.name}
                    </span>
                    <span className="text-2xl font-extrabold font-mono text-primary mt-2 block">
                      {formatMoney(wrappedData.biggestExpense.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Accounted for{" "}
                    {wrappedData.spent > 0
                      ? Math.round((wrappedData.biggestExpense.amount / wrappedData.spent) * 100)
                      : 0}
                    % of your total spending.
                  </p>
                </motion.div>
              )}

              {/* Slide 3: Month over Month comparison */}
              {currentSlide === 3 && (
                <motion.div
                  key="slide3"
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  className="space-y-5 text-center"
                >
                  <span className="text-xs font-mono uppercase tracking-widest text-accent font-semibold">
                    Month-over-Month Velocity
                  </span>
                  <h3 className="text-2xl font-bold text-foreground">
                    Compared to {format(prevMonthDate, "MMMM")}
                  </h3>

                  <div className="p-6 rounded-2xl bg-card border border-border/50 max-w-xs mx-auto">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {wrappedData.spendingChangePct <= 0 ? (
                        <div className="p-2 rounded-full bg-success/20 text-success">
                          <TrendingDown className="w-6 h-6" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-full bg-warning/20 text-warning">
                          <TrendingUp className="w-6 h-6" />
                        </div>
                      )}
                      <span className="text-3xl font-extrabold font-mono text-foreground">
                        {Math.abs(wrappedData.spendingChangePct)}%
                      </span>
                    </div>

                    <span className="text-sm font-semibold text-foreground block">
                      {wrappedData.spendingChangePct <= 0
                        ? "Spending Decreased!"
                        : "Spending Increased"}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {wrappedData.spendingChangePct <= 0
                        ? "You exercised stronger discipline compared to last month."
                        : "Higher activity this month, balanced across your priority targets."}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Slide 4: Verdict & Final Kudos */}
              {currentSlide === 4 && (
                <motion.div
                  key="slide4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="space-y-4 text-center"
                >
                  <div className="p-3.5 rounded-2xl bg-success/10 text-success border border-success/30 inline-block shadow-glow">
                    <Award className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-foreground">
                      {wrappedData.isUnderBudget ? "Budget Mastered!" : "Pace Tracked"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {wrappedData.isUnderBudget
                        ? `You finished ${formatMoney(wrappedData.budget - wrappedData.spent)} under your target budget.`
                        : `You monitored ${formatMoney(wrappedData.spent)} with full awareness.`}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-secondary/50 border border-border/40 text-left text-xs space-y-2 max-w-xs mx-auto">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Savings Rate:</span>
                      <span className="font-bold text-success">{wrappedData.savingsRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Top Goal:</span>
                      <span className="font-bold text-foreground">
                        {wrappedData.topGoal ? wrappedData.topGoal.name : "Emergency Fund"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Budget Target:</span>
                      <span className="font-mono text-foreground">{formatMoney(wrappedData.budget)}</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setShowMonthlyWrappedModal(false)}
                    className="w-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow text-sm mt-3"
                  >
                    Finish & Continue
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom navigation arrows */}
          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={currentSlide === 0}
              onClick={() => setCurrentSlide((s) => s - 1)}
              className="text-xs gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Previous
            </Button>

            <span className="text-xs font-mono text-muted-foreground">
              {currentSlide + 1} / {totalSlides}
            </span>

            {currentSlide < totalSlides - 1 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setCurrentSlide((s) => s + 1)}
                className="text-xs gap-1 bg-primary text-primary-foreground font-semibold"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowMonthlyWrappedModal(false)}
                className="text-xs"
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
