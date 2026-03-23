import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImagePlus, X, Library, Search, Link, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CoverPhotoPickerProps {
  coverPreview: string | null;
  onFileSelected: (file: File) => void;
  onUrlSelected: (url: string) => void;
  onRemove: () => void;
}

export function CoverPhotoPicker({
  coverPreview,
  onFileSelected,
  onUrlSelected,
  onRemove,
}: CoverPhotoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [urlInputOpen, setUrlInputOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [libraryImages, setLibraryImages] = useState<string[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    onFileSelected(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    onFileSelected(file);
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) onFileSelected(file);
          return;
        }
      }
    },
    [onFileSelected]
  );

  const handleUrlSubmit = () => {
    const trimmed = imageUrl.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
      onUrlSelected(trimmed);
      setImageUrl("");
      setUrlInputOpen(false);
    } catch {
      toast.error("Please enter a valid URL");
    }
  };

  const loadLibrary = async () => {
    setLoadingLibrary(true);
    try {
      const buckets = ["itinerary-covers", "trip-covers"];
      const urls: string[] = [];
      for (const bucket of buckets) {
        const { data: files } = await supabase.storage.from(bucket).list("", {
          limit: 50,
          sortBy: { column: "created_at", order: "desc" },
        });
        if (files) {
          for (const file of files) {
            if (file.name && !file.name.startsWith(".")) {
              const { data: urlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(file.name);
              if (urlData?.publicUrl) urls.push(urlData.publicUrl);
            }
          }
        }
      }
      setLibraryImages(urls);
    } catch (err) {
      console.error("Failed to load library:", err);
      toast.error("Failed to load media library");
    } finally {
      setLoadingLibrary(false);
    }
  };

  const openLibrary = () => {
    setLibraryOpen(true);
    loadLibrary();
  };

  return (
    <div className="space-y-2">
      <Label>Cover Photo</Label>
      <p className="text-xs text-muted-foreground">
        Add an image to bring this trip to life.
      </p>

      {coverPreview ? (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden border">
            <img
              src={coverPreview}
              alt="Cover preview"
              className="w-full h-48 object-cover"
            />
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 bg-background/80 hover:bg-background rounded-full p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            tabIndex={0}
            className="border border-dashed rounded-md p-3 text-center text-xs text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
            onClick={() => fileInputRef.current?.click()}
          >
            <p>Paste or drop a new image here to replace</p>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onPaste={handlePaste}
          tabIndex={0}
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Add photo</p>
          <p className="text-xs text-muted-foreground mt-1">
            Drag & drop, paste from clipboard, or use options below
          </p>
        </div>
      )}

      {/* Action buttons row */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={openLibrary}
        >
          <Library className="h-3.5 w-3.5" />
          Add from library
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={() => setUrlInputOpen(!urlInputOpen)}
        >
          <Search className="h-3.5 w-3.5" />
          Search free images
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          <Upload className="h-3.5 w-3.5" />
          Choose file
        </Button>
      </div>

      {/* URL input for pasting image links */}
      {urlInputOpen && (
        <div className="flex gap-2 pt-1">
          <div className="relative flex-1">
            <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Paste image URL here..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
              className="pl-8 text-sm h-9"
              autoFocus
            />
          </div>
          <Button size="sm" onClick={handleUrlSubmit} className="h-9">
            Add
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Media Library Dialog */}
      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Media Library</DialogTitle>
          </DialogHeader>
          {loadingLibrary ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : libraryImages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No images found in your library.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
              {libraryImages.map((url, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onUrlSelected(url);
                    setLibraryOpen(false);
                  }}
                  className="rounded-md overflow-hidden border hover:ring-2 hover:ring-primary transition-all aspect-square"
                >
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
