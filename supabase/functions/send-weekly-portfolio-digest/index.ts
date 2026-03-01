import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TYPE_LABELS: Record<string, string> = {
  mutual_fund: "Mutual Funds", stock: "Stocks", fixed_deposit: "Fixed Deposits",
  recurring_deposit: "Recurring Deposits", crypto: "Crypto", gold: "Gold", bonds: "Bonds", other: "Other",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This is a scheduled/cron function - allow cron or authenticated calls
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const authClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    console.log("Starting weekly portfolio digest...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: alertSettings, error: settingsError } = await supabase
      .from("portfolio_alert_settings")
      .select("*")
      .eq("alerts_enabled", true);

    if (settingsError) throw settingsError;

    if (!alertSettings || alertSettings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No subscribers", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let emailsSent = 0;
    let skipped = 0;

    for (const settings of alertSettings) {
      try {
        const userId = settings.user_id;

        const { data: investments, error: investmentsError } = await supabase
          .from("investments").select("*").eq("user_id", userId);

        if (investmentsError || !investments || investments.length === 0) { skipped++; continue; }

        const totalInvested = investments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
        const totalCurrent = investments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
        const totalGain = totalCurrent - totalInvested;
        const gainPercent = totalInvested > 0 ? ((totalGain / totalInvested) * 100) : 0;

        const byType: Record<string, { invested: number; current: number; count: number }> = {};
        investments.forEach((inv) => {
          const type = inv.type || "other";
          if (!byType[type]) byType[type] = { invested: 0, current: 0, count: 0 };
          byType[type].invested += inv.invested_amount || 0;
          byType[type].current += inv.current_value || 0;
          byType[type].count++;
        });

        const withReturns = investments.map((inv) => ({
          ...inv,
          returnPct: inv.invested_amount > 0 ? ((inv.current_value - inv.invested_amount) / inv.invested_amount) * 100 : 0,
        }));
        const topPerformers = [...withReturns].sort((a, b) => b.returnPct - a.returnPct).slice(0, 3);
        const bottomPerformers = [...withReturns].sort((a, b) => a.returnPct - b.returnPct).slice(0, 3).filter((p) => p.returnPct < 0);

        let userEmail = settings.alert_email;
        if (!userEmail) {
          const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
          if (authError || !authUser?.user?.email) continue;
          userEmail = authUser.user.email;
        }

        const allocationRows = Object.entries(byType)
          .sort((a, b) => b[1].current - a[1].current)
          .map(([type, data]) => {
            const returnPct = data.invested > 0 ? ((data.current - data.invested) / data.invested) * 100 : 0;
            const allocation = totalCurrent > 0 ? ((data.current / totalCurrent) * 100).toFixed(1) : "0";
            return `<tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${TYPE_LABELS[type] || type}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${data.count}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${allocation}%</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; color: ${returnPct >= 0 ? '#10b981' : '#ef4444'};">
                ${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(1)}%
              </td>
            </tr>`;
          }).join("");

        const topHtml = topPerformers.length > 0
          ? topPerformers.map((p) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;">
              <span style="color:#374151;">${String(p.name).slice(0, 50).replace(/[<>&"']/g, "")}</span>
              <span style="color:#10b981;font-weight:600;">+${p.returnPct.toFixed(1)}%</span>
            </div>`).join("")
          : '<p style="color:#9ca3af;font-size:14px;">No data yet</p>';

        const bottomHtml = bottomPerformers.length > 0
          ? bottomPerformers.map((p) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;">
              <span style="color:#374151;">${String(p.name).slice(0, 50).replace(/[<>&"']/g, "")}</span>
              <span style="color:#ef4444;font-weight:600;">${p.returnPct.toFixed(1)}%</span>
            </div>`).join("")
          : '<p style="color:#9ca3af;font-size:14px;">All positive! 🎉</p>';

        const formatCurrency = (amount: number) => amount >= 100000 ? `₹${(amount / 100000).toFixed(2)}L` : `₹${amount.toLocaleString("en-IN")}`;

        await resend.emails.send({
          from: "WalletWisely <onboarding@resend.dev>",
          to: [userEmail],
          subject: `📊 Weekly Portfolio Digest: ${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(1)}% overall`,
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family:-apple-system,sans-serif;background-color:#f4f4f5;margin:0;padding:20px;">
            <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
              <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
                <h1 style="color:white;margin:0;font-size:24px;">Weekly Portfolio Digest</h1>
              </div>
              <div style="padding:32px;">
                <div style="text-align:center;margin-bottom:32px;">
                  <p style="color:#6b7280;font-size:14px;margin:0;">Total Portfolio Value</p>
                  <p style="font-size:36px;font-weight:700;color:#111827;margin:8px 0;">${formatCurrency(totalCurrent)}</p>
                  <div style="display:inline-flex;padding:4px 12px;border-radius:999px;background:${gainPercent >= 0 ? '#ecfdf5' : '#fef2f2'};color:${gainPercent >= 0 ? '#10b981' : '#ef4444'};">
                    <span style="font-weight:600;">${gainPercent >= 0 ? '↑+' : '↓'}${gainPercent.toFixed(1)}% (${formatCurrency(Math.abs(totalGain))})</span>
                  </div>
                </div>
                <h3 style="color:#374151;font-size:16px;margin:0 0 16px;">Asset Allocation</h3>
                <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                  <thead><tr style="background:#f9fafb;">
                    <th style="padding:10px;text-align:left;font-size:12px;">Type</th>
                    <th style="padding:10px;text-align:center;font-size:12px;">Count</th>
                    <th style="padding:10px;text-align:center;font-size:12px;">Allocation</th>
                    <th style="padding:10px;text-align:right;font-size:12px;">Return</th>
                  </tr></thead>
                  <tbody>${allocationRows}</tbody>
                </table>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
                  <div style="padding:16px;background:#ecfdf5;border-radius:8px;">
                    <h4 style="color:#10b981;font-size:14px;margin:0 0 12px;">🚀 Top Performers</h4>
                    ${topHtml}
                  </div>
                  <div style="padding:16px;background:#fef2f2;border-radius:8px;">
                    <h4 style="color:#ef4444;font-size:14px;margin:0 0 12px;">⚠️ Need Attention</h4>
                    ${bottomHtml}
                  </div>
                </div>
              </div>
              <div style="background:#f9fafb;padding:24px;text-align:center;">
                <p style="color:#9ca3af;font-size:12px;margin:0;">WalletWisely</p>
              </div>
            </div>
          </body></html>`,
        });

        emailsSent++;
      } catch (userError) {
        console.error("Error processing user:", userError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: emailsSent, skipped }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-weekly-portfolio-digest:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
