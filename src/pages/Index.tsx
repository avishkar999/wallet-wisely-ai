import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { HeroHealthScore } from "@/components/dashboard/HeroHealthScore";
import { HabitStreak } from "@/components/dashboard/HabitStreak";
import { SmartInsights } from "@/components/dashboard/SmartInsights";
import { InvestmentGrowth } from "@/components/dashboard/InvestmentGrowth";
import { QuickActionsCompact } from "@/components/dashboard/QuickActionsCompact";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { SpendingBreakdown } from "@/components/dashboard/SpendingBreakdown";
import { ExpenseTracker } from "@/components/dashboard/ExpenseTracker";
import { InvestmentScanner } from "@/components/investments/InvestmentScanner";
import { DebtAnalyzer } from "@/components/debts/DebtAnalyzer";
import { AIAdvisorChat } from "@/components/advisor/AIAdvisorChat";
import { SettingsPage } from "@/pages/Settings";
import { CalendarPage } from "@/pages/Calendar";
import { DailySpendingTracker } from "@/components/tracker/DailySpendingTracker";
import { BudgetManager } from "@/components/budget/BudgetManager";
import { TransactionsHistory } from "@/components/transactions/TransactionsHistory";
import { SpendingAnalytics } from "@/components/analytics/SpendingAnalytics";
import { GoalTracker } from "@/components/goals/GoalTracker";
import { RentalManager } from "@/components/rentals/RentalManager";
import { Bell, Search, Menu, Sparkles, Sliders, Plus, User, Layers, Wallet, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMonthlyReset } from "@/hooks/useMonthlyReset";
import { useMonthlyArchive } from "@/hooks/useMonthlySummaries";
import { MonthlyHistory } from "@/components/history/MonthlyHistory";
import { MonthlySummaryCard } from "@/components/dashboard/MonthlySummaryCard";
import { SpendingTrendsLineChart } from "@/components/analytics/SpendingTrendsLineChart";
import { useAutoRecurring } from "@/hooks/useAutoRecurring";
import { RecurringAudit } from "@/components/recurring/RecurringAudit";

// CoinKeeper OS Components
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { FinancialHero } from "@/components/dashboard/FinancialHero";
import { MoneyPulseCard } from "@/components/dashboard/MoneyPulseCard";
import { MonthlyCycleBar } from "@/components/dashboard/MonthlyCycleBar";
import { AdaptiveDashboardBuilder } from "@/components/dashboard/AdaptiveDashboardBuilder";
import { MonthlyResetModal } from "@/components/dashboard/MonthlyResetModal";
import { MonthlyWrappedModal } from "@/components/dashboard/MonthlyWrappedModal";
import { MyMoneyAccountsCard } from "@/components/dashboard/MyMoneyAccountsCard";
import { CashFlowModule } from "@/components/dashboard/CashFlowModule";
import { NetWorthModule } from "@/components/dashboard/NetWorthModule";
import { PersonalFinancialRulesCard } from "@/components/dashboard/PersonalFinancialRulesCard";
import { SubscriptionImpactCard } from "@/components/dashboard/SubscriptionImpactCard";
import { SmartQuickAddTransactionDialog } from "@/components/forms/SmartQuickAddTransactionDialog";
import { PersonalizationOnboarding } from "@/components/onboarding/PersonalizationOnboarding";
import { CategoryManagerDialog } from "@/components/categories/CategoryManagerDialog";

const Index = () => {
  // Monthly cycles handling
  useMonthlyReset();
  useMonthlyArchive();
  useAutoRecurring();

  const {
    profile,
    showOnboardingModal,
    setShowOnboardingModal,
    showDashboardCustomizer,
    setShowDashboardCustomizer,
    setShowQuickAddModal,
  } = useCoinKeeper();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const isMobile = useIsMobile();

  // Auto-launch multi-step onboarding wizard for new zero-data profiles
  useEffect(() => {
    if (!profile.onboardingCompleted) {
      setShowOnboardingModal(true);
    }
  }, [profile.onboardingCompleted, setShowOnboardingModal]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "accounts":
        return (
          <div className="space-y-6 max-w-6xl mx-auto">
            <MyMoneyAccountsCard />
            <NetWorthModule />
            <CashFlowModule />
          </div>
        );
      case "categories":
        return (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Categories & Inflows</h2>
                <p className="text-xs text-muted-foreground">Manage your custom income sources, expense limits, and types.</p>
              </div>
              <Button size="sm" onClick={() => setShowCategoryManager(true)} className="bg-primary text-primary-foreground text-xs">
                + Edit Categories
              </Button>
            </div>
            <SpendingBreakdown />
          </div>
        );
      case "subscriptions":
        return (
          <div className="space-y-6 max-w-6xl mx-auto">
            <SubscriptionImpactCard />
          </div>
        );
      case "tracker":
        return <DailySpendingTracker />;
      case "budget":
        return <BudgetManager />;
      case "goals":
        return <GoalTracker />;
      case "history":
        return <TransactionsHistory />;
      case "monthly":
        return <MonthlyHistory />;
      case "audit":
        return <RecurringAudit />;
      case "analytics":
        return <SpendingAnalytics />;
      case "calendar":
        return <CalendarPage />;
      case "expenses":
        return <ExpenseTracker />;
      case "rentals":
        return <RentalManager />;
      case "investments":
        return <InvestmentScanner />;
      case "debts":
        return <DebtAnalyzer />;
      case "advisor":
        return <AIAdvisorChat />;
      case "settings":
        return <SettingsPage />;
      default:
        return <AdaptiveDashboard onNavigateTab={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {isMobile ? (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-[280px]">
            <Sidebar
              activeTab={activeTab}
              onTabChange={handleTabChange}
              isCollapsed={false}
              onToggle={() => {}}
            />
          </SheetContent>
        </Sheet>
      ) : (
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}
      
      <main 
        className="transition-all duration-300"
        style={{ marginLeft: isMobile ? 0 : (sidebarCollapsed ? 80 : 280) }}
      >
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5">
            <div className="flex items-center gap-3">
              {isMobile && (
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
                  <Menu className="w-5 h-5" />
                </Button>
              )}
              <div>
                <motion.h1 
                  key={activeTab}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-base sm:text-lg font-bold text-foreground capitalize flex items-center gap-2"
                >
                  {activeTab === "dashboard" && (
                    <button
                      type="button"
                      onClick={() => setShowOnboardingModal(true)}
                      className="group flex items-center gap-1.5 text-foreground hover:text-primary transition-colors text-left"
                      title="Click to change your financial persona"
                    >
                      <span>CoinKeeper OS</span>
                      <span className="text-[11px] font-medium font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 capitalize group-hover:bg-primary/20">
                        {profile.persona} · {profile.currency}
                      </span>
                    </button>
                  )}
                  {activeTab === "advisor" && "AI Financial Advisor"}
                  {activeTab === "monthly" && "Monthly History & Wrapped"}
                  {activeTab === "accounts" && "My Money & Accounts"}
                  {activeTab === "categories" && "Categories & Inflows"}
                  {activeTab === "subscriptions" && "Subscriptions"}
                  {activeTab !== "dashboard" &&
                    activeTab !== "advisor" &&
                    activeTab !== "monthly" &&
                    activeTab !== "accounts" &&
                    activeTab !== "categories" &&
                    activeTab !== "subscriptions" &&
                    activeTab}
                </motion.h1>
                <p className="text-[11px] text-muted-foreground">
                  {new Date().toLocaleDateString('en-IN', { 
                    weekday: isMobile ? 'short' : 'long', 
                    month: isMobile ? 'short' : 'long', 
                    day: 'numeric' 
                  })} · {profile.budgetingStyle.replace("_", " ")} budgeting
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Personalize Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowOnboardingModal(true)}
                className="hidden sm:flex text-xs h-8 gap-1.5 border-border/50 text-muted-foreground hover:text-foreground"
              >
                <User className="w-3.5 h-3.5 text-primary" /> Setup
              </Button>

              {/* Layout Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDashboardCustomizer(true)}
                className="hidden sm:flex text-xs h-8 gap-1.5 border-border/50 text-muted-foreground hover:text-foreground"
              >
                <Sliders className="w-3.5 h-3.5" /> Layout
              </Button>

              {/* Quick Add Button */}
              <Button
                type="button"
                size="sm"
                onClick={() => setShowQuickAddModal(true)}
                className="text-xs h-8 bg-primary text-primary-foreground font-semibold gap-1 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Transaction
              </Button>

              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
              </Button>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 pb-20 sm:pb-6">
          {renderContent()}
        </div>

        {/* Mobile Floating Action Button */}
        {isMobile && (
          <button
            type="button"
            onClick={() => setShowQuickAddModal(true)}
            className="fixed bottom-6 right-6 w-13 h-13 rounded-full bg-gradient-primary text-primary-foreground shadow-elevated flex items-center justify-center z-40 hover:scale-105 active:scale-95 transition-all"
            title="Quick Add Transaction"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </main>

      {/* Global Modals */}
      <PersonalizationOnboarding
        open={showOnboardingModal}
        onOpenChange={setShowOnboardingModal}
      />
      <AdaptiveDashboardBuilder
        open={showDashboardCustomizer}
        onOpenChange={setShowDashboardCustomizer}
      />
      <SmartQuickAddTransactionDialog />
      <MonthlyResetModal />
      <MonthlyWrappedModal />
      <CategoryManagerDialog
        open={showCategoryManager}
        onOpenChange={setShowCategoryManager}
      />
    </div>
  );
};

// Adaptive Dashboard Builder & Renderer based on user persona & card order
const AdaptiveDashboard = ({ onNavigateTab }: { onNavigateTab?: (tab: string) => void }) => {
  const { profile } = useCoinKeeper();

  const enabledCards = profile.enabledModules || [
    "pulse",
    "cycle",
    "budget",
    "trends",
    "cashflow",
    "accounts",
    "goals",
    "categories",
    "subscriptions",
    "investments",
    "debts",
    "habits",
  ];

  const cardsOrder = profile.dashboardCardsOrder || enabledCards;

  // Render individual card by ID
  const renderCard = (cardId: string) => {
    if (!enabledCards.includes(cardId)) return null;

    switch (cardId) {
      case "pulse":
        return <MoneyPulseCard key="pulse" />;
      case "cycle":
        return <MonthlyCycleBar key="cycle" />;
      case "budget":
        return <MonthlySummaryCard key="budget" />;
      case "trends":
        return <SpendingTrendsLineChart key="trends" />;
      case "cashflow":
        return <CashFlowModule key="cashflow" />;
      case "accounts":
        return <MyMoneyAccountsCard key="accounts" />;
      case "goals":
        return <GoalTracker key="goals" />;
      case "categories":
        return <SpendingBreakdown key="categories" />;
      case "subscriptions":
        return <SubscriptionImpactCard key="subscriptions" />;
      case "investments":
        return <InvestmentGrowth key="investments" />;
      case "debts":
        return <DebtAnalyzer key="debts" />;
      case "habits":
        return <HabitStreak key="habits" />;
      case "rules":
        return <PersonalFinancialRulesCard key="rules" />;
      case "networth":
        return <NetWorthModule key="networth" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 max-w-6xl mx-auto"
    >
      {/* 1. Star of the App: Main Financial Hero & Zero-Data Onboarding */}
      <FinancialHero onNavigateTab={onNavigateTab} />

      {/* 2. Monthly Cycle Bar (Active month, custom note, variable budget) */}
      <MonthlyCycleBar />

      {/* 3. Signature Money Pulse (Communicating current condition) */}
      <MoneyPulseCard />

      {/* 4. Dynamic Card Order based on user persona & customization */}
      <div className="space-y-5">
        {cardsOrder
          .filter((id) => id !== "pulse" && id !== "cycle")
          .map((cardId) => renderCard(cardId))}
      </div>

      {/* 5. Secondary Row: Quick Actions, Recent Activity & Smart Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-2">
        <div className="lg:col-span-2 space-y-5">
          <QuickActionsCompact />
          <RecentActivity />
        </div>
        <div className="space-y-5">
          <SmartInsights />
        </div>
      </div>
    </motion.div>
  );
};

export default Index;
