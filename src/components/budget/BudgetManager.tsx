import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useBudgets, useAddBudget, useUpdateBudget, useBudgetSummary, useRolloverBudgets } from "@/hooks/useBudgets";
import { useToast } from "@/hooks/use-toast";
import { 
  Target, 
  Plus, 
  Edit2, 
  Save, 
  X,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Wallet,
  PiggyBank,
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Gamepad2,
  Receipt,
  Heart,
  Smartphone,
  GraduationCap,
  Plane,
  MoreHorizontal,
  Loader2,
  Copy,
  Bell
} from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { Constants } from "@/integrations/supabase/types";

const categories = Constants.public.Enums.transaction_category;

const categoryConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  food: { icon: UtensilsCrossed, label: "Food & Dining", color: "text-orange-500" },
  shopping: { icon: ShoppingBag, label: "Shopping", color: "text-pink-500" },
  transport: { icon: Car, label: "Transport", color: "text-blue-500" },
  entertainment: { icon: Gamepad2, label: "Entertainment", color: "text-purple-500" },
  bills: { icon: Receipt, label: "Bills & Utilities", color: "text-yellow-600" },
  health: { icon: Heart, label: "Health", color: "text-red-500" },
  recharges: { icon: Smartphone, label: "Recharges", color: "text-cyan-500" },
  education: { icon: GraduationCap, label: "Education", color: "text-indigo-500" },
  travel: { icon: Plane, label: "Travel", color: "text-emerald-500" },
  income: { icon: Wallet, label: "Income", color: "text-green-500" },
  other: { icon: MoreHorizontal, label: "Other", color: "text-gray-500" },
};

export function BudgetManager() {
  const { toast } = useToast();
  const currentMonth = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const { data: budgets, isLoading } = useBudgets();
  const { totalBudgeted, totalSpent, remaining, categoryBreakdown } = useBudgetSummary();
  const addBudget = useAddBudget();
  const updateBudget = useUpdateBudget();
  const rolloverBudgets = useRolloverBudgets();

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [budgetAmounts, setBudgetAmounts] = useState<Record<string, string>>({});
  const [showAlerts, setShowAlerts] = useState(true);

  // Initialize budget amounts from existing budgets
  useEffect(() => {
    if (budgets) {
      const amounts: Record<string, string> = {};
      budgets.forEach(b => {
        amounts[b.category] = b.budgeted_amount.toString();
      });
      setBudgetAmounts(amounts);
    }
  }, [budgets]);

  // Get categories that are approaching or over budget
  const alertCategories = categoryBreakdown.filter(c => c.budgeted > 0 && c.percentUsed >= 80);
  const overBudgetCategories = categoryBreakdown.filter(c => c.budgeted > 0 && c.percentUsed > 100);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSaveBudget = async (category: string) => {
    const amount = parseFloat(budgetAmounts[category] || "0");
    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid budget amount.",
        variant: "destructive",
      });
      return;
    }

    try {
      const existingBudget = budgets?.find(b => b.category === category);
      
      if (existingBudget) {
        await updateBudget.mutateAsync({ id: existingBudget.id, budgeted_amount: amount });
      } else {
        await addBudget.mutateAsync({
          category: category as any,
          month: currentMonth,
          budgeted_amount: amount,
        });
      }

      toast({
        title: "Budget Updated",
        description: `${categoryConfig[category]?.label || category} budget set to ${formatCurrency(amount)}`,
      });
      setEditingCategory(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update budget.",
        variant: "destructive",
      });
    }
  };

  const handleRollover = async () => {
    try {
      await rolloverBudgets.mutateAsync(new Date(new Date().setMonth(new Date().getMonth() - 1)));
      toast({
        title: "Budgets Copied",
        description: "Last month's budgets have been copied to this month.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy budgets.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (percentUsed: number) => {
    if (percentUsed >= 100) return "bg-destructive";
    if (percentUsed >= 80) return "bg-amber-500";
    if (percentUsed >= 50) return "bg-primary";
    return "bg-success";
  };

  const getStatusBadge = (percentUsed: number) => {
    if (percentUsed >= 100) return { label: "Over Budget", variant: "destructive" as const, className: "" };
    if (percentUsed >= 80) return { label: "Warning", variant: "secondary" as const, className: "bg-amber-500/20 text-amber-600" };
    if (percentUsed >= 50) return { label: "On Track", variant: "secondary" as const, className: "" };
    return { label: "Good", variant: "default" as const, className: "bg-success/20 text-success" };
  };

  // Filter out income from expense categories
  const expenseCategories = categories.filter(c => c !== "income");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Budget Manager</h1>
          <p className="text-sm text-muted-foreground">
            Set monthly limits for each category - {format(new Date(), "MMMM yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRollover} disabled={rolloverBudgets.isPending}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Last Month
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAlerts(!showAlerts)}>
            <Bell className="w-4 h-4 mr-2" />
            {showAlerts ? "Hide" : "Show"} Alerts
          </Button>
        </div>
      </div>

      {/* Budget Alerts */}
      <AnimatePresence>
        {showAlerts && alertCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-amber-500/50 bg-amber-500/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Budget Alerts</p>
                    <div className="mt-2 space-y-1">
                      {alertCategories.map(cat => {
                        const config = categoryConfig[cat.category];
                        const isOver = cat.percentUsed > 100;
                        return (
                          <p key={cat.category} className="text-sm text-muted-foreground">
                            <span className={isOver ? "text-destructive font-medium" : "text-amber-600"}>
                              {config?.label || cat.category}:
                            </span>{" "}
                            {isOver ? (
                              <>Over by {formatCurrency(Math.abs(cat.remaining))}</>
                            ) : (
                              <>{cat.percentUsed}% used - {formatCurrency(cat.remaining)} remaining</>
                            )}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total Budget</span>
              </div>
              <p className="text-3xl font-bold text-primary">{formatCurrency(totalBudgeted)}</p>
              <p className="text-xs text-muted-foreground mt-1">Monthly limit set</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-destructive" />
                <span className="text-sm text-muted-foreground">Spent</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{formatCurrency(totalSpent)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {totalBudgeted > 0 ? `${Math.round((totalSpent / totalBudgeted) * 100)}% of budget` : "No budget set"}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant={remaining >= 0 ? "glow" : "elevated"} className={remaining < 0 ? "border-destructive/50" : ""}>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <PiggyBank className="w-5 h-5 text-success" />
                <span className="text-sm text-muted-foreground">Remaining</span>
              </div>
              <p className={`text-3xl font-bold ${remaining >= 0 ? "text-success" : "text-destructive"}`}>
                {formatCurrency(remaining)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {remaining >= 0 ? "Available to spend" : "Over budget!"}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Overall Progress */}
      {totalBudgeted > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="elevated">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Budget Progress</span>
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(totalSpent)} / {formatCurrency(totalBudgeted)}
                </span>
              </div>
              <div className="h-4 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totalSpent / totalBudgeted) * 100, 100)}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded-full ${getStatusColor(Math.round((totalSpent / totalBudgeted) * 100))}`}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Category Budgets */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Category Budgets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {expenseCategories.map((category, index) => {
              const config = categoryConfig[category];
              const Icon = config?.icon || MoreHorizontal;
              const breakdown = categoryBreakdown.find(c => c.category === category);
              const budgeted = breakdown?.budgeted || 0;
              const spent = breakdown?.spent || 0;
              const percentUsed = breakdown?.percentUsed || 0;
              const isEditing = editingCategory === category;
              const status = getStatusBadge(percentUsed);

              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 bg-secondary/30 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-background ${config?.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{config?.label || category}</p>
                        {budgeted > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(spent)} of {formatCurrency(budgeted)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {budgeted > 0 && (
                        <Badge 
                          variant={status.variant}
                          className={status.className}
                        >
                          {percentUsed}%
                        </Badge>
                      )}
                      
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={budgetAmounts[category] || ""}
                            onChange={(e) => setBudgetAmounts(prev => ({ ...prev, [category]: e.target.value }))}
                            placeholder="₹0"
                            className="w-24 h-8 text-right"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSaveBudget(category)}
                            disabled={addBudget.isPending || updateBudget.isPending}
                          >
                            <Save className="w-4 h-4 text-success" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingCategory(null)}
                          >
                            <X className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingCategory(category)}
                        >
                          {budgeted > 0 ? (
                            <Edit2 className="w-4 h-4" />
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-1" />
                              Set
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {budgeted > 0 && (
                    <div className="space-y-1">
                      <div className="h-2 bg-background rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(percentUsed, 100)}%` }}
                          transition={{ duration: 0.5, delay: index * 0.05 }}
                          className={`h-full rounded-full ${getStatusColor(percentUsed)}`}
                        />
                      </div>
                      {percentUsed >= 80 && percentUsed < 100 && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Approaching limit - {formatCurrency(budgeted - spent)} left
                        </p>
                      )}
                      {percentUsed >= 100 && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Over budget by {formatCurrency(spent - budgeted)}
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center py-4"
      >
        <p className="text-sm text-muted-foreground">
          💡 Tip: Set budgets for categories where you tend to overspend
        </p>
      </motion.div>
    </div>
  );
}
