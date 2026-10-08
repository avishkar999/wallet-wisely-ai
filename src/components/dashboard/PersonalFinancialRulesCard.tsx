import { useState } from "react";
import { motion } from "framer-motion";
import { Scale, Plus, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function PersonalFinancialRulesCard() {
  const { rules, addRule, toggleRule, deleteRule, formatMoney } = useCoinKeeper();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [threshold, setThreshold] = useState("");
  const [condition, setCondition] = useState<"below" | "above" | "save_at_least">("below");

  const handleCreate = () => {
    if (!title || !threshold) return;
    addRule({
      title,
      description: `${condition === "below" ? "Cap spending below" : "Maintain at least"} ${threshold}`,
      threshold: parseFloat(threshold),
      condition,
      enabled: true,
    });
    setShowAdd(false);
    setTitle("");
    setThreshold("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-premium rounded-2xl p-5 sm:p-6 border border-border/40 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            <h3 className="text-base font-bold text-foreground tracking-tight">
              Personal Financial Rules
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your self-defined financial guardrails and automated monitors
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowAdd(true)}
          className="text-xs h-8 border-border/50 gap-1 text-primary hover:text-primary"
        >
          <Plus className="w-3.5 h-3.5" /> Rule
        </Button>
      </div>

      <div className="space-y-2.5">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
              rule.enabled
                ? "bg-card/40 border-border/40 text-foreground"
                : "bg-secondary/20 border-border/20 opacity-50 text-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleRule(rule.id)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  rule.enabled
                    ? "bg-success/15 text-success border-success/30"
                    : "bg-secondary text-muted-foreground border-border/40"
                }`}
                title={rule.enabled ? "Rule is active" : "Rule is paused"}
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <div>
                <span className="font-semibold text-sm text-foreground block">
                  {rule.title}
                </span>
                <span className="text-xs text-muted-foreground block">
                  {rule.description}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary">
                {formatMoney(rule.threshold)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => deleteRule(rule.id)}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Rule Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-2xl border-border/70 p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">New Financial Rule</DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 my-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Rule Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Keep Dining Out < ₹8,000"
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Condition Type
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground"
              >
                <option value="below">Keep Spending Below Limit</option>
                <option value="save_at_least">Save At Least Minimum</option>
                <option value="above">Invest Greater Than Target</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Target Amount
              </label>
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="8000"
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreate}
              className="bg-primary text-primary-foreground font-semibold"
            >
              Save Rule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
