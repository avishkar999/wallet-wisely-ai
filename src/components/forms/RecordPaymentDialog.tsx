import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAddRentalPayment, Rental } from "@/hooks/useRentals";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, Calendar, Home } from "lucide-react";
import { format, startOfMonth } from "date-fns";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rental?: Rental | null;
  rentals: Rental[];
}

export function RecordPaymentDialog({ open, onOpenChange, rental, rentals }: RecordPaymentDialogProps) {
  const [selectedRentalId, setSelectedRentalId] = useState(rental?.id || "");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMonth, setPaymentMonth] = useState(format(startOfMonth(new Date()), "yyyy-MM"));
  const [isPartial, setIsPartial] = useState(false);
  const [lateFee, setLateFee] = useState("");
  const [notes, setNotes] = useState("");

  const addPayment = useAddRentalPayment();
  const { toast } = useToast();

  const selectedRental = rentals.find(r => r.id === (rental?.id || selectedRentalId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const rentalId = rental?.id || selectedRentalId;
    if (!rentalId || !amount) {
      toast({
        title: "Missing Fields",
        description: "Please select a property and enter amount.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addPayment.mutateAsync({
        rental_id: rentalId,
        amount: parseFloat(amount),
        payment_date: paymentDate,
        payment_month: `${paymentMonth}-01`,
        is_partial: isPartial,
        late_fee: lateFee ? parseFloat(lateFee) : 0,
        notes: notes || null,
      });

      toast({ title: "Payment recorded successfully" });
      onOpenChange(false);
      
      // Reset form
      setAmount("");
      setPaymentDate(format(new Date(), "yyyy-MM-dd"));
      setPaymentMonth(format(startOfMonth(new Date()), "yyyy-MM"));
      setIsPartial(false);
      setLateFee("");
      setNotes("");
      if (!rental) setSelectedRentalId("");
    } catch {
      toast({
        title: "Error",
        description: "Failed to record payment.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-success" />
            Record Rent Payment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!rental && (
            <div className="space-y-2">
              <Label>Select Property *</Label>
              <Select value={selectedRentalId} onValueChange={setSelectedRentalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a property" />
                </SelectTrigger>
                <SelectContent>
                  {rentals.filter(r => r.status === "active").map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        {r.name} - ₹{r.monthly_rent}/mo
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(rental || selectedRental) && (
            <div className="p-3 rounded-lg bg-secondary/50 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{(rental || selectedRental)?.name}</p>
                <p className="text-xs text-muted-foreground">
                  Expected: ₹{(rental || selectedRental)?.monthly_rent}
                </p>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setAmount(String((rental || selectedRental)?.monthly_rent || ""))}
              >
                Use Full Amount
              </Button>
            </div>
          )}

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
              <Label>Late Fee (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                value={lateFee}
                onChange={(e) => setLateFee(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Payment Date
              </Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>For Month</Label>
              <Input
                type="month"
                value={paymentMonth}
                onChange={(e) => setPaymentMonth(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="partial" 
              checked={isPartial} 
              onCheckedChange={(checked) => setIsPartial(checked === true)}
            />
            <Label htmlFor="partial" className="text-sm font-normal cursor-pointer">
              This is a partial payment
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input
              placeholder="Payment notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addPayment.isPending}>
              {addPayment.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Record Payment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
