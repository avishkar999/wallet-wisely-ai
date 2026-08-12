import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  RecurringTransaction,
  useUpdateRecurringTransaction,
} from "@/hooks/useRecurringTransactions";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { validateRecurring, MAX_REMINDER_DAYS, type FieldErrors } from "@/lib/validation/recurring";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "bills", label: "Bills & Utilities" },
  { value: "food", label: "Food & Dining" },
  { value: "transport", label: "Transport" },
  { value: "entertainment", label: "Entertainment" },
  { value: "shopping", label: "Shopping" },
  { value: "health", label: "Health" },
  { value: "education", label: "Education" },
  { value: "recharges", label: "Recharges" },
  { value: "travel", label: "Travel" },
  { value: "income", label: "Income" },
  { value: "other", label: "Other" },
];

const FREQUENCIES = ["daily", "weekly", "monthly", "yearly"];
const REMINDER_OPTIONS = ["0", "1", "2", "3", "5", "7"];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

interface EditRecurringDialogProps {
  item: RecurringTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditRecurringDialog({ item, open, onOpenChange }: EditRecurringDialogProps) {
  const updateRecurring = useUpdateRecurringTransaction();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("bills");
  const [frequency, setFrequency] = useState("monthly");
  const [nextDueDate, setNextDueDate] = useState("");
  const [reminderDays, setReminderDays] = useState("3");
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setAmount(String(item.amount));
    setType(item.type);
    setCategory(item.category);
    setFrequency(item.frequency);
    setNextDueDate(item.next_due_date);
    setReminderDays(String(item.reminder_days_before ?? 3));
    setIsActive(item.is_active ?? true);
    setNotes(item.notes ?? "");
    setErrors({});
  }, [item]);

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
    if (!item) return;

    const result = validateRecurring({
      title,
      amount: amount.trim() === "" ? NaN : Number(amount),
      type,
      category,
      frequency,
      next_due_date: nextDueDate,
      reminder_days_before: parseInt(reminderDays, 10),
      is_active: isActive,
      notes: notes.trim() || null,
    });

    if (!result.ok) {
      const fieldErrors: FieldErrors = (result as { errors: FieldErrors }).errors;
      setErrors(fieldErrors);
      const first = Object.values(fieldErrors).find((m): m is string => !!m);
      toast.error(first ?? "Please fix the highlighted fields");
      return;
    }

    setErrors({});

    try {
      await updateRecurring.mutateAsync({
        id: item.id,
        title: result.data.title,
        amount: result.data.amount,
        type: result.data.type,
        category: result.data.category,
        frequency: result.data.frequency,
        next_due_date: result.data.next_due_date,
        reminder_days_before: result.data.reminder_days_before,
        is_active: isActive,
        notes: result.data.notes ?? null,
      });
      toast.success("Schedule updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update schedule");
    }
  };

  const maxReminder = MAX_REMINDER_DAYS[frequency] ?? 30;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            Edit Recurring Schedule
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
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
              <Label htmlFor="edit-amount">Amount (₹)</Label>
              <Input
                id="edit-amount"
                type="number"
                min="0.01"
                step="0.01"
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
              <Label>Type</Label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Label>Category</Label>
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
                  {CATEGORIES.filter((c) =>
                    type === "income" ? c.value === "income" : c.value !== "income"
                  ).map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.category} />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={handleFrequencyChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.frequency} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-due">Next Due Date</Label>
              <Input
                id="edit-due"
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
              <Label>Remind Before (days)</Label>
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

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                Paused schedules stop posting automatically
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              maxLength={500}
              onChange={(e) => {
                setNotes(e.target.value);
                clearError("notes");
              }}
              rows={2}
            />
            <FieldError message={errors.notes} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateRecurring.isPending}>
              {updateRecurring.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
