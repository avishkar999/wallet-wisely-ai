import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import {
  ShieldCheck,
  RefreshCw,
  Building2,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sliders,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getStoredConsents,
  determineConnectionState,
  SUPPORTED_INSTITUTIONS,
} from "@/services/financialConnectionService";
import { ConnectionState, ConsentArtifact } from "@/types/connection";
import { FinancialConnectionModal } from "./FinancialConnectionModal";
import { ConnectionManagerDialog } from "./ConnectionManagerDialog";
import { useTransactions } from "@/hooks/useTransactions";
import { useToast } from "@/hooks/use-toast";

export interface ConnectionStatusProps {
  /** Visual display style: 'card' for dashboard view, 'compact' for navigation bar / headers */
  variant?: "card" | "compact" | "banner";
  /** Optional custom title override */
  title?: string;
  /** Optional custom class name */
  className?: string;
  /** Callback fired after synchronization completes */
  onSyncComplete?: () => void;
  /** Open account connection modal callback */
  onOpenConnect?: () => void;
  /** Open connection manager callback */
  onOpenManage?: () => void;
}

export function ConnectionStatus({
  variant = "card",
  title,
  className,
  onSyncComplete,
  onOpenConnect,
  onOpenManage,
}: ConnectionStatusProps) {
  const { toast } = useToast();
  const { data: transactions = [], refetch: refetchTransactions } = useTransactions();

  const [consents, setConsents] = useState<ConsentArtifact[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [now, setNow] = useState(new Date());

  // Internal modal states if parent doesn't override
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);

  // Load consents on mount and interval
  const reloadConsents = () => {
    setConsents(getStoredConsents());
  };

  useEffect(() => {
    reloadConsents();

    // Listen to network connectivity
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Refresh relative timestamp every minute
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const connectionState: ConnectionState = useMemo(() => {
    return determineConnectionState(consents, transactions.length, isSyncing);
  }, [consents, transactions.length, isSyncing]);

  // Find the latest successful sync timestamp among consents
  const latestSyncTimestamp = useMemo(() => {
    const timestamps = consents
      .map((c) => c.lastSyncTimestamp)
      .filter((ts): ts is string => Boolean(ts))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return timestamps[0] || null;
  }, [consents]);

  // Relative sync time string
  const relativeSyncTime = useMemo(() => {
    if (!latestSyncTimestamp) return "Pending initial sync";
    try {
      const syncDate = new Date(latestSyncTimestamp);
      const diffMs = now.getTime() - syncDate.getTime();
      if (diffMs < 45000) return "Just now";
      return `${formatDistanceToNow(syncDate, { addSuffix: true })}`;
    } catch {
      return "Recently";
    }
  }, [latestSyncTimestamp, now]);

  // Formatted date and time
  const formattedSyncTime = useMemo(() => {
    if (!latestSyncTimestamp) return null;
    try {
      return format(new Date(latestSyncTimestamp), "MMM d, yyyy · h:mm a");
    } catch {
      return null;
    }
  }, [latestSyncTimestamp]);

  const activeInstitutions = useMemo(() => {
    return consents
      .filter((c) => c.status === "ACTIVE")
      .map((c) => {
        const info = SUPPORTED_INSTITUTIONS.find((i) => i.id === c.institutionId);
        return {
          ...c,
          logo: info?.logo || "🏦",
          name: info?.name || c.institutionName,
        };
      });
  }, [consents]);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      // Simulate on-demand AA sync handshake & refresh
      await new Promise((resolve) => setTimeout(resolve, 1400));

      // Update sync timestamps on active consents
      const updatedConsents = consents.map((c) => ({
        ...c,
        lastSyncTimestamp: new Date().toISOString(),
      }));
      localStorage.setItem("walletwisely_connected_consents", JSON.stringify(updatedConsents));
      setConsents(updatedConsents);

      await refetchTransactions();
      onSyncComplete?.();

      toast({
        title: "Synchronization Complete",
        description: `Verified and refreshed latest records from ${consents.length} connected institution(s).`,
      });
    } catch (err: any) {
      toast({
        title: "Sync Failed",
        description: err?.message || "Could not complete feed synchronization.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenConnect = () => {
    if (onOpenConnect) {
      onOpenConnect();
    } else {
      setConnectModalOpen(true);
    }
  };

  const handleOpenManage = () => {
    if (onOpenManage) {
      onOpenManage();
    } else {
      setManageModalOpen(true);
    }
  };

  // Status configuration mappings
  const statusMeta = useMemo(() => {
    if (!isOnline) {
      return {
        badgeLabel: "Offline",
        badgeVariant: "destructive" as const,
        dotColor: "bg-destructive",
        headline: "Network Connection Offline",
        subtext: "Your browser is currently offline. Synchronisation will resume when network connectivity returns.",
        icon: WifiOff,
        accentColor: "text-destructive",
        borderGlow: "border-destructive/30",
        ambientGlow: "bg-destructive/10",
      };
    }

    switch (connectionState) {
      case "synced":
        return {
          badgeLabel: "Live Feed Active",
          badgeVariant: "default" as const,
          dotColor: "bg-emerald-500",
          headline: "Feed Synchronised & Active",
          subtext: "Continuous automated transaction classification and spending governance active.",
          icon: CheckCircle2,
          accentColor: "text-emerald-500",
          borderGlow: "border-emerald-500/30",
          ambientGlow: "bg-emerald-500/10",
        };
      case "syncing":
        return {
          badgeLabel: "Synchronising…",
          badgeVariant: "secondary" as const,
          dotColor: "bg-primary animate-ping",
          headline: "Retrieving Financial Feed",
          subtext: "Validating encrypted consent tokens, fetching transactions, and categorising spending.",
          icon: RefreshCw,
          accentColor: "text-primary",
          borderGlow: "border-primary/40",
          ambientGlow: "bg-primary/10",
        };
      case "connected_empty":
        return {
          badgeLabel: "Feed Linked",
          badgeVariant: "outline" as const,
          dotColor: "bg-accent",
          headline: "Connected · Awaiting Ingestion",
          subtext: "Account feed linked securely. No new transactions recorded in the current billing cycle.",
          icon: Building2,
          accentColor: "text-accent",
          borderGlow: "border-accent/30",
          ambientGlow: "bg-accent/10",
        };
      case "reauth_required":
        return {
          badgeLabel: "Re-auth Required",
          badgeVariant: "destructive" as const,
          dotColor: "bg-amber-500",
          headline: "Consent Artefact Expired",
          subtext: "RBI Account Aggregator consent has expired. Please renew authorization to resume syncing.",
          icon: AlertTriangle,
          accentColor: "text-amber-500",
          borderGlow: "border-amber-500/40",
          ambientGlow: "bg-amber-500/15",
        };
      case "error":
        return {
          badgeLabel: "Sync Issue",
          badgeVariant: "destructive" as const,
          dotColor: "bg-destructive",
          headline: "Synchronization Interrupted",
          subtext: "We encountered an issue updating records from your institution. Tap to retry.",
          icon: AlertTriangle,
          accentColor: "text-destructive",
          borderGlow: "border-destructive/30",
          ambientGlow: "bg-destructive/10",
        };
      case "connecting":
        return {
          badgeLabel: "Connecting…",
          badgeVariant: "secondary" as const,
          dotColor: "bg-primary animate-pulse",
          headline: "Establishing Secure Handshake",
          subtext: "Connecting to the financial institution consent gateway.",
          icon: ShieldCheck,
          accentColor: "text-primary",
          borderGlow: "border-primary/30",
          ambientGlow: "bg-primary/10",
        };
      case "disconnected":
      default:
        return {
          badgeLabel: "No Bank Connected",
          badgeVariant: "outline" as const,
          dotColor: "bg-muted-foreground",
          headline: "Automated Feed Disconnected",
          subtext: "Connect your bank via the RBI Account Aggregator framework for zero manual entry tracking.",
          icon: Building2,
          accentColor: "text-muted-foreground",
          borderGlow: "border-border/60",
          ambientGlow: "bg-primary/5",
        };
    }
  }, [connectionState, isOnline]);

  const StatusIcon = statusMeta.icon;

  // --------------------------------------------------------------------------
  // COMPACT VARIANT (Ideal for headers, top bars, and status bars)
  // --------------------------------------------------------------------------
  if (variant === "compact") {
    return (
      <>
        <div
          className={cn(
            "glass-hover inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs transition-all",
            statusMeta.borderGlow,
            className
          )}
        >
          {/* Status Indicator Pulse */}
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
                statusMeta.dotColor
              )}
            />
            <span
              className={cn("relative inline-flex rounded-full h-2 w-2", statusMeta.dotColor)}
            />
          </span>

          {/* Institution mask or label */}
          <span className="font-medium text-foreground text-[11px] flex items-center gap-1.5">
            {activeInstitutions.length > 0 ? (
              <>
                <span className="text-xs">{activeInstitutions[0].logo}</span>
                <span>{activeInstitutions[0].name}</span>
                <span className="font-mono text-muted-foreground text-[10px]">
                  ({activeInstitutions[0].accountMask})
                </span>
              </>
            ) : (
              <span>Automated Feed</span>
            )}
          </span>

          <span className="text-muted-foreground/40 text-[10px]">·</span>

          {/* Sync Time */}
          <span className="text-[10px] text-muted-foreground font-mono" title={formattedSyncTime || ""}>
            {relativeSyncTime}
          </span>

          {/* Quick Refresh Button */}
          {consents.length > 0 && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="p-1 -mr-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              title="Sync Now"
            >
              <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin text-primary")} />
            </button>
          )}
        </div>

        <FinancialConnectionModal
          open={connectModalOpen}
          onOpenChange={setConnectModalOpen}
          onSuccess={reloadConsents}
        />
        <ConnectionManagerDialog
          open={manageModalOpen}
          onOpenChange={setManageModalOpen}
          onRefreshData={reloadConsents}
          onAddNewConnection={() => {
            setManageModalOpen(false);
            setConnectModalOpen(true);
          }}
        />
      </>
    );
  }

  // --------------------------------------------------------------------------
  // BANNER VARIANT (Ideal for top of pages or dismissable notification)
  // --------------------------------------------------------------------------
  if (variant === "banner") {
    return (
      <>
        <div
          className={cn(
            "glass-premium rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border transition-all",
            statusMeta.borderGlow,
            className
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                statusMeta.ambientGlow
              )}
            >
              <StatusIcon
                className={cn(
                  "w-4.5 h-4.5",
                  statusMeta.accentColor,
                  isSyncing && "animate-spin"
                )}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-foreground">
                  {statusMeta.headline}
                </span>
                <Badge
                  variant={statusMeta.badgeVariant}
                  className="text-[10px] font-mono py-0 h-4 uppercase tracking-wider"
                >
                  {statusMeta.badgeLabel}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                <Clock className="w-3 h-3 text-muted-foreground/60" />
                <span>Last synchronised: <strong className="text-foreground font-mono">{relativeSyncTime}</strong></span>
                {formattedSyncTime && (
                  <span className="hidden md:inline text-muted-foreground/60">({formattedSyncTime})</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {consents.length === 0 ? (
              <Button
                size="sm"
                onClick={handleOpenConnect}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-8 gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" /> Connect Account
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="text-xs h-8 gap-1.5 border-border/60 hover:bg-secondary/60"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin text-primary")} />
                  {isSyncing ? "Syncing…" : "Sync Now"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleOpenManage}
                  className="text-xs h-8 text-muted-foreground hover:text-foreground"
                >
                  Manage
                </Button>
              </>
            )}
          </div>
        </div>

        <FinancialConnectionModal
          open={connectModalOpen}
          onOpenChange={setConnectModalOpen}
          onSuccess={reloadConsents}
        />
        <ConnectionManagerDialog
          open={manageModalOpen}
          onOpenChange={setManageModalOpen}
          onRefreshData={reloadConsents}
          onAddNewConnection={() => {
            setManageModalOpen(false);
            setConnectModalOpen(true);
          }}
        />
      </>
    );
  }

  // --------------------------------------------------------------------------
  // CARD VARIANT (Default high-fidelity glassmorphism dashboard card)
  // --------------------------------------------------------------------------
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "glass-premium rounded-2xl p-5 relative overflow-hidden transition-all duration-300",
          statusMeta.borderGlow,
          className
        )}
      >
        {/* Ambient background glow */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-60 transition-colors",
            statusMeta.ambientGlow
          )}
        />

        {/* Header Bar */}
        <div className="relative z-10 flex items-center justify-between pb-3.5 border-b border-border/30">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm",
                statusMeta.ambientGlow
              )}
            >
              <StatusIcon
                className={cn(
                  "w-4.5 h-4.5",
                  statusMeta.accentColor,
                  isSyncing && "animate-spin"
                )}
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                {title || "Connection & Sync Status"}
                {isOnline ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" title="Network Online" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-destructive" title="Network Offline" />
                )}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Automated Open Banking & Account Aggregator Feed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={statusMeta.badgeVariant}
              className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5"
            >
              <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusMeta.dotColor)} />
              {statusMeta.badgeLabel}
            </Badge>
          </div>
        </div>

        {/* Content Body */}
        <div className="relative z-10 py-4 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-foreground block">
                {statusMeta.headline}
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-lg mt-0.5">
                {statusMeta.subtext}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 pt-1 sm:pt-0">
              {consents.length > 0 ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleManualSync}
                    disabled={isSyncing || !isOnline}
                    className="text-xs h-8 gap-1.5 bg-background/50 border-border/60 hover:bg-secondary/60 shadow-sm"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin text-primary")} />
                    <span>{isSyncing ? "Syncing…" : "Sync Now"}</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleOpenManage}
                    className="text-xs h-8 gap-1 border-border/60 bg-background/30 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                    title="Manage Connected Accounts & Consents"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Manage</span>
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenConnect}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-8 gap-1.5 shadow-sm"
                >
                  <Building2 className="w-3.5 h-3.5" /> Connect Account
                </Button>
              )}
            </div>
          </div>

          {/* Metrics & Sync Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            {/* 1. Last Sync Timestamp */}
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/30 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block">
                  Last Sync
                </span>
                <span className="text-xs font-bold font-mono text-foreground block truncate">
                  {relativeSyncTime}
                </span>
                {formattedSyncTime && (
                  <span className="text-[10px] text-muted-foreground/80 block truncate">
                    {formattedSyncTime}
                  </span>
                )}
              </div>
            </div>

            {/* 2. Active Accounts / Feeds */}
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/30 flex items-start gap-2.5">
              <Building2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block">
                  Linked Accounts
                </span>
                <span className="text-xs font-bold font-mono text-foreground block">
                  {consents.length > 0
                    ? `${consents.length} Authorised Institution${consents.length > 1 ? "s" : ""}`
                    : "0 Accounts"}
                </span>
                <span className="text-[10px] text-muted-foreground/80 block truncate">
                  {activeInstitutions.length > 0
                    ? activeInstitutions.map((i) => i.name.split(" ")[0]).join(", ")
                    : "No feeds configured"}
                </span>
              </div>
            </div>

            {/* 3. Consent Security Level */}
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/30 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block">
                  Consent Mode
                </span>
                <span className="text-xs font-bold text-emerald-500 block truncate">
                  View-Only Access
                </span>
                <span className="text-[10px] text-muted-foreground/80 block truncate">
                  Zero secrets / PINs stored
                </span>
              </div>
            </div>
          </div>

          {/* Connected Institution Badges (if any exist) */}
          {activeInstitutions.length > 0 && (
            <div className="pt-1 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                Feeds:
              </span>
              {activeInstitutions.map((inst) => (
                <div
                  key={inst.consentId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/60 border border-border/40 text-xs"
                >
                  <span className="text-xs">{inst.logo}</span>
                  <span className="font-semibold text-foreground text-[11px]">{inst.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {inst.accountMask}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subtle Regulatory Guarantee Footer */}
        <div className="relative z-10 pt-3 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-primary" />
            <span>Regulated Account Aggregator (AA) Architecture · 256-bit Encrypted</span>
          </div>
          <button
            type="button"
            onClick={handleOpenManage}
            className="text-primary hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
          >
            <span>Audit Permissions</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </motion.div>

      {/* Connection & Management Modals */}
      <FinancialConnectionModal
        open={connectModalOpen}
        onOpenChange={setConnectModalOpen}
        onSuccess={reloadConsents}
      />
      <ConnectionManagerDialog
        open={manageModalOpen}
        onOpenChange={setManageModalOpen}
        onRefreshData={reloadConsents}
        onAddNewConnection={() => {
          setManageModalOpen(false);
          setConnectModalOpen(true);
        }}
      />
    </>
  );
}
