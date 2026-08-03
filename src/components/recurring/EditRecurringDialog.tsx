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
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    const parsedAmount = parseFloat(amount);
    if (!title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid title and amount");
      return;
    }
    if (!nextDueDate) {
      toast.error("Pick a next due date");
      return;
    }

    try {
      await updateRecurring.mutateAsync({
        id: item.id,
        title: title.trim(),
        amount: parsedAmount,
        type,
        category: category as RecurringTransaction["category"],
        frequency,
        next_due_date: nextDueDate,
        reminder_days_before: parseInt(reminderDays, 10),
        is_active: isActive,
        notes: notes.trim() || null,
      });
      toast.success("Schedule updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update schedule");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            Edit Recurring Schedule
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount (₹)</Label>
              <Input
                id="edit-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-due">Next Due Date</Label>
              <Input
                id="edit-due"
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Remind Before (days)</Label>
              <Select value={reminderDays} onValueChange={setReminderDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["0", "1", "2", "3", "5", "7"].map((d) => (
                    <SelectItem key={d} value={d}>{d} days</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
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
