import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, TrendingDown, AlertTriangle, Lightbulb } from "lucide-react";

interface Insight {
  type: "warning" | "suggestion" | "alert";
  title: string;
  description: string;
  action: string;
}

const insights: Insight[] = [
  {
    type: "warning",
    title: "Overspending on Food",
    description: "You've spent 40% more on food this month compared to last month",
    action: "View breakdown"
  },
  {
    type: "suggestion",
    title: "Increase SIP by ₹2,000",
    description: "Based on your cash flow, you can increase monthly SIP investment",
    action: "Adjust SIP"
  },
  {
    type: "alert",
    title: "Credit Card Due",
    description: "₹24,500 due in 5 days. Pay early to avoid interest charges",
    action: "Pay now"
  }
];

export function AIInsightCard() {
  const getIcon = (type: string) => {
    switch (type) {
      case "warning": return TrendingDown;
      case "alert": return AlertTriangle;
      default: return Lightbulb;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "warning": return "hsl(var(--warning))";
      case "alert": return "hsl(var(--destructive))";
      default: return "hsl(var(--primary))";
    }
  };

  return (
    <Card variant="glow" className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full" />
      
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Insights</h3>
            <p className="text-xs text-muted-foreground">Personalized recommendations</p>
          </div>
        </div>

        <div className="space-y-3">
          {insights.map((insight, index) => {
            const Icon = getIcon(insight.type);
            const color = getColor(insight.type);
            
            return (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>
            );
          })}
        </div>

        <Button variant="default" className="w-full mt-4">
          <Sparkles className="w-4 h-4 mr-2" />
          Chat with AI Advisor
        </Button>
      </CardContent>
    </Card>
  );
}
