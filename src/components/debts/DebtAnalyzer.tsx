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
  Flame
} from "lucide-react";

interface Debt {
  id: string;
  name: string;
  type: "credit_card" | "loan" | "emi";
  outstanding: number;
  interestRate: number;
  minimumDue: number;
  dueDate: string;
  totalPaid: number;
  totalAmount: number;
}

const debts: Debt[] = [
  {
    id: "1",
    name: "HDFC Credit Card",
    type: "credit_card",
    outstanding: 45000,
    interestRate: 36,
    minimumDue: 2250,
    dueDate: "Jan 5, 2025",
    totalPaid: 15000,
    totalAmount: 60000,
  },
  {
    id: "2",
    name: "Personal Loan - ICICI",
    type: "loan",
    outstanding: 180000,
    interestRate: 12.5,
    minimumDue: 8500,
    dueDate: "Jan 1, 2025",
    totalPaid: 120000,
    totalAmount: 300000,
  },
  {
    id: "3",
    name: "Car EMI - SBI",
    type: "emi",
    outstanding: 320000,
    interestRate: 9.5,
    minimumDue: 12000,
    dueDate: "Jan 10, 2025",
    totalPaid: 280000,
    totalAmount: 600000,
  },
  {
    id: "4",
    name: "Axis Credit Card",
    type: "credit_card",
    outstanding: 12000,
    interestRate: 42,
    minimumDue: 600,
    dueDate: "Jan 15, 2025",
    totalPaid: 8000,
    totalAmount: 20000,
  },
];

export function DebtAnalyzer() {
  const totalDebt = debts.reduce((sum, d) => sum + d.outstanding, 0);
  const totalMonthlyEMI = debts.reduce((sum, d) => sum + d.minimumDue, 0);
  const avgInterestRate = debts.reduce((sum, d) => sum + d.interestRate, 0) / debts.length;

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
      case "loan": return TrendingDown;
      default: return Calendar;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "credit_card": return "hsl(var(--destructive))";
      case "loan": return "hsl(var(--warning))";
      default: return "hsl(var(--primary))";
    }
  };

  // Sort by interest rate for avalanche method suggestion
  const sortedByInterest = [...debts].sort((a, b) => b.interestRate - a.interestRate);
  // Sort by outstanding amount for snowball method
  const sortedByAmount = [...debts].sort((a, b) => a.outstanding - b.outstanding);

  return (
    <div className="space-y-6">
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
                <span className="text-sm text-muted-foreground">Monthly EMI</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{formatCurrency(totalMonthlyEMI)}</p>
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
              <p className="text-3xl font-bold text-foreground">{avgInterestRate.toFixed(1)}%</p>
              <p className="text-xs text-destructive mt-1">High interest debt present</p>
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
            const progress = (debt.totalPaid / debt.totalAmount) * 100;

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
                      <p className="text-xs text-muted-foreground">Due: {debt.dueDate}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{formatCurrency(debt.outstanding)}</p>
                    <p className="text-xs text-destructive">{debt.interestRate}% APR</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Paid: {formatCurrency(debt.totalPaid)}</span>
                    <span className="text-muted-foreground">{progress.toFixed(0)}% complete</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-muted-foreground">Min. Due: {formatCurrency(debt.minimumDue)}</span>
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
                    <span className="text-destructive font-medium">{debt.interestRate}%</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-success">Potential savings: ₹18,500 in interest</p>
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
                    <span className="text-primary font-medium">{formatCurrency(debt.outstanding)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-primary">Clear first debt in: 2 months</p>
              </div>
              <Button variant="outline" className="w-full">
                Use This Strategy <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Debt-Free Predictor */}
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
                  <span className="text-sm font-medium text-foreground">Debt-Free Date</span>
                </div>
                <p className="text-3xl font-bold text-foreground">March 2027</p>
                <p className="text-sm text-muted-foreground mt-1">
                  At current pace • Pay ₹5,000 extra/month to finish by December 2026
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
    </div>
  );
}
