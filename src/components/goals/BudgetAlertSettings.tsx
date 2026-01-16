import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { Bell, Mail, AlertTriangle, Send, CheckCircle2, Settings } from "lucide-react";
import { useBudgetAlertSettings, useUpsertBudgetAlertSettings, useCheckBudgetAlerts } from "@/hooks/useBudgetAlerts";
import { useBudgetSummary } from "@/hooks/useBudgets";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

export function BudgetAlertSettings() {
  const { user } = useAuth();
  const { data: settings, isLoading } = useBudgetAlertSettings();
  const upsertSettings = useUpsertBudgetAlertSettings();
  const { checkAndSendAlerts } = useCheckBudgetAlerts();
  const { categoryBreakdown, totalBudgeted } = useBudgetSummary();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(settings?.email_alerts_enabled ?? true);
  const [threshold, setThreshold] = useState(settings?.alert_threshold ?? 80);
  const [alertEmail, setAlertEmail] = useState(settings?.alert_email || "");
  const [isSending, setIsSending] = useState(false);

  const alertCategories = categoryBreakdown.filter(
    c => c.budgeted > 0 && c.percentUsed >= (settings?.alert_threshold || 80)
  );

  const handleSave = async () => {
    try {
      await upsertSettings.mutateAsync({
        email_alerts_enabled: emailEnabled,
        alert_threshold: threshold,
        alert_email: alertEmail || null,
      });
      toast.success("Alert settings saved!");
      setDialogOpen(false);
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  const handleSendAlerts = async () => {
    if (alertCategories.length === 0) {
      toast.info("No categories exceed the alert threshold");
      return;
    }

    setIsSending(true);
    try {
      await checkAndSendAlerts();
    } catch (error) {
      toast.error("Failed to send alerts");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="glass-hover">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-warning" />
              </div>
              Budget Alerts
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Budget Alert Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Alerts</Label>
                      <p className="text-xs text-muted-foreground">Receive alerts when budget thresholds are exceeded</p>
                    </div>
                    <Switch
                      checked={emailEnabled}
                      onCheckedChange={setEmailEnabled}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Alert Threshold</Label>
                      <span className="text-sm font-medium text-primary">{threshold}%</span>
                    </div>
                    <Slider
                      value={[threshold]}
                      onValueChange={([value]) => setThreshold(value)}
                      min={50}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Send alert when spending reaches {threshold}% of budget
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Alert Email</Label>
                    <Input
                      type="email"
                      value={alertEmail}
                      onChange={(e) => setAlertEmail(e.target.value)}
                      placeholder={user?.email || "Enter email address"}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use your account email
                    </p>
                  </div>

                  <Button onClick={handleSave} className="w-full" disabled={upsertSettings.isPending}>
                    {upsertSettings.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                {settings?.email_alerts_enabled ? "Alerts enabled" : "Alerts disabled"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Threshold: {settings?.alert_threshold || 80}%
            </span>
          </div>

          {totalBudgeted === 0 ? (
            <div className="text-center py-4">
              <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Set up budgets to enable alerts</p>
            </div>
          ) : alertCategories.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {alertCategories.length} {alertCategories.length === 1 ? "category exceeds" : "categories exceed"} threshold:
              </p>
              <div className="flex flex-wrap gap-2">
                {alertCategories.slice(0, 4).map((cat) => (
                  <span
                    key={cat.category}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      cat.percentUsed > 100 
                        ? "bg-destructive/20 text-destructive" 
                        : "bg-warning/20 text-warning"
                    }`}
                  >
                    {cat.category} ({cat.percentUsed}%)
                  </span>
                ))}
              </div>
              {settings?.email_alerts_enabled && (
                <Button 
                  onClick={handleSendAlerts} 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-3"
                  disabled={isSending}
                >
                  {isSending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Alert Emails
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle2 className="w-4 h-4" />
              All budgets within threshold
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
