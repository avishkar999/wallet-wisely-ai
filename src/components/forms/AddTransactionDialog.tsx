import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddTransaction } from "@/hooks/useTransactions";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

interface AddTransactionDialogProps {
  defaultType?: "income" | "expense";
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const categories = Constants.public.Enums.transaction_category;
const paymentMethods = Constants.public.Enums.payment_method;

const categoryLabels: Record<string, string> = {
  food: "Food & Dining",
  shopping: "Shopping",
  transport: "Transport",
  entertainment: "Entertainment",
  bills: "Bills & Utilities",
  health: "Health & Fitness",
  recharges: "Recharges & Subscriptions",
  education: "Education",
  travel: "Travel",
  income: "Income",
  other: "Other",
};

const methodLabels: Record<string, string> = {
  upi: "UPI",
  debit_card: "Debit Card",
  credit_card: "Credit Card",
  cash: "Cash",
  neft: "NEFT / Bank Transfer",
  auto_pay: "Auto Pay / Standing Instruction",
  other: "Other",
};

export function AddTransactionDialog({
  defaultType = "expense",
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddTransactionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;

  // Form state
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">(defaultType);
  const [category, setCategory] = useState<string>("other");
  const [paymentMethod, setPaymentMethod] = useState<string>("upi");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  // Validation & error states
  const [titleError, setTitleError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addTransaction = useAddTransaction();
  const { toast } = useToast();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Clear errors on close
      setTitleError(null);
      setAmountError(null);
      setApiError(null);
    }
  };

  const handleButtonClick = () => {
    console.log("[TransactionDebug] Add Transaction button clicked.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[TransactionDebug] Form submission initiated.");

    console.log("[TransactionDebug] Form values received:", {
      title,
      amount,
      category,
      type,
      date,
      paymentMethod,
      description: description ? "(present)" : "(empty)",
    });

    // Reset error banners
    setTitleError(null);
    setAmountError(null);
    setApiError(null);

    // Validation
    let isValid = true;
    if (!title || !title.trim()) {
      setTitleError("Please enter a transaction title / name");
      isValid = false;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError("Please enter a valid amount greater than 0");
      isValid = false;
    }

    if (!isValid) {
      console.log("[TransactionDebug] Validation completed: valid = false");
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive",
      });
      return;
    }

    console.log("[TransactionDebug] Validation completed: valid = true");

    try {
      setIsSubmitting(true);

      const result = await addTransaction.mutateAsync({
        name: title.trim(),
        amount: parsedAmount,
        type,
        category: category as any,
        payment_method: paymentMethod as any,
        transaction_date: date,
        description: description.trim() || null,
      });

      console.log("[TransactionDebug] Transaction successfully saved:", result);

      toast({
        title: "Transaction Recorded",
        description: `${type === "income" ? "Income" : "Expense"} of ₹${parsedAmount} saved successfully.`,
      });

      // Reset form ONLY on success
      setTitle("");
      setAmount("");
      setCategory("other");
      setPaymentMethod("upi");
      setDate(new Date().toISOString().split("T")[0]);
      setDescription("");
      setTitleError(null);
      setAmountError(null);
      setApiError(null);

      // Close modal
      handleOpenChange(false);
    } catch (error: any) {
      const errorMsg = error?.message || "Failed to record transaction. Please try again.";
      console.error("[TransactionDebug] Submission error caught in form:", errorMsg);
      setApiError(errorMsg);
      toast({
        title: "Transaction Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 gap-1.5 font-semibold shadow-sm"
              onClick={handleButtonClick}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Transaction
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-2xl border-border/70 p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add New Transaction
          </DialogTitle>
        </DialogHeader>

        {/* Visible API / Supabase Error Banner */}
        <AnimatePresence>
          {apiError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Unable to save transaction</p>
                <p className="text-[11px] opacity-90 mt-0.5">{apiError}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-1">
          {/* Type and Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as "income" | "expense");
                  if (v === "income" && category !== "income") {
                    setCategory("income");
                  } else if (v === "expense" && category === "income") {
                    setCategory("other");
                  }
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Title / Name */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-title" className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>Title / Name *</span>
              {titleError && <span className="text-destructive text-[11px] font-normal">{titleError}</span>}
            </Label>
            <Input
              id="tx-title"
              placeholder="e.g., Coffee, Petrol, Grocery, Salary"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
              className={`h-9 text-xs ${titleError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-amount" className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>Amount (₹) *</span>
              {amountError && <span className="text-destructive text-[11px] font-normal">{amountError}</span>}
            </Label>
            <Input
              id="tx-amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (amountError) setAmountError(null);
              }}
              min="0.01"
              step="any"
              className={`h-9 text-xs font-mono ${amountError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
          </div>

          {/* Category and Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryLabels[cat] || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {methodLabels[method] || method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-desc" className="text-xs font-medium text-muted-foreground">Description (Optional)</Label>
            <Input
              id="tx-desc"
              placeholder="Add notes or reference details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting || addTransaction.isPending}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || addTransaction.isPending}
              onClick={handleButtonClick}
              className="text-xs h-8 bg-primary text-primary-foreground font-semibold min-w-28 shadow-sm hover:opacity-90"
            >
              {isSubmitting || addTransaction.isPending ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Add Transaction"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
