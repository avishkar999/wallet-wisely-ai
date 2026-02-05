 import { useState, useMemo } from "react";
 import { motion } from "framer-motion";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Slider } from "@/components/ui/slider";
 import { Progress } from "@/components/ui/progress";
 import {
   Calculator,
   TrendingDown,
   Calendar,
   PiggyBank,
   Zap,
   ArrowRight,
   Sparkles,
 } from "lucide-react";
 import { useDebtSummary } from "@/hooks/useDebts";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 
 interface PayoffScenario {
   monthsToPayoff: number;
   totalInterest: number;
   totalPaid: number;
   payoffDate: Date;
 }
 
 export function DebtPayoffSimulator() {
   const { debts, totalDebt, totalMonthlyPayment } = useDebtSummary();
   const [extraPayment, setExtraPayment] = useState(0);
   const [selectedDebtId, setSelectedDebtId] = useState<string>("all");
 
   const formatCurrency = (amount: number) => {
     if (amount >= 100000) {
       return `₹${(amount / 100000).toFixed(2)}L`;
     }
     return new Intl.NumberFormat("en-IN", {
       style: "currency",
       currency: "INR",
       maximumFractionDigits: 0,
     }).format(amount);
   };
 
   // Calculate payoff scenarios
   const calculatePayoff = (
     principal: number,
     monthlyPayment: number,
     annualRate: number,
     extra: number = 0
   ): PayoffScenario => {
     if (principal <= 0 || monthlyPayment <= 0) {
       return {
         monthsToPayoff: 0,
         totalInterest: 0,
         totalPaid: 0,
         payoffDate: new Date(),
       };
     }
 
     const monthlyRate = annualRate / 100 / 12;
     let balance = principal;
     let months = 0;
     let totalInterest = 0;
     const payment = monthlyPayment + extra;
     const maxMonths = 360; // 30 years max
 
     while (balance > 0 && months < maxMonths) {
       const interestPayment = balance * monthlyRate;
       totalInterest += interestPayment;
       const principalPayment = Math.min(payment - interestPayment, balance);
       
       if (principalPayment <= 0) {
         // Payment doesn't cover interest
         months = maxMonths;
         break;
       }
       
       balance -= principalPayment;
       months++;
     }
 
     const payoffDate = new Date();
     payoffDate.setMonth(payoffDate.getMonth() + months);
 
     return {
       monthsToPayoff: months,
       totalInterest,
       totalPaid: principal + totalInterest,
       payoffDate,
     };
   };
 
   const selectedDebt = useMemo(() => {
     if (selectedDebtId === "all") return null;
     return debts.find((d) => d.id === selectedDebtId) || null;
   }, [selectedDebtId, debts]);
 
   const currentScenario = useMemo(() => {
     if (selectedDebt) {
       return calculatePayoff(
         Number(selectedDebt.outstanding_amount),
         Number(selectedDebt.minimum_payment),
         Number(selectedDebt.interest_rate),
         0
       );
     }
     // All debts combined (simplified)
     const avgRate =
       debts.length > 0
         ? debts.reduce((sum, d) => sum + Number(d.interest_rate), 0) / debts.length
         : 0;
     return calculatePayoff(totalDebt, totalMonthlyPayment, avgRate, 0);
   }, [selectedDebt, debts, totalDebt, totalMonthlyPayment]);
 
   const extraScenario = useMemo(() => {
     if (selectedDebt) {
       return calculatePayoff(
         Number(selectedDebt.outstanding_amount),
         Number(selectedDebt.minimum_payment),
         Number(selectedDebt.interest_rate),
         extraPayment
       );
     }
     const avgRate =
       debts.length > 0
         ? debts.reduce((sum, d) => sum + Number(d.interest_rate), 0) / debts.length
         : 0;
     return calculatePayoff(totalDebt, totalMonthlyPayment, avgRate, extraPayment);
   }, [selectedDebt, debts, totalDebt, totalMonthlyPayment, extraPayment]);
 
   const monthsSaved = currentScenario.monthsToPayoff - extraScenario.monthsToPayoff;
   const interestSaved = currentScenario.totalInterest - extraScenario.totalInterest;
 
   const maxExtra = selectedDebt
     ? Number(selectedDebt.outstanding_amount) * 0.2
     : totalDebt * 0.1;
 
   if (debts.length === 0) {
     return null;
   }
 
   return (
     <Card variant="glow" className="relative overflow-hidden">
       <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <Calculator className="w-5 h-5 text-primary" />
           Debt Payoff Simulator
         </CardTitle>
       </CardHeader>
       <CardContent className="space-y-6">
         {/* Debt Selector */}
         <div className="space-y-2">
           <Label className="text-sm text-muted-foreground">Select Debt to Simulate</Label>
           <Select value={selectedDebtId} onValueChange={setSelectedDebtId}>
             <SelectTrigger>
               <SelectValue placeholder="Select a debt" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Debts Combined</SelectItem>
               {debts.map((debt) => (
                 <SelectItem key={debt.id} value={debt.id}>
                   {debt.name} ({formatCurrency(debt.outstanding_amount)})
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>
 
         {/* Extra Payment Slider */}
         <div className="space-y-4">
           <div className="flex items-center justify-between">
             <Label className="text-sm text-muted-foreground">Extra Monthly Payment</Label>
             <div className="flex items-center gap-2">
               <Input
                 type="number"
                 value={extraPayment}
                 onChange={(e) => setExtraPayment(Math.max(0, Number(e.target.value)))}
                 className="w-28 h-8 text-right"
               />
             </div>
           </div>
           <Slider
             value={[extraPayment]}
             onValueChange={([value]) => setExtraPayment(value)}
             max={Math.max(maxExtra, 10000)}
             step={500}
             className="w-full"
           />
           <div className="flex justify-between text-xs text-muted-foreground">
             <span>₹0</span>
             <span>{formatCurrency(Math.max(maxExtra, 10000))}</span>
           </div>
         </div>
 
         {/* Comparison Cards */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Current Plan */}
           <motion.div
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             className="p-4 rounded-xl bg-secondary/50 border border-border"
           >
             <div className="flex items-center gap-2 mb-3">
               <Calendar className="w-4 h-4 text-muted-foreground" />
               <span className="text-sm font-medium text-muted-foreground">Current Plan</span>
             </div>
             <div className="space-y-3">
               <div>
                 <p className="text-2xl font-bold text-foreground">
                   {currentScenario.monthsToPayoff < 360
                     ? currentScenario.payoffDate.toLocaleDateString("en-IN", {
                         month: "short",
                         year: "numeric",
                       })
                     : "30+ years"}
                 </p>
                 <p className="text-xs text-muted-foreground">
                   {currentScenario.monthsToPayoff} months
                 </p>
               </div>
               <div className="pt-2 border-t border-border">
                 <p className="text-xs text-muted-foreground">Total Interest</p>
                 <p className="text-lg font-semibold text-destructive">
                   {formatCurrency(currentScenario.totalInterest)}
                 </p>
               </div>
             </div>
           </motion.div>
 
           {/* With Extra Payment */}
           <motion.div
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-success/10 border border-primary/20"
           >
             <div className="flex items-center gap-2 mb-3">
               <Zap className="w-4 h-4 text-primary" />
               <span className="text-sm font-medium text-primary">With Extra Payment</span>
             </div>
             <div className="space-y-3">
               <div>
                 <p className="text-2xl font-bold text-foreground">
                   {extraScenario.monthsToPayoff < 360
                     ? extraScenario.payoffDate.toLocaleDateString("en-IN", {
                         month: "short",
                         year: "numeric",
                       })
                     : "30+ years"}
                 </p>
                 <p className="text-xs text-muted-foreground">
                   {extraScenario.monthsToPayoff} months
                 </p>
               </div>
               <div className="pt-2 border-t border-primary/20">
                 <p className="text-xs text-muted-foreground">Total Interest</p>
                 <p className="text-lg font-semibold text-success">
                   {formatCurrency(extraScenario.totalInterest)}
                 </p>
               </div>
             </div>
           </motion.div>
         </div>
 
         {/* Savings Summary */}
         {extraPayment > 0 && (
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="p-4 rounded-xl bg-success/10 border border-success/20"
           >
             <div className="flex items-center gap-2 mb-3">
               <Sparkles className="w-5 h-5 text-success" />
               <span className="text-sm font-semibold text-success">Your Savings</span>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <p className="text-xs text-muted-foreground">Time Saved</p>
                 <p className="text-xl font-bold text-foreground">
                   {monthsSaved > 0 ? `${monthsSaved} months` : "—"}
                 </p>
                 <p className="text-xs text-success">
                   {monthsSaved > 12
                     ? `${Math.floor(monthsSaved / 12)} years ${monthsSaved % 12} months faster!`
                     : monthsSaved > 0
                     ? `${monthsSaved} months faster!`
                     : ""}
                 </p>
               </div>
               <div>
                 <p className="text-xs text-muted-foreground">Interest Saved</p>
                 <p className="text-xl font-bold text-success">
                   {interestSaved > 0 ? formatCurrency(interestSaved) : "—"}
                 </p>
                 <p className="text-xs text-success">
                   {interestSaved > 0 ? "in interest payments" : ""}
                 </p>
               </div>
             </div>
           </motion.div>
         )}
 
         {/* Quick Suggestions */}
         <div className="space-y-2">
           <p className="text-sm font-medium text-muted-foreground">Quick Options</p>
           <div className="flex flex-wrap gap-2">
             {[1000, 2500, 5000, 10000].map((amount) => (
               <Button
                 key={amount}
                 variant={extraPayment === amount ? "default" : "outline"}
                 size="sm"
                 onClick={() => setExtraPayment(amount)}
               >
                 +{formatCurrency(amount)}
               </Button>
             ))}
           </div>
         </div>
       </CardContent>
     </Card>
   );
 }