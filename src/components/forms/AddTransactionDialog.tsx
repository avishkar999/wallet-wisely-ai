import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddTransaction } from "@/hooks/useTransactions";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

interface AddTransactionDialogProps {
  defaultType?: "income" | "expense";
  trigger?: React.ReactNode;
}

const categories = Constants.public.Enums.transaction_category;
const paymentMethods = Constants.public.Enums.payment_method;

const categoryLabels: Record<string, string> = {
  food: "Food & Dining",
  shopping: "Shopping",
  transport: "Transport",
  entertainment: "Entertainment",
  bills: "Bills & Utilities",
  health: "Health",
  recharges: "Recharges",
  education: "Education",
  travel: "Travel",
  income: "Income",
  other: "Other",
};

const methodLabels: Record<string, string> = {
  upi: "UPI",
  debit_card: "Debit Card",
  credit_card: "Credit Card",
  cash: "Cash",
  neft: "NEFT",
  auto_pay: "Auto Pay",
  other: "Other",
};

export function AddTransactionDialog({ defaultType = "expense", trigger }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">(defaultType);
  const [category, setCategory] = useState<string>("other");
  const [paymentMethod, setPaymentMethod] = useState<string>("upi");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  const addTransaction = useAddTransaction();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !amount) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addTransaction.mutateAsync({
        name,
        amount: parseFloat(amount),
        type,
        category: category as any,
        payment_method: paymentMethod as any,
        transaction_date: date,
        description: description || null,
      });

      toast({
        title: "Transaction Added",
        description: `${type === "income" ? "Income" : "Expense"} of ₹${amount} recorded.`,
      });

      // Reset form
      setName("");
      setAmount("");
      setCategory("other");
      setPaymentMethod("upi");
      setDate(new Date().toISOString().split("T")[0]);
      setDescription("");
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add transaction. Please try again.",
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
            Add {defaultType === "income" ? "Income" : "Expense"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              placeholder="e.g., Salary, Grocery, Petrol"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryLabels[cat] || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {methodLabels[method] || method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Input
              placeholder="Add a note..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addTransaction.isPending}>
              {addTransaction.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Add Transaction"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
