import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { 
  Target, 
  Wallet, 
  ShieldCheck, 
  CreditCard, 
  TrendingUp,
  Plus,
  Edit2,
  CheckCircle2,
  Clock,
  AlertTriangle
} from "lucide-react";
import { useEmergencyFundSummary, useCreateOrUpdateEmergencyFund } from "@/hooks/useEmergencyFund";
import { useDebtSummary } from "@/hooks/useDebts";
import { useTransactions } from "@/hooks/useTransactions";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function GoalTracker() {
  const { fund, progress: emergencyProgress, remaining: emergencyRemaining, monthlyContributionNeeded, isLoading: emergencyLoading } = useEmergencyFundSummary();
  const { debts, totalDebt, debtFreeDate, totalMonthlyPayment, isLoading: debtLoading } = useDebtSummary();
  const { data: transactions = [] } = useTransactions();
  const updateEmergencyFund = useCreateOrUpdateEmergencyFund();

  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const [goalAmount, setGoalAmount] = useState(fund?.goal_amount?.toString() || "100000");
  const [currentAmount, setCurrentAmount] = useState(fund?.current_amount?.toString() || "0");

  // Calculate savings goal progress (based on last 6 months average savings)
  const savingsData = (() => {
    const now = new Date();
    const monthsData: { savings: number }[] = [];
    
    for (let i = 0; i < 6; i++) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      
      const monthTransactions = transactions.filter(t => {
        const date = parseISO(t.transaction_date);
        return date >= monthStart && date <= monthEnd;
      });
      
      const income = monthTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = monthTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
      
      monthsData.push({ savings: income - expense });
    }
    
    const avgMonthlySavings = monthsData.reduce((sum, m) => sum + m.savings, 0) / 6;
    const totalSavings = monthsData.reduce((sum, m) => sum + Math.max(0, m.savings), 0);
    const targetSavings = avgMonthlySavings > 0 ? avgMonthlySavings * 12 : 50000; // Yearly target
    const progress = targetSavings > 0 ? Math.min(100, (totalSavings / targetSavings) * 100) : 0;
    
    return { avgMonthlySavings, totalSavings, targetSavings, progress };
  })();

  // Debt payoff milestones
  const debtMilestones = debts.map(debt => {
    const paidOff = Number(debt.principal_amount) - Number(debt.outstanding_amount);
    const progress = Number(debt.principal_amount) > 0 
      ? Math.round((paidOff / Number(debt.principal_amount)) * 100) 
      : 0;
    const monthsRemaining = Number(debt.minimum_payment) > 0 
      ? Math.ceil(Number(debt.outstanding_amount) / Number(debt.minimum_payment))
      : 0;
    
    return {
      ...debt,
      paidOff,
      progress,
      monthsRemaining,
    };
  });

  const handleSaveEmergencyFund = async () => {
    try {
      await updateEmergencyFund.mutateAsync({
        goal_amount: Number(goalAmount),
        current_amount: Number(currentAmount),
      });
      toast.success("Emergency fund updated!");
      setEmergencyDialogOpen(false);
    } catch (error) {
      toast.error("Failed to update emergency fund");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "bg-success";
    if (progress >= 50) return "bg-primary";
    if (progress >= 25) return "bg-warning";
    return "bg-destructive";
  };

  const getProgressStatus = (progress: number) => {
    if (progress >= 100) return { icon: CheckCircle2, text: "Completed", color: "text-success" };
    if (progress >= 75) return { icon: TrendingUp, text: "On Track", color: "text-success" };
    if (progress >= 50) return { icon: Clock, text: "In Progress", color: "text-primary" };
    return { icon: AlertTriangle, text: "Needs Attention", color: "text-warning" };
  };

  if (emergencyLoading || debtLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Financial Goals</h2>
          <p className="text-muted-foreground">Track your progress towards financial freedom</p>
        </div>
      </div>

      {/* Main Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emergency Fund Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-hover h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-success" />
                  </div>
                  Emergency Fund
                </CardTitle>
                <Dialog open={emergencyDialogOpen} onOpenChange={setEmergencyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      {fund ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Set Emergency Fund Goal</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Goal Amount</Label>
                        <Input
                          type="number"
                          value={goalAmount}
                          onChange={(e) => setGoalAmount(e.target.value)}
                          placeholder="Enter goal amount"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Current Amount</Label>
                        <Input
                          type="number"
                          value={currentAmount}
                          onChange={(e) => setCurrentAmount(e.target.value)}
                          placeholder="Enter current amount"
                        />
                      </div>
                      <Button 
                        onClick={handleSaveEmergencyFund} 
                        className="w-full"
                        disabled={updateEmergencyFund.isPending}
                      >
                        {updateEmergencyFund.isPending ? "Saving..." : "Save Goal"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fund ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className={`flex items-center gap-1 ${getProgressStatus(emergencyProgress).color}`}>
                      {(() => {
                        const StatusIcon = getProgressStatus(emergencyProgress).icon;
                        return <StatusIcon className="w-4 h-4" />;
                      })()}
                      {getProgressStatus(emergencyProgress).text}
                    </span>
                  </div>
                  
                  <div className="relative pt-1">
                    <Progress 
                      value={emergencyProgress} 
                      className="h-4 bg-muted"
                    />
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>{formatCurrency(fund.current_amount)}</span>
                      <span className="font-semibold text-foreground">{emergencyProgress}%</span>
                      <span>{formatCurrency(fund.goal_amount)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="text-lg font-semibold text-foreground">{formatCurrency(emergencyRemaining)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-xs text-muted-foreground">Monthly Needed</p>
                      <p className="text-lg font-semibold text-primary">{formatCurrency(monthlyContributionNeeded)}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">No emergency fund goal set</p>
                  <Button onClick={() => setEmergencyDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Set Goal
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Savings Goal Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-hover h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                Yearly Savings Goal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Based on 6-month average</span>
                <span className={`flex items-center gap-1 ${getProgressStatus(savingsData.progress).color}`}>
                  {(() => {
                    const StatusIcon = getProgressStatus(savingsData.progress).icon;
                    return <StatusIcon className="w-4 h-4" />;
                  })()}
                  {getProgressStatus(savingsData.progress).text}
                </span>
              </div>
              
              <div className="relative pt-1">
                <Progress 
                  value={savingsData.progress} 
                  className="h-4 bg-muted"
                />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{formatCurrency(savingsData.totalSavings)}</span>
                  <span className="font-semibold text-foreground">{savingsData.progress.toFixed(0)}%</span>
                  <span>{formatCurrency(savingsData.targetSavings)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Avg Monthly Savings</p>
                  <p className={`text-lg font-semibold ${savingsData.avgMonthlySavings >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(savingsData.avgMonthlySavings)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">6-Month Total</p>
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(savingsData.totalSavings)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Debt Payoff Milestones */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-accent" />
                </div>
                Debt Payoff Milestones
              </CardTitle>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Estimated Debt-Free Date</p>
                <p className="text-sm font-semibold text-foreground">{format(debtFreeDate, "MMM yyyy")}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {debtMilestones.length > 0 ? (
              <div className="space-y-4">
                {/* Overall Debt Progress */}
                <div className="p-4 rounded-xl bg-secondary/50 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Total Debt Progress</span>
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(totalDebt)} remaining</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Monthly Payment: {formatCurrency(totalMonthlyPayment)}</span>
                    <span>{debts.length} active {debts.length === 1 ? "debt" : "debts"}</span>
                  </div>
                </div>

                {/* Individual Debts */}
                <div className="grid gap-4">
                  {debtMilestones.map((debt, index) => (
                    <motion.div
                      key={debt.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="p-4 rounded-xl bg-card border border-border"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-foreground">{debt.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{debt.type.replace("_", " ")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(debt.outstanding_amount))}</p>
                          <p className="text-xs text-muted-foreground">{debt.interest_rate}% APR</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Paid: {formatCurrency(debt.paidOff)}</span>
                          <span className={`font-medium ${debt.progress >= 50 ? "text-success" : "text-warning"}`}>
                            {debt.progress}% complete
                          </span>
                        </div>
                        <Progress 
                          value={debt.progress} 
                          className="h-2 bg-muted"
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Min. Payment: {formatCurrency(Number(debt.minimum_payment))}/mo</span>
                          <span>~{debt.monthsRemaining} months left</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                <p className="text-lg font-medium text-foreground">Debt Free!</p>
                <p className="text-sm text-muted-foreground">You have no active debts</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
