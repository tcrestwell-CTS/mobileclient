import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, X } from "lucide-react";

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string | null;
  invoiceNumber?: string;
  generating?: boolean;
}

export function InvoicePreviewDialog({
  open,
  onOpenChange,
  pdfUrl,
  invoiceNumber,
  generating,
}: InvoicePreviewDialogProps) {
  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `${invoiceNumber || "Invoice"}.pdf`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg">
            Invoice Preview {invoiceNumber ? `— ${invoiceNumber}` : ""}
          </DialogTitle>
          <div className="flex items-center gap-2">
            {pdfUrl && (
              <Button size="sm" onClick={handleDownload} className="gap-1">
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 px-6 pb-6 min-h-0">
          {generating ? (
            <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg">
              <div className="text-center space-y-2">
                <Skeleton className="h-8 w-8 mx-auto rounded-full" />
                <p className="text-sm text-muted-foreground">Generating invoice…</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-lg border bg-background"
              title={`Invoice ${invoiceNumber || ""}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Failed to generate invoice.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
