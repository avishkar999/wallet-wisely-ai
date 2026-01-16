import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BudgetAlertRequest {
  email: string;
  userName: string;
  category: string;
  budgeted: number;
  spent: number;
  percentUsed: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userName, category, budgeted, spent, percentUsed }: BudgetAlertRequest = await req.json();

    const isOverBudget = spent > budgeted;
    const statusColor = isOverBudget ? "#ef4444" : "#f59e0b";
    const statusText = isOverBudget ? "Over Budget" : "Budget Alert";

    const emailResponse = await resend.emails.send({
      from: "WealthPilot <onboarding@resend.dev>",
      to: [email],
      subject: `${statusText}: ${category} at ${percentUsed}%`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #14b8a6, #0d9488); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
            .alert-box { background: white; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .progress-bar { background: #e2e8f0; border-radius: 10px; height: 12px; overflow: hidden; margin: 15px 0; }
            .progress-fill { background: ${statusColor}; height: 100%; border-radius: 10px; }
            .stats { display: flex; justify-content: space-between; margin-top: 15px; }
            .stat { text-align: center; }
            .stat-value { font-size: 20px; font-weight: bold; color: #1e293b; }
            .stat-label { font-size: 12px; color: #64748b; }
            .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 WealthPilot Budget Alert</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Your spending in <strong>${category}</strong> has reached <strong>${percentUsed}%</strong> of your budget.</p>
              
              <div class="alert-box">
                <h3 style="margin: 0 0 15px 0; color: ${statusColor};">${statusText}</h3>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${Math.min(percentUsed, 100)}%;"></div>
                </div>
                <div class="stats">
                  <div class="stat">
                    <div class="stat-value">${formatCurrency(spent)}</div>
                    <div class="stat-label">Spent</div>
                  </div>
                  <div class="stat">
                    <div class="stat-value">${formatCurrency(budgeted)}</div>
                    <div class="stat-label">Budget</div>
                  </div>
                  <div class="stat">
                    <div class="stat-value" style="color: ${isOverBudget ? '#ef4444' : '#22c55e'};">
                      ${isOverBudget ? '+' : ''}${formatCurrency(Math.abs(budgeted - spent))}
                    </div>
                    <div class="stat-label">${isOverBudget ? 'Over' : 'Remaining'}</div>
                  </div>
                </div>
              </div>
              
              <p style="color: #64748b; font-size: 14px;">
                ${isOverBudget 
                  ? "Consider reviewing your spending to get back on track." 
                  : "You're approaching your limit. Consider slowing down spending in this category."}
              </p>
              
              <div class="footer">
                <p>This is an automated alert from WealthPilot.</p>
                <p>Manage your alert settings in the app.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Budget alert email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-budget-alert function:", error);
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
