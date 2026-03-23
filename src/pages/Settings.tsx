import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Shield, CreditCard, Link2, Loader2, TrendingUp, Percent, Building2, Settings2, Columns3 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { Skeleton } from "@/components/ui/skeleton";
import { getTierConfig } from "@/lib/commissionTiers";
import { QBOIntegrationCard } from "@/components/settings/QBOIntegrationCard";
import { StripeConnectCard } from "@/components/settings/StripeConnectCard";
import { AgencySettingsTab } from "@/components/settings/AgencySettingsTab";
import { TripStatusesSettings } from "@/components/settings/TripStatusesSettings";
import { usePermissions } from "@/hooks/usePermissions";

const Settings = () => {
  const { profile, loading, saving, saveProfile, uploadAvatar, userEmail } = useProfile();
  const { preferences, loading: notifLoading, updatePreference } = useNotificationPreferences();
  const { isAdmin } = usePermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    job_title: "",
    agency_name: "",
    commission_rate: 10,
    clia_number: "",
    ccra_number: "",
    asta_number: "",
    embarc_number: "",
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name,
        phone: profile.phone,
        job_title: profile.job_title,
        agency_name: profile.agency_name,
        commission_rate: profile.commission_rate,
        clia_number: profile.clia_number,
        ccra_number: profile.ccra_number,
        asta_number: profile.asta_number,
        embarc_number: profile.embarc_number,
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await saveProfile(formData);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAvatar(file);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Link2 className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="statuses" className="gap-2">
            <Columns3 className="h-4 w-4" />
            Statuses
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="agency" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Agency
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-6">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      accept="image/*"
                      className="hidden"
                    />
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Avatar"
                        className="h-20 w-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-2xl font-semibold text-primary">
                          {getInitials(formData.full_name)}
                        </span>
                      </div>
                    )}
                    <Button variant="outline" onClick={handleAvatarClick}>
                      Change Photo
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange("full_name", e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userEmail}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email is managed through your authentication provider
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agency">Agency Name</Label>
                    <Input
                      id="agency"
                      value={formData.agency_name}
                      onChange={(e) => handleInputChange("agency_name", e.target.value)}
                      placeholder="Your agency name"
                    />
                  </div>

                  {/* Certification Numbers */}
                  <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-4">
                    <h3 className="font-medium text-card-foreground">Certification Numbers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="clia">CLIA #</Label>
                        <Input
                          id="clia"
                          value={formData.clia_number}
                          onChange={(e) => handleInputChange("clia_number", e.target.value)}
                          placeholder="e.g. 00048158"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ccra">CCRA #</Label>
                        <Input
                          id="ccra"
                          value={formData.ccra_number}
                          onChange={(e) => handleInputChange("ccra_number", e.target.value)}
                          placeholder="e.g. 99933757"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="asta">ASTA #</Label>
                        <Input
                          id="asta"
                          value={formData.asta_number}
                          onChange={(e) => handleInputChange("asta_number", e.target.value)}
                          placeholder="e.g. 900391006"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="embarc">Embarc ID</Label>
                        <Input
                          id="embarc"
                          value={formData.embarc_number}
                          onChange={(e) => handleInputChange("embarc_number", e.target.value)}
                          placeholder="e.g. EMB-12345"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      These will be displayed on shared trip pages alongside your advisor card.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title</Label>
                    <Input
                      id="title"
                      value={formData.job_title}
                      onChange={(e) => handleInputChange("job_title", e.target.value)}
                      placeholder="Travel Agent"
                    />
                  </div>

                  {/* Commission Tier Info - Read Only */}
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <h3 className="font-medium text-card-foreground">Your Commission Tier</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-background rounded-lg p-3 border">
                        <p className="text-xs text-muted-foreground mb-1">Tier Level</p>
                        <p className="text-lg font-semibold text-foreground">
                          {getTierConfig(profile.commission_tier).label}
                        </p>
                      </div>
                      <div className="bg-background rounded-lg p-3 border">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Percent className="h-3 w-3" />
                          Your Commission
                        </div>
                        <p className="text-lg font-semibold text-success">
                          {getTierConfig(profile.commission_tier).agentSplit}%
                        </p>
                      </div>
                      <div className="bg-background rounded-lg p-3 border">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Building2 className="h-3 w-3" />
                          Agency Split
                        </div>
                        <p className="text-lg font-semibold text-foreground">
                          {getTierConfig(profile.commission_tier).agencySplit}%
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Your commission tier determines how booking commissions are split between you and the agency.
                      Contact an administrator if you believe your tier should be changed.
                    </p>
                  </div>

                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {notifLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-11 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-card-foreground">
                        New Booking Alerts
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when a new booking is made
                      </p>
                    </div>
                    <Switch 
                      checked={preferences.new_booking_alerts}
                      onCheckedChange={(checked) => updatePreference("new_booking_alerts", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-card-foreground">
                        Commission Updates
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Notifications about commission payments
                      </p>
                    </div>
                    <Switch 
                      checked={preferences.commission_updates}
                      onCheckedChange={(checked) => updatePreference("commission_updates", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-card-foreground">
                        Client Messages
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Get notified about new client inquiries
                      </p>
                    </div>
                    <Switch 
                      checked={preferences.client_messages}
                      onCheckedChange={(checked) => updatePreference("client_messages", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-card-foreground">
                        Training Reminders
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Reminders about incomplete courses
                      </p>
                    </div>
                    <Switch 
                      checked={preferences.training_reminders}
                      onCheckedChange={(checked) => updatePreference("training_reminders", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-card-foreground">
                        Marketing Emails
                      </p>
                      <p className="text-sm text-muted-foreground">
                        News, tips, and promotional content
                      </p>
                    </div>
                    <Switch 
                      checked={preferences.marketing_emails}
                      onCheckedChange={(checked) => updatePreference("marketing_emails", checked)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your password and security options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
                <Button>Update Password</Button>
              </div>

              <div className="pt-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-card-foreground">
                      Two-Factor Authentication
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
              <CardDescription>
                Manage your subscription and payment methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-card-foreground">
                      Professional Plan
                    </p>
                    <p className="text-sm text-muted-foreground">
                      $49/month • Billed monthly
                    </p>
                  </div>
                  <Button variant="outline">Change Plan</Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-card-foreground">
                  Payment Method
                </h4>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-14 rounded bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center text-white text-xs font-bold">
                      VISA
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">
                        •••• •••• •••• 4242
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Expires 12/2027
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Update
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Connected Integrations</CardTitle>
              <CardDescription>
                Manage your third-party connections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-bold">S</span>
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">
                      Sabre GDS
                    </p>
                    <p className="text-sm text-muted-foreground">Connected</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Disconnect
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 font-bold">A</span>
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">
                      Amadeus
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Not connected
                    </p>
                  </div>
                </div>
                <Button size="sm">Connect</Button>
              </div>

              <StripeConnectCard />
              <QBOIntegrationCard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statuses">
          <TripStatusesSettings />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="agency">
            <AgencySettingsTab />
          </TabsContent>
        )}
      </Tabs>
    </DashboardLayout>
  );
};

export default Settings;
