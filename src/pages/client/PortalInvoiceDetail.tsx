import { useParams, useNavigate } from "react-router-dom";
import { usePortalInvoiceDetail } from "@/hooks/usePortalData";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { generateInvoicePDF, InvoiceData } from "@/lib/invoiceGenerator";

export default function PortalInvoiceDetail() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = usePortalInvoiceDetail(invoiceId);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!data?.invoice) return;

    const buildPdf = async () => {
      setGenerating(true);
      try {
        const { invoice, payments = [], branding } = data;

        const invoiceData: InvoiceData = {
          invoiceNumber: invoice.invoice_number,
          tripName: invoice.trip_name || "Services",
          clientName: invoice.client_name || "Client",
          clientEmail: data.client_email || undefined,
          clientPhone: data.client_phone || undefined,
          destination: data.destination || undefined,
          departDate: data.depart_date || undefined,
          returnDate: data.return_date || undefined,
          payments: payments.map((p: any) => ({
            id: p.id,
            trip_id: "",
            user_id: "",
            amount: p.amount,
            payment_date: p.payment_date,
            due_date: p.due_date,
            status: p.status,
            payment_type: p.payment_type,
            details: p.details,
            notes: p.notes || null,
            payment_method: null,
            booking_id: null,
            created_at: "",
            updated_at: "",
          })),
          tripTotal: invoice.total_amount,
          totalPaid: invoice.amount_paid,
          totalRemaining: invoice.amount_remaining,
          agencyName: branding?.agency_name || undefined,
          agencyPhone: branding?.phone || undefined,
          agencyEmail: branding?.email_address || undefined,
          agencyAddress: branding?.address || undefined,
          agencyWebsite: branding?.website || undefined,
          agencyLogoUrl: branding?.logo_url || undefined,
        };

        // Generate PDF as base64, then create blob URL
        const jsPDF = (await import("jspdf")).default;
        const { generateInvoicePDF: gen } = await import("@/lib/invoiceGenerator");

        // We need to get the raw jsPDF doc to create a blob
        // Use a trick: generate with returnBase64 then convert
        const base64 = await gen(invoiceData, { returnBase64: true });
        if (base64 && typeof base64 === "string") {
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        }
      } catch (e) {
        console.error("Failed to generate PDF:", e);
      } finally {
        setGenerating(false);
      }
    };

    buildPdf();

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  if (!data?.invoice) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>Invoice not found.</p>
        <Button variant="link" onClick={() => navigate("/client/invoices")}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const handleDownload = () => {
    if (pdfUrl) {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = `${data.invoice.invoice_number}.pdf`;
      a.click();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/client/invoices")} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Invoices
        </Button>
        {pdfUrl && (
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        )}
      </div>

      {generating ? (
        <div className="flex items-center justify-center h-[600px] bg-muted/30 rounded-lg">
          <div className="text-center space-y-2">
            <Skeleton className="h-8 w-8 mx-auto rounded-full" />
            <p className="text-sm text-muted-foreground">Generating invoice…</p>
          </div>
        </div>
      ) : pdfUrl ? (
        <div className="rounded-lg overflow-hidden border bg-background" style={{ height: "calc(100vh - 200px)" }}>
          <iframe
            src={pdfUrl}
            className="w-full h-full"
            title={`Invoice ${data.invoice.invoice_number}`}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-[600px] bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">Failed to load invoice PDF.</p>
        </div>
      )}
    </div>
  );
}
