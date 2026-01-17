import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Mail, Send, CheckCircle2, Calendar, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function MonthlyDigestSettings() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [email, setEmail] = useState(user?.email || "");
  const [isSending, setIsSending] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);

  const handleSendDigest = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-monthly-digest", {
        body: {
          userId: user?.id,
          email,
          displayName: profile?.display_name || user?.email?.split("@")[0],
        },
      });

      if (error) throw error;

      setLastSent(new Date());
      toast.success("Monthly digest sent successfully! Check your email.");
    } catch (error: any) {
      console.error("Error sending digest:", error);
      toast.error(error.message || "Failed to send monthly digest");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              Monthly Email Digest
            </CardTitle>
            <CardDescription>
              Receive a comprehensive monthly summary of your finances including income, expenses, savings rate, and spending insights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="digest-email">Email Address</Label>
              <Input
                id="digest-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
              <p className="text-xs text-muted-foreground">
                We'll send your monthly financial summary to this email.
              </p>
            </div>

            {/* What's Included */}
            <div className="p-4 rounded-xl bg-secondary/50">
              <h4 className="font-medium text-foreground mb-3">What's included in your digest:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Monthly income and expense summary
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Net savings and savings rate
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Top spending categories breakdown
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Detected recurring expenses
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Personalized financial tips
                </li>
              </ul>
            </div>

            {/* Send Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                {lastSent ? (
                  <span className="flex items-center gap-1 text-success">
                    <CheckCircle2 className="w-4 h-4" />
                    Last sent: {lastSent.toLocaleTimeString()}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Send yourself a digest anytime
                  </span>
                )}
              </div>
              <Button 
                onClick={handleSendDigest} 
                disabled={isSending || !email}
                className="w-full sm:w-auto"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Digest Now
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Monthly Automation</h4>
                <p className="text-sm text-muted-foreground">
                  For automatic monthly digests, you can set up a scheduled job through the app settings. 
                  The digest will be sent on the 1st of each month summarizing the previous month's activity.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
