import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Target, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Sparkles,
  PiggyBank,
  Wallet,
  Home,
  Car,
  GraduationCap,
  Plane
} from "lucide-react";
import { 
  useSavingsGoals, 
  useAddSavingsGoal, 
  useUpdateSavingsGoal, 
  useDeleteSavingsGoal,
  useSavingsGoalsSummary 
} from "@/hooks/useSavingsGoals";
import { toast } from "sonner";
import { format, differenceInDays, differenceInMonths } from "date-fns";

const categoryIcons: Record<string, React.ElementType> = {
  general: PiggyBank,
  emergency: Wallet,
  home: Home,
  car: Car,
  education: GraduationCap,
  travel: Plane,
  other: Target,
};

const categoryColors: Record<string, string> = {
  general: "bg-primary/20 text-primary",
  emergency: "bg-success/20 text-success",
  home: "bg-accent/20 text-accent",
  car: "bg-warning/20 text-warning",
  education: "bg-blue-500/20 text-blue-500",
  travel: "bg-pink-500/20 text-pink-500",
  other: "bg-muted text-muted-foreground",
};

interface GoalFormData {
  name: string;
  target_amount: string;
  current_amount: string;
  target_date: string;
  category: string;
  notes: string;
}

const initialFormData: GoalFormData = {
  name: "",
  target_amount: "",
  current_amount: "0",
  target_date: "",
  category: "general",
  notes: "",
};

export function SavingsGoals() {
  const { activeGoals, completedGoals, totalTargetAmount, totalCurrentAmount, overallProgress, isLoading } = useSavingsGoalsSummary();
  const addGoal = useAddSavingsGoal();
  const updateGoal = useUpdateSavingsGoal();
  const deleteGoal = useDeleteSavingsGoal();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [formData, setFormData] = useState<GoalFormData>(initialFormData);
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.target_amount) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const goalData = {
        name: formData.name,
        target_amount: Number(formData.target_amount),
        current_amount: Number(formData.current_amount) || 0,
        target_date: formData.target_date || null,
        category: formData.category || null,
        notes: formData.notes || null,
        is_completed: false,
      };

      if (editingGoal) {
        await updateGoal.mutateAsync({ id: editingGoal, ...goalData });
        toast.success("Goal updated!");
      } else {
        await addGoal.mutateAsync(goalData);
        toast.success("Goal created!");
      }
      
      setDialogOpen(false);
      setEditingGoal(null);
      setFormData(initialFormData);
    } catch (error) {
      toast.error("Failed to save goal");
    }
  };

  const handleEdit = (goal: any) => {
    setEditingGoal(goal.id);
    setFormData({
      name: goal.name,
      target_amount: goal.target_amount.toString(),
      current_amount: goal.current_amount.toString(),
      target_date: goal.target_date || "",
      category: goal.category || "general",
      notes: goal.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGoal.mutateAsync(id);
      toast.success("Goal deleted");
    } catch (error) {
      toast.error("Failed to delete goal");
    }
  };

  const handleContribution = async () => {
    if (!selectedGoalId || !contributionAmount) return;

    const goal = activeGoals.find(g => g.id === selectedGoalId);
    if (!goal) return;

    const newAmount = Number(goal.current_amount) + Number(contributionAmount);
    const isCompleted = newAmount >= Number(goal.target_amount);

    try {
      await updateGoal.mutateAsync({
        id: selectedGoalId,
        current_amount: newAmount,
        is_completed: isCompleted,
      });
      toast.success(isCompleted ? "🎉 Goal completed!" : "Contribution added!");
      setContributionDialogOpen(false);
      setContributionAmount("");
      setSelectedGoalId(null);
    } catch (error) {
      toast.error("Failed to add contribution");
    }
  };

  const getTimeRemaining = (targetDate: string | null) => {
    if (!targetDate) return null;
    const days = differenceInDays(new Date(targetDate), new Date());
    if (days < 0) return "Overdue";
    if (days === 0) return "Due today";
    if (days < 30) return `${days} days left`;
    const months = differenceInMonths(new Date(targetDate), new Date());
    return `${months} months left`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground">Savings Goals</h3>
          <p className="text-sm text-muted-foreground">Track your progress towards financial milestones</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingGoal(null);
            setFormData(initialFormData);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Goal Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Emergency Fund, Vacation, New Car"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Amount *</Label>
                  <Input
                    type="number"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                    placeholder="Enter amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Amount</Label>
                  <Input
                    type="number"
                    value={formData.current_amount}
                    onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Date</Label>
                  <Input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Savings</SelectItem>
                      <SelectItem value="emergency">Emergency Fund</SelectItem>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes about this goal..."
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleSubmit} 
                className="w-full"
                disabled={addGoal.isPending || updateGoal.isPending}
              >
                {addGoal.isPending || updateGoal.isPending ? "Saving..." : editingGoal ? "Update Goal" : "Create Goal"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overall Progress Card */}
      {activeGoals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-foreground">Overall Progress</h4>
                    <p className="text-sm text-muted-foreground">{activeGoals.length} active goals</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">{overallProgress}%</p>
                  <p className="text-xs text-muted-foreground">complete</p>
                </div>
              </div>
              <Progress value={overallProgress} className="h-3" />
              <div className="flex justify-between mt-3 text-sm text-muted-foreground">
                <span>Saved: {formatCurrency(totalCurrentAmount)}</span>
                <span>Target: {formatCurrency(totalTargetAmount)}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Goals Grid */}
      <div className="grid gap-4">
        <AnimatePresence>
          {activeGoals.map((goal, index) => {
            const progress = Number(goal.target_amount) > 0 
              ? Math.min(100, Math.round((Number(goal.current_amount) / Number(goal.target_amount)) * 100))
              : 0;
            const remaining = Number(goal.target_amount) - Number(goal.current_amount);
            const CategoryIcon = categoryIcons[goal.category || "other"] || Target;
            const categoryStyle = categoryColors[goal.category || "other"];
            const timeRemaining = getTimeRemaining(goal.target_date);

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${categoryStyle}`}>
                          <CategoryIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{goal.name}</h4>
                          <p className="text-xs text-muted-foreground capitalize">{goal.category || "General"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(goal)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Goal?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{goal.name}". This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(goal.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{progress}% complete</span>
                        {timeRemaining && (
                          <span className={`flex items-center gap-1 ${timeRemaining === "Overdue" ? "text-destructive" : "text-muted-foreground"}`}>
                            <Clock className="w-3 h-3" />
                            {timeRemaining}
                          </span>
                        )}
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="font-semibold text-foreground">{formatCurrency(Number(goal.current_amount))}</span>
                          <span className="text-muted-foreground"> / {formatCurrency(Number(goal.target_amount))}</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedGoalId(goal.id);
                            setContributionDialogOpen(true);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      {goal.notes && (
                        <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded-lg">{goal.notes}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {activeGoals.length === 0 && (
          <Card className="glass">
            <CardContent className="py-12 text-center">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h4 className="text-lg font-medium text-foreground mb-2">No savings goals yet</h4>
              <p className="text-sm text-muted-foreground mb-4">Create your first goal to start tracking your progress</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Goal
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Completed ({completedGoals.length})
          </h4>
          <div className="grid gap-3">
            {completedGoals.map((goal) => (
              <Card key={goal.id} className="glass opacity-75">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <div>
                      <p className="font-medium text-foreground">{goal.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(Number(goal.target_amount))}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(goal.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Contribution Dialog */}
      <Dialog open={contributionDialogOpen} onOpenChange={setContributionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <Button onClick={handleContribution} className="w-full" disabled={!contributionAmount || updateGoal.isPending}>
              {updateGoal.isPending ? "Adding..." : "Add Contribution"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
