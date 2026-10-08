import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  Tag,
  DollarSign,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useCoinKeeper, CustomCategory, ExpenseClassification } from "@/contexts/CoinKeeperContext";

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMMON_EMOJIS = ["🍔", "☕", "🛒", "🚌", "✈️", "🏠", "⚡", "💻", "📚", "👕", "🎉", "🏥", "🛡️", "📈", "💳", "🎓", "📱", "🎁", "📦", "💼"];

export function CategoryManagerDialog({ open, onOpenChange }: CategoryManagerProps) {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    incomeSources,
    addIncomeSource,
    deleteIncomeSource,
    formatMoney,
    profile,
  } = useCoinKeeper();

  const [activeTab, setActiveTab] = useState<"expenses" | "income">("expenses");

  // New Category State
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("🏷️");
  const [newCatType, setNewCatType] = useState<ExpenseClassification>("essential");
  const [newCatLimit, setNewCatLimit] = useState("");

  // New Income Source State
  const [newIncName, setNewIncName] = useState("");
  const [newIncIcon, setNewIncIcon] = useState("💵");
  const [newIncAmount, setNewIncAmount] = useState("");
  const [newIncType, setNewIncType] = useState<"salary" | "freelance" | "business" | "allowance" | "investment" | "rental" | "other">("salary");

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    addCategory({
      name: newCatName.trim(),
      icon: newCatIcon,
      color: "#38bdf8",
      type: newCatType,
      monthlyLimit: parseFloat(newCatLimit) || undefined,
    });

    setNewCatName("");
    setNewCatLimit("");
  };

  const handleCreateIncomeSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncName.trim()) return;

    addIncomeSource({
      name: newIncName.trim(),
      icon: newIncIcon,
      expectedAmount: parseFloat(newIncAmount) || undefined,
      type: newIncType,
    });

    setNewIncName("");
    setNewIncAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-2xl border-border/70 p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" /> Flexible Architecture
          </div>
          <DialogTitle className="text-xl font-bold">
            Custom Categories & Income Sources
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            CoinKeeper adapts to your lifestyle. Create, rename, delete, and budget categories tailored to your unique financial life.
          </DialogDescription>
        </DialogHeader>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-secondary/50 border border-border/40 my-2">
          <button
            type="button"
            onClick={() => setActiveTab("expenses")}
            className={`py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "expenses"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Expense Categories ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("income")}
            className={`py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "income"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Income Sources ({incomeSources.length})
          </button>
        </div>

        {activeTab === "expenses" ? (
          <div className="space-y-4">
            {/* Create Category Form */}
            <form onSubmit={handleCreateCategory} className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-primary" /> Create Custom Category
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="sm:col-span-2">
                  <Input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. College Canteen, Trading, Parents"
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div>
                  <select
                    value={newCatType}
                    onChange={(e) => setNewCatType(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground capitalize"
                  >
                    <option value="essential">Essential</option>
                    <option value="lifestyle">Lifestyle</option>
                    <option value="discretionary">Discretionary</option>
                    <option value="investment">Investment</option>
                    <option value="debt">Debt</option>
                  </select>
                </div>

                <div>
                  <Input
                    type="number"
                    value={newCatLimit}
                    onChange={(e) => setNewCatLimit(e.target.value)}
                    placeholder="Monthly Limit ₹"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Quick Emojis */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground mr-1">Icon:</span>
                {COMMON_EMOJIS.slice(0, 12).map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewCatIcon(emoji)}
                    className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                      newCatIcon === emoji
                        ? "bg-primary/20 border border-primary scale-110"
                        : "bg-secondary/60 hover:bg-secondary border border-transparent"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-1">
                <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-semibold text-xs h-8">
                  + Add Category
                </Button>
              </div>
            </form>

            {/* Existing Categories List */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3 rounded-xl bg-card/40 border border-border/40 flex items-center justify-between hover:border-primary/30 transition-all text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl p-1.5 rounded-lg bg-secondary/80">{cat.icon}</span>
                    <div>
                      <span className="font-semibold text-foreground text-sm block">{cat.name}</span>
                      <div className="flex items-center gap-2 text-muted-foreground text-[11px] mt-0.5">
                        <span className="capitalize">{cat.type}</span>
                        {cat.monthlyLimit && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Limit: <strong className="font-mono text-foreground">{formatMoney(cat.monthlyLimit)}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCategory(cat.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Create Income Source Form */}
            <form onSubmit={handleCreateIncomeSource} className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-primary" /> Create Income Source
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="sm:col-span-2">
                  <Input
                    value={newIncName}
                    onChange={(e) => setNewIncName(e.target.value)}
                    placeholder="e.g. Brand Deal, Dividend, Shop Rental"
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div>
                  <select
                    value={newIncType}
                    onChange={(e) => setNewIncType(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground capitalize"
                  >
                    <option value="salary">Salary</option>
                    <option value="freelance">Freelance / Gig</option>
                    <option value="business">Business</option>
                    <option value="allowance">Allowance</option>
                    <option value="investment">Dividends / Gains</option>
                    <option value="rental">Rental Income</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <Input
                    type="number"
                    value={newIncAmount}
                    onChange={(e) => setNewIncAmount(e.target.value)}
                    placeholder="Expected ₹"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-semibold text-xs h-8">
                  + Add Income Source
                </Button>
              </div>
            </form>

            {/* Income Sources List */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {incomeSources.map((source) => (
                <div
                  key={source.id}
                  className="p-3 rounded-xl bg-card/40 border border-border/40 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl p-1.5 rounded-lg bg-secondary/80">{source.icon}</span>
                    <div>
                      <span className="font-semibold text-foreground text-sm block">{source.name}</span>
                      <span className="text-muted-foreground capitalize text-[11px] block mt-0.5">
                        {source.type}
                        {source.expectedAmount && ` · Expected: ${formatMoney(source.expectedAmount)}`}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteIncomeSource(source.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 mt-2 border-t border-border/40">
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-primary text-primary-foreground font-semibold"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
