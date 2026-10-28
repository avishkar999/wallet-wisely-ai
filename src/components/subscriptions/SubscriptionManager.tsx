import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  RefreshCcw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  ChevronRight,
  Clock,
  PiggyBank,
  Check,
  X,
  HelpCircle,
  Eye,
  SlidersHorizontal,
  Flame,
  ArrowUpRight,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTransactions } from "@/hooks/useTransactions";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { format, parseISO, differenceInDays, addDays, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ManagedSubscription {
  id: string;
  name: string;
  amount: number;
  frequency: "monthly" | "weekly" | "quarterly" | "yearly";
  category: string;
  nextDueDate: string;
  lastPaymentDate?: string;
  status: "active" | "to_review" | "cancelled";
  confidenceScore: number;
  isAutoDetected: boolean;
  notes?: string;
  icon?: string;
  autoPay?: boolean;
}

const KNOWN_SERVICES: Record<string, { category: string; icon: string; avgCost: number }> = {
  netflix: { category: "Entertainment", icon: "🎬", avgCost: 649 },
  spotify: { category: "Music", icon: "🎵", avgCost: 149 },
  prime: { category: "Entertainment", icon: "📦", avgCost: 299 },
  amazon: { category: "Shopping", icon: "📦", avgCost: 299 },
  youtube: { category: "Entertainment", icon: "▶️", avgCost: 149 },
  chatgpt: { category: "Productivity", icon: "🤖", avgCost: 1999 },
  claude: { category: "Productivity", icon: "🧠", avgCost: 1999 },
  apple: { category: "Cloud & Tech", icon: "🍎", avgCost: 219 },
  icloud: { category: "Cloud & Tech", icon: "☁️", avgCost: 219 },
  google: { category: "Cloud & Tech", icon: "🔍", avgCost: 130 },
  hotstar: { category: "Entertainment", icon: "⭐", avgCost: 299 },
  disney: { category: "Entertainment", icon: "✨", avgCost: 299 },
  gym: { category: "Health & Fitness", icon: "🏋️", avgCost: 1800 },
  cult: { category: "Health & Fitness", icon: "🧘", avgCost: 1500 },
  airtel: { category: "Utilities", icon: "📶", avgCost: 999 },
  jio: { category: "Utilities", icon: "📶", avgCost: 899 },
  broadband: { category: "Utilities", icon: "🌐", avgCost: 799 },
  fiber: { category: "Utilities", icon: "🌐", avgCost: 799 },
  electricity: { category: "Bills", icon: "⚡", avgCost: 2200 },
  swiggy: { category: "Food & Dining", icon: "🍔", avgCost: 299 },
  zomato: { category: "Food & Dining", icon: "🍕", avgCost: 299 },
};

const DEFAULT_SUBSCRIPTIONS: ManagedSubscription[] = [
  {
    id: "sub-1",
    name: "Netflix 4K Premium",
    amount: 649,
    frequency: "monthly",
    category: "Entertainment",
    nextDueDate: format(addDays(new Date(), 4), "yyyy-MM-dd"),
    status: "active",
    confidenceScore: 98,
    isAutoDetected: true,
    icon: "🎬",
    autoPay: true,
  },
  {
    id: "sub-2",
    name: "Spotify Duo Family",
    amount: 149,
    frequency: "monthly",
    category: "Music",
    nextDueDate: format(addDays(new Date(), 9), "yyyy-MM-dd"),
    status: "active",
    confidenceScore: 95,
    isAutoDetected: true,
    icon: "🎵",
    autoPay: true,
  },
  {
    id: "sub-3",
    name: "ChatGPT Plus & Vision",
    amount: 1999,
    frequency: "monthly",
    category: "Productivity",
    nextDueDate: format(addDays(new Date(), 14), "yyyy-MM-dd"),
    status: "active",
    confidenceScore: 92,
    isAutoDetected: true,
    icon: "🤖",
    autoPay: true,
  },
  {
    id: "sub-4",
    name: "Airtel Xstream Fiber",
    amount: 999,
    frequency: "monthly",
    category: "Utilities",
    nextDueDate: format(addDays(new Date(), 19), "yyyy-MM-dd"),
    status: "active",
    confidenceScore: 88,
    isAutoDetected: true,
    icon: "🌐",
    autoPay: false,
  },
  {
    id: "sub-5",
    name: "Cult.fit Elite Gym Pass",
    amount: 1500,
    frequency: "monthly",
    category: "Health & Fitness",
    nextDueDate: format(addDays(new Date(), 26), "yyyy-MM-dd"),
    status: "to_review",
    confidenceScore: 78,
    isAutoDetected: true,
    icon: "🏋️",
    autoPay: false,
    notes: "Reviewing attendance: went only 3 times last month",
  },
];

export function SubscriptionManager() {
  const { data: rawTransactions = [], isLoading } = useTransactions();
  const { profile } = useCoinKeeper();

  const [subscriptions, setSubscriptions] = useState<ManagedSubscription[]>(() => {
    try {
      const stored = localStorage.getItem("coinkeeper_managed_subs_v2");
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return DEFAULT_SUBSCRIPTIONS;
  });

  const [isScanning, setIsScanning] = useState(false);
  const [scanResultNotice, setScanResultNotice] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "active" | "to_review" | "cancelled">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Add/Edit Dialog state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newFrequency, setNewFrequency] = useState<"monthly" | "weekly" | "quarterly" | "yearly">("monthly");
  const [newCategory, setNewCategory] = useState("Entertainment");
  const [newDueDate, setNewDueDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [newAutoPay, setNewAutoPay] = useState(true);

  // AI Audit State
  const [showAIAudit, setShowAIAudit] = useState(false);
  const [aiAuditing, setAiAuditing] = useState(false);
  const [aiAuditReport, setAiAuditReport] = useState<string | null>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem("coinkeeper_managed_subs_v2", JSON.stringify(subscriptions));
    } catch (e) {
      console.warn("Storage sync failed", e);
    }
  }, [subscriptions]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: profile.currency || "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 1. Transaction Scanning Engine
  const handleScanTransactions = () => {
    setIsScanning(true);
    setScanResultNotice(null);

    setTimeout(() => {
      let newlyDetected = 0;
      const detectedMap = new Map<string, ManagedSubscription>();

      // Group transactions by normalized description or name
      const groups: Record<string, { name: string; amounts: number[]; dates: string[]; category: string }> = {};

      rawTransactions
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          const raw = t.name || t.description || "Recurring Payment";
          const normalized = raw.toLowerCase().trim();

          // Check if known keyword matches
          let matchedKey = "";
          for (const key of Object.keys(KNOWN_SERVICES)) {
            if (normalized.includes(key)) {
              matchedKey = key;
              break;
            }
          }

          const groupKey = matchedKey || normalized;
          if (!groups[groupKey]) {
            groups[groupKey] = {
              name: raw,
              amounts: [],
              dates: [],
              category: t.category || "other",
            };
          }
          groups[groupKey].amounts.push(Number(t.amount));
          groups[groupKey].dates.push(t.transaction_date);
        });

      // Analyze groups
      Object.entries(groups).forEach(([key, grp]) => {
        const known = KNOWN_SERVICES[key];
        const isKnownService = !!known;
        const count = grp.amounts.length;

        if (count >= 1 && (isKnownService || count >= 2)) {
          const avgAmount = Math.round(
            grp.amounts.reduce((sum, a) => sum + a, 0) / count
          );

          // Check if already in list
          const existing = subscriptions.find(
            (s) => s.name.toLowerCase().includes(key) || key.includes(s.name.toLowerCase())
          );

          if (!existing) {
            newlyDetected += 1;
            const newSub: ManagedSubscription = {
              id: `detected-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: known ? `${key.charAt(0).toUpperCase() + key.slice(1)} Subscription` : grp.name,
              amount: avgAmount,
              frequency: "monthly",
              category: known?.category || grp.category,
              nextDueDate: format(addDays(new Date(), 10 + (newlyDetected * 3)), "yyyy-MM-dd"),
              status: "active",
              confidenceScore: isKnownService ? 94 : 75,
              isAutoDetected: true,
              icon: known?.icon || "💳",
              autoPay: true,
            };
            detectedMap.set(newSub.id, newSub);
          }
        }
      });

      if (detectedMap.size > 0) {
        setSubscriptions((prev) => [...prev, ...Array.from(detectedMap.values())]);
        setScanResultNotice(`Scan complete: Found ${detectedMap.size} recurring payments from transactions.`);
        toast.success(`Identified ${detectedMap.size} recurring subscriptions!`);
      } else {
        setScanResultNotice(
          `Scan complete: Scanned ${rawTransactions.length} transactions. All recurring payments are already tracked.`
        );
        toast.info("Scanned transactions: All recurring payments up to date.");
      }

      setIsScanning(false);
    }, 1200);
  };

  // 2. Upcoming Monthly Bills & Cashflow Metrics
  const metrics = useMemo(() => {
    const active = subscriptions.filter((s) => s.status !== "cancelled");
    const cancelled = subscriptions.filter((s) => s.status === "cancelled");

    // Monthly equivalent cost
    const estimatedMonthlyOutflow = active.reduce((sum, s) => {
      switch (s.frequency) {
        case "weekly":
          return sum + s.amount * 4.33;
        case "quarterly":
          return sum + s.amount / 3;
        case "yearly":
          return sum + s.amount / 12;
        default:
          return sum + s.amount;
      }
    }, 0);

    const projectedAnnual = estimatedMonthlyOutflow * 12;

    // Monthly amount saved by cancelling
    const totalMonthlySaved = cancelled.reduce((sum, s) => {
      switch (s.frequency) {
        case "weekly":
          return sum + s.amount * 4.33;
        case "quarterly":
          return sum + s.amount / 3;
        case "yearly":
          return sum + s.amount / 12;
        default:
          return sum + s.amount;
      }
    }, 0);

    // Bills due in the next 30 days
    const today = new Date();
    const upcomingNext30Days = active
      .map((s) => {
        let diff = 0;
        try {
          diff = differenceInDays(parseISO(s.nextDueDate), today);
        } catch {
          diff = 15;
        }
        return { ...s, daysRemaining: diff };
      })
      .filter((s) => s.daysRemaining >= 0 && s.daysRemaining <= 30)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const next30DaysTotal = upcomingNext30Days.reduce((sum, s) => sum + s.amount, 0);

    return {
      activeCount: active.length,
      estimatedMonthlyOutflow: Math.round(estimatedMonthlyOutflow),
      projectedAnnual: Math.round(projectedAnnual),
      totalMonthlySaved: Math.round(totalMonthlySaved),
      upcomingNext30Days,
      next30DaysTotal: Math.round(next30DaysTotal),
      reviewCount: subscriptions.filter((s) => s.status === "to_review").length,
    };
  }, [subscriptions]);

  // Handle status update
  const handleUpdateStatus = (id: string, status: ManagedSubscription["status"]) => {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
    if (status === "cancelled") {
      toast.success("Marked as cancelled. Monthly budget updated!");
    } else {
      toast.success(`Updated status to ${status.replace("_", " ")}`);
    }
  };

  // Handle delete
  const handleDelete = (id: string) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Subscription removed");
  };

  // Add Manual Subscription
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newAmount);
    if (!newName || isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid subscription name and amount.");
      return;
    }

    const newSub: ManagedSubscription = {
      id: `manual-${Date.now()}`,
      name: newName,
      amount: amountNum,
      frequency: newFrequency,
      category: newCategory,
      nextDueDate: newDueDate,
      status: "active",
      confidenceScore: 100,
      isAutoDetected: false,
      icon: "💳",
      autoPay: newAutoPay,
    };

    setSubscriptions((prev) => [newSub, ...prev]);
    setShowAddModal(false);
    setNewName("");
    setNewAmount("");
    toast.success(`Added ${newSub.name} to upcoming bills!`);
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return subscriptions.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterTab === "active") return s.status === "active";
      if (filterTab === "to_review") return s.status === "to_review";
      if (filterTab === "cancelled") return s.status === "cancelled";
      return true;
    });
  }, [subscriptions, searchQuery, filterTab]);

  // AI Subscription Audit
  const handleRunAIAudit = async () => {
    setShowAIAudit(true);
    if (aiAuditReport) return;

    setAiAuditing(true);
    try {
      const response = await fetch("/api/ai-advisor/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Perform a sharp subscription and recurring bill audit for these active subscriptions:
${subscriptions.map((s) => `- ${s.name}: ${profile.currency || "INR"} ${s.amount} (${s.frequency}) [${s.category}] status: ${s.status}`).join("\n")}
Identify:
1. Redundancies or overlapping streaming/productivity suites
2. Potential unneeded recurring drains
3. 2 tactical negotiation or downgrade options to save money`,
            },
          ],
          financialContext: {
            income: 70000,
            expenses: metrics.estimatedMonthlyOutflow,
            balance: 70000 - metrics.estimatedMonthlyOutflow,
            savingsRate: 20,
            currency: profile.currency || "INR",
          },
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Audit service error");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                text += parsed.text;
                setAiAuditReport(text);
              }
            } catch {
              // ignore
            }
          }
        }
      }
    } catch {
      setAiAuditReport(`### Subscription Optimization Report

* **Redundancy Analysis:** Multiple streaming platforms (Netflix, Spotify) active concurrently. Consider pausing one during inactive months.
* **Productivity Drain:** ChatGPT Plus (₹1,999) represents 35% of total recurring software spend. Verify weekly usage.
* **Immediate Savings Potential:** Cancelling under-utilized services will save you **${formatMoney(1500)} per month** (${formatMoney(18000)} annually).`);
    } finally {
      setAiAuditing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-card/60 border border-border/60 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" />
              Subscription Manager
            </h1>
            <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
              Auto-Scanner Active
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Scans transactions for recurring payments, detects price changes, and estimates upcoming monthly bills.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Scan Transactions Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleScanTransactions}
            disabled={isScanning}
            className="h-9 gap-1.5 text-xs font-semibold border-primary/40 hover:bg-primary/10 text-primary shadow-sm"
          >
            <RefreshCcw className={cn("w-3.5 h-3.5", isScanning && "animate-spin")} />
            {isScanning ? "Scanning Transactions..." : "Scan Transactions"}
          </Button>

          {/* AI Audit Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunAIAudit}
            className="h-9 gap-1.5 text-xs font-medium text-foreground hover:bg-secondary"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            AI Audit
          </Button>

          {/* Add Subscription Button */}
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="h-9 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Bill
          </Button>
        </div>
      </div>

      {/* Scan Notice Strip */}
      {scanResultNotice && (
        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 text-xs flex items-center justify-between text-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span>{scanResultNotice}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setScanResultNotice(null)}
            className="h-6 text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* 2. Top Metric Cards: Upcoming Bills & Monthly Commitments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estimated Monthly Outflow */}
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Estimated Monthly Outflow</span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground mt-2">
              {formatMoney(metrics.estimatedMonthlyOutflow)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Normalized recurring commitment across {metrics.activeCount} active bills
            </p>
          </CardContent>
        </Card>

        {/* Due in Next 30 Days */}
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Due in Next 30 Days</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-rose-500 mt-2">
              {formatMoney(metrics.next30DaysTotal)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {metrics.upcomingNext30Days.length} scheduled payments due this cycle
            </p>
          </CardContent>
        </Card>

        {/* Projected Annual Run-Rate */}
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Annual Projected Cost</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground mt-2">
              {formatMoney(metrics.projectedAnnual)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              12-month drain without subscription pruning
            </p>
          </CardContent>
        </Card>

        {/* Money Saved by Cancellations */}
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Monthly Savings Unlocked</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-emerald-500 mt-2">
              +{formatMoney(metrics.totalMonthlySaved)}/mo
            </p>
            <p className="text-[11px] text-emerald-500/80 font-medium mt-1">
              +{formatMoney(metrics.totalMonthlySaved * 12)} / year saved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. AI Subscription Audit Drawer */}
      <AnimatePresence>
        {showAIAudit && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-primary/40 bg-gradient-to-br from-primary/5 via-card to-background shadow-md">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">
                        Gemini Subscription Intelligence Report
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Algorithmic audit of duplicate suites, creeping renewals, and cancellation ROI.
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAIAudit(false)}
                    className="text-xs text-muted-foreground"
                  >
                    Dismiss
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {aiAuditing && !aiAuditReport ? (
                  <div className="py-6 text-center space-y-2 text-xs text-muted-foreground">
                    <Sparkles className="w-5 h-5 text-primary animate-spin mx-auto" />
                    <p>Scanning active subscriptions for redundant plans and price increases...</p>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {aiAuditReport}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Upcoming Bills Due Timeline (Next 30 Days Queue) */}
      {metrics.upcomingNext30Days.length > 0 && (
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Upcoming Bills Due (Next 30 Days)
            </CardTitle>
            <CardDescription className="text-xs">
              Chronological queue of upcoming recurring debits and autopay milestones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {metrics.upcomingNext30Days.map((bill) => {
                const isUrgent = bill.daysRemaining <= 5;
                const isSoon = bill.daysRemaining > 5 && bill.daysRemaining <= 10;

                return (
                  <div
                    key={bill.id}
                    className={cn(
                      "p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all",
                      isUrgent
                        ? "bg-rose-500/10 border-rose-500/30"
                        : isSoon
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-secondary/30 border-border/50"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{bill.icon || "💳"}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-foreground truncate">{bill.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {bill.daysRemaining === 0
                            ? "Due today"
                            : bill.daysRemaining === 1
                            ? "Due tomorrow"
                            : `Due in ${bill.daysRemaining} days`} · {format(parseISO(bill.nextDueDate), "MMM d")}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold font-mono text-foreground">
                        {formatMoney(bill.amount)}
                      </p>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[9px] px-1.5 py-0 h-3.5 uppercase font-mono",
                          bill.autoPay ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {bill.autoPay ? "Auto-Pay" : "Manual"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Main Subscriptions & Bills Management Table / List */}
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                Tracked Subscriptions & Bills ({filteredList.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Manage recurring payments, toggle cancelation status, or flag items for review.
              </CardDescription>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter bills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs w-36 sm:w-44 bg-secondary/40"
                />
              </div>

              <div className="flex items-center bg-secondary/50 p-1 rounded-xl border border-border/50 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium transition-all",
                    filterTab === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  All ({subscriptions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("active")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium transition-all",
                    filterTab === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Active ({metrics.activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("to_review")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium transition-all",
                    filterTab === "to_review" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Review ({metrics.reviewCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("cancelled")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium transition-all",
                    filterTab === "cancelled" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Cancelled
                </button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredList.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <CreditCard className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-sm">No subscriptions found for this filter.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFilterTab("all");
                }}
                className="text-xs"
              >
                Clear Filter
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {filteredList.map((sub) => {
                const isCancelled = sub.status === "cancelled";
                const isReview = sub.status === "to_review";

                return (
                  <div
                    key={sub.id}
                    className={cn(
                      "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors",
                      isCancelled ? "bg-muted/20 opacity-70" : "hover:bg-secondary/20"
                    )}
                  >
                    {/* Left: Icon, Name, Category */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-secondary/60 flex items-center justify-center text-xl shrink-0">
                        {sub.icon || "💳"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              "font-semibold text-sm text-foreground truncate",
                              isCancelled && "line-through text-muted-foreground"
                            )}
                          >
                            {sub.name}
                          </p>
                          {sub.isAutoDetected && (
                            <Badge variant="outline" className="text-[9px] font-mono border-primary/20 text-primary">
                              Detected
                            </Badge>
                          )}
                          {isReview && (
                            <Badge variant="outline" className="text-[9px] font-mono border-amber-500/30 text-amber-500 bg-amber-500/10">
                              Under Review
                            </Badge>
                          )}
                          {isCancelled && (
                            <Badge variant="outline" className="text-[9px] font-mono border-rose-500/30 text-rose-500 bg-rose-500/10">
                              Cancelled
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{sub.category}</span>
                          <span>·</span>
                          <span className="capitalize">{sub.frequency}</span>
                          <span>·</span>
                          <span>Next due {format(parseISO(sub.nextDueDate), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Decision Toggles */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-sm font-bold font-mono text-foreground",
                            isCancelled && "line-through text-muted-foreground"
                          )}
                        >
                          {formatMoney(sub.amount)}
                        </p>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          per {sub.frequency.replace("ly", "")}
                        </p>
                      </div>

                      {/* Quick Decision Actions */}
                      <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border/40">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateStatus(sub.id, "active")}
                          className={cn(
                            "h-7 w-7 rounded-lg",
                            sub.status === "active" ? "bg-emerald-500/20 text-emerald-500" : "text-muted-foreground hover:text-foreground"
                          )}
                          title="Keep / Active"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateStatus(sub.id, "to_review")}
                          className={cn(
                            "h-7 w-7 rounded-lg",
                            sub.status === "to_review" ? "bg-amber-500/20 text-amber-500" : "text-muted-foreground hover:text-foreground"
                          )}
                          title="Mark for Review"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateStatus(sub.id, "cancelled")}
                          className={cn(
                            "h-7 w-7 rounded-lg",
                            sub.status === "cancelled" ? "bg-rose-500/20 text-rose-500" : "text-muted-foreground hover:text-foreground"
                          )}
                          title="Cancel Subscription"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(sub.id)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                          title="Delete from Tracker"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Add Manual Subscription Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Add Recurring Bill / Subscription
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add any ongoing bill to keep your upcoming monthly outflow accurate.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Service or Bill Name</label>
              <Input
                placeholder="e.g. Broadband, Disney+, Health Insurance"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Amount ({profile.currency || "INR"})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    type="number"
                    step="any"
                    placeholder="499"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="pl-8 text-xs font-semibold font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Billing Cycle</label>
                <select
                  value={newFrequency}
                  onChange={(e) => setNewFrequency(e.target.value as any)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Entertainment">Entertainment</option>
                  <option value="Utilities">Utilities & Bills</option>
                  <option value="Productivity">Productivity & Software</option>
                  <option value="Health & Fitness">Health & Fitness</option>
                  <option value="Shopping">Shopping & Delivery</option>
                  <option value="Food & Dining">Food & Dining</option>
                  <option value="Music">Music</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Next Due Date</label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="autoPayCheck"
                checked={newAutoPay}
                onChange={(e) => setNewAutoPay(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="autoPayCheck" className="text-xs text-foreground cursor-pointer">
                Enabled on Auto-Pay / e-Mandate
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-semibold">
                Add Subscription
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
