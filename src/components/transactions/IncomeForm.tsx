import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownLeft,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Wallet,
  Receipt,
  Tag,
  DollarSign,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddTransaction, useUpdateTransaction } from "@/hooks/useTransactions";
import { useToast } from "@/hooks/use-toast";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;

export const INCOME_CATEGORIES = [
  { id: "salary", label: "Salary" },
  { id: "freelancing", label: "Freelancing" },
  { id: "business_income", label: "Business Income" },
  { id: "internship_stipend", label: "Internship Stipend" },
  { id: "investment_returns", label: "Investment Returns" },
  { id: "dividends", label: "Dividends" },
  { id: "interest_income", label: "Interest Income" },
  { id: "rental_income", label: "Rental Income" },
  { id: "affiliate_marketing", label: "Affiliate Marketing" },
  { id: "content_creation", label: "Content Creation" },
  { id: "gifts_rewards", label: "Gifts/Rewards" },
  { id: "refunds_cashback", label: "Refunds/Cashback" },
  { id: "other", label: "Other" },
] as const;

export const INCOME_PAYMENT_METHODS = [
  { id: "upi", label: "UPI" },
  { id: "neft", label: "NEFT / Bank Transfer" },
  { id: "debit_card", label: "Debit Card" },
  { id: "credit_card", label: "Credit Card" },
  { id: "cash", label: "Cash" },
  { id: "auto_pay", label: "Auto Pay / Standing Instruction" },
  { id: "other", label: "Other" },
] as const;

export interface IncomeFormProps {
  initialData?: Transaction | null;
  onSuccess?: (transaction: any) => void;
  onCancel?: () => void;
  className?: string;
  submitLabel?: string;
  showCardWrapper?: boolean;
}

export function IncomeForm({
  initialData,
  onSuccess,
  onCancel,
  className = "",
  submitLabel,
  showCardWrapper = false,
}: IncomeFormProps) {
  const isEditing = Boolean(initialData);
  const { profile } = useCoinKeeper();
  const { toast } = useToast();

  const addTransaction = useAddTransaction();
  const updateTransaction = useUpdateTransaction();

  // Form states
  const [title, setTitle] = useState(initialData?.name || "");
  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : "");
  const [category, setCategory] = useState<string>(
    initialData?.category || "salary"
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    initialData?.payment_method || "upi"
  );
  const [date, setDate] = useState(
    initialData?.transaction_date || new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState(initialData?.description || "");

  // Validation & error states
  const [titleError, setTitleError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleError(null);
    setAmountError(null);
    setApiError(null);

    // Validation
    let isValid = true;
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setTitleError("Please enter an income title");
      isValid = false;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError("Please enter a valid amount greater than 0");
      isValid = false;
    }

    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        name: cleanTitle,
        amount: parsedAmount,
        type: "income" as const,
        category: category as any,
        payment_method: paymentMethod as any,
        transaction_date: date,
        description: description.trim() || null,
        tags: ["Income"],
      };

      let result;
      if (isEditing && initialData) {
        result = await updateTransaction.mutateAsync({
          id: initialData.id,
          ...payload,
        });

        toast({
          title: "Income Updated",
          description: `Updated ${cleanTitle} (+${profile.currencySymbol}${parsedAmount.toLocaleString("en-IN")}).`,
        });
      } else {
        result = await addTransaction.mutateAsync(payload);

        toast({
          title: "Income Recorded",
          description: `Recorded +${profile.currencySymbol}${parsedAmount.toLocaleString("en-IN")} from ${cleanTitle}.`,
        });

        // Reset form on successful creation
        setTitle("");
        setAmount("");
        setCategory("salary");
        setPaymentMethod("upi");
        setDate(new Date().toISOString().split("T")[0]);
        setDescription("");
      }

      onSuccess?.(result);
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred while saving income.";
      setApiError(msg);
      toast({
        title: "Database Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Visual Indicator Banner (Success / Green Cue) */}
      <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-success/20 text-success flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="font-bold text-xs uppercase tracking-wider block">
              {isEditing ? "Editing Income Transaction" : "New Income Inflow"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Incoming deposits increase total balance and net savings
            </span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-success/25 border border-success/40 text-[10px] font-mono font-bold">
          +INCOME
        </span>
      </div>

      {/* API / Database Error Banner */}
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
              <p className="font-semibold">Unable to record income</p>
              <p className="text-[11px] opacity-90 mt-0.5">{apiError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title / Name */}
      <div className="space-y-1.5">
        <Label
          htmlFor="income-title-input"
          className="text-xs font-medium text-foreground flex items-center justify-between"
        >
          <span>Income Title / Source *</span>
          {titleError && (
            <span className="text-destructive text-[11px] font-normal">{titleError}</span>
          )}
        </Label>
        <Input
          id="income-title-input"
          placeholder="e.g. Monthly Salary, Freelance Gig, Stock Dividend"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (titleError) setTitleError(null);
          }}
          className={`h-9 text-xs border-border/70 focus-visible:border-success focus-visible:ring-success/20 ${
            titleError ? "border-destructive focus-visible:ring-destructive" : ""
          }`}
        />
      </div>

      {/* Amount and Date */}
      <div className="grid grid-cols-2 gap-3">
        {/* Amount */}
        <div className="space-y-1.5">
          <Label
            htmlFor="income-amount-input"
            className="text-xs font-medium text-foreground flex items-center justify-between"
          >
            <span>Amount ({profile.currencySymbol || "₹"}) *</span>
            {amountError && (
              <span className="text-destructive text-[11px] font-normal">{amountError}</span>
            )}
          </Label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-success text-xs">
              +{profile.currencySymbol || "₹"}
            </span>
            <Input
              id="income-amount-input"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (amountError) setAmountError(null);
              }}
              min="0.01"
              step="any"
              className={`h-9 text-xs font-mono font-semibold pl-8 text-success border-border/70 focus-visible:border-success focus-visible:ring-success/20 ${
                amountError ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <Label htmlFor="income-date-input" className="text-xs font-medium text-foreground">
            Date
          </Label>
          <Input
            id="income-date-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 text-xs border-border/70 focus-visible:border-success focus-visible:ring-success/20"
          />
        </div>
      </div>

      {/* Category and Payment Method */}
      <div className="grid grid-cols-2 gap-3">
        {/* Category Dropdown with items requested */}
        <div className="space-y-1.5">
          <Label htmlFor="income-cat-select" className="text-xs font-medium text-foreground">
            Income Category
          </Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger
              id="income-cat-select"
              className="h-9 text-xs border-border/70 focus:border-success focus:ring-success/20"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {INCOME_CATEGORIES.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="text-xs py-1.5">
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payment Method */}
        <div className="space-y-1.5">
          <Label htmlFor="income-method-select" className="text-xs font-medium text-foreground">
            Payment Method
          </Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger
              id="income-method-select"
              className="h-9 text-xs border-border/70 focus:border-success focus:ring-success/20"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              {INCOME_PAYMENT_METHODS.map((method) => (
                <SelectItem key={method.id} value={method.id} className="text-xs py-1.5">
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="income-desc-input" className="text-xs font-medium text-muted-foreground">
          Description (Optional)
        </Label>
        <Input
          id="income-desc-input"
          placeholder="Client, employer, or invoice reference notes..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-9 text-xs border-border/70 focus-visible:border-success focus-visible:ring-success/20"
        />
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting || addTransaction.isPending || updateTransaction.isPending}
            className="text-xs h-8"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || addTransaction.isPending || updateTransaction.isPending}
          className="text-xs h-8 bg-success hover:bg-success/90 text-success-foreground font-semibold min-w-28 shadow-sm transition-all"
        >
          {isSubmitting || addTransaction.isPending || updateTransaction.isPending ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving...
            </span>
          ) : isEditing ? (
            <span className="flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              {submitLabel || "Update Income"}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              {submitLabel || "Add Income"}
            </span>
          )}
        </Button>
      </div>
    </form>
  );

  if (showCardWrapper) {
    return (
      <div className={`p-5 rounded-2xl bg-card/95 border border-success/30 shadow-sm ${className}`}>
        {formContent}
      </div>
    );
  }

  return <div className={className}>{formContent}</div>;
}

export default IncomeForm;
