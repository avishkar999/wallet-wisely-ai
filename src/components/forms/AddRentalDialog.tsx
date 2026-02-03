import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAddRental, useUpdateRental, Rental, RentalType, RentalStatus } from "@/hooks/useRentals";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Home, Store, Building2, User, MapPin, Calendar, Phone, Mail } from "lucide-react";

interface AddRentalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rental?: Rental | null;
}

const rentalTypes: { value: RentalType; label: string; icon: React.ElementType; description: string }[] = [
  { value: "shop", label: "Shop", icon: Store, description: "Commercial retail space" },
  { value: "home", label: "Home", icon: Home, description: "Residential property" },
  { value: "other", label: "Other", icon: Building2, description: "Warehouse, land, etc." },
];

const statusOptions: { value: RentalStatus; label: string }[] = [
  { value: "active", label: "Active (Occupied)" },
  { value: "vacant", label: "Vacant" },
  { value: "pending", label: "Pending" },
  { value: "terminated", label: "Terminated" },
];

export function AddRentalDialog({ open, onOpenChange, rental }: AddRentalDialogProps) {
  const [step, setStep] = useState<"type" | "details" | "tenant">("type");
  const [type, setType] = useState<RentalType>("home");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [rentDueDay, setRentDueDay] = useState("1");
  const [status, setStatus] = useState<RentalStatus>("vacant");
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [leaseStartDate, setLeaseStartDate] = useState("");
  const [leaseEndDate, setLeaseEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const addRental = useAddRental();
  const updateRental = useUpdateRental();
  const { toast } = useToast();

  const isEditing = !!rental;

  useEffect(() => {
    if (rental) {
      setType(rental.type);
      setName(rental.name);
      setAddress(rental.address || "");
      setMonthlyRent(String(rental.monthly_rent));
      setSecurityDeposit(rental.security_deposit ? String(rental.security_deposit) : "");
      setRentDueDay(rental.rent_due_day ? String(rental.rent_due_day) : "1");
      setStatus(rental.status);
      setTenantName(rental.tenant_name || "");
      setTenantPhone(rental.tenant_phone || "");
      setTenantEmail(rental.tenant_email || "");
      setLeaseStartDate(rental.lease_start_date || "");
      setLeaseEndDate(rental.lease_end_date || "");
      setNotes(rental.notes || "");
      setStep("details");
    } else {
      resetForm();
    }
  }, [rental, open]);

  const resetForm = () => {
    setStep("type");
    setType("home");
    setName("");
    setAddress("");
    setMonthlyRent("");
    setSecurityDeposit("");
    setRentDueDay("1");
    setStatus("vacant");
    setTenantName("");
    setTenantPhone("");
    setTenantEmail("");
    setLeaseStartDate("");
    setLeaseEndDate("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!name || !monthlyRent) {
      toast({
        title: "Missing Fields",
        description: "Please fill in property name and monthly rent.",
        variant: "destructive",
      });
      return;
    }

    try {
      const data = {
        type,
        name,
        address: address || null,
        monthly_rent: parseFloat(monthlyRent),
        security_deposit: securityDeposit ? parseFloat(securityDeposit) : null,
        rent_due_day: parseInt(rentDueDay),
        status,
        tenant_name: tenantName || null,
        tenant_phone: tenantPhone || null,
        tenant_email: tenantEmail || null,
        lease_start_date: leaseStartDate || null,
        lease_end_date: leaseEndDate || null,
        notes: notes || null,
      };

      if (isEditing && rental) {
        await updateRental.mutateAsync({ id: rental.id, ...data });
        toast({ title: "Property updated successfully" });
      } else {
        await addRental.mutateAsync(data);
        toast({ title: "Property added successfully" });
      }

      onOpenChange(false);
      resetForm();
    } catch {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "add"} property.`,
        variant: "destructive",
      });
    }
  };

  const isPending = addRental.isPending || updateRental.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Property" : "Add New Property"}</DialogTitle>
        </DialogHeader>

        {!isEditing && step === "type" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select the type of property</p>
            <div className="grid grid-cols-3 gap-3">
              {rentalTypes.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setType(option.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      type === option.value 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50 hover:bg-secondary/50"
                    }`}
                  >
                    <Icon className={`w-8 h-8 ${type === option.value ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground text-center">{option.description}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep("details")}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {(isEditing || step !== "type") && (
          <Tabs value={step} onValueChange={(v) => setStep(v as typeof step)} className="w-full">
            {!isEditing && (
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Property Details</TabsTrigger>
                <TabsTrigger value="tenant">Tenant Info</TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                {(() => {
                  const config = rentalTypes.find(t => t.value === type);
                  const Icon = config?.icon || Building2;
                  return (
                    <>
                      <Icon className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">{config?.label} Property</span>
                    </>
                  );
                })()}
                {!isEditing && (
                  <Button variant="ghost" size="sm" onClick={() => setStep("type")} className="ml-auto">
                    Change
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Property Name *</Label>
                <Input
                  placeholder="e.g., Ground Floor Shop - Main Road"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </Label>
                <Textarea
                  placeholder="Full address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Rent (₹) *</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(e.target.value)}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Security Deposit (₹)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rent Due Day</Label>
                  <Select value={rentDueDay} onValueChange={setRentDueDay}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          Day {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as RentalStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={isPending}>
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                  </Button>
                </div>
              )}

              {!isEditing && (
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep("type")}>
                    Back
                  </Button>
                  <Button onClick={() => setStep("tenant")}>
                    Continue to Tenant Info
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tenant" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Add tenant information if this property is currently rented
              </p>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Tenant Name
                </Label>
                <Input
                  placeholder="Full name"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone
                  </Label>
                  <Input
                    type="tel"
                    placeholder="+91..."
                    value={tenantPhone}
                    onChange={(e) => setTenantPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={tenantEmail}
                    onChange={(e) => setTenantEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Lease Start
                  </Label>
                  <Input
                    type="date"
                    value={leaseStartDate}
                    onChange={(e) => setLeaseStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Lease End
                  </Label>
                  <Input
                    type="date"
                    value={leaseEndDate}
                    onChange={(e) => setLeaseEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep("details")}>
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={isPending}>
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Property"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
