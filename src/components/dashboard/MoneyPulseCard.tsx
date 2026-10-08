import { motion } from "framer-motion";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Calendar,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { Button } from "@/components/ui/button";

export function MoneyPulseCard() {
  const {
    moneyPulse,
    formatMoney,
    profile,
    getCurrentMonthCycle,
    setShowQuickAddModal,
    setShowDashboardCustomizer,
  } = useCoinKeeper();

  const cycle = getCurrentMonthCycle();

  const statusConfig = moneyPulse.isStandby
    ? {
        color: "text-primary",
        bg: "bg-primary/10",
        border: "border-primary/25",
        glow: "shadow-[0_0_30px_hsl(168_60%_55%/0.1)]",
        badge: "Standby · Ready",
        icon: Activity,
      }
    : {
        healthy: {
          color: "text-success",
          bg: "bg-success/10",
          border: "border-success/30",
          glow: "shadow-[0_0_30px_hsl(152_55%_48%/0.15)]",
          badge: "Healthy · On Track",
          icon: ShieldCheck,
        },
        watch: {
          color: "text-warning",
          bg: "bg-warning/10",
          border: "border-warning/30",
          glow: "shadow-[0_0_30px_hsl(42_85%_55%/0.15)]",
          badge: "Watch · Moderate Pace",
          icon: AlertTriangle,
        },
        critical: {
          color: "text-destructive",
          bg: "bg-destructive/10",
          border: "border-destructive/30",
          glow: "shadow-[0_0_30px_hsl(0_65%_55%/0.2)]",
          badge: "Caution · High Burn Rate",
          icon: Flame,
        },
      }[moneyPulse.status];

  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`glass-premium rounded-2xl p-5 sm:p-6 border ${statusConfig.border} ${statusConfig.glow} relative overflow-hidden`}
    >
      {/* Background ambient gradient */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full filter blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${statusConfig.bg} ${statusConfig.color}`}>
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                Money Pulse
              </h2>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}>
                {statusConfig.badge}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personalized for {profile.persona} · Priority: {profile.primaryPriority.replace("_", " ")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowDashboardCustomizer(true)}
            className="text-xs h-8 gap-1.5 border-border/50 text-muted-foreground hover:text-foreground"
          >
            <Sliders className="w-3.5 h-3.5" /> Customize
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowQuickAddModal(true)}
            className="text-xs h-8 bg-primary text-primary-foreground hover:opacity-90 shadow-sm font-semibold"
          >
            + Add Expense
          </Button>
        </div>
      </div>

      {/* Score and Main Burn Rate Gauge */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-card/50 border border-border/30 mb-5 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="currentColor"
                strokeWidth="5"
                fill="transparent"
                className="text-muted/40"
              />
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="currentColor"
                strokeWidth="5"
                fill="transparent"
                strokeDasharray={163.3}
                strokeDashoffset={
                  moneyPulse.score !== null
                    ? 163.3 - (163.3 * moneyPulse.score) / 100
                    : 163.3
                }
                className={`${statusConfig.color} transition-all duration-1000 ease-out`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute font-mono font-bold text-base text-foreground">
              {moneyPulse.score !== null ? moneyPulse.score : "—"}
            </span>
          </div>

          <div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Health Score
            </div>
            <div className="text-sm font-semibold text-foreground mt-0.5">
              {moneyPulse.title}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              {moneyPulse.description}
            </p>
          </div>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-border/40 pt-3 md:pt-0 md:pl-4">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
            Daily Burn Rate
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">
              {formatMoney(moneyPulse.burnRatePerDay)}
            </span>
            <span className="text-xs text-muted-foreground">/ day</span>
          </div>
          <span className="text-[11px] text-muted-foreground block mt-0.5">
            {moneyPulse.daysRemainingInMonth} days left in {cycle.monthKey}
          </span>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-border/40 pt-3 md:pt-0 md:pl-4">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
            Projected Month-End
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">
              {formatMoney(moneyPulse.projectedMonthEndSpending)}
            </span>
            <span className="text-xs text-muted-foreground">vs {formatMoney(cycle.budget)} budget</span>
          </div>
          <span className="text-[11px] text-muted-foreground block mt-0.5">
            {moneyPulse.projectedMonthEndSpending <= cycle.budget ? (
              <span className="text-success font-medium">Within target monthly limit</span>
            ) : (
              <span className="text-warning font-medium">May exceed by {formatMoney(moneyPulse.projectedMonthEndSpending - cycle.budget)}</span>
            )}
          </span>
        </div>
      </div>

      {/* Adaptive Key Health Drivers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
        {moneyPulse.keyFactors.map((factor, idx) => {
          const factorColor =
            factor.status === "good"
              ? "text-success bg-success/10 border-success/20"
              : factor.status === "warning"
              ? "text-warning bg-warning/10 border-warning/20"
              : "text-destructive bg-destructive/10 border-destructive/20";

          return (
            <div
              key={idx}
              className="p-3 rounded-xl bg-card/30 border border-border/30 flex items-start gap-2.5 text-xs"
            >
              <div className={`p-1 rounded-md shrink-0 mt-0.5 ${factorColor}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-foreground block">
                  {factor.label}
                </span>
                <span className="text-muted-foreground text-[11px] block mt-0.5 leading-snug">
                  {factor.detail}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
