import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddDebt } from "@/hooks/useDebts";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

interface AddDebtDialogProps {
  trigger?: React.ReactNode;
}

const debtTypes = Constants.public.Enums.debt_type;

const typeLabels: Record<string, string> = {
  credit_card: "Credit Card",
  personal_loan: "Personal Loan",
  home_loan: "Home Loan",
  car_loan: "Car Loan",
  education_loan: "Education Loan",
  emi: "EMI",
  other: "Other",
};

export function AddDebtDialog({ trigger }: AddDebtDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("credit_card");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [outstandingAmount, setOutstandingAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [minimumPayment, setMinimumPayment] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");

  const addDebt = useAddDebt();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !outstandingAmount) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addDebt.mutateAsync({
        name,
        type: type as any,
        principal_amount: parseFloat(principalAmount) || parseFloat(outstandingAmount),
        outstanding_amount: parseFloat(outstandingAmount),
        interest_rate: parseFloat(interestRate) || 0,
        minimum_payment: parseFloat(minimumPayment) || 0,
        due_date: dueDate ? parseInt(dueDate) : null,
        start_date: startDate || null,
        notes: notes || null,
      });

      toast({
        title: "Debt Added",
        description: `${name} added to your debt tracker.`,
      });

      // Reset form
      setName("");
      setType("credit_card");
      setPrincipalAmount("");
      setOutstandingAmount("");
      setInterestRate("");
      setMinimumPayment("");
      setDueDate("");
      setStartDate("");
      setNotes("");
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add debt. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Debt/Loan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Debt/Loan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Debt Name *</Label>
            <Input
              placeholder="e.g., HDFC Credit Card"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {debtTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {typeLabels[t] || t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Principal Amount (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Outstanding (₹) *</Label>
              <Input
                type="number"
                placeholder="0"
                value={outstandingAmount}
                onChange={(e) => setOutstandingAmount(e.target.value)}
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Interest Rate (%)</Label>
              <Input
                type="number"
                placeholder="0"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                min="0"
                max="100"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Min. Payment (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                value={minimumPayment}
                onChange={(e) => setMinimumPayment(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Due Date (Day of month)</Label>
              <Input
                type="number"
                placeholder="1-31"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min="1"
                max="31"
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              placeholder="Add notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addDebt.isPending}>
              {addDebt.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Add Debt"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
