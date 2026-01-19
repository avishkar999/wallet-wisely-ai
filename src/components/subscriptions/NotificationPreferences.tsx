import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, BellOff, Mail, Send, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export function NotificationPreferences() {
  const { user } = useAuth();
  const {
    preferences,
    isLoading,
    updatePreferences,
    testReminder,
    isRemindersEnabled,
    reminderEmail,
  } = useNotificationPreferences();

  const [email, setEmail] = useState(reminderEmail || user?.email || "");
  const [isEmailDirty, setIsEmailDirty] = useState(false);

  const handleToggleReminders = () => {
    updatePreferences.mutate({
      subscriptionRemindersEnabled: !isRemindersEnabled,
    });
  };

  const handleSaveEmail = () => {
    updatePreferences.mutate({
      reminderEmail: email || null,
    });
    setIsEmailDirty(false);
  };

  const handleTestReminder = () => {
    testReminder.mutate();
  };

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Subscription Reminders
                </CardTitle>
                <CardDescription>
                  Get notified when it's time to review your subscriptions
                </CardDescription>
              </div>
              <Badge variant={isRemindersEnabled ? "default" : "secondary"}>
                {isRemindersEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                {isRemindersEnabled ? (
                  <Bell className="w-5 h-5 text-primary" />
                ) : (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium text-foreground">Email Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Receive daily digest of subscriptions pending review
                  </p>
                </div>
              </div>
              <Switch
                checked={isRemindersEnabled}
                onCheckedChange={handleToggleReminders}
                disabled={updatePreferences.isPending}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="reminder-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Reminder Email Address
              </Label>
              <div className="flex gap-2">
                <Input
                  id="reminder-email"
                  type="email"
                  placeholder={user?.email || "your@email.com"}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIsEmailDirty(true);
                  }}
                  disabled={!isRemindersEnabled}
                />
                <Button
                  onClick={handleSaveEmail}
                  disabled={!isEmailDirty || updatePreferences.isPending || !isRemindersEnabled}
                  variant="outline"
                >
                  {updatePreferences.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to use your account email ({user?.email})
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              Scheduled Reminders
            </CardTitle>
            <CardDescription>
              Automatic reminder schedule and testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Daily Reminder Schedule</p>
                  <p className="text-sm text-muted-foreground">
                    Reminders are sent automatically every day at 9:00 AM UTC for subscriptions marked "To Review" that have exceeded their reminder period.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-dashed">
              <div>
                <p className="font-medium text-foreground">Test Reminder</p>
                <p className="text-sm text-muted-foreground">
                  Send a test reminder email now to verify your setup
                </p>
              </div>
              <Button
                onClick={handleTestReminder}
                disabled={testReminder.isPending || !isRemindersEnabled}
                variant="outline"
                className="gap-2"
              >
                {testReminder.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Test
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass border-muted">
          <CardContent className="py-4">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <Bell className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                <strong>How it works:</strong> When you mark a subscription as "To Review", you can set a reminder period (3, 7, 14, or 30 days). After this period, you'll receive an email reminder to make a decision about that subscription. Reminders are sent once per day and won't repeat for 7 days after being sent.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
