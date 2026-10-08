import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowRight, Tag, MapPin, Users, Briefcase, Plus } from "lucide-react";
import { useCoinKeeper, ExpenseClassification } from "@/contexts/CoinKeeperContext";
import { useAddTransaction } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useToast } from "@/hooks/use-toast";

// Keyword category matcher
const SMART_KEYWORDS: Record<string, { category: string; type: ExpenseClassification }> = {
  uber: { category: "transport", type: "essential" },
  ola: { category: "transport", type: "essential" },
  metro: { category: "transport", type: "essential" },
  flight: { category: "travel", type: "lifestyle" },
  swiggy: { category: "food", type: "lifestyle" },
  zomato: { category: "food", type: "lifestyle" },
  groceries: { category: "food", type: "essential" },
  supermarket: { category: "food", type: "essential" },
  starbucks: { category: "food", type: "lifestyle" },
  cafe: { category: "food", type: "lifestyle" },
  netflix: { category: "entertainment", type: "lifestyle" },
  spotify: { category: "entertainment", type: "lifestyle" },
  prime: { category: "entertainment", type: "lifestyle" },
  wifi: { category: "bills", type: "essential" },
  electricity: { category: "bills", type: "essential" },
  rent: { category: "bills", type: "essential" },
  amazon: { category: "shopping", type: "discretionary" },
  zara: { category: "shopping", type: "lifestyle" },
  pharmacy: { category: "health", type: "essential" },
  doctor: { category: "health", type: "essential" },
  gym: { category: "health", type: "lifestyle" },
  salary: { category: "income", type: "essential" },
  freelance: { category: "income", type: "essential" },
  dividend: { category: "income", type: "investment" },
};

export function SmartQuickAddTransactionDialog() {
  const {
    showQuickAddModal,
    setShowQuickAddModal,
    quickAddInitialType,
    categories,
    profile,
    currentSelectedMonth,
  } = useCoinKeeper();

  const { data: accounts = [] } = useAccounts();
  const addTransactionMutation = useAddTransaction();
  const { toast } = useToast();

  const [type, setType] = useState<"expense" | "income" | "transfer">("expense");
  const [amount, setAmount] = useState("");

  // Sync initial type when opened
  useEffect(() => {
    if (showQuickAddModal) {
      const initial = quickAddInitialType || "expense";
      setType(initial);
      if (initial === "income") {
        setCategory("income");
      }
    }
  }, [showQuickAddModal, quickAddInitialType]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("food");
  const [expenseClassification, setExpenseClassification] = useState<ExpenseClassification>("essential");
  const [accountId, setAccountId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  // Optional custom fields
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [location, setLocation] = useState("");
  const [people, setPeople] = useState("");
  const [projectClient, setProjectClient] = useState("");

  // Smart detection on name change
  useEffect(() => {
    const lower = name.toLowerCase().trim();
    for (const [key, match] of Object.entries(SMART_KEYWORDS)) {
      if (lower.includes(key)) {
        setCategory(match.category);
        setExpenseClassification(match.type);
        break;
      }
    }
  }, [name]);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid numeric transaction amount.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addTransactionMutation.mutateAsync({
        name: name || (type === "expense" ? "General Expense" : "Income Deposit"),
        amount: parsedAmount,
        type,
        category: category as any,
        payment_method: paymentMethod as any,
        transaction_date: date,
        description: note || purpose || undefined,
      });

      toast({
        title: "Transaction Recorded",
        description: `${type === "income" ? "+" : "-"}${profile.currencySymbol}${parsedAmount} logged successfully.`,
      });

      // Reset
      setShowQuickAddModal(false);
      setAmount("");
      setName("");
      setNote("");
      setPurpose("");
      setLocation("");
      setPeople("");
      setProjectClient("");
    } catch {
      toast({
        title: "Error saving transaction",
        description: "Failed to record transaction. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={showQuickAddModal} onOpenChange={setShowQuickAddModal}>
      <DialogContent className="max-w-lg bg-card/95 backdrop-blur-2xl border-border/70 p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Quick Add Transaction
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2">
          {/* Expense / Income / Transfer Segmented Control */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-secondary/60 border border-border/50">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                type === "expense"
                  ? "bg-destructive text-destructive-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                type === "income"
                  ? "bg-success text-success-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setType("transfer")}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                type === "transfer"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Transfer
            </button>
          </div>

          {/* Large Numeric Input */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">
              {profile.currencySymbol}
            </span>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="w-full pl-10 pr-4 py-4 rounded-2xl bg-secondary/40 border border-border/50 text-3xl font-extrabold font-mono text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-center"
              required
            />
          </div>

          {/* Transaction Name / Description */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Title / Payee
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Swiggy, Uber, Metro, Amazon, Salary"
              className="h-10 text-sm bg-secondary/50"
              required
            />
          </div>

          {/* Category & Classification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name.toLowerCase()}>
                    {c.icon} {c.name}
                  </option>
                ))}
                <option value="other">Other</option>
              </select>
            </div>

            {type === "expense" && (
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Expense Type
                </label>
                <select
                  value={expenseClassification}
                  onChange={(e) => setExpenseClassification(e.target.value as any)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary capitalize"
                >
                  <option value="essential">Essential (Needs)</option>
                  <option value="lifestyle">Lifestyle (Wants)</option>
                  <option value="discretionary">Discretionary</option>
                  <option value="investment">Investment SIP</option>
                  <option value="debt">Debt / EMI</option>
                </select>
              </div>
            )}
          </div>

          {/* Account & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                From Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({profile.currencySymbol}{a.balance})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Payment Channel
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="debit_card">Debit Card</option>
                <option value="credit_card">Credit Card</option>
                <option value="cash">Cash</option>
                <option value="neft">Net Banking / NEFT</option>
                <option value="auto_pay">Auto-Debit</option>
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 text-xs bg-secondary/50"
            />
          </div>

          {/* Custom Fields Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowCustomFields(!showCustomFields)}
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 mt-1"
            >
              <Tag className="w-3.5 h-3.5" />
              {showCustomFields ? "Hide Custom Context Tags" : "+ Add Context Tags (Location, Purpose, Project)"}
            </button>

            {showCustomFields && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-secondary/30 border border-border/40 mt-2 text-xs">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">
                    Purpose / Event
                  </label>
                  <Input
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. Goa Trip, College fest"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">
                    Location
                  </label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Bangalore, Indiranagar"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">
                    People Involved
                  </label>
                  <Input
                    value={people}
                    onChange={(e) => setPeople(e.target.value)}
                    placeholder="e.g. Rahul, Priya"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">
                    Client / Project
                  </label>
                  <Input
                    value={projectClient}
                    onChange={(e) => setProjectClient(e.target.value)}
                    placeholder="e.g. Fintech Redesign"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowQuickAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={addTransactionMutation.isPending}
              className="bg-primary text-primary-foreground font-semibold px-6 shadow-glow"
            >
              {addTransactionMutation.isPending ? "Logging..." : "Record Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
