import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTransactions, useFinancialSummary, useAddTransaction, useDeleteTransaction } from "@/hooks/useTransactions";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Trash2, 
  UtensilsCrossed, 
  Car, 
  BookOpen, 
  Smartphone, 
  Dumbbell, 
  PartyPopper, 
  Receipt,
  Wallet,
  TrendingUp,
  PiggyBank,
  Target,
  Loader2
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

const simpleCategories = [
  { value: "food", label: "🍽 Food", icon: UtensilsCrossed },
  { value: "transport", label: "🚍 Travel", icon: Car },
  { value: "education", label: "📚 Study", icon: BookOpen },
  { value: "recharges", label: "📱 Subscriptions", icon: Smartphone },
  { value: "health", label: "🏋️ Gym/Health", icon: Dumbbell },
  { value: "entertainment", label: "🎉 Entertainment", icon: PartyPopper },
  { value: "other", label: "🧾 Miscellaneous", icon: Receipt },
];

const paymentModes = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "debit_card", label: "Debit Card" },
  { value: "credit_card", label: "Credit Card" },
];

export function DailySpendingTracker() {
  const { data: transactions = [], isLoading } = useTransactions();
  const { income, expenses, balance, categoryTotals } = useFinancialSummary();
  const addTransaction = useAddTransaction();
  const deleteTransaction = useDeleteTransaction();
  const { toast } = useToast();

  // Quick add form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [paymentMode, setPaymentMode] = useState("upi");
  const [isNecessary, setIsNecessary] = useState(true);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Get today's transactions
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayTransactions = transactions.filter(t => 
    t.transaction_date === todayStr && t.type === "expense"
  );

  // Get current month expenses
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  const monthTransactions = transactions.filter(t => {
    const tDate = new Date(t.transaction_date);
    return tDate >= currentMonthStart && tDate <= currentMonthEnd;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate 60-25-15 rule (Student version)
  const totalBudget = income > 0 ? income : expenses * 1.5; // Estimate if no income
  const needsTarget = totalBudget * 0.60;
  const wantsTarget = totalBudget * 0.25;
  const savingsTarget = totalBudget * 0.15;

  // Categorize spending
  const needsCategories = ["food", "transport", "education", "recharges", "bills", "health"];
  const wantsCategories = ["entertainment", "shopping", "travel"];
  
  const needsSpent = monthTransactions
    .filter(t => t.type === "expense" && needsCategories.includes(t.category))
    .reduce((sum, t) => sum + t.amount, 0);
  
  const wantsSpent = monthTransactions
    .filter(t => t.type === "expense" && wantsCategories.includes(t.category))
    .reduce((sum, t) => sum + t.amount, 0);

  const actualSavings = income - expenses;

  // Find biggest expense category
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const biggestCategory = sortedCategories[0];

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !amount) {
      toast({
        title: "Missing Fields",
        description: "Please enter description and amount.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addTransaction.mutateAsync({
        name: description,
        amount: parseFloat(amount),
        type: "expense",
        category: category as any,
        payment_method: paymentMode as any,
        transaction_date: date,
        description: isNecessary ? "Necessary" : "Want",
      });

      toast({
        title: "Added!",
        description: `₹${amount} for ${description}`,
      });

      // Reset form
      setDescription("");
      setAmount("");
      setIsNecessary(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add expense.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction.mutateAsync(id);
      toast({ title: "Deleted", description: "Transaction removed." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const getCategoryIcon = (cat: string) => {
    const found = simpleCategories.find(c => c.value === cat);
    return found?.label.split(" ")[0] || "🧾";
  };

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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Daily Spending Tracker</h1>
        <p className="text-sm text-muted-foreground">Simple tracking = Awareness, not restriction</p>
      </div>

      {/* Monthly Summary Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card variant="glow" className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Monthly Summary - {format(new Date(), "MMMM yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-success/10 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Total Income</p>
                <p className="text-xl font-bold text-success">{formatCurrency(income)}</p>
              </div>
              <div className="text-center p-3 bg-destructive/10 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
                <p className="text-xl font-bold text-destructive">{formatCurrency(expenses)}</p>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Savings</p>
                <p className={`text-xl font-bold ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Top Expense</p>
                <p className="text-xl font-bold text-foreground">
                  {biggestCategory ? getCategoryIcon(biggestCategory[0]) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {biggestCategory ? formatCurrency(biggestCategory[1]) : "No data"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 60-25-15 Rule (Student Version) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card variant="elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-primary" />
              60-25-15 Rule (Student Budget)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Needs - 60% */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">60% Needs</span>
                <span className="text-muted-foreground">
                  {formatCurrency(needsSpent)} / {formatCurrency(needsTarget)}
                </span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((needsSpent / needsTarget) * 100, 100)}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded-full ${
                    needsSpent <= needsTarget ? 'bg-success' : 'bg-destructive'
                  }`}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Food, travel, study, phone, health</p>
            </div>

            {/* Wants - 25% */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">25% Wants</span>
                <span className="text-muted-foreground">
                  {formatCurrency(wantsSpent)} / {formatCurrency(wantsTarget)}
                </span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((wantsSpent / wantsTarget) * 100, 100)}%` }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className={`h-full rounded-full ${
                    wantsSpent <= wantsTarget ? 'bg-primary' : 'bg-destructive'
                  }`}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Coffee, outings, OTT, entertainment</p>
            </div>

            {/* Savings - 15% */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">15% Savings</span>
                <span className="text-muted-foreground">
                  {formatCurrency(Math.max(actualSavings, 0))} / {formatCurrency(savingsTarget)}
                </span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((Math.max(actualSavings, 0) / savingsTarget) * 100, 100)}%` }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className={`h-full rounded-full ${
                    actualSavings >= savingsTarget ? 'bg-success' : 'bg-amber-500'
                  }`}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Emergency fund / Investing</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Add Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card variant="elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Quick Add Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleQuickAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Description</Label>
                  <Input
                    placeholder="e.g., Vada Pav"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Amount (₹)</Label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {simpleCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Payment Mode</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentModes.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          {mode.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Necessary?</Label>
                  <Switch
                    checked={isNecessary}
                    onCheckedChange={setIsNecessary}
                  />
                  <span className={`text-xs ${isNecessary ? 'text-success' : 'text-amber-500'}`}>
                    {isNecessary ? 'Yes' : 'No (Want)'}
                  </span>
                </div>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-auto h-10"
                />
              </div>

              <Button type="submit" className="w-full" disabled={addTransaction.isPending}>
                {addTransaction.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Today's Expenses Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card variant="elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Today's Expenses - {format(new Date(), "dd MMM")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No expenses recorded today</p>
                <p className="text-xs mt-1">Update once at night (2-3 minutes)</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">Category</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Amount</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">Mode</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">Need?</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayTransactions.map((t, index) => (
                      <motion.tr
                        key={t.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-border/50 hover:bg-secondary/50"
                      >
                        <td className="py-3">
                          <span className="text-lg">{getCategoryIcon(t.category)}</span>
                        </td>
                        <td className="py-3 font-medium">{t.name}</td>
                        <td className="py-3 text-right font-mono text-destructive">
                          ₹{t.amount}
                        </td>
                        <td className="py-3 text-center text-xs text-muted-foreground uppercase">
                          {t.payment_method}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            t.description === "Necessary" 
                              ? 'bg-success/20 text-success' 
                              : 'bg-amber-500/20 text-amber-600'
                          }`}>
                            {t.description === "Necessary" ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(t.id)}
                            className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-secondary/30">
                      <td colSpan={2} className="py-3 font-medium">Total Today</td>
                      <td className="py-3 text-right font-bold text-destructive">
                        {formatCurrency(todayTransactions.reduce((sum, t) => sum + t.amount, 0))}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Category-wise Totals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card variant="elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Category-wise Total (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {simpleCategories.map((cat) => {
                const total = categoryTotals[cat.value] || 0;
                return (
                  <motion.div
                    key={cat.value}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 bg-secondary/50 rounded-lg text-center"
                  >
                    <span className="text-2xl">{cat.label.split(" ")[0]}</span>
                    <p className="text-xs text-muted-foreground mt-1">{cat.label.split(" ").slice(1).join(" ")}</p>
                    <p className="font-bold text-foreground mt-1">{formatCurrency(total)}</p>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Daily Habit Reminder */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center py-4"
      >
        <p className="text-sm text-muted-foreground italic">
          💡 Tracking ≠ restriction • Tracking = awareness
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Even ₹10 goes in. No guilt. Just honesty.
        </p>
      </motion.div>
    </div>
  );
}
