import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Building2,
  Calendar,
  Lock,
  Plus,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import {
  ConsentArtifact,
  SupportedInstitution,
} from "@/types/connection";
import {
  getStoredConsents,
  revokeConsent,
  renewConsentArtifact,
  SUPPORTED_INSTITUTIONS,
} from "@/services/financialConnectionService";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ConnectionManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddNewConnection?: () => void;
  onRefreshData?: () => void;
}

export function ConnectionManagerDialog({
  open,
  onOpenChange,
  onAddNewConnection,
  onRefreshData,
}: ConnectionManagerDialogProps) {
  const { toast } = useToast();
  const [consents, setConsents] = useState<ConsentArtifact[]>([]);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const loadConsents = () => {
    setConsents(getStoredConsents());
  };

  useEffect(() => {
    if (open) {
      loadConsents();
    }
  }, [open]);

  const handleDisconnect = (consentId: string, name: string) => {
    revokeConsent(consentId);
    loadConsents();
    toast({
      title: "Account Disconnected",
      description: `Revoked data consent for ${name}. No further transactions will be received.`,
    });
    onRefreshData?.();
  };

  const handleRenew = (consentId: string, name: string) => {
    const renewed = renewConsentArtifact(consentId);
    if (renewed) {
      loadConsents();
      toast({
        title: "Consent Renewed",
        description: `Extended read-only data consent for ${name} for 12 months.`,
      });
      onRefreshData?.();
    }
  };

  const handleSyncNow = async (consentId: string, name: string) => {
    setRefreshingId(consentId);
    setTimeout(() => {
      setRefreshingId(null);
      toast({
        title: "Sync Completed",
        description: `Synchronised latest transactions from ${name}.`,
      });
      onRefreshData?.();
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase font-mono">
            <Lock className="w-4 h-4 text-primary" />
            Financial Data & Privacy Governance
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Connected Accounts & Consent
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Manage your connected bank feeds, review data sharing scopes, and renew or revoke consent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Active Consents List */}
          {consents.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-secondary/30 border border-border/50 space-y-3">
              <Building2 className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <div>
                <h4 className="font-bold text-sm text-foreground">No Connected Financial Accounts</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  Connect your bank or payment institution via the regulated Account Aggregator
                  network to track your expenses automatically.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onAddNewConnection?.();
                }}
                className="bg-primary text-primary-foreground font-semibold text-xs gap-1.5"
              >
                <Plus className="w-4 h-4" /> Connect Financial Account
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {consents.map((consent) => {
                const isExpired = new Date(consent.consentExpiry) < new Date();
                const isRefreshing = refreshingId === consent.consentId;
                const provider = SUPPORTED_INSTITUTIONS.find((i) => i.id === consent.institutionId);

                return (
                  <div
                    key={consent.consentId}
                    className="p-4 rounded-xl border border-border/60 bg-secondary/20 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{provider?.logo || "🏦"}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">
                              {consent.institutionName}
                            </span>
                            <Badge
                              variant={isExpired ? "destructive" : "secondary"}
                              className="text-[10px] font-mono"
                            >
                              {isExpired ? "Expired Consent" : "Active Feed"}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            {consent.accountMask} ({consent.accountType})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSyncNow(consent.consentId, consent.institutionName)}
                          disabled={isRefreshing || isExpired}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Sync Now"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDisconnect(consent.consentId, consent.institutionName)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          title="Revoke Consent and Disconnect"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-border/40 text-muted-foreground">
                      <div>
                        <span>Last Synchronised:</span>{" "}
                        <strong className="text-foreground">
                          {consent.lastSyncTimestamp
                            ? format(new Date(consent.lastSyncTimestamp), "MMM d, h:mm a")
                            : "Pending"}
                        </strong>
                      </div>
                      <div>
                        <span>Consent Expiry:</span>{" "}
                        <strong className={isExpired ? "text-destructive" : "text-foreground"}>
                          {format(new Date(consent.consentExpiry), "MMM d, yyyy")}
                        </strong>
                      </div>
                    </div>

                    {isExpired && (
                      <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs flex items-center justify-between">
                        <span className="text-destructive font-medium text-[11px]">
                          Consent expired. Re-authorise to resume syncing.
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRenew(consent.consentId, consent.institutionName)}
                          className="h-7 text-xs font-semibold"
                        >
                          Renew Consent
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onAddNewConnection?.();
                }}
                className="w-full text-xs h-8 gap-1.5 border-dashed border-border/80 text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-3.5 h-3.5" /> Connect Another Financial Account
              </Button>
            </div>
          )}

          {/* Privacy & Zero Secret Policy */}
          <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 space-y-2 text-xs">
            <div className="font-semibold text-primary flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Privacy & Regulatory Assurances
            </div>
            <ul className="space-y-1 text-[11px] text-muted-foreground list-disc pl-4">
              <li>WalletWisely never has access to passwords, PINs, or funds movement capabilities.</li>
              <li>Data retrieval is governed by the RBI Account Aggregator electronic consent standard.</li>
              <li>You can revoke consent at any moment, terminating all automated ingestion immediately.</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
