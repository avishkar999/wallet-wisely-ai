import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAddRentalExpense, Rental } from "@/hooks/useRentals";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wrench, Home, Calendar } from "lucide-react";
import { format } from "date-fns";

interface RecordExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentals: Rental[];
}

const expenseCategories = [
  { value: "maintenance", label: "Maintenance & Repairs" },
  { value: "utilities", label: "Utilities" },
  { value: "insurance", label: "Insurance" },
  { value: "taxes", label: "Property Tax" },
  { value: "management", label: "Property Management" },
  { value: "legal", label: "Legal Fees" },
  { value: "cleaning", label: "Cleaning" },
  { value: "advertising", label: "Advertising" },
  { value: "other", label: "Other" },
];

export function RecordExpenseDialog({ open, onOpenChange, rentals }: RecordExpenseDialogProps) {
  const [selectedRentalId, setSelectedRentalId] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("maintenance");
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");

  const addExpense = useAddRentalExpense();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRentalId || !amount || !category) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addExpense.mutateAsync({
        rental_id: selectedRentalId,
        amount: parseFloat(amount),
        category,
        expense_date: expenseDate,
        description: description || null,
      });

      toast({ title: "Expense recorded successfully" });
      onOpenChange(false);
      
      // Reset form
      setSelectedRentalId("");
      setAmount("");
      setCategory("maintenance");
      setExpenseDate(format(new Date(), "yyyy-MM-dd"));
      setDescription("");
    } catch {
      toast({
        title: "Error",
        description: "Failed to record expense.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-warning" />
            Record Property Expense
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Property *</Label>
            <Select value={selectedRentalId} onValueChange={setSelectedRentalId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a property" />
              </SelectTrigger>
              <SelectContent>
                {rentals.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      {r.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Expense Date
            </Label>
            <Input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="What was this expense for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addExpense.isPending}>
              {addExpense.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Record Expense"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
