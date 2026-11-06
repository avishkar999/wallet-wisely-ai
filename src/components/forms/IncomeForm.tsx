import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownLeft,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Wallet,
  Repeat,
  Tag,
  Sparkles,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAddTransaction, useUpdateTransaction } from "@/hooks/useTransactions";
import { useToast } from "@/hooks/use-toast";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import {
  PREDEFINED_INCOME_CATEGORIES,
  INCOME_PAYMENT_METHODS,
  getIncomeCategoryConfig,
} from "@/types/income";
import { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;

export interface IncomeFormProps {
  initialData?: Transaction | null;
  onSuccess?: (transaction: any) => void;
  onCancel?: () => void;
  className?: string;
  submitLabel?: string;
  isDialogMode?: boolean;
}

export function IncomeForm({
  initialData,
  onSuccess,
  onCancel,
  className = "",
  submitLabel,
  isDialogMode = false,
}: IncomeFormProps) {
  const isEditing = Boolean(initialData);
  const { profile, incomeSources, addIncomeSource } = useCoinKeeper();
  const { toast } = useToast();

  const addTransaction = useAddTransaction();
  const updateTransaction = useUpdateTransaction();

  // Form field state
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("salary");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);

  // Validation & error states
  const [titleError, setTitleError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initialData when editing or reset
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.name || "");
      setAmount(String(initialData.amount || ""));
      setDate(initialData.transaction_date || new Date().toISOString().split("T")[0]);

      const rawCategory = initialData.category || "salary";
      const isKnown = PREDEFINED_INCOME_CATEGORIES.some(
        (c) => c.id === rawCategory || c.name.toLowerCase() === rawCategory.toLowerCase()
      );

      if (isKnown) {
        setCategory(rawCategory);
        setIsCustomCategory(false);
        setCustomCategoryName("");
      } else {
        setCategory("custom");
        setIsCustomCategory(true);
        setCustomCategoryName(rawCategory);
      }

      setPaymentMethod(initialData.payment_method || "bank_transfer");
      setDescription(initialData.description || "");

      const tags: string[] = (initialData as any).tags || [];
      setIsRecurring(tags.includes("Recurring") || (initialData as any).is_recurring === true);
    } else {
      setTitle("");
      setAmount("");
      setCategory("salary");
      setIsCustomCategory(false);
      setCustomCategoryName("");
      setDate(new Date().toISOString().split("T")[0]);
      setPaymentMethod("bank_transfer");
      setDescription("");
      setIsRecurring(false);
      setTitleError(null);
      setAmountError(null);
      setApiError(null);
    }
  }, [initialData]);

  const handleCategoryChange = (val: string) => {
    if (val === "custom") {
      setIsCustomCategory(true);
      setCategory("custom");
    } else {
      setIsCustomCategory(false);
      setCategory(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleError(null);
    setAmountError(null);
    setApiError(null);

    // Validation
    let isValid = true;
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setTitleError("Please enter an income title / source");
      isValid = false;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError("Please enter a valid amount greater than 0");
      isValid = false;
    }

    if (!isValid) return;

    const finalCategory = isCustomCategory
      ? (customCategoryName.trim() || "other_income")
      : category;

    // Persist custom category to context if not existing
    if (isCustomCategory && customCategoryName.trim()) {
      const exists = incomeSources.some(
        (s) => s.name.toLowerCase() === customCategoryName.trim().toLowerCase()
      );
      if (!exists) {
        addIncomeSource({
          name: customCategoryName.trim(),
          icon: "💵",
          expectedAmount: parsedAmount,
          type: "other",
        });
      }
    }

    try {
      setIsSubmitting(true);

      const tags = ["Income"];
      if (isRecurring) {
        tags.push("Recurring");
      }

      const payload = {
        name: cleanTitle,
        amount: parsedAmount,
        type: "income" as const,
        category: finalCategory as any,
        payment_method: paymentMethod as any,
        transaction_date: date,
        description: description.trim() || null,
        tags,
        is_recurring: isRecurring,
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
          description: `Logged +${profile.currencySymbol}${parsedAmount.toLocaleString("en-IN")} from ${cleanTitle}.`,
        });
      }

      // Reset form if creating
      if (!isEditing) {
        setTitle("");
        setAmount("");
        setCategory("salary");
        setIsCustomCategory(false);
        setCustomCategoryName("");
        setDescription("");
        setIsRecurring(false);
      }

      onSuccess?.(result);
    } catch (err: any) {
      const msg = err.message || "An error occurred while saving income.";
      setApiError(msg);
      toast({
        title: "Failed to Save Income",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryConfig = getIncomeCategoryConfig(
    isCustomCategory ? customCategoryName : category
  );
  const SelectedIcon = selectedCategoryConfig.icon;

  return (
    <form onSubmit={handleSubmit} noValidate className={`space-y-4 ${className}`}>
      {/* Error Banner */}
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

      {/* Visual Header / Indicator for Inflows (Green Aesthetic) */}
      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider block">
              {isEditing ? "Editing Income Record" : "Positive Cash Inflow"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Credits increase net savings and monthly cash flow
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono text-emerald-500 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          +CREDIT
        </div>
      </div>

      {/* Title / Name */}
      <div className="space-y-1.5">
        <Label
          htmlFor="income-title"
          className="text-xs font-semibold text-foreground flex items-center justify-between"
        >
          <span>Income Title / Source *</span>
          {titleError && (
            <span className="text-destructive text-[11px] font-normal">{titleError}</span>
          )}
        </Label>
        <div className="relative">
          <Input
            id="income-title"
            placeholder="e.g. Monthly Salary, Freelance Web App, Dividend Payout"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError(null);
            }}
            className={`h-9 text-xs pl-8 border-border/70 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 ${
              titleError ? "border-destructive focus-visible:ring-destructive" : ""
            }`}
          />
          <Tag className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Amount & Date (2 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Amount */}
        <div className="space-y-1.5">
          <Label
            htmlFor="income-amount"
            className="text-xs font-semibold text-foreground flex items-center justify-between"
          >
            <span>Amount ({profile.currencySymbol}) *</span>
            {amountError && (
              <span className="text-destructive text-[11px] font-normal">{amountError}</span>
            )}
          </Label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-emerald-500 text-xs">
              +{profile.currencySymbol}
            </span>
            <Input
              id="income-amount"
              type="number"
              step="any"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (amountError) setAmountError(null);
              }}
              className={`h-9 text-xs font-mono font-semibold pl-9 text-emerald-500 border-border/70 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 ${
                amountError ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <Label htmlFor="income-date" className="text-xs font-semibold text-foreground">
            Date Received *
          </Label>
          <Input
            id="income-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 text-xs border-border/70 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Category Selection (13 Predefined Income Categories + Custom) */}
      <div className="space-y-1.5">
        <Label
          htmlFor="income-category"
          className="text-xs font-semibold text-foreground flex items-center justify-between"
        >
          <span>Income Category</span>
          <span className="text-[10px] text-muted-foreground font-normal">
            13 Predefined + Custom
          </span>
        </Label>
        <Select
          value={isCustomCategory ? "custom" : category}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger
            id="income-category"
            className="h-9 text-xs border-border/70 focus:border-emerald-500 focus:ring-emerald-500/20"
          >
            <SelectValue placeholder="Select an income category" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {PREDEFINED_INCOME_CATEGORIES.map((cat) => {
              const CatIcon = cat.icon;
              return (
                <SelectItem key={cat.id} value={cat.id} className="text-xs py-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-5 h-5 rounded-md ${cat.bgClass} ${cat.textClass} flex items-center justify-center shrink-0`}
                    >
                      <CatIcon className="w-3 h-3" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-foreground">{cat.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {cat.description}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
            <SelectItem value="custom" className="text-xs py-2 border-t border-border/40 mt-1">
              <div className="flex items-center gap-2 text-emerald-500 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>+ Custom Category…</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Custom Category Input if selected */}
        {isCustomCategory && (
          <div className="pt-1.5 animate-in fade-in duration-200">
            <Label htmlFor="custom-category-name" className="text-[11px] font-semibold text-emerald-500">
              Custom Category Name
            </Label>
            <Input
              id="custom-category-name"
              placeholder="e.g. Royalties, Side Gig, Bug Bounty"
              value={customCategoryName}
              onChange={(e) => setCustomCategoryName(e.target.value)}
              className="mt-1 h-8 text-xs border-emerald-500/40 focus-visible:border-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div className="space-y-1.5">
        <Label htmlFor="income-method" className="text-xs font-semibold text-foreground">
          Payment Method
        </Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger
            id="income-method"
            className="h-9 text-xs border-border/70 focus:border-emerald-500 focus:ring-emerald-500/20"
          >
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            {INCOME_PAYMENT_METHODS.map((method) => (
              <SelectItem key={method.id} value={method.id} className="text-xs py-1.5">
                <div className="flex items-center justify-between w-full gap-4">
                  <span className="font-semibold text-foreground">{method.name}</span>
                  <span className="text-[10px] text-muted-foreground">{method.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Optional Description / Reference */}
      <div className="space-y-1.5">
        <Label
          htmlFor="income-notes"
          className="text-xs font-medium text-muted-foreground flex items-center justify-between"
        >
          <span>Description / Reference (Optional)</span>
        </Label>
        <Textarea
          id="income-notes"
          rows={2}
          placeholder="Client name, invoice reference, bank transaction narrative…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="text-xs resize-none border-border/70 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
        />
      </div>

      {/* Recurring Income Toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-emerald-500/20">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Repeat className="w-3.5 h-3.5 text-emerald-500" />
            <span>Recurring Inflow</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Mark as regularly anticipated income (e.g. monthly paycheck, quarterly dividend)
          </p>
        </div>
        <Switch
          checked={isRecurring}
          onCheckedChange={setIsRecurring}
          className="data-[state=checked]:bg-emerald-600"
          aria-label="Toggle recurring income"
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
            disabled={isSubmitting}
            className="text-xs h-8"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || addTransaction.isPending || updateTransaction.isPending}
          className="text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold min-w-28 shadow-sm"
        >
          {isSubmitting || addTransaction.isPending || updateTransaction.isPending ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving…
            </span>
          ) : isEditing ? (
            <span className="flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              {submitLabel || "Update Income"}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              {submitLabel || "Record Income"}
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}

export interface AddIncomeDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  incomeToEdit?: Transaction | null;
  onSuccess?: () => void;
}

/**
 * Reusable Add/Edit Income Dialog wrapping the IncomeForm
 */
export function AddIncomeDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  incomeToEdit,
  onSuccess,
}: AddIncomeDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;

  const isEditing = Boolean(incomeToEdit);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 gap-1.5 font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Income
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-2xl border-border/70 p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase tracking-wider">
            <ArrowDownLeft className="w-4 h-4" />
            <span>{isEditing ? "Edit Income Entry" : "Record New Inflow"}</span>
          </div>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            {isEditing ? "Update Income Record" : "Add Income Transaction"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Record salaries, freelancing, business earnings, or dividends with automated financial metrics tracking.
          </DialogDescription>
        </DialogHeader>

        <IncomeForm
          initialData={incomeToEdit}
          isDialogMode={true}
          onCancel={() => setOpen(false)}
          onSuccess={(tx) => {
            setOpen(false);
            onSuccess?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
