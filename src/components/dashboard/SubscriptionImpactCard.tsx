import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Plus, ArrowUpRight, Zap, Trash2 } from "lucide-react";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface SubscriptionItem {
  id: string;
  name: string;
  monthlyCost: number;
  category: string;
  icon: string;
}

const DEFAULT_SUBSCRIPTIONS: SubscriptionItem[] = [
  { id: "sub-1", name: "Netflix 4K Bundle", monthlyCost: 649, category: "Entertainment", icon: "🎬" },
  { id: "sub-2", name: "Spotify Duo", monthlyCost: 149, category: "Music", icon: "🎵" },
  { id: "sub-3", name: "ChatGPT Plus & AI", monthlyCost: 1999, category: "Productivity", icon: "🤖" },
  { id: "sub-4", name: "Gym Membership", monthlyCost: 1500, category: "Fitness", icon: "🏋️" },
  { id: "sub-5", name: "iCloud+ 2TB", monthlyCost: 749, category: "Cloud Storage", icon: "☁️" },
];

export function SubscriptionImpactCard() {
  const { formatMoney } = useCoinKeeper();

  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>(() => {
    try {
      const raw = localStorage.getItem("coinkeeper_subs_v1");
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return DEFAULT_SUBSCRIPTIONS;
  });

  const [showAdd, setShowAdd] = useState(false);
  const [subName, setSubName] = useState("");
  const [subCost, setSubCost] = useState("");
  const [subCategory, setSubCategory] = useState("Entertainment");

  const totalMonthly = subscriptions.reduce((sum, s) => sum + s.monthlyCost, 0);
  const totalAnnual = totalMonthly * 12;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName || !subCost) return;
    const newSub: SubscriptionItem = {
      id: `sub-${Date.now()}`,
      name: subName,
      monthlyCost: parseFloat(subCost) || 0,
      category: subCategory,
      icon: "💳",
    };
    const updated = [...subscriptions, newSub];
    setSubscriptions(updated);
    localStorage.setItem("coinkeeper_subs_v1", JSON.stringify(updated));
    setShowAdd(false);
    setSubName("");
    setSubCost("");
  };

  const handleDelete = (id: string) => {
    const updated = subscriptions.filter((s) => s.id !== id);
    setSubscriptions(updated);
    localStorage.setItem("coinkeeper_subs_v1", JSON.stringify(updated));
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
            <CreditCard className="w-4 h-4 text-accent" />
            <h3 className="text-base font-bold text-foreground tracking-tight">
              Subscription Cost & Impact
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Recurring digital memberships and annual commitments
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowAdd(true)}
          className="text-xs h-8 border-border/50 gap-1 text-accent hover:text-accent"
        >
          <Plus className="w-3.5 h-3.5" /> Subscription
        </Button>
      </div>

      {/* Impact Ribbon */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-accent/10 to-primary/5 border border-accent/20 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] text-muted-foreground uppercase font-medium tracking-wider block">
            Monthly Drain
          </span>
          <span className="text-2xl font-extrabold font-mono text-foreground mt-0.5 block">
            {formatMoney(totalMonthly)} <span className="text-xs text-muted-foreground font-normal">/ month</span>
          </span>
        </div>

        <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-accent/20 pt-2 sm:pt-0 sm:pl-4">
          <span className="text-[11px] text-muted-foreground uppercase font-medium tracking-wider block">
            Annual Commitment
          </span>
          <span className="text-lg font-bold font-mono text-accent mt-0.5 block">
            {formatMoney(totalAnnual)} <span className="text-xs text-muted-foreground font-normal">/ year</span>
          </span>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {subscriptions.map((sub) => (
          <div
            key={sub.id}
            className="p-3 rounded-xl bg-card/40 border border-border/40 flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base p-1.5 rounded-lg bg-secondary/80">{sub.icon}</span>
              <div>
                <span className="font-semibold text-foreground text-sm block">{sub.name}</span>
                <span className="text-[11px] text-muted-foreground block">{sub.category}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="font-mono font-bold text-foreground block">
                  {formatMoney(sub.monthlyCost)}
                  <span className="text-[10px] text-muted-foreground font-normal">/mo</span>
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {formatMoney(sub.monthlyCost * 12)}/yr
                </span>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(sub.id)}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Subscription Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-2xl border-border/70 p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add Subscription</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAdd} className="space-y-3.5 my-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Subscription Name
              </label>
              <Input
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                placeholder="e.g. Adobe Creative Cloud, Gym"
                className="h-9 text-xs"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Monthly Amount
              </label>
              <Input
                type="number"
                value={subCost}
                onChange={(e) => setSubCost(e.target.value)}
                placeholder="e.g. 1499"
                className="h-9 text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Category
              </label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
              >
                <option value="Entertainment">Entertainment</option>
                <option value="Productivity">Productivity & AI</option>
                <option value="Cloud Storage">Cloud Storage</option>
                <option value="Fitness">Fitness & Health</option>
                <option value="Education">Learning & Courses</option>
                <option value="Utilities">Utilities & Telecom</option>
              </select>
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
                type="submit"
                size="sm"
                className="bg-accent text-accent-foreground font-semibold"
              >
                Save Subscription
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
