import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ArrowUpRight } from "lucide-react";

interface HealthScoreCardProps {
  score: number;
  change: number;
}

export function HealthScoreCard({ score, change }: HealthScoreCardProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 500);
    return () => clearTimeout(timer);
  }, [score]);

  const getScoreColor = (s: number) => {
    if (s >= 80) return "hsl(var(--success))";
    if (s >= 60) return "hsl(var(--primary))";
    if (s >= 40) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return "Excellent";
    if (s >= 60) return "Good";
    if (s >= 40) return "Fair";
    return "Needs Work";
  };

  return (
    <Card variant="glow" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-primary" />
          Financial Health Score
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex items-center justify-between">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            {/* Animated progress circle */}
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={getScoreColor(animatedScore)}
              strokeWidth="8"
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
              style={{ strokeDasharray: circumference }}
              className="drop-shadow-[0_0_8px_currentColor]"
            />
          </svg>
          
          {/* Center score */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-4xl font-bold counter"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              style={{ color: getScoreColor(animatedScore) }}
            >
              {animatedScore}
            </motion.span>
            <span className="text-xs text-muted-foreground">out of 100</span>
          </div>
        </div>

        <div className="flex-1 pl-6 space-y-4">
          <div>
            <p className="text-2xl font-bold text-foreground">{getScoreLabel(score)}</p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-4 h-4 text-success" />
              <span className="text-sm text-success font-medium">+{change} pts</span>
              <span className="text-sm text-muted-foreground">this month</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Savings Rate</span>
              <span className="text-foreground font-medium">24%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Debt Ratio</span>
              <span className="text-foreground font-medium">18%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Emergency Fund</span>
              <span className="text-success font-medium">6 months</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
