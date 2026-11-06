import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Wallet, 
  TrendingUp, 
  CreditCard, 
  MessageSquare, 
  Settings,
  ChevronLeft,
  Sparkles,
  LogOut,
  CalendarDays,
  Receipt,
  Target,
  History,
  BarChart3,
  Goal,
  Building2,
  Archive,
  DatabaseZap,
  Layers,
  Coins,
  ArrowDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "income", label: "Income", icon: ArrowDownLeft },
  { id: "accounts", label: "My Money", icon: Wallet },
  { id: "tracker", label: "Daily Tracker", icon: Receipt },
  { id: "budget", label: "Budget & Flow", icon: Target },
  { id: "goals", label: "Goals", icon: Goal },
  { id: "categories", label: "Categories", icon: Layers },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { id: "investments", label: "Investments", icon: TrendingUp },
  { id: "debts", label: "Debts", icon: CreditCard },
  { id: "history", label: "Transactions", icon: History },
  { id: "monthly", label: "Monthly History", icon: Archive },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "advisor", label: "AI Advisor", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({ activeTab, onTabChange, isCollapsed, onToggle }: SidebarProps) {
  const { data: profile } = useProfile();
  const { user, signOut } = useAuth();
  const { profile: ckProfile } = useCoinKeeper();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth", { replace: true });
    } catch (err) {
      console.error("Sign out error:", err);
      navigate("/auth", { replace: true });
    }
  };

  // Forward wheel scrolling from header or footer to nav so the entire sidebar responds
  const handleContainerWheel = (e: React.WheelEvent<HTMLElement>) => {
    if (navRef.current && !navRef.current.contains(e.target as Node)) {
      navRef.current.scrollTop += e.deltaY;
    }
  };

  return (
    <motion.aside
      initial={{ width: 280 }}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      onWheel={handleContainerWheel}
      className="fixed left-0 top-0 h-screen max-h-screen h-[100dvh] bg-sidebar border-r border-sidebar-border z-50 flex flex-col overflow-hidden select-none"
    >
      {/* Logo Header - Fixed at top, non-shrinking */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-sidebar-border/40 shrink-0 bg-sidebar">
        <motion.div 
          className="flex items-center gap-3 overflow-hidden"
          animate={{ opacity: isCollapsed ? 0 : 1 }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
            <Coins className="w-5 h-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col min-w-0"
            >
              <span className="text-lg font-bold text-foreground tracking-tight flex items-center gap-1.5 truncate">
                WalletWisely
              </span>
              <span className="text-[10px] text-primary uppercase font-mono tracking-wider font-semibold truncate">
                Automated Finance
              </span>
            </motion.div>
          )}
        </motion.div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "transition-transform duration-300 h-8 w-8 text-muted-foreground hover:text-foreground shrink-0",
            isCollapsed && "rotate-180"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Navigation - Independently scrollable container */}
      <nav
        ref={navRef}
        aria-label="Sidebar Navigation"
        className="flex-1 min-h-0 px-3 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden overscroll-contain sidebar-scrollbar focus:outline-none"
        tabIndex={0}
      >
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.015 }}
              onClick={() => onTabChange(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm font-semibold" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                isCollapsed && "justify-center px-0"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && (
                <span className="truncate">
                  {item.label}
                </span>
              )}
              {isActive && item.id === "advisor" && !isCollapsed && (
                <span className="ml-auto w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* User Profile & Sign Out - Pinned at bottom, always visible & accessible */}
      <div className="p-3 border-t border-sidebar-border space-y-2 shrink-0 bg-sidebar/95 backdrop-blur-sm mt-auto z-10">
        <div
          className={cn(
            "flex items-center gap-2.5 p-2 rounded-xl bg-secondary/50",
            isCollapsed && "justify-center p-1.5"
          )}
          title={isCollapsed ? `${displayName} (${ckProfile.persona})` : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center text-accent-foreground font-semibold text-xs shrink-0 shadow-sm">
            {initials}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
              <span className="text-[10px] text-primary capitalize font-medium block truncate">
                {ckProfile.persona} · {ckProfile.currency}
              </span>
            </div>
          )}
        </div>
        
        {isCollapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={handleSignOut}
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 transition-colors gap-2"
            onClick={handleSignOut}
            title="Sign Out of WalletWisely"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">Sign Out</span>
          </Button>
        )}
      </div>
    </motion.aside>
  );
}

