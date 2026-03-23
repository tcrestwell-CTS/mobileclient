import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SendInviteLinkDialog } from "@/components/trips/SendInviteLinkDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Edit2,
  Mail,
  Phone,
  MapPin,
  Cake,
  Heart,
  Plane,
  Ship,
  Building,
  Shield,
  Utensils,
  Star,
  Tag,
  FileText,
  Copy,
  Trash2,
  X,
  Save,
  Loader2,
  Calendar,
  Users,
  DollarSign,
  ExternalLink,
  UserPlus,
  MoreHorizontal,
  Link2,
  ClipboardEdit,
  Send,
} from "lucide-react";
import { useClient, useDeleteClient, useUpdateClient } from "@/hooks/useClients";
import { PageBanner } from "@/components/layout/PageBanner";
import { useClientBookings } from "@/hooks/useBookings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanions, useDeleteCompanion, Companion } from "@/hooks/useCompanions";
import { useEmailLogs } from "@/hooks/useEmailLogs";
import { CompanionDialog } from "@/components/clients/CompanionDialog";
import { ClientMessagesPanel } from "@/components/clients/ClientMessagesPanel";
import { SendEmailDialog } from "@/components/clients/SendEmailDialog";
import { useState, useEffect } from "react";
import { format, differenceInYears, isPast, isFuture, isWithinInterval } from "date-fns";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ClientDetail = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading, error, refetch } = useClient(clientId!);
  const { bookings: clientBookings, loading: bookingsLoading } = useClientBookings(clientId);
  const { data: companions = [], isLoading: companionsLoading } = useCompanions(clientId);
  const { data: emailLogs = [], isLoading: emailLogsLoading, refetch: refetchEmailLogs } = useEmailLogs(clientId);
  const deleteCompanion = useDeleteCompanion();
  const deleteClient = useDeleteClient();
  const updateClient = useUpdateClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, string | null>>({});
  const [companionDialogOpen, setCompanionDialogOpen] = useState(false);
  const [editingCompanion, setEditingCompanion] = useState<Companion | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [isSendingPortalLink, setIsSendingPortalLink] = useState(false);
  const [isSendingUpdateLink, setIsSendingUpdateLink] = useState(false);

  const { data: hasPortalAccount } = useQuery({
    queryKey: ["portal-session-status", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_portal_sessions")
        .select("id")
        .eq("client_id", clientId!)
        .gt("expires_at", new Date().toISOString())
        .limit(1);
      return (data && data.length > 0) || false;
    },
    enabled: !!clientId,
  });

  const handleSendPortalLink = async () => {
    if (!client?.email) {
      toast.error("Client has no email address");
      return;
    }
    setIsSendingPortalLink(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-auth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action: "send-magic-link", email: client.email }),
        }
      );
      if (!res.ok) throw new Error("Failed to send");
      toast.success(`Portal access link sent to ${client.email}`);
    } catch {
      toast.error("Failed to send portal link");
    } finally {
      setIsSendingPortalLink(false);
    }
  };

  const handleSendUpdateLink = async () => {
    if (!client?.email) {
      toast.error("Client has no email address");
      return;
    }
    setIsSendingUpdateLink(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: "send-update-link", clientId: client.id }),
        }
      );
      if (!res.ok) throw new Error("Failed to send");
      toast.success(`Update info link sent to ${client.email}`);
    } catch {
      toast.error("Failed to send update link");
    } finally {
      setIsSendingUpdateLink(false);
    }
  };

  useEffect(() => {
    if (client) {
      setFormData({
        title: client.title || "",
        first_name: client.first_name || "",
        last_name: client.last_name || "",
        preferred_first_name: client.preferred_first_name || "",
        birthday: client.birthday || "",
        anniversary: client.anniversary || "",
        email: client.email || "",
        secondary_email: client.secondary_email || "",
        phone: client.phone || "",
        secondary_phone: client.secondary_phone || "",
        address_line_1: client.address_line_1 || "",
        address_line_2: client.address_line_2 || "",
        address_city: client.address_city || "",
        address_state: client.address_state || "",
        address_zip_code: client.address_zip_code || "",
        address_country: client.address_country || "",
        redress_number: client.redress_number || "",
        known_traveler_number: client.known_traveler_number || "",
        passport_info: client.passport_info || "",
        activities_interests: client.activities_interests || "",
        food_drink_allergies: client.food_drink_allergies || "",
        flight_seating_preference: client.flight_seating_preference || "no_preference",
        flight_bulkhead_preference: client.flight_bulkhead_preference || "no_preference",
        lodging_floor_preference: client.lodging_floor_preference || "no_preference",
        lodging_elevator_preference: client.lodging_elevator_preference || "no_preference",
        cruise_cabin_floor_preference: client.cruise_cabin_floor_preference || "no_preference",
        cruise_cabin_location_preference: client.cruise_cabin_location_preference || "no_preference",
        loyalty_programs: client.loyalty_programs || "",
        notes: client.notes || "",
        tags: client.tags || "",
        status: client.status || "lead",
        location: client.location || "",
      });
    }
  }, [client]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!client) return;
    
    const name = `${formData.first_name || ""} ${formData.last_name || ""}`.trim() || client.name;
    
    // Convert empty strings to null and handle sentinel values
    const cleanData: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(formData)) {
      if (key === "status") {
        cleanData[key] = value || "lead";
      } else if (typeof value === "string" && (value === "" || value === "no_preference")) {
        cleanData[key] = null;
      } else {
        cleanData[key] = value;
      }
    }

    // Build location from city/state
    const location = cleanData.address_city && cleanData.address_state
      ? `${cleanData.address_city}, ${cleanData.address_state}`
      : null;
    
    try {
      await updateClient.mutateAsync({
        id: client.id,
        name,
        ...cleanData,
        location,
      });
      await refetch();
      setIsEditing(false);
      toast.success("Client updated successfully");
    } catch (err) {
      toast.error("Failed to update client");
    }
  };

  const handleCancel = () => {
    if (client) {
      setFormData({
        title: client.title || "",
        first_name: client.first_name || "",
        last_name: client.last_name || "",
        preferred_first_name: client.preferred_first_name || "",
        birthday: client.birthday || "",
        anniversary: client.anniversary || "",
        email: client.email || "",
        secondary_email: client.secondary_email || "",
        phone: client.phone || "",
        secondary_phone: client.secondary_phone || "",
        address_line_1: client.address_line_1 || "",
        address_line_2: client.address_line_2 || "",
        address_city: client.address_city || "",
        address_state: client.address_state || "",
        address_zip_code: client.address_zip_code || "",
        address_country: client.address_country || "",
        redress_number: client.redress_number || "",
        known_traveler_number: client.known_traveler_number || "",
        passport_info: client.passport_info || "",
        activities_interests: client.activities_interests || "",
        food_drink_allergies: client.food_drink_allergies || "",
        flight_seating_preference: client.flight_seating_preference || "no_preference",
        flight_bulkhead_preference: client.flight_bulkhead_preference || "no_preference",
        lodging_floor_preference: client.lodging_floor_preference || "no_preference",
        lodging_elevator_preference: client.lodging_elevator_preference || "no_preference",
        cruise_cabin_floor_preference: client.cruise_cabin_floor_preference || "no_preference",
        cruise_cabin_location_preference: client.cruise_cabin_location_preference || "no_preference",
        loyalty_programs: client.loyalty_programs || "",
        notes: client.notes || "",
        tags: client.tags || "",
        status: client.status || "lead",
        location: client.location || "",
      });
    }
    setIsEditing(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return format(new Date(date), "MMMM d, yyyy");
  };

  const formatBirthdayWithAge = (birthday: string | null) => {
    if (!birthday) return null;
    const date = new Date(birthday);
    const age = differenceInYears(new Date(), date);
    return `${format(date, "MMMM d, yyyy")} (${age} years old)`;
  };

  const getPreferenceLabel = (value: string | null) => {
    if (!value || value === "no_preference") return "None";
    return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
  };

  const handleDelete = async () => {
    if (!client) return;
    await deleteClient.mutateAsync(client.id);
    navigate("/contacts");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !client) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-destructive font-medium">Client not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/contacts")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const fullName = client.title
    ? `${client.title} ${client.first_name || ""} ${client.last_name || ""}`.trim()
    : client.name;

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hasAddress =
    client.address_line_1 ||
    client.address_city ||
    client.address_state ||
    client.address_zip_code ||
    client.address_country;

  return (
    <DashboardLayout>
      <PageBanner
        title={
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-2xl font-semibold text-white">{initials}</span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-white tracking-tight">
                  {fullName}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  {!isEditing && (
                    <Badge
                      variant="secondary"
                      className={
                        client.status === "active"
                          ? "bg-white/20 text-white"
                          : client.status === "lead"
                          ? "bg-white/15 text-white/90"
                          : client.status === "traveling"
                          ? "bg-white/20 text-white"
                          : client.status === "traveled"
                          ? "bg-white/15 text-white/90"
                          : client.status === "cancelled"
                          ? "bg-white/10 text-white/70"
                          : "bg-white/10 text-white/70"
                      }
                    >
                      {client.status}
                    </Badge>
                   )}
                  {!isEditing && (
                    <Badge
                      variant="secondary"
                      className={
                        hasPortalAccount
                          ? "bg-emerald-500/30 text-white border border-emerald-400/40"
                          : "bg-white/10 text-white/60 border border-white/20"
                      }
                    >
                      {hasPortalAccount ? "CTS Client Portal: Active" : "CTS Client Portal: None"}
                    </Badge>
                  )}
                  {!isEditing && client.tags && (
                    <span className="text-sm text-white/70">{client.tags}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        }
      >
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} className="text-white border-white/30 hover:bg-white/10 hover:text-white">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateClient.isPending} className="bg-white/20 text-white hover:bg-white/30 border-white/30">
                {updateClient.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Client</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {fullName}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {client.email && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSendPortalLink}
                    disabled={isSendingPortalLink}
                    className="bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white"
                  >
                    {isSendingPortalLink ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-2 h-4 w-4" />
                    )}
                    Send Portal Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSendUpdateLink}
                    disabled={isSendingUpdateLink}
                    className="bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white"
                  >
                    {isSendingUpdateLink ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ClipboardEdit className="mr-2 h-4 w-4" />
                    )}
                    Request Info Update
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setEmailDialogOpen(true)}
                    className="bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email
                  </Button>
                  <SendInviteLinkDialog
                    defaultClientName={client.name}
                    defaultClientEmail={client.email}
                    trigger={
                      <Button
                        variant="outline"
                        className="bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Send Invite Link
                      </Button>
                    }
                  />
                </>
              )}
              <Button onClick={() => setIsEditing(true)} className="bg-white/20 text-white hover:bg-white/30 border-white/30">
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Client
              </Button>
            </>
          )}
        </div>
      </PageBanner>

      <div className="space-y-6">
        {/* Row 1: Personal Info + Contact + Address */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Select
                      value={formData.title || "none"}
                      onValueChange={(value) => handleChange("title", value === "none" ? "" : value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Title" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="Mr.">Mr.</SelectItem>
                        <SelectItem value="Mrs.">Mrs.</SelectItem>
                        <SelectItem value="Ms.">Ms.</SelectItem>
                        <SelectItem value="Dr.">Dr.</SelectItem>
                        <SelectItem value="Prof.">Prof.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">First Name</Label>
                    <Input
                      value={formData.first_name || ""}
                      onChange={(e) => handleChange("first_name", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Last Name</Label>
                    <Input
                      value={formData.last_name || ""}
                      onChange={(e) => handleChange("last_name", e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Preferred Name</Label>
                  <Input
                    value={formData.preferred_first_name || ""}
                    onChange={(e) => handleChange("preferred_first_name", e.target.value)}
                    placeholder="Goes by..."
                    className="h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      <Cake className="h-3 w-3" /> Birthday
                    </Label>
                    <Input
                      type="date"
                      value={formData.birthday || ""}
                      onChange={(e) => handleChange("birthday", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      <Heart className="h-3 w-3" /> Anniversary
                    </Label>
                    <Input
                      type="date"
                      value={formData.anniversary || ""}
                      onChange={(e) => handleChange("anniversary", e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <InfoRow
                  label="Legal Name"
                  value={`${client.first_name || ""} ${client.last_name || ""}`.trim() || client.name}
                />
                {client.preferred_first_name && (
                  <InfoRow label="Goes By" value={client.preferred_first_name} />
                )}
                <InfoRow
                  label="Birthday"
                  value={formatBirthdayWithAge(client.birthday)}
                  icon={<Cake className="h-4 w-4 text-muted-foreground" />}
                />
                <InfoRow
                  label="Anniversary"
                  value={formatDate(client.anniversary)}
                  icon={<Heart className="h-4 w-4 text-muted-foreground" />}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Primary Email
                  </Label>
                  <Input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Secondary Email
                  </Label>
                  <Input
                    type="email"
                    value={formData.secondary_email || ""}
                    onChange={(e) => handleChange("secondary_email", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Primary Phone
                  </Label>
                  <Input
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Secondary Phone
                  </Label>
                  <Input
                    type="tel"
                    value={formData.secondary_phone || ""}
                    onChange={(e) => handleChange("secondary_phone", e.target.value)}
                    className="h-9"
                  />
                </div>
              </>
            ) : (
              <>
                {client.email && (
                  <ContactRow
                    label="Primary Email"
                    value={client.email}
                    icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                    onCopy={() => copyToClipboard(client.email!, "Email")}
                  />
                )}
                {client.secondary_email && (
                  <ContactRow
                    label="Secondary Email"
                    value={client.secondary_email}
                    icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                    onCopy={() => copyToClipboard(client.secondary_email!, "Email")}
                  />
                )}
                {client.phone && (
                  <ContactRow
                    label="Primary Phone"
                    value={client.phone}
                    icon={<Phone className="h-4 w-4 text-muted-foreground" />}
                    onCopy={() => copyToClipboard(client.phone!, "Phone")}
                  />
                )}
                {client.secondary_phone && (
                  <ContactRow
                    label="Secondary Phone"
                    value={client.secondary_phone}
                    icon={<Phone className="h-4 w-4 text-muted-foreground" />}
                    onCopy={() => copyToClipboard(client.secondary_phone!, "Phone")}
                  />
                )}
                {!client.email && !client.phone && (
                  <p className="text-muted-foreground text-sm italic">No contact info added</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Address Line 1</Label>
                  <Input
                    value={formData.address_line_1 || ""}
                    onChange={(e) => handleChange("address_line_1", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Address Line 2</Label>
                  <Input
                    value={formData.address_line_2 || ""}
                    onChange={(e) => handleChange("address_line_2", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">City</Label>
                    <Input
                      value={formData.address_city || ""}
                      onChange={(e) => handleChange("address_city", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">State</Label>
                    <Input
                      value={formData.address_state || ""}
                      onChange={(e) => handleChange("address_state", e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">ZIP Code</Label>
                    <Input
                      value={formData.address_zip_code || ""}
                      onChange={(e) => handleChange("address_zip_code", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Country</Label>
                    <Input
                      value={formData.address_country || ""}
                      onChange={(e) => handleChange("address_country", e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            ) : hasAddress ? (
              <div className="text-sm space-y-1">
                {client.address_line_1 && <p>{client.address_line_1}</p>}
                {client.address_line_2 && <p>{client.address_line_2}</p>}
                <p>
                  {[client.address_city, client.address_state, client.address_zip_code]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {client.address_country && <p>{client.address_country}</p>}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">No address added</p>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Row 2: Secure Travel IDs + Interests & Preferences */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Secure Travel IDs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Secure Travel IDs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <Label className="text-xs">Redress Number</Label>
                  <Input
                    value={formData.redress_number || ""}
                    onChange={(e) => handleChange("redress_number", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Known Traveler Number</Label>
                  <Input
                    value={formData.known_traveler_number || ""}
                    onChange={(e) => handleChange("known_traveler_number", e.target.value)}
                    className="h-9"
                  />
                </div>
                <Separator />
                <div>
                  <Label className="text-xs">Passport Info</Label>
                  <Textarea
                    value={formData.passport_info || ""}
                    onChange={(e) => handleChange("passport_info", e.target.value)}
                    rows={3}
                    placeholder="Passport number, expiry, country..."
                  />
                </div>
              </>
            ) : (
              <>
                <InfoRow label="Redress Number" value={client.redress_number} />
                <InfoRow label="Known Traveler Number" value={client.known_traveler_number} />
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Passport(s)</p>
                  {client.passport_info ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {client.passport_info}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">None added</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Interests & Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <Label className="text-xs">Activities & Interests</Label>
                  <Textarea
                    value={formData.activities_interests || ""}
                    onChange={(e) => handleChange("activities_interests", e.target.value)}
                    rows={2}
                    placeholder="Hiking, museums, beaches..."
                  />
                </div>
                <Separator />
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Utensils className="h-3 w-3" /> Food, Drink & Allergies
                  </Label>
                  <Textarea
                    value={formData.food_drink_allergies || ""}
                    onChange={(e) => handleChange("food_drink_allergies", e.target.value)}
                    rows={2}
                    placeholder="Vegetarian, nut allergy..."
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium mb-1">Activities & Interests</p>
                  <p className="text-sm text-muted-foreground">
                    {client.activities_interests || "None at the moment."}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-1 flex items-center gap-2">
                    <Utensils className="h-4 w-4" />
                    Food, Drink & Allergies
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {client.food_drink_allergies || "None at the moment."}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Row 3: Travel Preferences + Loyalty Programs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Travel Preferences */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Travel Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    Flight Preferences
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Seating</Label>
                      <Select
                        value={formData.flight_seating_preference || "no_preference"}
                        onValueChange={(v) => handleChange("flight_seating_preference", v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_preference">No Preference</SelectItem>
                          <SelectItem value="window">Window</SelectItem>
                          <SelectItem value="aisle">Aisle</SelectItem>
                          <SelectItem value="middle">Middle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Bulkhead</Label>
                      <Select
                        value={formData.flight_bulkhead_preference || "no_preference"}
                        onValueChange={(v) => handleChange("flight_bulkhead_preference", v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_preference">No Preference</SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Lodging Preferences
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Floor</Label>
                      <Select
                        value={formData.lodging_floor_preference || "no_preference"}
                        onValueChange={(v) => handleChange("lodging_floor_preference", v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_preference">No Preference</SelectItem>
                          <SelectItem value="low">Low Floor</SelectItem>
                          <SelectItem value="high">High Floor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Elevator</Label>
                      <Select
                        value={formData.lodging_elevator_preference || "no_preference"}
                        onValueChange={(v) => handleChange("lodging_elevator_preference", v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_preference">No Preference</SelectItem>
                          <SelectItem value="near">Near Elevator</SelectItem>
                          <SelectItem value="far">Away from Elevator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Ship className="h-4 w-4" />
                    Cruise Preferences
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Cabin Floor</Label>
                      <Select
                        value={formData.cruise_cabin_floor_preference || "no_preference"}
                        onValueChange={(v) => handleChange("cruise_cabin_floor_preference", v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_preference">No Preference</SelectItem>
                          <SelectItem value="low">Low Deck</SelectItem>
                          <SelectItem value="mid">Mid Deck</SelectItem>
                          <SelectItem value="high">High Deck</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Location</Label>
                      <Select
                        value={formData.cruise_cabin_location_preference || "no_preference"}
                        onValueChange={(v) => handleChange("cruise_cabin_location_preference", v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_preference">No Preference</SelectItem>
                          <SelectItem value="forward">Forward</SelectItem>
                          <SelectItem value="midship">Midship</SelectItem>
                          <SelectItem value="aft">Aft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    Flight Preferences
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Seating:</span>{" "}
                      {getPreferenceLabel(client.flight_seating_preference)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bulkhead:</span>{" "}
                      {getPreferenceLabel(client.flight_bulkhead_preference)}
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Lodging Preferences
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Floor:</span>{" "}
                      {getPreferenceLabel(client.lodging_floor_preference)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Elevator:</span>{" "}
                      {getPreferenceLabel(client.lodging_elevator_preference)}
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Ship className="h-4 w-4" />
                    Cruise Preferences
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Cabin Floor:</span>{" "}
                      {getPreferenceLabel(client.cruise_cabin_floor_preference)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>{" "}
                      {getPreferenceLabel(client.cruise_cabin_location_preference)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Loyalty Programs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Loyalty Programs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={formData.loyalty_programs || ""}
                onChange={(e) => handleChange("loyalty_programs", e.target.value)}
                rows={4}
                placeholder="Delta SkyMiles: 1234567890&#10;Marriott Bonvoy: ABC123..."
              />
            ) : client.loyalty_programs ? (
              <p className="text-sm whitespace-pre-wrap">{client.loyalty_programs}</p>
            ) : (
              <p className="text-muted-foreground text-sm italic">No loyalty programs added</p>
            )}
          </CardContent>
        </Card>

        </div>

        {/* Notes - Full Width */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={4}
                placeholder="Additional notes about this client..."
              />
            ) : client.notes ? (
              <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
            ) : (
              <p className="text-muted-foreground text-sm italic">No notes added</p>
            )}
          </CardContent>
        </Card>

        {/* Booking History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Booking History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : clientBookings.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">No bookings yet</p>
            ) : (
              <div className="space-y-3">
                {/* Categorize bookings */}
                {(() => {
                  const today = new Date();
                  const upcoming = clientBookings.filter(b => 
                    isFuture(new Date(b.depart_date)) && b.status !== "cancelled"
                  );
                  const current = clientBookings.filter(b => {
                    const depart = new Date(b.depart_date);
                    const returnDate = new Date(b.return_date);
                    return isWithinInterval(today, { start: depart, end: returnDate }) && b.status !== "cancelled";
                  });
                  const past = clientBookings.filter(b => 
                    isPast(new Date(b.return_date)) && b.status !== "cancelled"
                  );
                  const cancelled = clientBookings.filter(b => b.status === "cancelled");

                  return (
                    <>
                      {current.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-primary flex items-center gap-2">
                            <Plane className="h-3.5 w-3.5" />
                            Currently Traveling
                          </h4>
                          {current.map(booking => (
                            <BookingHistoryItem key={booking.id} booking={booking} variant="current" />
                          ))}
                        </div>
                      )}
                      {upcoming.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground">Upcoming Trips</h4>
                          {upcoming.map(booking => (
                            <BookingHistoryItem key={booking.id} booking={booking} variant="upcoming" />
                          ))}
                        </div>
                      )}
                      {past.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground">Past Trips</h4>
                          {past.map(booking => (
                            <BookingHistoryItem key={booking.id} booking={booking} variant="past" />
                          ))}
                        </div>
                      )}
                      {cancelled.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground">Cancelled</h4>
                          {cancelled.map(booking => (
                            <BookingHistoryItem key={booking.id} booking={booking} variant="cancelled" />
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Travel Companions */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Travel Companions
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingCompanion(null);
                setCompanionDialogOpen(true);
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Companion
            </Button>
          </CardHeader>
          <CardContent>
            {companionsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : companions.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">No travel companions added</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {companions.map((companion) => (
                  <CompanionCard
                    key={companion.id}
                    companion={companion}
                    onEdit={() => {
                      setEditingCompanion(companion);
                      setCompanionDialogOpen(true);
                    }}
                    onDelete={() => {
                      if (clientId) {
                        deleteCompanion.mutate({ id: companion.id, clientId });
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Portal Messages & Email History - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ClientMessagesPanel clientId={clientId!} />

          {/* Email History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {emailLogsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : emailLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No emails sent to this client yet</p>
              ) : (
                <div className="space-y-2">
                  {emailLogs.map((log) => (
                    <EmailLogItem key={log.id} log={log} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Companion Dialog */}
      <CompanionDialog
        open={companionDialogOpen}
        onOpenChange={setCompanionDialogOpen}
        clientId={clientId!}
        companion={editingCompanion}
      />

      {/* Send Email Dialog */}
      {client.email && (
        <SendEmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          clientId={clientId!}
          clientName={fullName}
          clientEmail={client.email}
          onEmailSent={() => refetchEmailLogs()}
        />
      )}
    </DashboardLayout>
  );
};

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon}
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || "Unknown"}</p>
      </div>
    </div>
  );
}

function ContactRow({
  label,
  value,
  icon,
  onCopy,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium">{value}</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCopy}>
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}

import type { Booking } from "@/hooks/useBookings";

function BookingHistoryItem({
  booking,
  variant,
}: {
  booking: Booking;
  variant: "current" | "upcoming" | "past" | "cancelled";
}) {
  const navigate = useNavigate();
  
  const getStatusColor = () => {
    switch (variant) {
      case "current":
        return "bg-primary/10 text-primary border-primary/20";
      case "upcoming":
        return "bg-accent/10 text-accent border-accent/20";
      case "past":
        return "bg-muted text-muted-foreground border-border";
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20 opacity-60";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div
      onClick={() => navigate(`/bookings/${booking.id}`)}
      className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${getStatusColor()}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">
              {booking.trip_name || booking.destination}
            </span>
            <Badge variant="outline" className="text-xs shrink-0">
              {booking.booking_reference}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(booking.depart_date), "MMM d")} - {format(new Date(booking.return_date), "MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {booking.travelers} {booking.travelers === 1 ? "traveler" : "travelers"}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {formatCurrency(booking.total_amount)}
            </span>
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
      </div>
    </div>
  );
}

function CompanionCard({
  companion,
  onEdit,
  onDelete,
}: {
  companion: Companion;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const getRelationshipLabel = (rel: string) => {
    return rel.charAt(0).toUpperCase() + rel.slice(1);
  };

  const formatBirthday = (birthday: string | null) => {
    if (!birthday) return null;
    const date = new Date(birthday);
    const age = differenceInYears(new Date(), date);
    return `${format(date, "MMM d, yyyy")} (${age} years)`;
  };

  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {companion.first_name} {companion.last_name || ""}
            </span>
            <Badge variant="outline" className="text-xs">
              {getRelationshipLabel(companion.relationship)}
            </Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
            {companion.birthday && (
              <p className="flex items-center gap-1">
                <Cake className="h-3 w-3" />
                {formatBirthday(companion.birthday)}
              </p>
            )}
            {companion.email && (
              <p className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {companion.email}
              </p>
            )}
            {companion.phone && (
              <p className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {companion.phone}
              </p>
            )}
            {companion.known_traveler_number && (
              <p className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                KTN: {companion.known_traveler_number}
              </p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Companion?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove {companion.first_name} {companion.last_name || ""}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

import type { EmailLog } from "@/hooks/useEmailLogs";

function EmailLogItem({ log }: { log: EmailLog }) {
  const getTemplateLabel = (template: string) => {
    const labels: Record<string, string> = {
      custom: "Custom Message",
      welcome: "Welcome Email",
      quote: "Quote",
      itinerary: "Itinerary",
      booking_confirmation: "Booking Confirmation",
      trip_completed: "Trip Completed",
    };
    return labels[template] || template;
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{log.subject}</span>
          <Badge variant="outline" className="text-xs shrink-0">
            {getTemplateLabel(log.template)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>To: {log.to_email}</span>
          <span>•</span>
          <span>{format(new Date(log.sent_at), "MMM d, yyyy 'at' h:mm a")}</span>
        </div>
      </div>
      <Badge 
        variant="secondary" 
        className={log.status === "sent" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}
      >
        {log.status}
      </Badge>
    </div>
  );
}

export default ClientDetail;
