import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GraduationCap,
  Briefcase,
  Laptop,
  Building,
  TrendingUp,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  Target,
  PiggyBank,
  ShieldCheck,
  CreditCard,
  Scale,
  Zap,
} from "lucide-react";
import {
  useCoinKeeper,
  PersonaType,
  IncomePattern,
  FinancialPriority,
  BudgetingStyle,
  InsightStyle,
  CurrencyCode,
} from "@/contexts/CoinKeeperContext";

interface OnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PERSONAS: { type: PersonaType; title: string; desc: string; icon: any }[] = [
  {
    type: "student",
    title: "Student",
    desc: "Hostel/PG, canteen, college fees, pocket money, study goals",
    icon: GraduationCap,
  },
  {
    type: "professional",
    title: "Working Professional",
    desc: "Monthly salary, rent, EMIs, groceries, family, SIP investments",
    icon: Briefcase,
  },
  {
    type: "freelancer",
    title: "Freelancer / Creator",
    desc: "Variable client income, software tools, tax reserves, runway",
    icon: Laptop,
  },
  {
    type: "business",
    title: "Business Owner",
    desc: "Revenue flows, vendors, operations, marketing, personal drawings",
    icon: Building,
  },
  {
    type: "investor",
    title: "Investor / Wealth Builder",
    desc: "Dividends, equities, rental yields, asset allocation, net worth",
    icon: TrendingUp,
  },
  {
    type: "other",
    title: "Custom Life Setup",
    desc: "Flexible money tracking tailored completely from scratch",
    icon: HelpCircle,
  },
];

const PRIORITIES: { id: FinancialPriority; label: string; desc: string; icon: any }[] = [
  { id: "save", label: "Save More", desc: "Build wealth and hit ambitious savings milestones", icon: PiggyBank },
  { id: "spend_less", label: "Control Spending", desc: "Keep lifestyle expenses under strict budget guardrails", icon: Target },
  { id: "emergency_fund", label: "Emergency Safety Net", desc: "Secure 3–6 months of living expenses buffer", icon: ShieldCheck },
  { id: "invest", label: "Grow Investments", desc: "Compound capital into stocks, mutual funds, and assets", icon: TrendingUp },
  { id: "debt", label: "Pay Off Debts", desc: "Aggressively reduce credit card balances and EMIs", icon: CreditCard },
  { id: "discipline", label: "Build Financial Discipline", desc: "Form daily mindful money habits and streaks", icon: Scale },
];

const BUDGET_STYLES: { id: BudgetingStyle; label: string; desc: string }[] = [
  { id: "category", label: "Category-Based Budget", desc: "Set individual limits for food, rent, fun, and shopping" },
  { id: "simple", label: "Simple Monthly Cap", desc: "One clean monthly spending limit for total peace of mind" },
  { id: "savings_first", label: "Savings-First (Pay Yourself First)", desc: "Deduct your savings goal immediately, spend the rest" },
  { id: "percentage", label: "Percentage Allocation (e.g. 50/30/20)", desc: "Split income into needs, wants, and future wealth" },
];

export function PersonalizationOnboarding({ open, onOpenChange }: OnboardingProps) {
  const { profile, updateProfile, resetToPersonaPresets } = useCoinKeeper();

  const [step, setStep] = useState(1);
  const [selectedPersona, setSelectedPersona] = useState<PersonaType>(profile.persona || "professional");
  const [incomePattern, setIncomePattern] = useState<IncomePattern>(profile.incomePattern || "fixed");
  const [primaryPriority, setPrimaryPriority] = useState<FinancialPriority>(profile.primaryPriority || "save");
  const [budgetingStyle, setBudgetingStyle] = useState<BudgetingStyle>(profile.budgetingStyle || "category");
  const [insightStyle, setInsightStyle] = useState<InsightStyle>(profile.insightStyle || "detailed");
  const [currency, setCurrency] = useState<CurrencyCode>(profile.currency || "INR");
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState<string>(
    String(profile.defaultMonthlyBudget || 45000)
  );

  const handleFinish = () => {
    const budgetNum = parseFloat(monthlyBudgetInput) || 45000;
    
    // Reset to preset categories & income sources for selected persona
    resetToPersonaPresets(selectedPersona);

    updateProfile({
      persona: selectedPersona,
      incomePattern,
      primaryPriority,
      budgetingStyle,
      insightStyle,
      currency,
      defaultMonthlyBudget: budgetNum,
      monthlySavingsTarget: Math.round(budgetNum * 0.3),
      onboardingCompleted: true,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-2xl border-border/60 p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-semibold text-primary uppercase tracking-wider">
              CoinKeeper Setup · Step {step} of 4
            </span>
            <span>{Math.round((step / 4) * 100)}% Complete</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground">
            {step === 1 && "What best describes your financial life?"}
            {step === 2 && "How do you earn and prioritize money?"}
            {step === 3 && "How do you want to manage your budget?"}
            {step === 4 && "Choose your currency and intelligence style"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {step === 1 && "CoinKeeper adapts to you. Select a baseline template — you can fully customize every category later."}
            {step === 2 && "We tune your Money Pulse, burn rate alerts, and recommendations to what matters most right now."}
            {step === 3 && "Flexible by default. Pick the budgeting philosophy that naturally fits your everyday lifestyle."}
            {step === 4 && "Your personal financial operating system is ready to launch."}
          </DialogDescription>
        </DialogHeader>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {PERSONAS.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPersona === p.type;
                return (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => setSelectedPersona(p.type)}
                    className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-glow text-foreground"
                        : "bg-secondary/40 border-border/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-lg ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        {p.title}
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {p.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2.5">
                  Income Pattern
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(["fixed", "variable", "irregular"] as IncomePattern[]).map((pat) => (
                    <button
                      key={pat}
                      type="button"
                      onClick={() => setIncomePattern(pat)}
                      className={`p-3 rounded-xl border text-xs font-semibold capitalize transition-all ${
                        incomePattern === pat
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary/50 border-border/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {pat === "fixed" ? "Fixed Salary" : pat === "variable" ? "Variable Inflow" : "Irregular / Gigs"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2.5">
                  What matters most to you right now?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRIORITIES.map((pri) => {
                    const Icon = pri.icon;
                    const isSelected = primaryPriority === pri.id;
                    return (
                      <button
                        key={pri.id}
                        type="button"
                        onClick={() => setPrimaryPriority(pri.id)}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-accent/10 border-accent text-foreground shadow-sm"
                            : "bg-secondary/40 border-border/50 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg ${
                            isSelected ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                            {pri.label}
                            {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{pri.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2.5">
                  Monthly Spending Budget Baseline
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                    {profile.currencySymbol || "₹"}
                  </span>
                  <Input
                    type="number"
                    value={monthlyBudgetInput}
                    onChange={(e) => setMonthlyBudgetInput(e.target.value)}
                    placeholder="45000"
                    className="pl-9 bg-secondary/50 text-base font-semibold font-mono"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  You can change this for each individual month at any time (e.g. higher in festive or travel months).
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2.5">
                  Budgeting Methodology
                </label>
                <div className="space-y-2">
                  {BUDGET_STYLES.map((b) => {
                    const isSelected = budgetingStyle === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBudgetingStyle(b.id)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground"
                            : "bg-secondary/40 border-border/50 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-foreground text-sm">{b.label}</div>
                          <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2.5">
                  Preferred Currency
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {(["INR", "USD", "EUR", "GBP", "CAD", "AUD", "JPY"] as CurrencyCode[]).map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => setCurrency(cur)}
                      className={`p-3 rounded-xl border text-xs font-semibold transition-all ${
                        currency === cur
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-secondary/50 border-border/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2.5">
                  Personalized Insight Depth
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: "simple", label: "Simple", desc: "Short, calm summaries and green/amber indicators" },
                    { id: "detailed", label: "Detailed", desc: "Pace, budget % used, remaining days, category alerts" },
                    { id: "advanced", label: "Advanced", desc: "Burn rate/day, projected month-end, cash flow delta" },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setInsightStyle(lvl.id as InsightStyle)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        insightStyle === lvl.id
                          ? "bg-accent/10 border-accent text-foreground"
                          : "bg-secondary/40 border-border/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="font-semibold text-foreground text-sm flex items-center justify-between">
                        {lvl.label}
                        {insightStyle === lvl.id && <Check className="w-3.5 h-3.5 text-accent" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{lvl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 mt-4 border-t border-border/50">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => s - 1)}
              className="gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          ) : (
            <span />
          )}

          {step < 4 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setStep((s) => s + 1)}
              className="bg-primary text-primary-foreground hover:opacity-90 gap-1.5 ml-auto"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleFinish}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-1.5 ml-auto font-semibold"
            >
              <Sparkles className="w-4 h-4" /> Launch My CoinKeeper
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
