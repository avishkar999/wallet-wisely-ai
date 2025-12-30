import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddInvestment } from "@/hooks/useInvestments";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

interface AddInvestmentDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const investmentTypes = Constants.public.Enums.investment_type;

const typeLabels: Record<string, string> = {
  mutual_fund: "Mutual Fund",
  stock: "Stock",
  fixed_deposit: "Fixed Deposit",
  recurring_deposit: "Recurring Deposit",
  crypto: "Cryptocurrency",
  gold: "Gold",
  bonds: "Bonds",
  other: "Other",
};

export function AddInvestmentDialog({ trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange }: AddInvestmentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("mutual_fund");
  const [investedAmount, setInvestedAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [units, setUnits] = useState("");
  const [nav, setNav] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");

  const addInvestment = useAddInvestment();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !investedAmount) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addInvestment.mutateAsync({
        name,
        type: type as any,
        invested_amount: parseFloat(investedAmount),
        current_value: parseFloat(currentValue) || parseFloat(investedAmount),
        units: units ? parseFloat(units) : null,
        nav: nav ? parseFloat(nav) : null,
        purchase_date: purchaseDate || null,
        notes: notes || null,
      });

      toast({
        title: "Investment Added",
        description: `${name} added to your portfolio.`,
      });

      // Reset form
      setName("");
      setType("mutual_fund");
      setInvestedAmount("");
      setCurrentValue("");
      setUnits("");
      setNav("");
      setPurchaseDate("");
      setNotes("");
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add investment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Investment
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Investment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Investment Name *</Label>
            <Input
              placeholder="e.g., Axis Bluechip Fund"
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
                {investmentTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {typeLabels[t] || t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Invested Amount (₹) *</Label>
              <Input
                type="number"
                placeholder="0"
                value={investedAmount}
                onChange={(e) => setInvestedAmount(e.target.value)}
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Current Value (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Units</Label>
              <Input
                type="number"
                placeholder="0"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                min="0"
                step="0.0001"
              />
            </div>
            <div className="space-y-2">
              <Label>NAV</Label>
              <Input
                type="number"
                placeholder="0"
                value={nav}
                onChange={(e) => setNav(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Purchase Date</Label>
            <Input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
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
            <Button type="submit" disabled={addInvestment.isPending}>
              {addInvestment.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Add Investment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
