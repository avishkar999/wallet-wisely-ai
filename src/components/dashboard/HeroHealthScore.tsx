import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TrendingUp, Zap, Shield, Target, Sparkles } from "lucide-react";
import { useFinancialHealthScore } from "@/hooks/useFinancialHealthScore";
import { Button } from "@/components/ui/button";

export function HeroHealthScore() {
  const { score, label, savingsRate, debtRatio, emergencyMonths, isLoading, hasData } = useFinancialHealthScore();
  const [animatedScore, setAnimatedScore] = useState(0);
  const circumference = 2 * Math.PI * 52;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        const interval = setInterval(() => {
          setAnimatedScore(prev => {
            if (prev >= score) {
              clearInterval(interval);
              return score;
            }
            return prev + 1;
          });
        }, 20);
        return () => clearInterval(interval);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [score, isLoading]);

  const getScoreColor = (s: number) => {
    if (s >= 80) return "hsl(var(--success))";
    if (s >= 60) return "hsl(var(--primary))";
    if (s >= 40) return "hsl(var(--warning))";
    if (s > 0) return "hsl(var(--destructive))";
    return "hsl(var(--muted-foreground))";
  };

  const getScoreGradient = (s: number) => {
    if (s >= 80) return "from-success to-primary";
    if (s >= 60) return "from-primary to-accent";
    if (s >= 40) return "from-warning to-primary";
    return "from-destructive to-warning";
  };

  const metrics = [
    { 
      label: "Savings Rate", 
      value: `${savingsRate}%`, 
      icon: TrendingUp,
      status: savingsRate >= 20 ? "good" : savingsRate >= 10 ? "ok" : "low"
    },
    { 
      label: "Debt Ratio", 
      value: `${debtRatio}%`, 
      icon: Shield,
      status: debtRatio <= 30 ? "good" : debtRatio <= 50 ? "ok" : "high"
    },
    { 
      label: "Emergency Fund", 
      value: `${emergencyMonths} mo`, 
      icon: Target,
      status: emergencyMonths >= 6 ? "good" : emergencyMonths >= 3 ? "ok" : "low"
    },
  ];

  if (isLoading) {
    return (
      <div className="card-hero p-8">
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="card-hero p-6 sm:p-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Financial Health</h2>
            <p className="text-sm text-muted-foreground">Your wellness score</p>
          </div>
        </div>
        {hasData && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="metric-badge"
          >
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-muted-foreground">Updated today</span>
          </motion.div>
        )}
      </div>

      {/* Main Score Display */}
      <div className="flex flex-col sm:flex-row items-center gap-8">
        {/* Score Ring */}
        <div className="relative">
          <svg className="w-40 h-40 sm:w-48 sm:h-48 transform -rotate-90" viewBox="0 0 120 120">
            {/* Background ring */}
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              className="score-ring-bg"
              strokeWidth="10"
            />
            {/* Progress ring */}
            <motion.circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={getScoreColor(animatedScore)}
              strokeWidth="10"
              className="score-ring-progress glow-ring"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.8, ease: "easeOut", delay: 0.3 }}
              style={{ strokeDasharray: circumference }}
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className={`text-5xl sm:text-6xl font-bold counter bg-gradient-to-br ${getScoreGradient(animatedScore)} bg-clip-text text-transparent`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5, type: "spring" }}
            >
              {animatedScore}
            </motion.span>
            <motion.span 
              className="text-xs text-muted-foreground mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              out of 100
            </motion.span>
          </div>
        </div>

        {/* Score Details */}
        <div className="flex-1 space-y-4 w-full sm:w-auto">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <p className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${getScoreGradient(animatedScore)} bg-clip-text text-transparent`}>
              {label}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasData 
                ? "Based on your financial data" 
                : "Add transactions to calculate your score"}
            </p>
          </motion.div>

          {/* Metric Pills */}
          <div className="flex flex-wrap gap-2">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              const statusColor = metric.status === "good" 
                ? "text-success" 
                : metric.status === "ok" 
                  ? "text-primary" 
                  : "text-warning";
              
              return (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="metric-badge"
                >
                  <Icon className={`w-3.5 h-3.5 ${statusColor}`} />
                  <span className="text-muted-foreground">{metric.label}:</span>
                  <span className={`font-semibold ${statusColor}`}>{metric.value}</span>
                </motion.div>
              );
            })}
          </div>

          {/* CTA */}
          {!hasData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <Button className="mt-2" size="sm">
                <TrendingUp className="w-4 h-4 mr-2" />
                Start Tracking
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
