import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Eye,
  Copy,
  ExternalLink,
  ImagePlus,
  Link,
  X,
  Loader2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  GripVertical,
  Plus,
  Trash2,
  ClipboardPaste,
  ChevronRight,
  Save,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────
interface FeatureImage {
  id: string;
  url: string;
  caption?: string;
}

interface AdditionalSection {
  id: string;
  title: string;
  content: string;
}

interface LandingContent {
  feature_images: FeatureImage[];
  additional_sections: AdditionalSection[];
  signup_button_label?: string;
  signup_enabled?: boolean;
  cta_enabled?: boolean;
  cta_button_label?: string;
  cta_link?: string;
}

const generateId = () => crypto.randomUUID();

// ─── Component ────────────────────────────────────────
const GroupLandingBuilder = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trip, setTrip] = useState<any>(null);

  // Core fields
  const [landingEnabled, setLandingEnabled] = useState(false);
  const [landingHeadline, setLandingHeadline] = useState("");
  const [landingDescription, setLandingDescription] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");

  // Rich content
  const [featureImages, setFeatureImages] = useState<FeatureImage[]>([]);
  const [additionalSections, setAdditionalSections] = useState<AdditionalSection[]>([]);

  // Settings
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [signupButtonLabel, setSignupButtonLabel] = useState("");
  const [ctaEnabled, setCtaEnabled] = useState(false);
  const [ctaButtonLabel, setCtaButtonLabel] = useState("");
  const [ctaLink, setCtaLink] = useState("");

  // UI state
  const [heroUrlInput, setHeroUrlInput] = useState("");
  const [showHeroUrlInput, setShowHeroUrlInput] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingFeature, setUploadingFeature] = useState(false);
  const [featureUrlInput, setFeatureUrlInput] = useState("");
  const [showFeatureUrlInput, setShowFeatureUrlInput] = useState(false);
  const [dragOverFeature, setDragOverFeature] = useState(false);
  const [draggedImageIdx, setDraggedImageIdx] = useState<number | null>(null);

  const heroFileRef = useRef<HTMLInputElement>(null);
  const featureFileRef = useRef<HTMLInputElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);

  // ─── Fetch ────────────────────────────────────────
  const fetchTrip = async () => {
    if (!tripId) return;
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (error || !data) {
      toast.error("Trip not found");
      navigate("/trips");
      return;
    }

    const d = data as any;
    if (d.trip_type !== "group") {
      toast.error("Landing pages are only available for group trips");
      navigate(`/trips/${tripId}`);
      return;
    }

    setTrip(d);
    setLandingEnabled(d.group_landing_enabled || false);
    setLandingHeadline(d.group_landing_headline || "");
    setLandingDescription(d.group_landing_description || "");
    setHeroImageUrl(d.cover_image_url || "");

    const content: LandingContent = d.group_landing_content || {
      feature_images: [],
      additional_sections: [],
    };
    setFeatureImages(content.feature_images || []);
    setAdditionalSections(content.additional_sections || []);
    setSignupEnabled(content.signup_enabled !== false);
    setSignupButtonLabel(content.signup_button_label || "");
    setCtaEnabled(content.cta_enabled || false);
    setCtaButtonLabel(content.cta_button_label || "");
    setCtaLink(content.cta_link || "");
    setLoading(false);
  };

  useEffect(() => {
    fetchTrip();
  }, [tripId]);

  // ─── Overview rich-text init ──────────────────────
  useEffect(() => {
    if (overviewRef.current && landingDescription && !overviewRef.current.innerHTML) {
      overviewRef.current.innerHTML = landingDescription;
    }
  }, [landingDescription, loading]);

  // ─── Toggle ───────────────────────────────────────
  const handleToggle = async (enabled: boolean) => {
    setLandingEnabled(enabled);
    const { error } = await supabase
      .from("trips")
      .update({ group_landing_enabled: enabled } as any)
      .eq("id", tripId!);
    if (error) {
      toast.error("Failed to update");
      setLandingEnabled(!enabled);
    } else {
      toast.success(enabled ? "Landing page enabled" : "Landing page disabled");
    }
  };

  // ─── Save all ─────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    const overviewHtml = overviewRef.current?.innerHTML || landingDescription;
    const content: LandingContent = {
      feature_images: featureImages,
      additional_sections: additionalSections,
      signup_enabled: signupEnabled,
      signup_button_label: signupButtonLabel,
      cta_enabled: ctaEnabled,
      cta_button_label: ctaButtonLabel,
      cta_link: ctaLink,
    };

    const { error } = await supabase
      .from("trips")
      .update({
        group_landing_headline: landingHeadline || null,
        group_landing_description: overviewHtml || null,
        cover_image_url: heroImageUrl || null,
        group_landing_content: content,
      } as any)
      .eq("id", tripId!);

    if (error) {
      toast.error("Failed to save changes");
    } else {
      setLandingDescription(overviewHtml);
      toast.success("Landing page saved");
    }
    setSaving(false);
  };

  // ─── Overview formatting ──────────────────────────
  const execFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    overviewRef.current?.focus();
  };

  // ─── Hero image ───────────────────────────────────
  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploadingHero(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${tripId}/landing-hero.${ext}`;
      const { error } = await supabase.storage.from("trip-covers").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("trip-covers").getPublicUrl(path);
      setHeroImageUrl(publicUrl);
      await supabase.from("trips").update({ cover_image_url: publicUrl } as any).eq("id", tripId!);
      toast.success("Hero image uploaded");
    } catch { toast.error("Failed to upload image"); }
    finally { setUploadingHero(false); if (heroFileRef.current) heroFileRef.current.value = ""; }
  };

  const handleHeroUrlSubmit = async () => {
    if (!heroUrlInput.trim()) return;
    setHeroImageUrl(heroUrlInput.trim());
    setShowHeroUrlInput(false);
    await supabase.from("trips").update({ cover_image_url: heroUrlInput.trim() } as any).eq("id", tripId!);
    toast.success("Hero image URL saved");
    setHeroUrlInput("");
  };

  const handleRemoveHero = async () => {
    setHeroImageUrl("");
    await supabase.from("trips").update({ cover_image_url: null } as any).eq("id", tripId!);
    toast.success("Hero image removed");
  };

  const handleHeroPaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          setUploadingHero(true);
          try {
            const ext = file.type.split("/")[1] || "png";
            const path = `${tripId}/hero-${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from("trip-covers").upload(path, file, { upsert: true });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from("trip-covers").getPublicUrl(path);
            setHeroImageUrl(publicUrl);
            await supabase.from("trips").update({ cover_image_url: publicUrl } as any).eq("id", tripId!);
            toast.success("Hero image pasted");
          } catch { toast.error("Failed to upload pasted image"); }
          finally { setUploadingHero(false); }
          return;
        }
      }
    }
    const text = e.clipboardData.getData("text/plain");
    if (text && (text.startsWith("http://") || text.startsWith("https://")) && /\.(jpg|jpeg|png|gif|webp|svg)/i.test(text)) {
      e.preventDefault();
      setHeroImageUrl(text);
      await supabase.from("trips").update({ cover_image_url: text } as any).eq("id", tripId!);
      toast.success("Hero image added from clipboard");
    }
  }, [tripId]);

  // ─── Feature images ───────────────────────────────
  const uploadFeatureImage = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploadingFeature(true);
    try {
      const id = generateId();
      const ext = file.name.split(".").pop();
      const path = `${tripId}/feature-${id}.${ext}`;
      const { error } = await supabase.storage.from("trip-covers").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("trip-covers").getPublicUrl(path);
      setFeatureImages((prev) => [...prev, { id, url: publicUrl }]);
      toast.success("Image added");
    } catch { toast.error("Failed to upload image"); }
    finally { setUploadingFeature(false); if (featureFileRef.current) featureFileRef.current.value = ""; }
  };

  const handleFeatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFeatureImage(file);
  };

  const handleFeatureUrlAdd = () => {
    if (!featureUrlInput.trim()) return;
    setFeatureImages((prev) => [...prev, { id: generateId(), url: featureUrlInput.trim() }]);
    setFeatureUrlInput("");
    setShowFeatureUrlInput(false);
    toast.success("Image added");
  };

  const removeFeatureImage = (id: string) => {
    setFeatureImages((prev) => prev.filter((img) => img.id !== id));
  };

  const updateFeatureCaption = (id: string, caption: string) => {
    setFeatureImages((prev) => prev.map((img) => (img.id === id ? { ...img, caption } : img)));
  };

  const handleFeatureDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOverFeature(false);

      if (draggedImageIdx !== null) {
        const targetEl = (e.target as HTMLElement).closest("[data-img-idx]");
        if (targetEl) {
          const targetIdx = parseInt(targetEl.getAttribute("data-img-idx") || "0");
          if (targetIdx !== draggedImageIdx) {
            setFeatureImages((prev) => {
              const updated = [...prev];
              const [moved] = updated.splice(draggedImageIdx, 1);
              updated.splice(targetIdx, 0, moved);
              return updated;
            });
          }
        }
        setDraggedImageIdx(null);
        return;
      }

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        Array.from(files).forEach((file) => {
          if (file.type.startsWith("image/")) uploadFeatureImage(file);
        });
        return;
      }

      const url = e.dataTransfer.getData("text/plain");
      if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
        setFeatureImages((prev) => [...prev, { id: generateId(), url }]);
        toast.success("Image added");
      }
    },
    [draggedImageIdx, tripId]
  );

  const handleFeaturePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            uploadFeatureImage(file);
            return;
          }
        }
      }
      const text = e.clipboardData.getData("text/plain");
      if (text && (text.startsWith("http://") || text.startsWith("https://")) && /\.(jpg|jpeg|png|gif|webp|svg)/i.test(text)) {
        e.preventDefault();
        setFeatureImages((prev) => [...prev, { id: generateId(), url: text }]);
        toast.success("Image added from clipboard");
      }
    },
    [tripId]
  );

  // ─── Additional sections ──────────────────────────
  const addSection = () => {
    setAdditionalSections((prev) => [
      ...prev,
      { id: generateId(), title: "", content: "" },
    ]);
  };

  const updateSection = (id: string, field: "title" | "content", value: string) => {
    setAdditionalSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeSection = (id: string) => {
    setAdditionalSections((prev) => prev.filter((s) => s.id !== id));
  };

  // ─── URL ──────────────────────────────────────────
  const getPublicBaseUrl = () => {
    if (trip?.trip_page_url) {
      try {
        return new URL(trip.trip_page_url).origin;
      } catch {
        // fall through to default
      }
    }
    return "https://cts-agent-dash.lovable.app";
  };

  const landingUrl = trip?.share_token ? `${getPublicBaseUrl()}/group/${trip.share_token}` : null;
  const copyUrl = () => {
    if (landingUrl) { navigator.clipboard.writeText(landingUrl); toast.success("Link copied!"); }
  };

  // ─── Loading ──────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* ─── Top Bar ──────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/trips/${tripId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{trip?.trip_name || "Group Trip"}</h1>
            <p className="text-xs text-muted-foreground">Landing Page</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {landingUrl && landingEnabled && (
            <Button variant="outline" size="sm" asChild>
              <a href={landingUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
              </a>
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* ─── Two-column layout ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        {/* ─── LEFT: Main Content ─────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Landing Page Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Page Title */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Page Title</Label>
              <Input
                placeholder={trip?.trip_name || "Join Our Amazing Group Trip!"}
                value={landingHeadline}
                onChange={(e) => setLandingHeadline(e.target.value)}
              />
            </div>

          {/* Hero Image */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Hero Image</Label>
            {heroImageUrl ? (
              <div className="relative group rounded-lg overflow-hidden border">
                <img src={heroImageUrl} alt="Landing page hero" className="w-full h-48 object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => heroFileRef.current?.click()} disabled={uploadingHero}>
                    {uploadingHero ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-1" />} Replace
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleRemoveHero}>
                    <X className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  onPaste={handleHeroPaste}
                  tabIndex={0}
                  onClick={() => heroFileRef.current?.click()}
                  className="w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {uploadingHero ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                    <>
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-sm font-medium">Upload or paste image</span>
                      <span className="text-xs flex items-center gap-1"><ClipboardPaste className="h-3 w-3" /> Ctrl+V / Cmd+V</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className="flex-1 h-px bg-border" /><span>or</span><div className="flex-1 h-px bg-border" /></div>
                {showHeroUrlInput ? (
                  <div className="flex gap-2">
                    <Input placeholder="https://example.com/image.jpg" value={heroUrlInput} onChange={(e) => setHeroUrlInput(e.target.value)} className="text-sm" />
                    <Button size="sm" onClick={handleHeroUrlSubmit} disabled={!heroUrlInput.trim()}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowHeroUrlInput(false); setHeroUrlInput(""); }}>Cancel</Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setShowHeroUrlInput(true)}>
                    <Link className="h-3.5 w-3.5 mr-1.5" /> Paste Image URL
                  </Button>
                )}
              </div>
            )}
            <input ref={heroFileRef} type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
          </div>

          <Separator />

          {/* Overview */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Overview</Label>
            <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/30">
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execFormat("bold")} title="Bold">
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execFormat("italic")} title="Italic">
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execFormat("underline")} title="Underline">
                <Underline className="h-3.5 w-3.5" />
              </Button>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execFormat("insertUnorderedList")} title="Bullet List">
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execFormat("insertOrderedList")} title="Numbered List">
                <ListOrdered className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div
              ref={overviewRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 prose prose-sm max-w-none"
              style={{ wordBreak: "break-word" }}
              data-placeholder="Share what makes this trip special — highlights, inclusions, what's planned..."
            />
          </div>

          <Separator />

          {/* Featured Images */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Featured Images</Label>
              <div className="flex items-center gap-2">
                {showFeatureUrlInput ? null : (
                  <>
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowFeatureUrlInput(true)}>
                      <ClipboardPaste className="h-3.5 w-3.5 mr-1" /> Paste Image URL
                    </Button>
                    <Button size="sm" className="h-8 text-xs" onClick={() => featureFileRef.current?.click()} disabled={uploadingFeature}>
                      <ImagePlus className="h-3.5 w-3.5 mr-1" /> Add from library
                    </Button>
                  </>
                )}
              </div>
            </div>

            {showFeatureUrlInput && (
              <div className="flex gap-2">
                <Input placeholder="https://example.com/photo.jpg" value={featureUrlInput} onChange={(e) => setFeatureUrlInput(e.target.value)} className="text-sm" />
                <Button size="sm" onClick={handleFeatureUrlAdd} disabled={!featureUrlInput.trim()}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowFeatureUrlInput(false); setFeatureUrlInput(""); }}>Cancel</Button>
              </div>
            )}

            {/* Image gallery */}
            {featureImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {featureImages.map((img, idx) => (
                  <div
                    key={img.id}
                    data-img-idx={idx}
                    draggable
                    onDragStart={() => setDraggedImageIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedImageIdx !== null && draggedImageIdx !== idx) {
                        setFeatureImages((prev) => {
                          const updated = [...prev];
                          const [moved] = updated.splice(draggedImageIdx, 1);
                          updated.splice(idx, 0, moved);
                          return updated;
                        });
                        setDraggedImageIdx(null);
                      }
                    }}
                    onDragEnd={() => setDraggedImageIdx(null)}
                    className={`relative group rounded-lg overflow-hidden border bg-muted/20 cursor-grab active:cursor-grabbing ${
                      draggedImageIdx === idx ? "opacity-50 ring-2 ring-primary" : ""
                    }`}
                  >
                    <img src={img.url} alt={img.caption || "Feature"} className="w-full h-28 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => removeFeatureImage(img.id)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Remove
                      </Button>
                    </div>
                    <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="h-4 w-4 text-white drop-shadow" />
                    </div>
                    <Input
                      placeholder="Caption (optional)"
                      value={img.caption || ""}
                      onChange={(e) => updateFeatureCaption(img.id, e.target.value)}
                      className="text-xs border-0 border-t rounded-none h-7 bg-background/80"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); if (draggedImageIdx === null) setDragOverFeature(true); }}
              onDragLeave={() => setDragOverFeature(false)}
              onDrop={(e) => { setDragOverFeature(false); handleFeatureDrop(e); }}
              onPaste={handleFeaturePaste}
              tabIndex={0}
              className={`w-full rounded-lg border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground p-4 focus:outline-none focus:ring-2 focus:ring-ring ${
                dragOverFeature
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:text-primary"
              }`}
            >
              {uploadingFeature ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-sm">Add photos</span>
                </>
              )}
            </div>
            <input ref={featureFileRef} type="file" accept="image/*" className="hidden" onChange={handleFeatureUpload} />
          </div>

          <Separator />

          {/* Additional Sections */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Additional Information</Label>
            <p className="text-xs text-muted-foreground">
              Add extra sections for details like pricing, included items, travel tips, etc.
            </p>

            {additionalSections.map((section, idx) => (
              <div key={section.id} className="space-y-2 p-4 border rounded-lg bg-muted/10 relative group">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Section {idx + 1}
                  </span>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => removeSection(section.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Input
                  placeholder="Section Title"
                  value={section.title}
                  onChange={(e) => updateSection(section.id, "title", e.target.value)}
                  className="font-medium"
                />
                <Textarea
                  placeholder="Section content..."
                  value={section.content}
                  onChange={(e) => updateSection(section.id, "content", e.target.value)}
                  rows={4}
                />
              </div>
            ))}

            <Button variant="outline" className="w-full" onClick={addSection}>
              <Plus className="h-4 w-4 mr-2" /> Add Section
            </Button>
          </div>

          </CardContent>
        </Card>

        <div className="sticky top-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Enable Landing Page */}
              <div className="flex items-center justify-between">
                <Label className="text-sm">Enable landing page</Label>
                <Switch checked={landingEnabled} onCheckedChange={handleToggle} />
              </div>

              {/* Public URL */}
              {landingUrl && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Public URL</Label>
                  <div className="flex items-center gap-1.5">
                    <Input readOnly value={landingUrl} className="text-xs font-mono h-8" onClick={(e) => (e.target as HTMLInputElement).select()} />
                    <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={copyUrl}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              {/* Self Service Signup */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Self Service Signup</h3>
                <p className="text-xs text-muted-foreground">
                  Automatically create sub-trips when a client fills out your signup form. They'll also see their selections and be able to make payments that are made.
                </p>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Button Label</Label>
                  <Input
                    placeholder="Sign Up Now"
                    value={signupButtonLabel}
                    onChange={(e) => setSignupButtonLabel(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <button
                  onClick={() => navigate(`/trips/${tripId}`)}
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Edit Signup Form <ChevronRight className="h-3.5 w-3.5" />
                </button>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Enable sign up</Label>
                  <Switch checked={signupEnabled} onCheckedChange={setSignupEnabled} />
                </div>
              </div>

              <Separator />

              {/* Custom Call to Action */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Custom Call to Action</h3>
                <p className="text-xs text-muted-foreground">
                  Display a custom call to action, separate from self service signup.
                </p>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Button Label</Label>
                  <Input
                    placeholder="Learn More"
                    value={ctaButtonLabel}
                    onChange={(e) => setCtaButtonLabel(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Link</Label>
                  <Input
                    placeholder="https://..."
                    value={ctaLink}
                    onChange={(e) => setCtaLink(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Enable call to action</Label>
                  <Switch checked={ctaEnabled} onCheckedChange={setCtaEnabled} />
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GroupLandingBuilder;
