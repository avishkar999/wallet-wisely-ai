import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useUpdateDebt, useDeleteDebt } from "@/hooks/useDebts";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, AlertTriangle, Bell, Trash2, TrendingDown, Calendar } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Debt = Tables<"debts">;

interface EditDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt | null;
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

export function EditDebtDialog({ open, onOpenChange, debt }: EditDebtDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("credit_card");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [outstandingAmount, setOutstandingAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [minimumPayment, setMinimumPayment] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState("3");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const updateDebt = useUpdateDebt();
  const deleteDebt = useDeleteDebt();
  const { toast } = useToast();

  useEffect(() => {
    if (debt) {
      setName(debt.name);
      setType(debt.type);
      setPrincipalAmount(String(debt.principal_amount));
      setOutstandingAmount(String(debt.outstanding_amount));
      setInterestRate(String(debt.interest_rate));
      setMinimumPayment(String(debt.minimum_payment));
      setDueDate(debt.due_date ? String(debt.due_date) : "");
      setStartDate(debt.start_date || "");
      setEndDate(debt.end_date || "");
      setNotes(debt.notes || "");
      setReminderEnabled((debt as any).reminder_enabled ?? true);
      setReminderDaysBefore(String((debt as any).reminder_days_before || 3));
    }
  }, [debt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debt) return;

    try {
      await updateDebt.mutateAsync({
        id: debt.id,
        name,
        type: type as any,
        principal_amount: parseFloat(principalAmount) || 0,
        outstanding_amount: parseFloat(outstandingAmount) || 0,
        interest_rate: parseFloat(interestRate) || 0,
        minimum_payment: parseFloat(minimumPayment) || 0,
        due_date: dueDate ? parseInt(dueDate) : null,
        start_date: startDate || null,
        end_date: endDate || null,
        notes: notes || null,
      });

      toast({ title: "Debt updated successfully" });
      onOpenChange(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update debt.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!debt) return;
    try {
      await deleteDebt.mutateAsync(debt.id);
      toast({ title: "Debt deleted successfully" });
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete debt.",
        variant: "destructive",
      });
    }
  };

  if (!debt) return null;

  const progress = debt.principal_amount > 0 
    ? ((debt.principal_amount - debt.outstanding_amount) / debt.principal_amount) * 100 
    : 0;

  const paidAmount = debt.principal_amount - debt.outstanding_amount;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Edit Debt
            </DialogTitle>
          </DialogHeader>

          {/* Progress Overview */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-success/10 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Payoff Progress</span>
              <span className="text-sm text-muted-foreground">{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-3 mb-3" />
            <div className="flex justify-between text-xs">
              <span className="text-success">Paid: ₹{paidAmount.toLocaleString("en-IN")}</span>
              <span className="text-destructive">Remaining: ₹{debt.outstanding_amount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="reminders">Reminders</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
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
                    <Label>Principal (₹)</Label>
                    <Input
                      type="number"
                      value={principalAmount}
                      onChange={(e) => setPrincipalAmount(e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Outstanding (₹) *</Label>
                    <Input
                      type="number"
                      value={outstandingAmount}
                      onChange={(e) => setOutstandingAmount(e.target.value)}
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Interest Rate (%)</Label>
                    <Input
                      type="number"
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
                      value={minimumPayment}
                      onChange={(e) => setMinimumPayment(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Due Day</Label>
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
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Add notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateDebt.isPending}>
                      {updateDebt.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="reminders" className="space-y-4 mt-4">
              <div className="p-4 rounded-xl bg-secondary/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">Payment Reminders</p>
                      <p className="text-xs text-muted-foreground">Get notified before due date</p>
                    </div>
                  </div>
                  <Switch 
                    checked={reminderEnabled} 
                    onCheckedChange={setReminderEnabled}
                  />
                </div>

                {reminderEnabled && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Label>Remind me before</Label>
                    <Select value={reminderDaysBefore} onValueChange={setReminderDaysBefore}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 day before</SelectItem>
                        <SelectItem value="3">3 days before</SelectItem>
                        <SelectItem value="5">5 days before</SelectItem>
                        <SelectItem value="7">1 week before</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {debt.due_date && (
                <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-warning" />
                    <span className="font-medium">Next Payment Due</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    Day {debt.due_date} of each month
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Minimum payment: ₹{debt.minimum_payment.toLocaleString("en-IN")}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Debt?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{debt.name}" from your debt tracker. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteDebt.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
