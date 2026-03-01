import { useState, useMemo } from "react";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Target, ArrowRight, ArrowUpRight, ArrowDownRight,
  RefreshCw, Sparkles, AlertTriangle, CheckCircle,
  TrendingUp, TrendingDown, DollarSign, Scale,
} from "lucide-react";
import { Bell, BellOff, Mail, Send, Loader2, Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useInvestmentSummary } from "@/hooks/useInvestments";
import { usePortfolioAlerts } from "@/hooks/usePortfolioAlerts";
import { useAuth } from "@/contexts/AuthContext";

interface AllocationTarget {
  type: string;
  label: string;
  targetPercent: number;
  color: string;
}

const DEFAULT_ALLOCATIONS: AllocationTarget[] = [
  { type: "mutual_fund", label: "Mutual Funds", targetPercent: 40, color: "hsl(var(--primary))" },
  { type: "stock", label: "Stocks", targetPercent: 30, color: "hsl(var(--success))" },
  { type: "fixed_deposit", label: "Fixed Deposits", targetPercent: 15, color: "hsl(var(--warning))" },
  { type: "gold", label: "Gold", targetPercent: 10, color: "hsl(38 92% 50%)" },
  { type: "other", label: "Other", targetPercent: 5, color: "hsl(var(--muted-foreground))" },
];

export function PortfolioRebalancing() {
  const { totalCurrentValue, byType, investments } = useInvestmentSummary();
  const { user } = useAuth();
  const {
    settings, isLoading: isLoadingSettings, updateSettings, sendDriftAlert,
    isAlertsEnabled, driftThreshold, alertEmail,
  } = usePortfolioAlerts();

  const [allocations, setAllocations] = useState<AllocationTarget[]>(DEFAULT_ALLOCATIONS);
  const [isEditing, setIsEditing] = useState(false);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [localThreshold, setLocalThreshold] = useState(driftThreshold);
  const [localEmail, setLocalEmail] = useState(alertEmail || "");

  useEffect(() => {
    setLocalThreshold(driftThreshold);
    setLocalEmail(alertEmail || "");
  }, [driftThreshold, alertEmail]);

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return new Intl.NumberFormat("en-IN", {
      style: "currency", currency: "INR", maximumFractionDigits: 0,
    }).format(amount);
  };

  const allocationAnalysis = useMemo(() => {
    return allocations.map((target) => {
      const typeData = byType[target.type];
      const currentValue = typeData?.current || 0;
      const currentPercent = totalCurrentValue > 0 ? (currentValue / totalCurrentValue) * 100 : 0;
      const difference = currentPercent - target.targetPercent;
      const targetValue = (target.targetPercent / 100) * totalCurrentValue;
      const amountDifference = currentValue - targetValue;

      return {
        ...target,
        currentValue,
        currentPercent,
        difference,
        targetValue,
        amountDifference,
        status: Math.abs(difference) < 3 ? "balanced" : difference > 0 ? "over" : "under",
      };
    });
  }, [allocations, byType, totalCurrentValue]);

  const needsRebalancing = allocationAnalysis.some((a) => Math.abs(a.difference) >= 5);

  const maxDrift = useMemo(() => {
    return Math.max(...allocationAnalysis.map((a) => Math.abs(a.difference)));
  }, [allocationAnalysis]);

  // Smart rebalancing: calculate optimal trades
  const rebalancingPlan = useMemo(() => {
    const overAllocated = allocationAnalysis
      .filter((a) => a.amountDifference > 0 && Math.abs(a.difference) >= 3)
      .sort((a, b) => b.amountDifference - a.amountDifference);

    const underAllocated = allocationAnalysis
      .filter((a) => a.amountDifference < 0 && Math.abs(a.difference) >= 3)
      .sort((a, b) => a.amountDifference - b.amountDifference);

    const totalExcess = overAllocated.reduce((sum, a) => sum + a.amountDifference, 0);
    const totalDeficit = Math.abs(underAllocated.reduce((sum, a) => sum + a.amountDifference, 0));
    const rebalanceAmount = Math.min(totalExcess, totalDeficit);

    // Generate trade pairs
    const trades: { from: string; to: string; amount: number; fromColor: string; toColor: string }[] = [];
    let overIdx = 0;
    let underIdx = 0;
    let overRemaining = overAllocated[0]?.amountDifference || 0;
    let underRemaining = Math.abs(underAllocated[0]?.amountDifference || 0);

    while (overIdx < overAllocated.length && underIdx < underAllocated.length) {
      const tradeAmount = Math.min(overRemaining, underRemaining);
      if (tradeAmount > 100) {
        trades.push({
          from: overAllocated[overIdx].label,
          to: underAllocated[underIdx].label,
          amount: tradeAmount,
          fromColor: overAllocated[overIdx].color,
          toColor: underAllocated[underIdx].color,
        });
      }

      overRemaining -= tradeAmount;
      underRemaining -= tradeAmount;

      if (overRemaining <= 100) {
        overIdx++;
        overRemaining = overAllocated[overIdx]?.amountDifference || 0;
      }
      if (underRemaining <= 100) {
        underIdx++;
        underRemaining = Math.abs(underAllocated[underIdx]?.amountDifference || 0);
      }
    }

    return { trades, rebalanceAmount, totalExcess, totalDeficit };
  }, [allocationAnalysis]);

  const handleAllocationChange = (index: number, newPercent: number) => {
    const newAllocations = [...allocations];
    newAllocations[index] = { ...newAllocations[index], targetPercent: newPercent };
    setAllocations(newAllocations);
  };

  const totalTargetPercent = allocations.reduce((sum, a) => sum + a.targetPercent, 0);

  const handleSendAlert = () => {
    const driftData = allocationAnalysis.map((a) => ({
      type: a.type, label: a.label, currentPercent: a.currentPercent,
      targetPercent: a.targetPercent, difference: a.difference,
    }));
    sendDriftAlert.mutate({ driftData, maxDrift });
  };

  const handleToggleAlerts = () => {
    updateSettings.mutate({ alertsEnabled: !isAlertsEnabled });
  };

  const handleSaveAlertSettings = () => {
    updateSettings.mutate({ driftThreshold: localThreshold, alertEmail: localEmail || null });
    setShowAlertSettings(false);
  };

  if (investments.length === 0) return null;

  return (
    <Card variant="glow" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-primary/5" />
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <PieChart className="w-5 h-5 text-accent" />
          Portfolio Rebalancing
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? "Done" : "Edit Targets"}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowAlertSettings(!showAlertSettings)}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alert Settings Panel */}
        {showAlertSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-xl bg-secondary/50 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isAlertsEnabled ? <Bell className="w-5 h-5 text-primary" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
                <div>
                  <p className="font-medium text-foreground text-sm">Drift Alerts</p>
                  <p className="text-xs text-muted-foreground">Get notified when portfolio drifts</p>
                </div>
              </div>
              <Switch checked={isAlertsEnabled} onCheckedChange={handleToggleAlerts} disabled={updateSettings.isPending} />
            </div>

            {isAlertsEnabled && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Alert Threshold: {localThreshold}%</Label>
                    <Slider value={[localThreshold]} onValueChange={(v) => setLocalThreshold(v[0])} min={1} max={20} step={1} className="w-full" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alert-email" className="flex items-center gap-2 text-sm"><Mail className="w-3 h-3" />Alert Email</Label>
                    <Input id="alert-email" type="email" placeholder={user?.email || "your@email.com"} value={localEmail} onChange={(e) => setLocalEmail(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveAlertSettings} disabled={updateSettings.isPending}>
                      {updateSettings.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}Save Settings
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleSendAlert} disabled={sendDriftAlert.isPending || maxDrift < 1}>
                      {sendDriftAlert.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}Test Alert
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Status Banner */}
        {needsRebalancing ? (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-warning/10 border border-warning/20">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Rebalancing Recommended</p>
              <p className="text-xs text-muted-foreground">Max drift: {maxDrift.toFixed(1)}% — {rebalancingPlan.trades.length} trade{rebalancingPlan.trades.length !== 1 ? "s" : ""} suggested</p>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-success/10 border border-success/20">
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Portfolio Balanced</p>
              <p className="text-xs text-muted-foreground">All allocations within target ranges</p>
            </div>
          </motion.div>
        )}

        {/* Allocation Bars */}
        <div className="space-y-4">
          {allocationAnalysis.map((allocation, index) => (
            <motion.div key={allocation.type} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: allocation.color }} />
                  <span className="text-sm font-medium text-foreground">{allocation.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input type="number" value={allocation.targetPercent}
                        onChange={(e) => handleAllocationChange(index, Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="w-16 h-7 text-center text-sm" />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs text-muted-foreground">
                        {allocation.currentPercent.toFixed(1)}% / {allocation.targetPercent}%
                      </span>
                      {allocation.status !== "balanced" && (
                        <span className={`text-xs font-medium flex items-center gap-0.5 ${allocation.status === "over" ? "text-warning" : "text-primary"}`}>
                          {allocation.status === "over" ? (
                            <><ArrowUpRight className="w-3 h-3" />+{allocation.difference.toFixed(1)}%</>
                          ) : (
                            <><ArrowDownRight className="w-3 h-3" />{allocation.difference.toFixed(1)}%</>
                          )}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="relative h-4 bg-secondary rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(allocation.currentPercent, 100)}%`, backgroundColor: allocation.color, opacity: 0.7 }} />
                <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/50" style={{ left: `${allocation.targetPercent}%` }} />
              </div>
            </motion.div>
          ))}
        </div>

        {isEditing && (
          <div className={`text-sm ${totalTargetPercent === 100 ? "text-success" : "text-destructive"}`}>
            Total: {totalTargetPercent}% {totalTargetPercent !== 100 && "(should be 100%)"}
          </div>
        )}

        {/* Smart Rebalancing Plan */}
        {needsRebalancing && !isEditing && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Smart Rebalancing Plan</span>
              <Badge variant="secondary" className="text-xs">
                {formatCurrency(rebalancingPlan.rebalanceAmount)} to move
              </Badge>
            </div>

            {/* Sell/Buy Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-xs font-medium text-destructive">Reduce / Sell</span>
                </div>
                <div className="space-y-1.5">
                  {allocationAnalysis
                    .filter((a) => a.amountDifference > 0 && Math.abs(a.difference) >= 3)
                    .sort((a, b) => b.amountDifference - a.amountDifference)
                    .map((a) => (
                      <div key={a.type} className="flex items-center justify-between">
                        <span className="text-xs text-foreground">{a.label}</span>
                        <span className="text-xs font-semibold text-destructive">-{formatCurrency(a.amountDifference)}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-success/5 border border-success/10">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-success" />
                  <span className="text-xs font-medium text-success">Increase / Buy</span>
                </div>
                <div className="space-y-1.5">
                  {allocationAnalysis
                    .filter((a) => a.amountDifference < 0 && Math.abs(a.difference) >= 3)
                    .sort((a, b) => a.amountDifference - b.amountDifference)
                    .map((a) => (
                      <div key={a.type} className="flex items-center justify-between">
                        <span className="text-xs text-foreground">{a.label}</span>
                        <span className="text-xs font-semibold text-success">+{formatCurrency(Math.abs(a.amountDifference))}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Trade Flow */}
            {rebalancingPlan.trades.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs font-medium text-muted-foreground">Suggested Trades</span>
                </div>
                {rebalancingPlan.trades.map((trade, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border/50"
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: trade.fromColor }} />
                      <span className="text-xs text-foreground truncate">{trade.from}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs font-semibold px-1.5 py-0">
                        {formatCurrency(trade.amount)}
                      </Badge>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                      <span className="text-xs text-foreground truncate">{trade.to}</span>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: trade.toColor }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {isEditing && (
          <Button variant="outline" size="sm" onClick={() => setAllocations(DEFAULT_ALLOCATIONS)} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />Reset to Default Allocations
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
