import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUpdateInvestment, useDeleteInvestment } from "@/hooks/useInvestments";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Trash2, 
  Shield, 
  Zap, 
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
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

type Investment = Tables<"investments">;

interface EditInvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: Investment | null;
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

const riskLevels = [
  { value: "low", label: "Low Risk", color: "bg-success/20 text-success", icon: Shield },
  { value: "medium", label: "Medium Risk", color: "bg-warning/20 text-warning", icon: Activity },
  { value: "high", label: "High Risk", color: "bg-destructive/20 text-destructive", icon: Zap },
];

export function EditInvestmentDialog({ open, onOpenChange, investment }: EditInvestmentDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("mutual_fund");
  const [investedAmount, setInvestedAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [units, setUnits] = useState("");
  const [nav, setNav] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [riskLevel, setRiskLevel] = useState("medium");
  const [notes, setNotes] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const updateInvestment = useUpdateInvestment();
  const deleteInvestment = useDeleteInvestment();
  const { toast } = useToast();

  useEffect(() => {
    if (investment) {
      setName(investment.name);
      setType(investment.type);
      setInvestedAmount(String(investment.invested_amount));
      setCurrentValue(String(investment.current_value));
      setUnits(investment.units ? String(investment.units) : "");
      setNav(investment.nav ? String(investment.nav) : "");
      setPurchaseDate(investment.purchase_date || "");
      setRiskLevel((investment as any).risk_level || "medium");
      setNotes(investment.notes || "");
    }
  }, [investment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investment) return;

    try {
      await updateInvestment.mutateAsync({
        id: investment.id,
        name,
        type: type as any,
        invested_amount: parseFloat(investedAmount) || 0,
        current_value: parseFloat(currentValue) || parseFloat(investedAmount) || 0,
        units: units ? parseFloat(units) : null,
        nav: nav ? parseFloat(nav) : null,
        purchase_date: purchaseDate || null,
        notes: notes || null,
      });

      toast({ title: "Investment updated successfully" });
      onOpenChange(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update investment.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!investment) return;
    try {
      await deleteInvestment.mutateAsync(investment.id);
      toast({ title: "Investment deleted successfully" });
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete investment.",
        variant: "destructive",
      });
    }
  };

  if (!investment) return null;

  const gain = investment.current_value - investment.invested_amount;
  const gainPercent = investment.invested_amount > 0 
    ? (gain / investment.invested_amount) * 100 
    : 0;
  const isPositive = gain >= 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Edit Investment
            </DialogTitle>
          </DialogHeader>

          {/* Performance Overview */}
          <div className={`p-4 rounded-xl border ${isPositive ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Current Performance</span>
              <Badge variant="secondary" className={isPositive ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}>
                {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {isPositive ? '+' : ''}{gainPercent.toFixed(2)}%
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Invested</p>
                <p className="text-lg font-bold">₹{investment.invested_amount.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Value</p>
                <p className="text-lg font-bold">₹{investment.current_value.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isPositive ? 'Gain' : 'Loss'}</p>
                <p className={`text-lg font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                  {isPositive ? '+' : ''}₹{gain.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="risk">Risk & Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
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
                      value={investedAmount}
                      onChange={(e) => setInvestedAmount(e.target.value)}
                      min="0"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Value (₹) *</Label>
                    <Input
                      type="number"
                      value={currentValue}
                      onChange={(e) => setCurrentValue(e.target.value)}
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Units</Label>
                    <Input
                      type="number"
                      value={units}
                      onChange={(e) => setUnits(e.target.value)}
                      min="0"
                      step="0.0001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>NAV / Price</Label>
                    <Input
                      type="number"
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
                    <Button type="submit" disabled={updateInvestment.isPending}>
                      {updateInvestment.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="risk" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label>Risk Level</Label>
                <div className="grid grid-cols-3 gap-3">
                  {riskLevels.map((level) => {
                    const Icon = level.icon;
                    return (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setRiskLevel(level.value)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          riskLevel === level.value 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${level.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium">{level.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="p-4 rounded-xl bg-secondary/50 space-y-3">
                <h4 className="font-medium">Performance Metrics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Absolute Return</p>
                    <p className={`text-lg font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                      {isPositive ? '+' : ''}{gainPercent.toFixed(2)}%
                    </p>
                  </div>
                  {purchaseDate && (
                    <div>
                      <p className="text-xs text-muted-foreground">Holding Period</p>
                      <p className="text-lg font-bold">
                        {Math.floor((new Date().getTime() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24))} days
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Insight */}
              <div className={`p-4 rounded-xl border ${
                gainPercent >= 10 
                  ? 'bg-success/5 border-success/20' 
                  : gainPercent >= 0 
                    ? 'bg-warning/5 border-warning/20'
                    : 'bg-destructive/5 border-destructive/20'
              }`}>
                <div className="flex items-start gap-3">
                  {gainPercent >= 10 ? (
                    <TrendingUp className="w-5 h-5 text-success flex-shrink-0" />
                  ) : gainPercent >= 0 ? (
                    <Activity className="w-5 h-5 text-warning flex-shrink-0" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-destructive flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {gainPercent >= 10 
                        ? 'Strong Performer' 
                        : gainPercent >= 0 
                          ? 'Stable Investment'
                          : 'Needs Attention'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {gainPercent >= 10 
                        ? 'This investment is outperforming. Consider maintaining your position.' 
                        : gainPercent >= 0 
                          ? 'Moderate returns. Monitor for better opportunities.'
                          : 'This investment is underperforming. Consider reviewing your strategy.'}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Investment?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{investment.name}" from your portfolio. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteInvestment.isPending ? (
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
