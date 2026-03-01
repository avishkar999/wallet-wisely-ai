import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = claimsData.claims.sub;

    console.log("Starting subscription reminder check for user:", userId);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch subscriptions scoped to authenticated user
    const { data: subscriptions, error: fetchError } = await supabase
      .from("subscription_decisions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "to_review")
      .not("marked_for_review_at", "is", null);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions marked for review`);

    // Check user's notification preferences
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("subscription_reminders_enabled, reminder_email")
      .eq("user_id", userId)
      .maybeSingle();

    if (preferences?.subscription_reminders_enabled === false) {
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0, reason: "reminders_disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const now = new Date();
    const remindersToSend: SubscriptionToReview[] = [];

    for (const sub of subscriptions || []) {
      const markedAt = new Date(sub.marked_for_review_at);
      const reminderDays = sub.reminder_days || 7;
      const reminderDate = new Date(markedAt.getTime() + reminderDays * 24 * 60 * 60 * 1000);

      if (now >= reminderDate) {
        const lastReminder = sub.reminder_sent_at ? new Date(sub.reminder_sent_at) : null;
        const reminderCooldown = 7 * 24 * 60 * 60 * 1000;

        if (!lastReminder || (now.getTime() - lastReminder.getTime()) >= reminderCooldown) {
          let userEmail = preferences?.reminder_email;
          if (!userEmail) {
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
            if (authError || !authUser?.user?.email) {
              console.error(`Could not get email for user ${userId}:`, authError);
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

    if (remindersToSend.length === 0) {
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0, reason: "no_reminders_due" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const totalMonthly = remindersToSend.reduce((sum, s) => sum + Number(s.monthly_amount), 0);
    const email = remindersToSend[0].user_email;

    const subscriptionList = remindersToSend
      .map(
        (s) =>
          `<tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${String(s.subscription_name).slice(0, 100).replace(/[<>&"']/g, "")}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${Number(s.monthly_amount).toLocaleString()}/mo</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${Math.floor((now.getTime() - new Date(s.marked_for_review_at).getTime()) / (24 * 60 * 60 * 1000))} days</td>
          </tr>`
      )
      .join("");

    const emailResponse = await resend.emails.send({
      from: "WalletWisely <onboarding@resend.dev>",
      to: [email],
      subject: `⏰ Reminder: ${remindersToSend.length} subscription${remindersToSend.length > 1 ? "s" : ""} awaiting your review`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Subscription Review Reminder</h1>
            </div>
            <div style="padding: 32px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                You marked the following subscription${remindersToSend.length > 1 ? "s" : ""} for review. It's time to decide!
              </p>
              <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Subscription</th>
                    <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151;">Cost</th>
                    <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151;">Pending</th>
                  </tr>
                </thead>
                <tbody>${subscriptionList}</tbody>
              </table>
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="color: #92400e; margin: 0; font-weight: 600;">💰 Potential Monthly Savings: ₹${totalMonthly.toLocaleString()}</p>
              </div>
            </div>
            <div style="background: #f9fafb; padding: 24px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">WalletWisely - Your Smart Financial Companion</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`Email sent:`, emailResponse);

    // Update reminder_sent_at
    const subIds = remindersToSend.map((s) => s.id);
    await supabase
      .from("subscription_decisions")
      .update({ reminder_sent_at: now.toISOString() })
      .in("id", subIds);

    return new Response(
      JSON.stringify({ success: true, emailsSent: 1, subscriptionsProcessed: remindersToSend.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-subscription-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
