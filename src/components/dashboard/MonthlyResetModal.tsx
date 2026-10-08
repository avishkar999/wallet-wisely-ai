import { useState } from "react";
import { format, parseISO, subMonths } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Sparkles, Sliders, CheckCircle2, ShieldAlert } from "lucide-react";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";

export function MonthlyResetModal() {
  const {
    showMonthResetModal,
    setShowMonthResetModal,
    currentSelectedMonth,
    resetMonthSetup,
    getCurrentMonthCycle,
    formatMoney,
    profile,
  } = useCoinKeeper();

  const cycle = getCurrentMonthCycle();
  const currentDate = parseISO(`${currentSelectedMonth}-01`);
  const prevDate = subMonths(currentDate, 1);

  const [selectedMode, setSelectedMode] = useState<"copy_previous" | "fresh" | "custom">("copy_previous");
  const [customBudget, setCustomBudget] = useState(String(cycle.budget || profile.defaultMonthlyBudget || 45000));
  const [customNote, setCustomNote] = useState(cycle.note || "");

  const handleApply = () => {
    const budgetNum = parseFloat(customBudget) || profile.defaultMonthlyBudget;
    resetMonthSetup(currentSelectedMonth, selectedMode, budgetNum);
    setShowMonthResetModal(false);
  };

  return (
    <Dialog open={showMonthResetModal} onOpenChange={setShowMonthResetModal}>
      <DialogContent className="max-w-lg bg-card/95 backdrop-blur-2xl border-border/60 p-6">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Month Setup · {format(currentDate, "MMMM yyyy")}
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            How do you want to run {format(currentDate, "MMMM")}?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            CoinKeeper keeps each month isolated. Transactions are never duplicated, but your rules, category budgets, and preferences can carry over with one tap.
          </DialogDescription>
        </DialogHeader>

        {/* 3 Choices */}
        <div className="space-y-3 my-2">
          {/* Option 1: Copy Previous Month Setup */}
          <button
            type="button"
            onClick={() => setSelectedMode("copy_previous")}
            className={`w-full flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
              selectedMode === "copy_previous"
                ? "bg-primary/10 border-primary shadow-sm text-foreground"
                : "bg-secondary/40 border-border/50 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            }`}
          >
            <div className={`p-2.5 rounded-lg ${selectedMode === "copy_previous" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
              <Copy className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm text-foreground flex items-center justify-between">
                <span>Use Last Month's Setup</span>
                {selectedMode === "copy_previous" && <CheckCircle2 className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                Carry forward categories, category limits, and recurring targets from {format(prevDate, "MMMM")}.
              </p>
            </div>
          </button>

          {/* Option 2: Customize This Month (Variable Budget) */}
          <button
            type="button"
            onClick={() => setSelectedMode("custom")}
            className={`w-full flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
              selectedMode === "custom"
                ? "bg-accent/10 border-accent shadow-sm text-foreground"
                : "bg-secondary/40 border-border/50 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            }`}
          >
            <div className={`p-2.5 rounded-lg ${selectedMode === "custom" ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"}`}>
              <Sliders className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm text-foreground flex items-center justify-between">
                <span>Customize This Month (Variable Budget)</span>
                {selectedMode === "custom" && <CheckCircle2 className="w-4 h-4 text-accent" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                Expected travel, festivities, or high freelance income? Tailor a unique budget for this specific month.
              </p>
            </div>
          </button>

          {/* Option 3: Start Fresh */}
          <button
            type="button"
            onClick={() => setSelectedMode("fresh")}
            className={`w-full flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
              selectedMode === "fresh"
                ? "bg-primary/10 border-primary shadow-sm text-foreground"
                : "bg-secondary/40 border-border/50 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            }`}
          >
            <div className={`p-2.5 rounded-lg ${selectedMode === "fresh" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm text-foreground flex items-center justify-between">
                <span>Start Fresh</span>
                {selectedMode === "fresh" && <CheckCircle2 className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                Reset to default baseline {formatMoney(profile.defaultMonthlyBudget)} with a clean slate.
              </p>
            </div>
          </button>
        </div>

        {/* Custom fields if "custom" is selected */}
        {selectedMode === "custom" && (
          <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/50 space-y-3 mt-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Custom Budget for {format(currentDate, "MMMM yyyy")}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  {profile.currencySymbol}
                </span>
                <Input
                  type="number"
                  value={customBudget}
                  onChange={(e) => setCustomBudget(e.target.value)}
                  className="pl-7 h-8 text-xs font-mono"
                  placeholder="55000"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Month Context / Theme (Optional)
              </label>
              <Input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="h-8 text-xs"
                placeholder="e.g. Bangalore internship & relocation"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowMonthResetModal(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            className="bg-primary text-primary-foreground font-semibold px-5"
          >
            Apply & Start {format(currentDate, "MMM")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
