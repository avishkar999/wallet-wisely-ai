import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionToReview {
  id: string;
  user_id: string;
  subscription_name: string;
  monthly_amount: number;
  marked_for_review_at: string;
  reminder_days: number;
  user_email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting subscription reminder check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find subscriptions marked as 'to_review' where reminder period has passed
    const { data: subscriptions, error: fetchError } = await supabase
      .from("subscription_decisions")
      .select("*")
      .eq("status", "to_review")
      .not("marked_for_review_at", "is", null);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions marked for review`);

    const now = new Date();
    const remindersToSend: SubscriptionToReview[] = [];

    for (const sub of subscriptions || []) {
      // Check user's notification preferences
      const { data: preferences } = await supabase
        .from("notification_preferences")
        .select("subscription_reminders_enabled, reminder_email")
        .eq("user_id", sub.user_id)
        .maybeSingle();

      // Skip if reminders are disabled
      if (preferences?.subscription_reminders_enabled === false) {
        console.log(`Skipping user ${sub.user_id} - reminders disabled`);
        continue;
      }

      const markedAt = new Date(sub.marked_for_review_at);
      const reminderDays = sub.reminder_days || 7;
      const reminderDate = new Date(markedAt.getTime() + reminderDays * 24 * 60 * 60 * 1000);
      
      // Check if reminder period has passed and reminder hasn't been sent recently
      if (now >= reminderDate) {
        const lastReminder = sub.reminder_sent_at ? new Date(sub.reminder_sent_at) : null;
        const reminderCooldown = 7 * 24 * 60 * 60 * 1000; // 7 days cooldown between reminders
        
        if (!lastReminder || (now.getTime() - lastReminder.getTime()) >= reminderCooldown) {
          // Get user email - prefer custom email from preferences
          let userEmail = preferences?.reminder_email;
          
          if (!userEmail) {
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(sub.user_id);
            
            if (authError || !authUser?.user?.email) {
              console.error(`Could not get email for user ${sub.user_id}:`, authError);
              continue;
            }
            userEmail = authUser.user.email;
          }

          remindersToSend.push({
            ...sub,
            user_email: userEmail,
          });
        }
      }
    }

    console.log(`Sending ${remindersToSend.length} reminder emails`);

    // Group by user for batch emails
    const userSubscriptions = remindersToSend.reduce((acc, sub) => {
      if (!acc[sub.user_id]) {
        acc[sub.user_id] = {
          email: sub.user_email,
          subscriptions: [],
        };
      }
      acc[sub.user_id].subscriptions.push(sub);
      return acc;
    }, {} as Record<string, { email: string; subscriptions: SubscriptionToReview[] }>);

    let emailsSent = 0;

    for (const [userId, userData] of Object.entries(userSubscriptions)) {
      const totalMonthly = userData.subscriptions.reduce((sum, s) => sum + Number(s.monthly_amount), 0);
      
      const subscriptionList = userData.subscriptions
        .map(
          (s) =>
            `<tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${s.subscription_name}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${Number(s.monthly_amount).toLocaleString()}/mo</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${Math.floor((now.getTime() - new Date(s.marked_for_review_at).getTime()) / (24 * 60 * 60 * 1000))} days</td>
            </tr>`
        )
        .join("");

      try {
        const emailResponse = await resend.emails.send({
          from: "WalletWisely <onboarding@resend.dev>",
          to: [userData.email],
          subject: `⏰ Reminder: ${userData.subscriptions.length} subscription${userData.subscriptions.length > 1 ? "s" : ""} awaiting your review`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">Subscription Review Reminder</h1>
                </div>

                <div style="padding: 32px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    You marked the following subscription${userData.subscriptions.length > 1 ? "s" : ""} for review. It's time to decide whether to keep or cancel ${userData.subscriptions.length > 1 ? "them" : "it"}!
                  </p>

                  <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                    <thead>
                      <tr style="background: #f9fafb;">
                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Subscription</th>
                        <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151;">Cost</th>
                        <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151;">Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${subscriptionList}
                    </tbody>
                  </table>

                  <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 16px; margin: 24px 0;">
                    <p style="color: #92400e; margin: 0; font-weight: 600;">
                      💰 Potential Monthly Savings: ₹${totalMonthly.toLocaleString()}
                    </p>
                  </div>

                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                    Take a moment to review these subscriptions in your WalletWisely dashboard. Consider whether you're still getting value from each service.
                  </p>
                </div>

                <div style="background: #f9fafb; padding: 24px; text-align: center;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    WalletWisely - Your Smart Financial Companion
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        console.log(`Email sent to ${userData.email}:`, emailResponse);
        emailsSent++;

        // Update reminder_sent_at for these subscriptions
        const subIds = userData.subscriptions.map((s) => s.id);
        await supabase
          .from("subscription_decisions")
          .update({ reminder_sent_at: now.toISOString() })
          .in("id", subIds);

      } catch (emailError) {
        console.error(`Failed to send email to ${userData.email}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        subscriptionsProcessed: remindersToSend.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-subscription-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
