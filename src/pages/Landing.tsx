import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Wallet, TrendingUp, PieChart, Shield, Sparkles, ArrowRight,
  BarChart3, Target, CreditCard, Bell, Calendar, Brain,
  Star, Quote, Users, CheckCircle2
} from "lucide-react";

const features = [
  { icon: PieChart, title: "Budget Tracking", desc: "Set budgets by category and track spending with real-time alerts." },
  { icon: TrendingUp, title: "Investment Portfolio", desc: "Monitor stocks, mutual funds, crypto & more with performance history." },
  { icon: CreditCard, title: "Debt Management", desc: "Snowball vs avalanche strategies with payoff simulations." },
  { icon: Target, title: "Savings Goals", desc: "Set goals, track progress, and hit milestones with smart insights." },
  { icon: Calendar, title: "Recurring Tracker", desc: "Never miss a bill with automated reminders and calendar view." },
  { icon: Brain, title: "AI Advisor", desc: "Get personalized financial recommendations powered by AI." },
];

const stats = [
  { value: "100%", label: "Free to use" },
  { value: "256-bit", label: "Encryption" },
  { value: "Real-time", label: "Sync" },
  { value: "AI", label: "Powered insights" },
];

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Freelance Designer",
    quote: "Wallet Wisely completely changed how I manage my finances. The budget alerts alone have saved me from overspending every month.",
    rating: 5,
    avatar: "PS",
  },
  {
    name: "Rahul Mehta",
    role: "Software Engineer",
    quote: "The investment portfolio tracker is incredible. I can see all my mutual funds, stocks, and FDs in one place with real performance data.",
    rating: 5,
    avatar: "RM",
  },
  {
    name: "Ananya Patel",
    role: "Small Business Owner",
    quote: "The debt payoff simulator helped me create a plan to become debt-free in 18 months. The AI advisor suggestions are spot on!",
    rating: 5,
    avatar: "AP",
  },
];

const socialProof = [
  { icon: Users, value: "10,000+", label: "Active Users" },
  { icon: CheckCircle2, value: "₹50Cr+", label: "Finances Tracked" },
  { icon: Star, value: "4.9/5", label: "User Rating" },
  { icon: Shield, value: "99.9%", label: "Uptime" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">CoinKeeper</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                Get Started <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(168_60%_55%/0.08),transparent_60%)]" />
        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" /> Personal Finance Operating System
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Finance Built Around{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Your Life
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              CoinKeeper adapts to you — custom income sources, user-defined categories, variable monthly budgets, multiple accounts, and real-time Money Pulse.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 text-base px-8 h-12">
                  Start for Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="text-base px-8 h-12">
                  See Features
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-3xl mx-auto"
          >
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-12 px-4 border-y border-border/50 bg-muted/30">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
          >
            {socialProof.map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2 text-center">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-2xl font-bold">{item.value}</div>
                <div className="text-sm text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-card/40">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="text-primary">Master Your Money</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Powerful tools designed to give you complete control over your finances.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-card border border-border/60 hover:border-primary/30 transition-colors group"
              >
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-4">
              <Quote className="h-4 w-4" /> What Our Users Say
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Loved by{" "}
              <span className="text-primary">Thousands</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Real stories from people who transformed their financial lives.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="p-6 rounded-2xl bg-card border border-border/60 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 flex flex-col"
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, idx) => (
                    <Star key={idx} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center p-10 md:p-16 rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border/60"
          >
            <Shield className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Take Control Today
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Join thousands managing their money smarter. No credit card required — start completely free.
            </p>
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 text-base px-10 h-12">
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span>Wallet Wisely</span>
          </div>
          <p>© {new Date().getFullYear()} Wallet Wisely. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
