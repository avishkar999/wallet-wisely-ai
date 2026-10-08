import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useCoinKeeper, PersonaType, CurrencyCode } from "@/contexts/CoinKeeperContext";
import { toast } from "sonner";
import { User, Wallet, RefreshCw, Info, Trash2, Sparkles, Sliders, Layers } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

const currencies = [
  { value: "INR", label: "₹ Indian Rupee (INR)" },
  { value: "USD", label: "$ US Dollar (USD)" },
  { value: "EUR", label: "€ Euro (EUR)" },
  { value: "GBP", label: "£ British Pound (GBP)" },
  { value: "CAD", label: "CA$ Canadian Dollar (CAD)" },
  { value: "AUD", label: "A$ Australian Dollar (AUD)" },
  { value: "JPY", label: "¥ Japanese Yen (JPY)" },
];

export function SettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const { mutate: updateProfile } = useUpdateProfile();
  const { user } = useAuth();
  const {
    profile: ckProfile,
    updateProfile: updateCkProfile,
    resetToPersonaPresets,
    setShowOnboardingModal,
    setShowDashboardCustomizer,
  } = useCoinKeeper();
  
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [currency, setCurrency] = useState(ckProfile.currency || "INR");
  const [isResetting, setIsResetting] = useState(false);

  const handleSaveProfile = () => {
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }
    
    updateProfile(
      { display_name: displayName },
      {
        onSuccess: () => toast.success("Profile updated successfully"),
        onError: () => toast.error("Failed to update profile"),
      }
    );
  };

  const handleResetAllData = async () => {
    if (!user) return;
    
    setIsResetting(true);
    try {
      // Delete all user data from all tables
      await supabase.from('transactions').delete().eq('user_id', user.id);
      await supabase.from('investments').delete().eq('user_id', user.id);
      await supabase.from('debts').delete().eq('user_id', user.id);
      await supabase.from('budgets').delete().eq('user_id', user.id);
      await supabase.from('emergency_fund').delete().eq('user_id', user.id);
      await supabase.from('calendar_events').delete().eq('user_id', user.id);
      
      toast.success("All data has been reset successfully");
      window.location.reload();
    } catch (error) {
      toast.error("Failed to reset data");
    } finally {
      setIsResetting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-2xl mx-auto"
    >
      {/* Profile Settings */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            <Button onClick={handleSaveProfile} className="w-full sm:w-auto">
              Save Profile
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* CoinKeeper Personal Finance OS Configuration */}
      <motion.div variants={itemVariants}>
        <Card className="border-primary/30 shadow-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              CoinKeeper OS Personalization
            </CardTitle>
            <CardDescription>
              CoinKeeper adapts to you. Change your lifestyle template, budgeting methodology, and insight depth.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Financial Persona</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(["student", "professional", "freelancer", "business", "investor", "other"] as PersonaType[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      resetToPersonaPresets(p);
                      toast.success(`Switched template to ${p.toUpperCase()}`);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition-all ${
                      ckProfile.persona === p
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-secondary/40 border-border/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label>Budgeting Philosophy</Label>
                <Select
                  value={ckProfile.budgetingStyle}
                  onValueChange={(val: any) => {
                    updateCkProfile({ budgetingStyle: val });
                    toast.success("Budgeting style updated");
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Budgeting Style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category">Category-Based Budget</SelectItem>
                    <SelectItem value="simple">Simple Monthly Cap</SelectItem>
                    <SelectItem value="savings_first">Savings-First (Pay Yourself First)</SelectItem>
                    <SelectItem value="percentage">Percentage (50/30/20)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Insight Intelligence Depth</Label>
                <Select
                  value={ckProfile.insightStyle}
                  onValueChange={(val: any) => {
                    updateCkProfile({ insightStyle: val });
                    toast.success("Insight depth updated");
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Insight Depth" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple Summaries</SelectItem>
                    <SelectItem value="detailed">Detailed Pace & Guardrails</SelectItem>
                    <SelectItem value="advanced">Advanced Burn Rate & Projection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowOnboardingModal(true)}
                className="text-xs h-8 gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Run Onboarding Wizard
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDashboardCustomizer(true)}
                className="text-xs h-8 gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-accent" /> Customize Dashboard Layout
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Currency Settings */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Currency Settings
            </CardTitle>
            <CardDescription>
              Choose your preferred currency
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={currency}
                onValueChange={(c: any) => {
                  setCurrency(c);
                  updateCkProfile({ currency: c });
                  toast.success(`Currency changed to ${c}`);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Currency display will be updated across all calculations and dashboards
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Reset Data */}
      <motion.div variants={itemVariants}>
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <RefreshCw className="w-5 h-5" />
              Reset All Data
            </CardTitle>
            <CardDescription>
              This will permanently delete all your financial data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all your
                    transactions, investments, debts, budgets, and emergency fund data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetAllData}
                    disabled={isResetting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isResetting ? "Resetting..." : "Yes, Reset Everything"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </motion.div>

      {/* App Info */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              App Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">v4.0</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">App Name</span>
              <span className="font-medium">Money Maestro</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Current Year</span>
              <span className="font-medium">{new Date().getFullYear()}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
