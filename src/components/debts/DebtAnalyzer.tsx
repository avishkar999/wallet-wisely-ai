import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, 
  TrendingDown, 
  AlertTriangle, 
  Target,
  Calendar,
  Zap,
  ArrowRight,
  Snowflake,
  Flame,
  Plus
} from "lucide-react";
import { useDebts, useDebtSummary } from "@/hooks/useDebts";
import { EmptyState } from "@/components/ui/empty-state";
import { AddDebtDialog } from "@/components/forms/AddDebtDialog";
import { useState } from "react";

export function DebtAnalyzer() {
  const { data: debts, isLoading } = useDebts();
  const { totalDebt, totalMonthly, avgInterest, sortedByInterest, sortedByAmount, debtFreeDate } = useDebtSummary();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "credit_card": return CreditCard;
      case "personal_loan": 
      case "home_loan":
      case "car_loan":
      case "education_loan": 
        return TrendingDown;
      default: return Calendar;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "credit_card": return "hsl(var(--destructive))";
      case "personal_loan": return "hsl(var(--warning))";
      case "home_loan": return "hsl(var(--primary))";
      case "car_loan": return "hsl(var(--accent))";
      default: return "hsl(var(--muted-foreground))";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!debts || debts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Debt Analyzer</h1>
            <p className="text-sm text-muted-foreground">Track and manage your debts</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Debt
          </Button>
        </div>
        
        <EmptyState
          icon={CreditCard}
          title="No debts tracked"
          description="Great news! You have no debts to track, or you can add your existing debts to manage them better."
          action={
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Debt
            </Button>
          }
        />
        
        <AddDebtDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Debt Analyzer</h1>
          <p className="text-sm text-muted-foreground">Track and manage your debts</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Debt
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card variant="glow" className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-destructive" />
                <span className="text-sm text-muted-foreground">Total Debt</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{formatCurrency(totalDebt)}</p>
              <p className="text-xs text-muted-foreground mt-1">Across {debts.length} accounts</p>
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
                <Calendar className="w-5 h-5 text-warning" />
                <span className="text-sm text-muted-foreground">Monthly Payment</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{formatCurrency(totalMonthly)}</p>
              <p className="text-xs text-muted-foreground mt-1">Due this month</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <span className="text-sm text-muted-foreground">Avg. Interest</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{avgInterest.toFixed(1)}%</p>
              <p className="text-xs text-destructive mt-1">
                {avgInterest > 15 ? 'High interest debt present' : 'Manageable interest rate'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Debt List */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-primary" />
            Your Debts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {debts.map((debt, index) => {
            const Icon = getTypeIcon(debt.type);
            const color = getTypeColor(debt.type);
            const progress = debt.principal_amount > 0 
              ? ((debt.principal_amount - debt.outstanding_amount) / debt.principal_amount) * 100 
              : 0;

            return (
              <motion.div
                key={debt.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{debt.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: Day {debt.due_date || 'N/A'} of each month
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{formatCurrency(debt.outstanding_amount)}</p>
                    <p className="text-xs text-destructive">{debt.interest_rate}% APR</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Paid: {formatCurrency(debt.principal_amount - debt.outstanding_amount)}
                    </span>
                    <span className="text-muted-foreground">{progress.toFixed(0)}% complete</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-muted-foreground">
                      Min. Due: {formatCurrency(debt.minimum_payment)}
                    </span>
                    <Button variant="outline" size="sm">Pay Now</Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      {/* Payoff Strategies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="elevated" className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-destructive" />
                </div>
                Avalanche Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pay off highest interest rate debts first. Saves the most money in interest.
              </p>
              <div className="space-y-2">
                {sortedByInterest.slice(0, 3).map((debt, index) => (
                  <div key={debt.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">
                      {index + 1}. {debt.name}
                    </span>
                    <span className="text-destructive font-medium">{debt.interest_rate}%</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full">
                Use This Strategy <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card variant="elevated" className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Snowflake className="w-4 h-4 text-primary" />
                </div>
                Snowball Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pay off smallest debts first. Quick wins keep you motivated!
              </p>
              <div className="space-y-2">
                {sortedByAmount.slice(0, 3).map((debt, index) => (
                  <div key={debt.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">
                      {index + 1}. {debt.name}
                    </span>
                    <span className="text-primary font-medium">{formatCurrency(debt.outstanding_amount)}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full">
                Use This Strategy <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Debt-Free Predictor */}
      {debtFreeDate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card variant="glow" className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-success/10 to-primary/10" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-success" />
                    <span className="text-sm font-medium text-foreground">Estimated Debt-Free Date</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {debtFreeDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    At current payment pace
                  </p>
                </div>
                <Button>
                  <Zap className="w-4 h-4 mr-2" />
                  Optimize My Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <AddDebtDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  );
}
