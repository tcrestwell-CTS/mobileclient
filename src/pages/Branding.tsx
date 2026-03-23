import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, Palette, FileText, Eye, Upload, Send, Image, Loader2 } from "lucide-react";
import { useBrandingSettings } from "@/hooks/useBrandingSettings";
import { useSendEmail } from "@/hooks/useSendEmail";
import { toast } from "sonner";


type EmailTemplate = "welcome" | "booking_confirmation" | "itinerary" | "quote";

const Branding = () => {
  const { settings, loading, saving, saveSettings, uploadLogo } = useBrandingSettings();
  const { sendTestEmail, sending } = useSendEmail();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>("welcome");
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local form state
  const [brandForm, setBrandForm] = useState({
    agency_name: settings.agency_name,
    tagline: settings.tagline,
    primary_color: settings.primary_color,
    accent_color: settings.accent_color,
  });

  const [contactForm, setContactForm] = useState({
    email_address: settings.email_address,
    phone: settings.phone,
    address: settings.address,
    website: settings.website,
    instagram: settings.instagram,
    facebook: settings.facebook,
    from_email: settings.from_email,
    from_name: settings.from_name,
  });

  // Update form when settings load
  useState(() => {
    setBrandForm({
      agency_name: settings.agency_name,
      tagline: settings.tagline,
      primary_color: settings.primary_color,
      accent_color: settings.accent_color,
    });
    setContactForm({
      email_address: settings.email_address,
      phone: settings.phone,
      address: settings.address,
      website: settings.website,
      instagram: settings.instagram,
      facebook: settings.facebook,
      from_email: settings.from_email,
      from_name: settings.from_name,
    });
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2MB");
      return;
    }

    setUploading(true);
    await uploadLogo(file);
    setUploading(false);
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      toast.error("Please enter an email address");
      return;
    }

    const success = await sendTestEmail(testEmailAddress, selectedTemplate);
    if (success) {
      setTestDialogOpen(false);
      setTestEmailAddress("");
    }
  };

  const handleSaveBrandSettings = async () => {
    await saveSettings(brandForm);
  };

  const handleSaveContactInfo = async () => {
    await saveSettings(contactForm);
  };

  const templateInfo: Record<EmailTemplate, { title: string; description: string }> = {
    welcome: { title: "Welcome Email", description: "New client onboarding" },
    booking_confirmation: { title: "Booking Confirmation", description: "Sent after booking" },
    itinerary: { title: "Travel Itinerary", description: "Trip details & schedule" },
    quote: { title: "Quote Proposal", description: "Price estimates" },
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Email & Branding</h1>
        <p className="text-muted-foreground text-sm mt-1">Customize your communications and brand identity</p>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="templates" className="gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Brand Settings
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template List */}
            <div className="space-y-4">
              {(Object.keys(templateInfo) as EmailTemplate[]).map((template) => (
                <Card
                  key={template}
                  className={selectedTemplate === template ? "ring-2 ring-primary" : ""}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{templateInfo[template].title}</CardTitle>
                    <CardDescription>{templateInfo[template].description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Email Editor Preview */}
            <div className="lg:col-span-2 bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-card-foreground">
                    Email Preview - {templateInfo[selectedTemplate].title}
                  </h3>
                  <div className="flex gap-2">
                    <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Send className="h-4 w-4" />
                          Send Test
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Send Test Email</DialogTitle>
                          <DialogDescription>
                            Send a test "{templateInfo[selectedTemplate].title}" email to preview how it looks.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label htmlFor="test-email">Email Address</Label>
                            <Input
                              id="test-email"
                              type="email"
                              placeholder="your@email.com"
                              value={testEmailAddress}
                              onChange={(e) => setTestEmailAddress(e.target.value)}
                            />
                          </div>
                          <Button
                            className="w-full"
                            onClick={handleSendTestEmail}
                            disabled={sending}
                          >
                            {sending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Send Test Email
                              </>
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <div className="max-w-lg mx-auto bg-background rounded-lg border border-border p-8">
                  <div className="text-center mb-8">
                    {settings.logo_url ? (
                      <img
                        src={settings.logo_url}
                        alt={settings.agency_name}
                        className="max-h-16 mx-auto mb-4"
                      />
                    ) : (
                      <div className="inline-flex items-center gap-2 mb-4">
                        <span className="text-xl font-semibold text-foreground">
                          {settings.agency_name}
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedTemplate === "welcome" && (
                    <>
                      <h2 className="text-xl font-semibold text-foreground mb-4">
                        Welcome Aboard! 🌍
                      </h2>
                      <p className="text-muted-foreground mb-4">Dear [Client Name],</p>
                      <p className="text-muted-foreground mb-4">
                        Thank you for choosing {settings.agency_name} for your upcoming
                        adventure. We're thrilled to help you create unforgettable
                        travel memories.
                      </p>
                      <p className="text-muted-foreground mb-6">
                        Your dedicated travel consultant is ready to craft the
                        perfect itinerary for you.
                      </p>
                      <Button className="w-full">Get Started</Button>
                    </>
                  )}

                  {selectedTemplate === "booking_confirmation" && (
                    <>
                      <h2 className="text-xl font-semibold text-foreground mb-4">
                        Booking Confirmed! ✈️
                      </h2>
                      <p className="text-muted-foreground mb-4">Dear [Client Name],</p>
                      <p className="text-muted-foreground mb-4">
                        Great news! Your booking has been confirmed. Here are your trip details:
                      </p>
                      <div className="bg-muted/50 p-4 rounded-lg mb-4">
                        <p className="text-sm mb-2"><strong>Destination:</strong> Paris, France</p>
                        <p className="text-sm mb-2"><strong>Dates:</strong> March 15-22, 2025</p>
                        <p className="text-sm"><strong>Reference:</strong> CTS-2025-001</p>
                      </div>
                      <p className="text-muted-foreground">
                        We'll send you your detailed itinerary soon.
                      </p>
                    </>
                  )}

                  {selectedTemplate === "itinerary" && (
                    <>
                      <h2 className="text-xl font-semibold text-foreground mb-4">
                        Your Travel Itinerary 📋
                      </h2>
                      <p className="text-muted-foreground mb-4">Dear [Client Name],</p>
                      <p className="text-muted-foreground mb-4">
                        Please find your detailed travel itinerary below.
                      </p>
                      <div className="bg-muted/50 p-4 rounded-lg mb-4">
                        <p className="text-sm mb-2"><strong>Trip:</strong> European Adventure</p>
                        <p className="text-sm"><strong>Duration:</strong> 7 nights</p>
                      </div>
                      <p className="text-muted-foreground">
                        Have questions? Don't hesitate to reach out!
                      </p>
                    </>
                  )}

                  {selectedTemplate === "quote" && (
                    <>
                      <h2 className="text-xl font-semibold text-foreground mb-4">
                        Your Travel Quote 💼
                      </h2>
                      <p className="text-muted-foreground mb-4">Dear [Client Name],</p>
                      <p className="text-muted-foreground mb-4">
                        Thank you for your interest! Here's a personalized quote for your trip:
                      </p>
                      <div className="bg-muted/50 p-4 rounded-lg mb-4">
                        <p className="text-sm mb-2"><strong>Destination:</strong> Paris, France</p>
                        <p className="text-sm mb-2"><strong>Estimated Cost:</strong> $4,500</p>
                        <p className="text-sm"><strong>Valid Until:</strong> 14 days</p>
                      </div>
                      <Button className="w-full" variant="secondary">Accept Quote</Button>
                    </>
                  )}

                  <div className="mt-6 pt-6 border-t border-border text-center">
                    <p className="text-sm text-muted-foreground">{settings.agency_name}</p>
                    {settings.tagline && (
                      <p className="text-xs text-muted-foreground italic">{settings.tagline}</p>
                    )}
                    {settings.phone && (
                      <p className="text-xs text-muted-foreground mt-1">📞 {settings.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Brand Identity</CardTitle>
                <CardDescription>
                  Customize your agency's visual identity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Agency Logo</Label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                  />
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                      </div>
                    ) : settings.logo_url ? (
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={settings.logo_url}
                          alt="Logo"
                          className="max-h-16 mb-2"
                        />
                        <p className="text-sm text-muted-foreground">
                          Click to change logo
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                          <Image className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="text-sm">
                          <span className="text-primary font-medium">
                            Upload logo
                          </span>{" "}
                          <span className="text-muted-foreground">
                            or drag and drop
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG or SVG up to 2MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agency-name">Agency Name</Label>
                  <Input
                    id="agency-name"
                    value={brandForm.agency_name}
                    onChange={(e) => setBrandForm({ ...brandForm, agency_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={brandForm.tagline}
                    onChange={(e) => setBrandForm({ ...brandForm, tagline: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandForm.primary_color}
                        onChange={(e) => setBrandForm({ ...brandForm, primary_color: e.target.value })}
                        className="h-10 w-10 rounded-lg border-0 cursor-pointer"
                      />
                      <Input
                        value={brandForm.primary_color}
                        onChange={(e) => setBrandForm({ ...brandForm, primary_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandForm.accent_color}
                        onChange={(e) => setBrandForm({ ...brandForm, accent_color: e.target.value })}
                        className="h-10 w-10 rounded-lg border-0 cursor-pointer"
                      />
                      <Input
                        value={brandForm.accent_color}
                        onChange={(e) => setBrandForm({ ...brandForm, accent_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <Button className="w-full" onClick={handleSaveBrandSettings} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Brand Settings"
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Sender Settings</CardTitle>
                <CardDescription>
                  Configure the "From" address for outgoing emails (requires verified domain)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="from-email">From Email Address</Label>
                  <Input
                    id="from-email"
                    type="email"
                    placeholder="hello@crestwellgetaways.com"
                    value={contactForm.from_email}
                    onChange={(e) => setContactForm({ ...contactForm, from_email: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must use your verified domain (e.g., hello@yourdomain.com)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="from-name">From Name</Label>
                  <Input
                    id="from-name"
                    placeholder="Crestwell Travel Services"
                    value={contactForm.from_name}
                    onChange={(e) => setContactForm({ ...contactForm, from_name: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Display name shown to recipients (defaults to agency name)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  Details shown in client communications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactForm.email_address}
                    onChange={(e) => setContactForm({ ...contactForm, email_address: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Textarea
                    id="address"
                    value={contactForm.address}
                    onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={contactForm.website}
                    onChange={(e) => setContactForm({ ...contactForm, website: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      value={contactForm.instagram}
                      onChange={(e) => setContactForm({ ...contactForm, instagram: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input
                      id="facebook"
                      value={contactForm.facebook}
                      onChange={(e) => setContactForm({ ...contactForm, facebook: e.target.value })}
                    />
                  </div>
                </div>

                <Button className="w-full" onClick={handleSaveContactInfo} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Update Contact Info"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-card-foreground mb-1">
                    Terms & Conditions
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Booking policies and terms
                  </p>
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <Upload className="h-4 w-4" />
                    Upload New
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="font-semibold text-card-foreground mb-1">
                    Travel Insurance Info
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Insurance options & details
                  </p>
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <Upload className="h-4 w-4" />
                    Upload New
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-xl bg-success/10 flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-success" />
                  </div>
                  <h3 className="font-semibold text-card-foreground mb-1">
                    Client Questionnaire
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Travel preference form
                  </p>
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <Upload className="h-4 w-4" />
                    Upload New
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Branding;
