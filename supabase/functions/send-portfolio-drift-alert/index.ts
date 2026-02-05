 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
 import { Resend } from "https://esm.sh/resend@2.0.0";
 
 const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
     console.log("Processing portfolio drift alert...");
 
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     const body = await req.json();
     const { userId, driftData, maxDrift } = body as {
       userId: string;
       driftData: DriftData[];
       maxDrift: number;
     };
 
     if (!userId || !driftData) {
       throw new Error("Missing userId or driftData");
     }
 
     // Get user's alert settings
     const { data: settings, error: settingsError } = await supabase
       .from("portfolio_alert_settings")
       .select("*")
       .eq("user_id", userId)
       .maybeSingle();
 
     if (settingsError) {
       console.error("Error fetching settings:", settingsError);
       throw settingsError;
     }
 
     // Skip if alerts are disabled
     if (settings?.alerts_enabled === false) {
       console.log("Alerts disabled for user");
       return new Response(
         JSON.stringify({ success: true, skipped: true, reason: "alerts_disabled" }),
         { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
       );
     }
 
     const threshold = settings?.drift_threshold ?? 5;
 
     // Check if drift exceeds threshold
     if (maxDrift < threshold) {
       console.log(`Drift ${maxDrift}% is below threshold ${threshold}%`);
       return new Response(
         JSON.stringify({ success: true, skipped: true, reason: "below_threshold" }),
         { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
       );
     }
 
     // Check cooldown (don't send more than once per day)
     const lastAlert = settings?.last_alert_sent_at
       ? new Date(settings.last_alert_sent_at)
       : null;
     const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours
 
     if (lastAlert && Date.now() - lastAlert.getTime() < cooldownPeriod) {
       console.log("Alert cooldown active");
       return new Response(
         JSON.stringify({ success: true, skipped: true, reason: "cooldown" }),
         { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
       );
     }
 
     // Get user email
     let userEmail = settings?.alert_email;
     if (!userEmail) {
       const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
       if (authError || !authUser?.user?.email) {
         console.error("Could not get user email:", authError);
         throw new Error("Could not retrieve user email");
       }
       userEmail = authUser.user.email;
     }
 
     // Build email content
     const driftRows = driftData
       .filter((d) => Math.abs(d.difference) >= 3)
       .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
       .map(
         (d) => `
         <tr>
           <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${d.label}</td>
           <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${d.currentPercent.toFixed(1)}%</td>
           <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${d.targetPercent}%</td>
           <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: ${d.difference > 0 ? "#f59e0b" : "#6366f1"};">
             ${d.difference > 0 ? "+" : ""}${d.difference.toFixed(1)}%
           </td>
         </tr>
       `
       )
       .join("");
 
     const emailResponse = await resend.emails.send({
       from: "WalletWisely <onboarding@resend.dev>",
       to: [userEmail],
       subject: `⚠️ Portfolio Drift Alert: ${maxDrift.toFixed(1)}% deviation detected`,
       html: `
         <!DOCTYPE html>
         <html>
         <head>
           <meta charset="utf-8">
           <meta name="viewport" content="width=device-width, initial-scale=1.0">
         </head>
         <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
           <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
             
             <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; text-align: center;">
               <h1 style="color: white; margin: 0; font-size: 24px;">Portfolio Drift Alert</h1>
               <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Rebalancing may be needed</p>
             </div>
 
             <div style="padding: 32px;">
               <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                 <p style="color: #92400e; margin: 0; font-weight: 600; font-size: 18px;">
                   ⚠️ Maximum Drift: ${maxDrift.toFixed(1)}%
                 </p>
                 <p style="color: #a16207; margin: 8px 0 0 0; font-size: 14px;">
                   Your portfolio has drifted beyond your ${threshold}% threshold
                 </p>
               </div>
 
               <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                 The following asset classes have significant deviations from your target allocations:
               </p>
 
               <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                 <thead>
                   <tr style="background: #f9fafb;">
                     <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Asset Class</th>
                     <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Current</th>
                     <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Target</th>
                     <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151;">Drift</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${driftRows}
                 </tbody>
               </table>
 
               <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                 Consider rebalancing your portfolio to maintain your target asset allocation. Visit your WalletWisely dashboard to see specific recommendations.
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
 
     console.log("Email sent successfully:", emailResponse);
 
     // Update last_alert_sent_at
     await supabase
       .from("portfolio_alert_settings")
       .upsert({
         user_id: userId,
         last_alert_sent_at: new Date().toISOString(),
         alerts_enabled: true,
         drift_threshold: threshold,
       }, { onConflict: "user_id" });
 
     return new Response(
       JSON.stringify({ success: true, emailSent: true }),
       { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
     );
   } catch (error: any) {
     console.error("Error in send-portfolio-drift-alert:", error);
     return new Response(
       JSON.stringify({ error: error.message }),
       { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
     );
   }
 };
 
 serve(handler);