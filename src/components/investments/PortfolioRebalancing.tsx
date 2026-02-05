 import { useState, useMemo } from "react";
 import { motion } from "framer-motion";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Progress } from "@/components/ui/progress";
 import { Slider } from "@/components/ui/slider";
 import {
   PieChart,
   Target,
   ArrowRight,
   ArrowUpRight,
   ArrowDownRight,
   RefreshCw,
   Sparkles,
   AlertTriangle,
   CheckCircle,
 } from "lucide-react";
 import { useInvestmentSummary } from "@/hooks/useInvestments";
 
 interface AllocationTarget {
   type: string;
   label: string;
   targetPercent: number;
   color: string;
 }
 
 const DEFAULT_ALLOCATIONS: AllocationTarget[] = [
   { type: "mutual_fund", label: "Mutual Funds", targetPercent: 40, color: "hsl(var(--primary))" },
   { type: "stock", label: "Stocks", targetPercent: 30, color: "hsl(var(--success))" },
   { type: "fixed_deposit", label: "Fixed Deposits", targetPercent: 15, color: "hsl(var(--warning))" },
   { type: "gold", label: "Gold", targetPercent: 10, color: "hsl(38 92% 50%)" },
   { type: "other", label: "Other", targetPercent: 5, color: "hsl(var(--muted-foreground))" },
 ];
 
 export function PortfolioRebalancing() {
   const { totalCurrentValue, byType, investments } = useInvestmentSummary();
   const [allocations, setAllocations] = useState<AllocationTarget[]>(DEFAULT_ALLOCATIONS);
   const [isEditing, setIsEditing] = useState(false);
 
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
 
   // Calculate current allocations and differences
   const allocationAnalysis = useMemo(() => {
     return allocations.map((target) => {
       const typeData = byType[target.type];
       const currentValue = typeData?.current || 0;
       const currentPercent = totalCurrentValue > 0 ? (currentValue / totalCurrentValue) * 100 : 0;
       const difference = currentPercent - target.targetPercent;
       const targetValue = (target.targetPercent / 100) * totalCurrentValue;
       const amountDifference = currentValue - targetValue;
 
       return {
         ...target,
         currentValue,
         currentPercent,
         difference,
         targetValue,
         amountDifference,
         status: Math.abs(difference) < 3 ? "balanced" : difference > 0 ? "over" : "under",
       };
     });
   }, [allocations, byType, totalCurrentValue]);
 
   const needsRebalancing = allocationAnalysis.some((a) => Math.abs(a.difference) >= 5);
 
   const handleAllocationChange = (index: number, newPercent: number) => {
     const newAllocations = [...allocations];
     newAllocations[index] = { ...newAllocations[index], targetPercent: newPercent };
     setAllocations(newAllocations);
   };
 
   const totalTargetPercent = allocations.reduce((sum, a) => sum + a.targetPercent, 0);
 
   if (investments.length === 0) {
     return null;
   }
 
   return (
     <Card variant="glow" className="relative overflow-hidden">
       <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-primary/5" />
       <CardHeader className="flex flex-row items-center justify-between">
         <CardTitle className="flex items-center gap-2">
           <PieChart className="w-5 h-5 text-accent" />
           Portfolio Rebalancing
         </CardTitle>
         <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
           {isEditing ? "Done" : "Edit Targets"}
         </Button>
       </CardHeader>
       <CardContent className="space-y-6">
         {/* Status Banner */}
         {needsRebalancing ? (
           <motion.div
             initial={{ opacity: 0, y: -10 }}
             animate={{ opacity: 1, y: 0 }}
             className="flex items-center gap-3 p-3 rounded-xl bg-warning/10 border border-warning/20"
           >
             <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
             <div>
               <p className="text-sm font-medium text-foreground">Rebalancing Recommended</p>
               <p className="text-xs text-muted-foreground">
                 Your portfolio has drifted from target allocations
               </p>
             </div>
           </motion.div>
         ) : (
           <motion.div
             initial={{ opacity: 0, y: -10 }}
             animate={{ opacity: 1, y: 0 }}
             className="flex items-center gap-3 p-3 rounded-xl bg-success/10 border border-success/20"
           >
             <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
             <div>
               <p className="text-sm font-medium text-foreground">Portfolio Balanced</p>
               <p className="text-xs text-muted-foreground">
                 Your allocations are within target ranges
               </p>
             </div>
           </motion.div>
         )}
 
         {/* Allocation Bars */}
         <div className="space-y-4">
           {allocationAnalysis.map((allocation, index) => (
             <motion.div
               key={allocation.type}
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: index * 0.1 }}
               className="space-y-2"
             >
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div
                     className="w-3 h-3 rounded-full"
                     style={{ backgroundColor: allocation.color }}
                   />
                   <span className="text-sm font-medium text-foreground">{allocation.label}</span>
                 </div>
                 <div className="flex items-center gap-3">
                   {isEditing ? (
                     <div className="flex items-center gap-2">
                       <Input
                         type="number"
                         value={allocation.targetPercent}
                         onChange={(e) =>
                           handleAllocationChange(index, Math.max(0, Math.min(100, Number(e.target.value))))
                         }
                         className="w-16 h-7 text-center text-sm"
                       />
                       <span className="text-xs text-muted-foreground">%</span>
                     </div>
                   ) : (
                     <>
                       <span className="text-xs text-muted-foreground">
                         {allocation.currentPercent.toFixed(1)}% / {allocation.targetPercent}%
                       </span>
                       {allocation.status !== "balanced" && (
                         <span
                           className={`text-xs font-medium flex items-center gap-0.5 ${
                             allocation.status === "over" ? "text-warning" : "text-primary"
                           }`}
                         >
                           {allocation.status === "over" ? (
                             <>
                               <ArrowUpRight className="w-3 h-3" />+{allocation.difference.toFixed(1)}%
                             </>
                           ) : (
                             <>
                               <ArrowDownRight className="w-3 h-3" />
                               {allocation.difference.toFixed(1)}%
                             </>
                           )}
                         </span>
                       )}
                     </>
                   )}
                 </div>
               </div>
 
               {/* Visual Bar */}
               <div className="relative h-4 bg-secondary rounded-full overflow-hidden">
                 {/* Current allocation */}
                 <div
                   className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                   style={{
                     width: `${Math.min(allocation.currentPercent, 100)}%`,
                     backgroundColor: allocation.color,
                     opacity: 0.7,
                   }}
                 />
                 {/* Target marker */}
                 <div
                   className="absolute top-0 bottom-0 w-0.5 bg-foreground/50"
                   style={{ left: `${allocation.targetPercent}%` }}
                 />
               </div>
             </motion.div>
           ))}
         </div>
 
         {/* Total validation */}
         {isEditing && (
           <div
             className={`text-sm ${
               totalTargetPercent === 100 ? "text-success" : "text-destructive"
             }`}
           >
             Total: {totalTargetPercent}% {totalTargetPercent !== 100 && "(should be 100%)"}
           </div>
         )}
 
         {/* Rebalancing Actions */}
         {needsRebalancing && !isEditing && (
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="space-y-4"
           >
             <div className="flex items-center gap-2 mb-2">
               <Sparkles className="w-4 h-4 text-accent" />
               <span className="text-sm font-medium text-foreground">Suggested Actions</span>
             </div>
 
             <div className="space-y-2">
               {allocationAnalysis
                 .filter((a) => Math.abs(a.difference) >= 3)
                 .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
                 .map((allocation) => (
                   <div
                     key={allocation.type}
                     className="flex items-center justify-between p-3 rounded-xl bg-secondary/50"
                   >
                     <div className="flex items-center gap-2">
                       <div
                         className="w-2 h-2 rounded-full"
                         style={{ backgroundColor: allocation.color }}
                       />
                       <span className="text-sm text-foreground">{allocation.label}</span>
                     </div>
                     <div className="flex items-center gap-2">
                       {allocation.status === "over" ? (
                         <span className="text-xs text-warning">
                           Reduce by {formatCurrency(Math.abs(allocation.amountDifference))}
                         </span>
                       ) : (
                         <span className="text-xs text-primary">
                           Add {formatCurrency(Math.abs(allocation.amountDifference))}
                         </span>
                       )}
                       <ArrowRight className="w-3 h-3 text-muted-foreground" />
                     </div>
                   </div>
                 ))}
             </div>
           </motion.div>
         )}
 
         {/* Reset Button */}
         {isEditing && (
           <Button
             variant="outline"
             size="sm"
             onClick={() => setAllocations(DEFAULT_ALLOCATIONS)}
             className="w-full"
           >
             <RefreshCw className="w-4 h-4 mr-2" />
             Reset to Default Allocations
           </Button>
         )}
       </CardContent>
     </Card>
   );
 }