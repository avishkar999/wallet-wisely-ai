import { useState } from "react";
import { format, subMonths, addMonths, parseISO } from "date-fns";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Edit3,
  Check,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MonthlyCycleBar() {
  const {
    currentSelectedMonth,
    setSelectedMonth,
    getCurrentMonthCycle,
    updateMonthCycle,
    formatMoney,
    setShowMonthResetModal,
    setShowMonthlyWrappedModal,
  } = useCoinKeeper();

  const cycle = getCurrentMonthCycle();
  const [editingNote, setEditingNote] = useState(false);
  const [noteInput, setNoteInput] = useState(cycle.note || "");
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(cycle.budget || ""));

  const currentDate = parseISO(`${currentSelectedMonth}-01`);

  const handlePrevMonth = () => {
    const prev = format(subMonths(currentDate, 1), "yyyy-MM");
    setSelectedMonth(prev);
  };

  const handleNextMonth = () => {
    const next = format(addMonths(currentDate, 1), "yyyy-MM");
    setSelectedMonth(next);
  };

  const handleSaveNote = () => {
    updateMonthCycle(currentSelectedMonth, { note: noteInput });
    setEditingNote(false);
  };

  const handleSaveBudget = () => {
    const num = parseFloat(budgetInput);
    if (!isNaN(num) && num > 0) {
      updateMonthCycle(currentSelectedMonth, { budget: num });
    }
    setEditingBudget(false);
  };

  return (
    <div className="glass-premium rounded-2xl p-4 sm:p-5 border border-border/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Month Navigator & Note */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Month Selector Buttons */}
        <div className="flex items-center gap-1.5 bg-secondary/60 p-1 rounded-xl border border-border/50 self-start">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1.5 px-3 py-1 font-semibold text-sm text-foreground">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{format(currentDate, "MMMM yyyy")}</span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Custom Month Note (Personal context) */}
        <div className="flex items-center gap-2 text-xs">
          {editingNote ? (
            <div className="flex items-center gap-1.5">
              <Input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="e.g. Bangalore internship month"
                className="h-8 text-xs bg-secondary/80 w-60 border-primary/40"
                autoFocus
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleSaveNote}
                className="h-8 w-8 text-primary"
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNoteInput(cycle.note || "");
                setEditingNote(true);
              }}
              className="group flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-left"
            >
              <span className="italic text-foreground/80">
                "{cycle.note || "Add personal context or theme for this month..."}"
              </span>
              <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
            </button>
          )}
        </div>
      </div>

      {/* Monthly Budget & Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Variable Budget Indicator & Quick Adjust */}
        <div className="flex items-center gap-2 bg-secondary/40 px-3 py-1.5 rounded-xl border border-border/40 text-xs">
          <span className="text-muted-foreground">Month Budget:</span>
          {editingBudget ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="h-7 w-24 text-xs font-mono bg-background"
                autoFocus
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleSaveBudget}
                className="h-7 w-7 text-primary"
              >
                <Check className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setBudgetInput(String(cycle.budget));
                setEditingBudget(true);
              }}
              className="font-bold font-mono text-primary hover:underline flex items-center gap-1"
              title="Click to customize budget for this month"
            >
              {formatMoney(cycle.budget)}
              <Edit3 className="w-2.5 h-2.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Start Fresh / Copy Month Setup */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMonthResetModal(true)}
          className="text-xs h-8 border-border/50 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5 text-primary" /> Month Setup
        </Button>

        {/* Monthly Wrapped Story */}
        <Button
          type="button"
          size="sm"
          onClick={() => setShowMonthlyWrappedModal(true)}
          className="text-xs h-8 bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold gap-1.5 shadow-sm"
        >
          <Trophy className="w-3.5 h-3.5" /> Monthly Wrapped
        </Button>
      </div>
    </div>
  );
}
