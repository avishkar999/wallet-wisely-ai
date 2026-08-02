import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-cron-secret, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Default target allocations
const DEFAULT_ALLOCATIONS: Record<string, number> = {
  mutual_fund: 40, stock: 25, fixed_deposit: 15, recurring_deposit: 5,
  crypto: 5, gold: 5, bonds: 5, other: 0,
};

interface DriftData {
  type: string;
  label: string;
  currentPercent: number;
  targetPercent: number;
  difference: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This is a cron/scheduled function - authenticate via service role
    // Verify this is called by the scheduler or an admin, not arbitrary users
    // Cron-only endpoint: require the shared cron secret
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    if (!expectedSecret || cronSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Starting scheduled portfolio drift check...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all users with alerts enabled
    const { data: alertSettings, error: settingsError } = await supabase
      .from("portfolio_alert_settings")
      .select("*")
      .eq("alerts_enabled", true);

    if (settingsError) {
      console.error("Error fetching alert settings:", settingsError);
      throw settingsError;
    }

    if (!alertSettings || alertSettings.length === 0) {
      console.log("No users with alerts enabled");
      return new Response(
        JSON.stringify({ success: true, message: "No users with alerts enabled", processed: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${alertSettings.length} users with alerts enabled`);

    let alertsSent = 0;
    let skipped = 0;

    for (const settings of alertSettings) {
      try {
        const userId = settings.user_id;
        const threshold = settings.drift_threshold ?? 5;

        // Check cooldown
        const lastAlert = settings.last_alert_sent_at ? new Date(settings.last_alert_sent_at) : null;
        const cooldownPeriod = 24 * 60 * 60 * 1000;

        if (lastAlert && Date.now() - lastAlert.getTime() < cooldownPeriod) {
          skipped++;
          continue;
        }

        const { data: investments, error: investmentsError } = await supabase
          .from("investments")
          .select("*")
          .eq("user_id", userId);

        if (investmentsError || !investments || investments.length === 0) {
          skipped++;
          continue;
        }

        const totalValue = investments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
        if (totalValue === 0) { skipped++; continue; }

        const typeValues: Record<string, number> = {};
        investments.forEach((inv) => {
          const type = inv.type || "other";
          typeValues[type] = (typeValues[type] || 0) + (inv.current_value || 0);
        });

        const driftData: DriftData[] = Object.entries(DEFAULT_ALLOCATIONS).map(([type, target]) => {
          const currentValue = typeValues[type] || 0;
          const currentPercent = (currentValue / totalValue) * 100;
          return {
            type,
            label: type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            currentPercent, targetPercent: target,
            difference: currentPercent - target,
          };
        });

        const maxDrift = Math.max(...driftData.map((d) => Math.abs(d.difference)));

        if (maxDrift < threshold) { skipped++; continue; }

        // Get user email
        let userEmail = settings.alert_email;
        if (!userEmail) {
          const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
          if (authError || !authUser?.user?.email) { continue; }
          userEmail = authUser.user.email;
        }

        const driftRows = driftData
          .filter((d) => Math.abs(d.difference) >= 3)
          .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
          .map((d) => `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${d.label}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${d.currentPercent.toFixed(1)}%</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${d.targetPercent}%</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: ${d.difference > 0 ? "#f59e0b" : "#6366f1"};">
                ${d.difference > 0 ? "+" : ""}${d.difference.toFixed(1)}%
              </td>
            </tr>
          `).join("");

        await resend.emails.send({
          from: "WalletWisely <onboarding@resend.dev>",
          to: [userEmail],
          subject: `⚠️ Daily Portfolio Alert: ${maxDrift.toFixed(1)}% drift detected`,
          html: `
            <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="font-family: -apple-system, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">Daily Portfolio Drift Check</h1>
                </div>
                <div style="padding: 32px;">
                  <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                    <p style="color: #92400e; margin: 0; font-weight: 600;">⚠️ Maximum Drift: ${maxDrift.toFixed(1)}%</p>
                    <p style="color: #a16207; margin: 8px 0 0; font-size: 14px;">Threshold: ${threshold}%</p>
                  </div>
                  <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                    <thead><tr style="background: #f9fafb;">
                      <th style="padding: 12px; text-align: left;">Asset Class</th>
                      <th style="padding: 12px; text-align: center;">Current</th>
                      <th style="padding: 12px; text-align: center;">Target</th>
                      <th style="padding: 12px; text-align: right;">Drift</th>
                    </tr></thead>
                    <tbody>${driftRows}</tbody>
                  </table>
                </div>
                <div style="background: #f9fafb; padding: 24px; text-align: center;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">WalletWisely</p>
                </div>
              </div>
            </body></html>
          `,
        });

        await supabase.from("portfolio_alert_settings")
          .update({ last_alert_sent_at: new Date().toISOString() })
          .eq("user_id", userId);

        alertsSent++;
      } catch (userError) {
        console.error("Error processing user:", userError);
      }
    }

    console.log(`Completed: ${alertsSent} alerts sent, ${skipped} skipped`);

    return new Response(
      JSON.stringify({ success: true, alertsSent, skipped, total: alertSettings.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in check-portfolio-drift:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
