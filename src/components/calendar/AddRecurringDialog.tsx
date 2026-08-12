import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAddRecurringTransaction } from "@/hooks/useRecurringTransactions";
import { Plus, Bell } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  validateRecurring,
  MAX_REMINDER_DAYS,
  type FieldErrors,
} from "@/lib/validation/recurring";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "bills", label: "Bills & Utilities" },
  { value: "food", label: "Food & Dining" },
  { value: "transport", label: "Transport" },
  { value: "entertainment", label: "Entertainment" },
  { value: "shopping", label: "Shopping" },
  { value: "health", label: "Health" },
  { value: "education", label: "Education" },
  { value: "income", label: "Income" },
  { value: "other", label: "Other" },
];

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const REMINDER_OPTIONS = ["0", "1", "2", "3", "5", "7"];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function AddRecurringDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("bills");
  const [frequency, setFrequency] = useState("monthly");
  const [nextDueDate, setNextDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reminderDays, setReminderDays] = useState("3");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const addRecurring = useAddRecurringTransaction();

  const clearError = (key: keyof FieldErrors) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const handleTypeChange = (value: string) => {
    setType(value);
    if (value === "income") setCategory("income");
    else if (category === "income") setCategory("bills");
    setErrors((prev) => ({ ...prev, type: undefined, category: undefined }));
  };

  const handleFrequencyChange = (value: string) => {
    setFrequency(value);
    const max = MAX_REMINDER_DAYS[value] ?? 30;
    if (parseInt(reminderDays, 10) > max) setReminderDays(String(max));
    setErrors((prev) => ({ ...prev, frequency: undefined, reminder_days_before: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = validateRecurring({
      title,
      amount: amount.trim() === "" ? NaN : Number(amount),
      type,
      category,
      frequency,
      next_due_date: nextDueDate,
      reminder_days_before: parseInt(reminderDays, 10),
      notes: notes.trim() || null,
    });

    if (!result.ok) {
      setErrors(result.errors);
      toast.error(Object.values(result.errors)[0] ?? "Please fix the highlighted fields");
      return;
    }

    setErrors({});

    try {
      await addRecurring.mutateAsync({
        title: result.data.title,
        amount: result.data.amount,
        type: result.data.type,
        category: result.data.category,
        frequency: result.data.frequency,
        next_due_date: result.data.next_due_date,
        reminder_days_before: result.data.reminder_days_before,
        is_active: true,
        notes: result.data.notes ?? null,
        day_of_month: null,
        day_of_week: null,
      });

      toast.success("Recurring transaction created!");
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to create recurring transaction");
    }
  };

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setType("expense");
    setCategory("bills");
    setFrequency("monthly");
    setNextDueDate(format(new Date(), "yyyy-MM-dd"));
    setReminderDays("3");
    setNotes("");
    setErrors({});
  };

  const maxReminder = MAX_REMINDER_DAYS[frequency] ?? 30;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Recurring
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Add Recurring Transaction
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Electricity Bill, Netflix"
              value={title}
              maxLength={100}
              aria-invalid={!!errors.title}
              className={cn(errors.title && "border-destructive")}
              onChange={(e) => {
                setTitle(e.target.value);
                clearError("title");
              }}
            />
            <FieldError message={errors.title} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0"
                value={amount}
                aria-invalid={!!errors.amount}
                className={cn(errors.amount && "border-destructive")}
                onChange={(e) => {
                  setAmount(e.target.value);
                  clearError("amount");
                }}
              />
              <FieldError message={errors.amount} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={errors.type} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v);
                  clearError("category");
                }}
              >
                <SelectTrigger className={cn(errors.category && "border-destructive")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((cat) =>
                    type === "income" ? cat.value === "income" : cat.value !== "income"
                  ).map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.category} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={handleFrequencyChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.frequency} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nextDueDate">Next Due Date</Label>
              <Input
                id="nextDueDate"
                type="date"
                min="2000-01-01"
                max="2100-12-31"
                value={nextDueDate}
                aria-invalid={!!errors.next_due_date}
                className={cn(errors.next_due_date && "border-destructive")}
                onChange={(e) => {
                  setNextDueDate(e.target.value);
                  clearError("next_due_date");
                }}
              />
              <FieldError message={errors.next_due_date} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminderDays">Remind Before (days)</Label>
              <Select
                value={reminderDays}
                onValueChange={(v) => {
                  setReminderDays(v);
                  clearError("reminder_days_before");
                }}
              >
                <SelectTrigger className={cn(errors.reminder_days_before && "border-destructive")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.filter((d) => parseInt(d, 10) <= maxReminder).map((d) => (
                    <SelectItem key={d} value={d}>
                      {d === "0" ? "On the day" : `${d} day${d === "1" ? "" : "s"}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.reminder_days_before} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={notes}
              maxLength={500}
              aria-invalid={!!errors.notes}
              onChange={(e) => {
                setNotes(e.target.value);
                clearError("notes");
              }}
              rows={2}
            />
            <FieldError message={errors.notes} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={addRecurring.isPending}>
              {addRecurring.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
