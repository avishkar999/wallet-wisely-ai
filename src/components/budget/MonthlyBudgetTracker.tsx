import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTransactions } from "@/hooks/useTransactions";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/useUserSettings";
import { startOfMonth, endOfMonth, isWithinInterval, format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, PiggyBank, RefreshCw, Target } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

function monthlyEquivalent(frequency: string, amount: number) {
  switch (frequency) {
    case "daily":
      return amount * 30;
    case "weekly":
      return amount * 4;
    case "yearly":
      return amount / 12;
    default:
      return amount;
  }
}

export function MonthlyBudgetTracker() {
  const { data: transactions = [] } = useTransactions();
  const { data: recurring = [] } = useRecurringTransactions();
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  const [goalInput, setGoalInput] = useState("");

  useEffect(() => {
    if (settings) setGoalInput(String(Number(settings.monthly_budget_goal) || ""));
  }, [settings?.id]);

  const now = new Date();
  const interval = { start: startOfMonth(now), end: endOfMonth(now) };
  const thisMonth = transactions.filter((t) =>
    isWithinInterval(new Date(t.transaction_date), interval)
  );

  const income = thisMonth
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expenses = thisMonth
    .filter((t) => t.type !== "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const saved = income - expenses;

  const activeRecurring = recurring.filter((r) => r.is_active);
  const recurringOut = activeRecurring
    .filter((r) => r.type !== "income")
    .reduce((s, r) => s + monthlyEquivalent(r.frequency, Number(r.amount)), 0);

  const goal = Number(settings?.monthly_budget_goal ?? 0);
  const progress = goal > 0 ? Math.min(100, Math.max(0, (saved / goal) * 100)) : 0;

  const saveGoal = async () => {
    const value = Number(goalInput);
    if (Number.isNaN(value) || value < 0) {
      toast.error("Enter a valid savings goal");
      return;
    }
    try {
      await updateSettings.mutateAsync({ monthly_budget_goal: value });
      toast.success("Monthly goal saved");
    } catch {
      toast.error("Could not save your goal");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-5xl mx-auto"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <ArrowUpRight className="w-4 h-4 text-success" /> Income this month
            </div>
            <p className="text-2xl font-bold mt-1 text-success">{formatCurrency(income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <ArrowDownRight className="w-4 h-4 text-destructive" /> Spent this month
            </div>
            <p className="text-2xl font-bold mt-1 text-destructive">{formatCurrency(expenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <PiggyBank className="w-4 h-4 text-primary" /> Left over
            </div>
            <p className={cn("text-2xl font-bold mt-1", saved < 0 ? "text-destructive" : "text-foreground")}>
              {formatCurrency(saved)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Monthly savings goal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>Goal amount</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="e.g. 10000"
              />
            </div>
            <Button onClick={saveGoal} disabled={updateSettings.isPending}>
              Save goal
            </Button>
          </div>

          {goal > 0 ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatCurrency(Math.max(0, saved))} of {formatCurrency(goal)}
                </span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {saved >= goal
                  ? "Goal reached for " + format(now, "MMMM") + " — nice work."
                  : `${formatCurrency(goal - Math.max(0, saved))} to go this month.`}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Set a goal to see your progress bar.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            Recurring payments
            <Badge variant="secondary" className="ml-auto">
              {formatCurrency(recurringOut)} / month
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeRecurring.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
          ) : (
            activeRecurring.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {item.frequency} · next {format(new Date(item.next_due_date), "MMM d")}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold whitespace-nowrap",
                    item.type === "income" ? "text-success" : "text-destructive"
                  )}
                >
                  {item.type === "income" ? "+" : "-"}
                  {formatCurrency(Number(item.amount))}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
