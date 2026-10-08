import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Calendar,
  PieChart,
  LineChart,
  Wallet,
  Target,
  Layers,
  CreditCard,
  TrendingUp,
  Flame,
  Check,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Sparkles,
  DollarSign,
  Scale,
} from "lucide-react";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";

interface BuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ALL_DASHBOARD_CARDS: {
  id: string;
  title: string;
  desc: string;
  category: "core" | "insights" | "wealth" | "lifestyle";
  icon: any;
}[] = [
  {
    id: "pulse",
    title: "Money Pulse",
    desc: "Real-time health score, daily burn rate, and priority-adapted pulse",
    category: "insights",
    icon: Activity,
  },
  {
    id: "cycle",
    title: "Monthly Cycle & Notes",
    desc: "Month switcher, personal monthly context note, and variable budget editor",
    category: "core",
    icon: Calendar,
  },
  {
    id: "budget",
    title: "Budget & Cash Flow",
    desc: "Progress vs monthly limit, remaining runway, and money in vs out",
    category: "core",
    icon: PieChart,
  },
  {
    id: "trends",
    title: "6-Month Spending Trends",
    desc: "Interactive Recharts line chart showing smooth monthly outflows and average line",
    category: "insights",
    icon: LineChart,
  },
  {
    id: "accounts",
    title: "My Money & Accounts",
    desc: "Balances across Cash, Bank accounts, UPI, and Credit Cards",
    category: "wealth",
    icon: Wallet,
  },
  {
    id: "cashflow",
    title: "Cash Flow Breakdown",
    desc: "Income − Expenses − Investments − Debt = Net Cash Flow",
    category: "core",
    icon: DollarSign,
  },
  {
    id: "goals",
    title: "Personal Financial Goals",
    desc: "Savings targets, deadlines, and milestone progress bars",
    category: "wealth",
    icon: Target,
  },
  {
    id: "categories",
    title: "Category Breakdown",
    desc: "Top spending categories with icon badges and custom limits",
    category: "core",
    icon: Layers,
  },
  {
    id: "subscriptions",
    title: "Subscription Impact",
    desc: "Monthly recurring services and their total annual impact",
    category: "lifestyle",
    icon: CreditCard,
  },
  {
    id: "investments",
    title: "Investment Portfolio",
    desc: "Stocks, Mutual Funds, FDs, and asset growth performance",
    category: "wealth",
    icon: TrendingUp,
  },
  {
    id: "debts",
    title: "Debts & Liabilities",
    desc: "Outstanding loans, EMIs, credit cards, and payoff plan",
    category: "wealth",
    icon: CreditCard,
  },
  {
    id: "habits",
    title: "Habit Streaks",
    desc: "No-spend days, tracking consistency, and mindful check-ins",
    category: "lifestyle",
    icon: Flame,
  },
  {
    id: "rules",
    title: "Personal Financial Rules",
    desc: "User-defined guardrails (e.g. Dining < ₹6k, Save > ₹15k)",
    category: "insights",
    icon: Scale,
  },
];

export function AdaptiveDashboardBuilder({ open, onOpenChange }: BuilderProps) {
  const { profile, updateProfile, setShowOnboardingModal } = useCoinKeeper();

  const [cardsOrder, setCardsOrder] = useState<string[]>(
    profile.dashboardCardsOrder || ALL_DASHBOARD_CARDS.map((c) => c.id)
  );
  const [enabledCards, setEnabledCards] = useState<string[]>(
    profile.enabledModules || ALL_DASHBOARD_CARDS.map((c) => c.id)
  );

  const toggleCard = (id: string) => {
    setEnabledCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const moveCard = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= cardsOrder.length) return;
    const copy = [...cardsOrder];
    const [removed] = copy.splice(index, 1);
    copy.splice(newIdx, 0, removed);
    setCardsOrder(copy);
  };

  const handleSave = () => {
    updateProfile({
      dashboardCardsOrder: cardsOrder,
      enabledModules: enabledCards,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card/95 backdrop-blur-2xl border-border/70 p-6 max-h-[85vh] overflow-y-auto">
        <DialogHeader className="mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Adaptive Dashboard Builder
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                setShowOnboardingModal(true);
              }}
              className="text-xs h-7 gap-1"
            >
              Re-run Life Setup
            </Button>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Arrange Your Command Center
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Toggle which modules appear on your home screen and move cards up or down to set your ideal visual hierarchy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 my-3">
          {cardsOrder.map((cardId, index) => {
            const card = ALL_DASHBOARD_CARDS.find((c) => c.id === cardId);
            if (!card) return null;
            const Icon = card.icon;
            const isEnabled = enabledCards.includes(card.id);

            return (
              <div
                key={card.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isEnabled
                    ? "bg-secondary/40 border-border/60 text-foreground"
                    : "bg-secondary/15 border-border/30 opacity-60 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-foreground block">
                      {card.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground line-clamp-1">
                      {card.desc}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  {/* Move Up */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => moveCard(index, "up")}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <MoveUp className="w-3.5 h-3.5" />
                  </Button>

                  {/* Move Down */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === cardsOrder.length - 1}
                    onClick={() => moveCard(index, "down")}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <MoveDown className="w-3.5 h-3.5" />
                  </Button>

                  {/* Toggle Visible */}
                  <Button
                    type="button"
                    variant={isEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleCard(card.id)}
                    className="h-8 text-xs gap-1 ml-1"
                  >
                    {isEnabled ? (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Visible
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Hidden
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setCardsOrder(ALL_DASHBOARD_CARDS.map((c) => c.id));
              setEnabledCards(ALL_DASHBOARD_CARDS.map((c) => c.id));
            }}
            className="text-xs text-muted-foreground"
          >
            Reset to Default
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            className="bg-primary text-primary-foreground font-semibold px-5"
          >
            Save Layout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
