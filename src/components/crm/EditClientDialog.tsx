import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateClient, Client } from "@/hooks/useClients";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditClientDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditClientDialog({ client, open, onOpenChange }: EditClientDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    first_name: "",
    last_name: "",
    preferred_first_name: "",
    birthday: "",
    anniversary: "",
    email: "",
    secondary_email: "",
    phone: "",
    secondary_phone: "",
    address_line_1: "",
    address_line_2: "",
    address_city: "",
    address_state: "",
    address_zip_code: "",
    address_country: "",
    redress_number: "",
    known_traveler_number: "",
    passport_info: "",
    activities_interests: "",
    food_drink_allergies: "",
    flight_seating_preference: "",
    flight_bulkhead_preference: "",
    lodging_floor_preference: "",
    lodging_elevator_preference: "",
    cruise_cabin_floor_preference: "",
    cruise_cabin_location_preference: "",
    loyalty_programs: "",
    tags: "",
    status: "lead",
    notes: "",
  });

  const updateClient = useUpdateClient();

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
        flight_seating_preference: client.flight_seating_preference || "",
        flight_bulkhead_preference: client.flight_bulkhead_preference || "",
        lodging_floor_preference: client.lodging_floor_preference || "",
        lodging_elevator_preference: client.lodging_elevator_preference || "",
        cruise_cabin_floor_preference: client.cruise_cabin_floor_preference || "",
        cruise_cabin_location_preference: client.cruise_cabin_location_preference || "",
        loyalty_programs: client.loyalty_programs || "",
        tags: client.tags || "",
        status: client.status || "lead",
        notes: client.notes || "",
      });
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    
    const name = `${formData.first_name} ${formData.last_name}`.trim() || client.name;

    await updateClient.mutateAsync({
      id: client.id,
      name,
      title: formData.title || null,
      first_name: formData.first_name || null,
      last_name: formData.last_name || null,
      preferred_first_name: formData.preferred_first_name || null,
      birthday: formData.birthday || null,
      anniversary: formData.anniversary || null,
      email: formData.email || null,
      secondary_email: formData.secondary_email || null,
      phone: formData.phone || null,
      secondary_phone: formData.secondary_phone || null,
      address_line_1: formData.address_line_1 || null,
      address_line_2: formData.address_line_2 || null,
      address_city: formData.address_city || null,
      address_state: formData.address_state || null,
      address_zip_code: formData.address_zip_code || null,
      address_country: formData.address_country || null,
      redress_number: formData.redress_number || null,
      known_traveler_number: formData.known_traveler_number || null,
      passport_info: formData.passport_info || null,
      activities_interests: formData.activities_interests || null,
      food_drink_allergies: formData.food_drink_allergies || null,
      flight_seating_preference: formData.flight_seating_preference || null,
      flight_bulkhead_preference: formData.flight_bulkhead_preference || null,
      lodging_floor_preference: formData.lodging_floor_preference || null,
      lodging_elevator_preference: formData.lodging_elevator_preference || null,
      cruise_cabin_floor_preference: formData.cruise_cabin_floor_preference || null,
      cruise_cabin_location_preference: formData.cruise_cabin_location_preference || null,
      loyalty_programs: formData.loyalty_programs || null,
      tags: formData.tags || null,
      status: formData.status,
      notes: formData.notes || null,
      location: formData.address_city && formData.address_state 
        ? `${formData.address_city}, ${formData.address_state}` 
        : null,
    });

    // Check if status changed from lead to active — offer trip creation
    const wasLead = client.status === "lead";
    const nowActive = formData.status === "active";

    onOpenChange(false);

    if (wasLead && nowActive) {
      // Small delay so dialog closes first
      setTimeout(() => {
        const createTrip = window.confirm(
          `${name} has been converted to an active client. Would you like to create a trip for them?`
        );
        if (createTrip) {
          // Navigate to trips page with client pre-selected
          window.location.href = `/trips?newTrip=true&clientId=${client.id}&clientName=${encodeURIComponent(name)}`;
        }
      }, 300);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client information and travel preferences.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="personal" className="mt-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="travel-ids">Travel IDs</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="other">Other</TabsTrigger>
            </TabsList>
            
            <ScrollArea className="h-[400px] pr-4">
              {/* Personal Information Tab */}
              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Select
                      value={formData.title}
                      onValueChange={(value) => updateField("title", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Title" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mr.">Mr.</SelectItem>
                        <SelectItem value="Mrs.">Mrs.</SelectItem>
                        <SelectItem value="Ms.">Ms.</SelectItem>
                        <SelectItem value="Dr.">Dr.</SelectItem>
                        <SelectItem value="Mx.">Mx.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => updateField("first_name", e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="grid gap-2 col-span-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => updateField("last_name", e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="preferred_first_name">Preferred First Name</Label>
                  <Input
                    id="preferred_first_name"
                    value={formData.preferred_first_name}
                    onChange={(e) => updateField("preferred_first_name", e.target.value)}
                    placeholder="Johnny"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="birthday">Birthday</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => updateField("birthday", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="anniversary">Anniversary</Label>
                    <Input
                      id="anniversary"
                      type="date"
                      value={formData.anniversary}
                      onChange={(e) => updateField("anniversary", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => updateField("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Contact Information Tab */}
              <TabsContent value="contact" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Email Addresses</h4>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Primary Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="secondary_email">Secondary Email</Label>
                    <Input
                      id="secondary_email"
                      type="email"
                      value={formData.secondary_email}
                      onChange={(e) => updateField("secondary_email", e.target.value)}
                      placeholder="john.work@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Phone Numbers</h4>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Primary Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="secondary_phone">Secondary Phone</Label>
                    <Input
                      id="secondary_phone"
                      value={formData.secondary_phone}
                      onChange={(e) => updateField("secondary_phone", e.target.value)}
                      placeholder="+1 (555) 987-6543"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Address</h4>
                  <div className="grid gap-2">
                    <Label htmlFor="address_line_1">Address Line 1</Label>
                    <Input
                      id="address_line_1"
                      value={formData.address_line_1}
                      onChange={(e) => updateField("address_line_1", e.target.value)}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address_line_2">Address Line 2</Label>
                    <Input
                      id="address_line_2"
                      value={formData.address_line_2}
                      onChange={(e) => updateField("address_line_2", e.target.value)}
                      placeholder="Apt 4B"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="address_city">City</Label>
                      <Input
                        id="address_city"
                        value={formData.address_city}
                        onChange={(e) => updateField("address_city", e.target.value)}
                        placeholder="New York"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="address_state">State</Label>
                      <Input
                        id="address_state"
                        value={formData.address_state}
                        onChange={(e) => updateField("address_state", e.target.value)}
                        placeholder="NY"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="address_zip_code">ZIP Code</Label>
                      <Input
                        id="address_zip_code"
                        value={formData.address_zip_code}
                        onChange={(e) => updateField("address_zip_code", e.target.value)}
                        placeholder="10001"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="address_country">Country</Label>
                      <Input
                        id="address_country"
                        value={formData.address_country}
                        onChange={(e) => updateField("address_country", e.target.value)}
                        placeholder="United States"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Travel IDs Tab */}
              <TabsContent value="travel-ids" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Secure Travel IDs</h4>
                  <div className="grid gap-2">
                    <Label htmlFor="redress_number">Redress Number</Label>
                    <Input
                      id="redress_number"
                      value={formData.redress_number}
                      onChange={(e) => updateField("redress_number", e.target.value)}
                      placeholder="Enter redress number"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="known_traveler_number">Known Traveler Number (TSA PreCheck/Global Entry)</Label>
                    <Input
                      id="known_traveler_number"
                      value={formData.known_traveler_number}
                      onChange={(e) => updateField("known_traveler_number", e.target.value)}
                      placeholder="Enter known traveler number"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Passport Information</h4>
                  <div className="grid gap-2">
                    <Label htmlFor="passport_info">Passport Details</Label>
                    <Textarea
                      id="passport_info"
                      value={formData.passport_info}
                      onChange={(e) => updateField("passport_info", e.target.value)}
                      placeholder="Passport number, issuing country, expiration date..."
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Preferences Tab */}
              <TabsContent value="preferences" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Activities & Interests</h4>
                  <div className="grid gap-2">
                    <Label htmlFor="activities_interests">Activities & Interests</Label>
                    <Textarea
                      id="activities_interests"
                      value={formData.activities_interests}
                      onChange={(e) => updateField("activities_interests", e.target.value)}
                      placeholder="Beach, adventure sports, cultural tours, wine tasting..."
                      rows={2}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Food, Drink & Allergy Preferences</h4>
                  <div className="grid gap-2">
                    <Label htmlFor="food_drink_allergies">Dietary Requirements & Allergies</Label>
                    <Textarea
                      id="food_drink_allergies"
                      value={formData.food_drink_allergies}
                      onChange={(e) => updateField("food_drink_allergies", e.target.value)}
                      placeholder="Vegetarian, nut allergy, gluten-free..."
                      rows={2}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Flight Preferences</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="flight_seating_preference">Seating Preference</Label>
                      <Select
                        value={formData.flight_seating_preference}
                        onValueChange={(value) => updateField("flight_seating_preference", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select preference" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="window">Window</SelectItem>
                          <SelectItem value="aisle">Aisle</SelectItem>
                          <SelectItem value="middle">Middle</SelectItem>
                          <SelectItem value="no_preference">No Preference</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="flight_bulkhead_preference">Bulkhead Preference</Label>
                      <Select
                        value={formData.flight_bulkhead_preference}
                        onValueChange={(value) => updateField("flight_bulkhead_preference", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select preference" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prefer">Prefer Bulkhead</SelectItem>
                          <SelectItem value="avoid">Avoid Bulkhead</SelectItem>
                          <SelectItem value="no_preference">No Preference</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Lodging Preferences</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="lodging_floor_preference">Floor Preference</Label>
                      <Select
                        value={formData.lodging_floor_preference}
                        onValueChange={(value) => updateField("lodging_floor_preference", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select preference" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High Floor</SelectItem>
                          <SelectItem value="low">Low Floor</SelectItem>
                          <SelectItem value="ground">Ground Floor</SelectItem>
                          <SelectItem value="no_preference">No Preference</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lodging_elevator_preference">Elevator Proximity</Label>
                      <Select
                        value={formData.lodging_elevator_preference}
                        onValueChange={(value) => updateField("lodging_elevator_preference", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select preference" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="near">Near Elevator</SelectItem>
                          <SelectItem value="away">Away from Elevator</SelectItem>
                          <SelectItem value="no_preference">No Preference</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Cruise Preferences</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="cruise_cabin_floor_preference">Cabin Floor</Label>
                      <Select
                        value={formData.cruise_cabin_floor_preference}
                        onValueChange={(value) => updateField("cruise_cabin_floor_preference", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select preference" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High Deck</SelectItem>
                          <SelectItem value="mid">Mid Deck</SelectItem>
                          <SelectItem value="low">Low Deck</SelectItem>
                          <SelectItem value="no_preference">No Preference</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="cruise_cabin_location_preference">Cabin Location</Label>
                      <Select
                        value={formData.cruise_cabin_location_preference}
                        onValueChange={(value) => updateField("cruise_cabin_location_preference", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select preference" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="forward">Forward</SelectItem>
                          <SelectItem value="midship">Midship</SelectItem>
                          <SelectItem value="aft">Aft</SelectItem>
                          <SelectItem value="no_preference">No Preference</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Other Tab */}
              <TabsContent value="other" className="space-y-4 mt-4">
                <div className="grid gap-2">
                  <Label htmlFor="loyalty_programs">Loyalty Programs</Label>
                  <Textarea
                    id="loyalty_programs"
                    value={formData.loyalty_programs}
                    onChange={(e) => updateField("loyalty_programs", e.target.value)}
                    placeholder="Delta SkyMiles #12345, Marriott Bonvoy #67890..."
                    rows={2}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => updateField("tags", e.target.value)}
                    placeholder="VIP, Family, Business..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    placeholder="Any additional notes about this client..."
                    rows={4}
                  />
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateClient.isPending}>
              {updateClient.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
