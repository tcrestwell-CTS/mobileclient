import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CoverPhotoPicker } from "./CoverPhotoPicker";
import type { Itinerary } from "@/hooks/useItineraries";

interface ItineraryFormData {
  name: string;
  depart_date?: string;
  return_date?: string;
  cover_image_url?: string;
  overview?: string;
}

interface CreateItinerarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripDepartDate?: string | null;
  tripReturnDate?: string | null;
  onCreate: (data: ItineraryFormData) => Promise<any>;
  /** When provided, the sheet operates in edit mode */
  editingItinerary?: Itinerary | null;
  onUpdate?: (id: string, data: {
    name?: string;
    depart_date?: string | null;
    return_date?: string | null;
    cover_image_url?: string | null;
    overview?: string | null;
  }) => Promise<any>;
}

export function CreateItinerarySheet({
  open,
  onOpenChange,
  tripDepartDate,
  tripReturnDate,
  onCreate,
  editingItinerary,
  onUpdate,
}: CreateItinerarySheetProps) {
  const { user } = useAuth();
  const isEditing = !!editingItinerary;

  const [name, setName] = useState("");
  const [overview, setOverview] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form when editing or reset when creating
  useEffect(() => {
    if (open && editingItinerary) {
      setName(editingItinerary.name);
      setOverview(editingItinerary.overview || "");
      setCoverPreview(editingItinerary.cover_image_url || null);
      setCoverFile(null);
    } else if (open && !editingItinerary) {
      setName("");
      setOverview("");
      setCoverPreview(null);
      setCoverFile(null);
    }
  }, [open, editingItinerary, tripDepartDate, tripReturnDate]);

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleUrlSelected = (url: string) => {
    setCoverFile(null);
    setCoverPreview(url);
  };

  const removeCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadCoverIfNeeded = async (): Promise<string | null | undefined> => {
    if (coverFile && user) {
      const ext = coverFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("itinerary-covers")
        .upload(path, coverFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("itinerary-covers")
        .getPublicUrl(path);
      return urlData.publicUrl;
    }
    if (coverPreview && !coverFile) return coverPreview;
    // Cover was removed
    if (!coverPreview) return null;
    return undefined;
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    setSubmitting(true);
    try {
      const cover_image_url = await uploadCoverIfNeeded();

      if (isEditing && onUpdate) {
        await onUpdate(editingItinerary.id, {
          name: name.trim(),
          depart_date: tripDepartDate || null,
          return_date: tripReturnDate || null,
          cover_image_url: cover_image_url === undefined ? editingItinerary.cover_image_url : cover_image_url,
          overview: overview.trim() || null,
        });
      } else {
        await onCreate({
          name: name.trim(),
          depart_date: tripDepartDate || undefined,
          return_date: tripReturnDate || undefined,
          cover_image_url: cover_image_url || undefined,
          overview: overview.trim() || undefined,
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error(`Error ${isEditing ? "updating" : "creating"} itinerary:`, error);
      toast.error(`Failed to ${isEditing ? "update" : "create"} itinerary`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Itinerary" : "Create Itinerary"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="itin-name">Name</Label>
            <Input
              id="itin-name"
              placeholder="e.g. Option 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Travel Dates (read-only, inherited from trip) */}
          <div className="space-y-2">
            <Label>Travel Dates</Label>
            <p className="text-xs text-muted-foreground">
              Dates are inherited from the trip. Edit them in Trip Details.
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={tripDepartDate || ""}
                disabled
                className="flex-1 opacity-70"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={tripReturnDate || ""}
                disabled
                className="flex-1 opacity-70"
              />
            </div>
          </div>

          {/* Cover Photo */}
          <CoverPhotoPicker
            coverPreview={coverPreview}
            onFileSelected={handleFileSelected}
            onUrlSelected={handleUrlSelected}
            onRemove={removeCover}
          />

          {/* Overview Statement */}
          <div className="space-y-2">
            <Label>Overview Statement</Label>
            <p className="text-xs text-muted-foreground">
              An overview statement is optional. When present it will be shown to travelers with each itinerary option.
            </p>
            <Textarea
              placeholder="Write a brief overview of this itinerary..."
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <SheetFooter className="flex flex-row justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? isEditing ? "Saving..." : "Creating..."
              : isEditing ? "Save Changes" : "Create Itinerary"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
