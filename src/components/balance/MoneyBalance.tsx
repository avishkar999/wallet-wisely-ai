import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  useAccounts,
  useAddAccount,
  useUpdateAccount,
  useDeleteAccount,
  ACCOUNT_TYPE_LABELS,
  type Account,
  type AccountType,
} from "@/hooks/useAccounts";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { Banknote, Landmark, Smartphone, CreditCard, Wallet, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { addDays, format, isAfter, isBefore } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<AccountType, typeof Wallet> = {
  cash: Banknote,
  bank: Landmark,
  upi: Smartphone,
  credit_card: CreditCard,
  digital_wallet: Wallet,
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

/** Approximate monthly value of a schedule, used for the 30-day outlook. */
function monthlyEquivalent(frequency: string, amount: number) {
  switch (frequency) {
    case "daily":
      return amount * 30;
    case "weekly":
      return amount * 4;
    case "yearly":
      return amount / 12;
    default:
      return amount;
  }
}

export function MoneyBalance() {
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: recurring = [] } = useRecurringTransactions();
  const addAccount = useAddAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [balance, setBalance] = useState("");
  const [institution, setInstitution] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setType("bank");
    setBalance("");
    setInstitution("");
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setName(account.name);
    setType(account.type);
    setBalance(String(Number(account.balance)));
    setInstitution(account.institution ?? "");
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const amount = Number(balance);
    if (!name.trim()) return setError("Give this account a name.");
    if (balance.trim() === "" || Number.isNaN(amount)) return setError("Enter a valid amount.");
    if (amount < 0) return setError("Amount cannot be negative. For a credit card, enter the amount you owe.");

    try {
      if (editing) {
        await updateAccount.mutateAsync({
          id: editing.id,
          name: name.trim(),
          type,
          balance: amount,
          institution: institution.trim() || null,
        });
        toast.success("Account updated");
      } else {
        await addAccount.mutateAsync({
          name: name.trim(),
          type,
          balance: amount,
          institution: institution.trim() || null,
        });
        toast.success("Account added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Could not save this account");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAccount.mutateAsync(deleteId);
      toast.success("Account removed");
      setDeleteId(null);
    } catch {
      toast.error("Could not remove this account");
    }
  };

  const cashLike = accounts.filter((a) => a.type !== "credit_card");
  const cards = accounts.filter((a) => a.type === "credit_card");
  const totalAvailable = cashLike.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalOwed = cards.reduce((sum, a) => sum + Number(a.balance), 0);
  const netBalance = totalAvailable - totalOwed;

  const activeRecurring = recurring.filter((r) => r.is_active);
  const horizon = addDays(new Date(), 30);
  const upcoming = activeRecurring.filter((r) => {
    const due = new Date(r.next_due_date);
    return isBefore(due, horizon) || !isAfter(due, horizon);
  });
  const recurringIn = activeRecurring
    .filter((r) => r.type === "income")
    .reduce((s, r) => s + monthlyEquivalent(r.frequency, Number(r.amount)), 0);
  const recurringOut = activeRecurring
    .filter((r) => r.type !== "income")
    .reduce((s, r) => s + monthlyEquivalent(r.frequency, Number(r.amount)), 0);
  const projected = netBalance + recurringIn - recurringOut;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-5xl mx-auto"
    >
      {/* Net balance hero */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Net balance</p>
          <p className={cn("text-4xl font-bold mt-1", netBalance < 0 ? "text-destructive" : "text-foreground")}>
            {formatCurrency(netBalance)}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div>
              <p className="text-xs text-muted-foreground">Money available</p>
              <p className="font-semibold text-success">{formatCurrency(totalAvailable)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Card dues</p>
              <p className="font-semibold text-destructive">{formatCurrency(totalOwed)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recurring in / month</p>
              <p className="font-semibold text-success">{formatCurrency(recurringIn)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recurring out / month</p>
              <p className="font-semibold text-destructive">{formatCurrency(recurringOut)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            After a month of scheduled money in and out, you'd be at{" "}
            <span className={cn("font-medium", projected < 0 ? "text-destructive" : "text-success")}>
              {formatCurrency(projected)}
            </span>
            .
          </p>
        </CardContent>
      </Card>

      {/* Accounts */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Your money
          </CardTitle>
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No data yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add your cash, bank accounts, UPI, cards and wallets to see a net balance.
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {accounts.map((account) => {
                const Icon = TYPE_ICONS[account.type];
                const isCard = account.type === "credit_card";
                return (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{account.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">
                          {ACCOUNT_TYPE_LABELS[account.type]}
                        </Badge>
                        {account.institution && (
                          <span className="text-xs text-muted-foreground truncate">{account.institution}</span>
                        )}
                      </div>
                    </div>
                    <span className={cn("text-sm font-semibold", isCard ? "text-destructive" : "text-success")}>
                      {isCard ? "-" : ""}
                      {formatCurrency(Number(account.balance))}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(account)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(account.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* Linked recurring schedules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            Linked recurring schedules
            {upcoming.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {upcoming.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeRecurring.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
          ) : (
            activeRecurring.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {item.frequency} · next {format(new Date(item.next_due_date), "MMM d")}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold whitespace-nowrap",
                    item.type === "income" ? "text-success" : "text-destructive"
                  )}
                >
                  {item.type === "income" ? "+" : "-"}
                  {formatCurrency(Number(item.amount))}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit account" : "Add account"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Salary account" />
            </div>
            <div className="space-y-2">
              <Label>Kind</Label>
              <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {ACCOUNT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{type === "credit_card" ? "Amount owed" : "Current amount"}</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Bank or provider (optional)</Label>
              <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. HDFC" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={addAccount.isPending || updateAccount.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this account?</AlertDialogTitle>
            <AlertDialogDescription>
              This only removes the account from your balance page. Your transactions stay untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
