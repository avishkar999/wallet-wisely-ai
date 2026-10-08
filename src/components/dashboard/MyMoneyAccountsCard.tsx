import { useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Plus,
  Landmark,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useAccounts, AccountType } from "@/hooks/useAccounts";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function MyMoneyAccountsCard() {
  const { data: accounts = [], isLoading } = useAccounts();
  const { formatMoney } = useCoinKeeper();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [balance, setBalance] = useState("");
  const [institution, setInstitution] = useState("");

  const totalBalance = accounts.reduce((acc, a) => acc + (a.is_active ? Number(a.balance) : 0), 0);
  const positiveAssets = accounts.filter(a => a.is_active && Number(a.balance) > 0).reduce((acc, a) => acc + Number(a.balance), 0);
  const liabilities = accounts.filter(a => a.is_active && Number(a.balance) < 0).reduce((acc, a) => acc + Math.abs(Number(a.balance)), 0);

  const getAccountIcon = (accType: AccountType) => {
    switch (accType) {
      case "bank":
        return Landmark;
      case "credit_card":
        return CreditCard;
      case "cash":
        return Banknote;
      case "upi":
        return Smartphone;
      default:
        return Wallet;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-premium rounded-2xl p-5 sm:p-6 border border-border/40 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            <h3 className="text-base font-bold text-foreground tracking-tight">
              My Money & Accounts
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total Liquid Balance: <span className="font-mono font-semibold text-foreground">{formatMoney(totalBalance)}</span>
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowAddDialog(true)}
          className="text-xs h-8 border-border/50 gap-1 text-primary hover:text-primary"
        >
          <Plus className="w-3.5 h-3.5" /> Account
        </Button>
      </div>

      {/* Account Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((acc) => {
          const Icon = getAccountIcon(acc.type);
          const isNegative = Number(acc.balance) < 0;

          return (
            <div
              key={acc.id}
              className="p-3.5 rounded-xl bg-card/40 border border-border/40 hover:border-primary/30 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isNegative ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-sm text-foreground block">
                    {acc.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground block capitalize">
                    {acc.institution || acc.type}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`font-mono font-bold text-sm block ${
                    isNegative ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {formatMoney(Number(acc.balance))}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  {acc.type === "credit_card" ? "Due" : "Balance"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Asset vs Liability Ribbon */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>
            Assets: <strong className="font-mono text-foreground">{formatMoney(positiveAssets)}</strong>
          </span>
          <span>
            Liabilities: <strong className="font-mono text-destructive">{formatMoney(liabilities)}</strong>
          </span>
        </div>
        <span className="font-medium text-foreground">
          Net: <strong className="font-mono text-success">{formatMoney(totalBalance)}</strong>
        </span>
      </div>

      {/* Quick Add Account Modal */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-2xl border-border/70 p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add Financial Account</DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 my-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Account Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ICICI Savings, Cash, GooglePay"
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Account Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="bank">Bank Account</option>
                <option value="upi">UPI / Digital Payment</option>
                <option value="cash">Cash Wallet</option>
                <option value="credit_card">Credit Card</option>
                <option value="digital_wallet">Digital Wallet</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Current Balance
              </label>
              <Input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0"
                className="h-9 text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Institution / Provider (Optional)
              </label>
              <Input
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. HDFC, Axis, Paytm"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                // save account locally
                setShowAddDialog(false);
                setName("");
                setBalance("");
              }}
              className="bg-primary text-primary-foreground font-semibold"
            >
              Save Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
