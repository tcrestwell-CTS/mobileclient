import jsPDF from "jspdf";
import { TripPayment } from "@/hooks/useTripPayments";
import { format } from "date-fns";

export interface InvoiceData {
  invoiceNumber?: string;
  tripName: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  destination?: string;
  departDate?: string;
  returnDate?: string;
  payments: TripPayment[];
  tripTotal: number;
  totalPaid: number;
  totalRemaining: number;
  agencyName?: string;
  agencyPhone?: string;
  agencyEmail?: string;
  agencyAddress?: string;
  agencyWebsite?: string;
  agencyLogoUrl?: string;
  supplierName?: string;
}

interface GenerateOptions {
  returnBase64?: boolean;
  returnBlobUrl?: boolean;
}

// Helper to load image as base64
const loadImageAsBase64 = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
};

export async function generateInvoicePDF(data: InvoiceData, options?: GenerateOptions): Promise<string | void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = 25;

  // Colors matching the template
  const primaryColor: [number, number, number] = [0, 150, 167]; // Teal #0096A7
  const textColor: [number, number, number] = [51, 51, 51];
  const mutedColor: [number, number, number] = [102, 102, 102];
  const lightGray: [number, number, number] = [200, 200, 200];

  // Use provided invoice number or generate fallback
  const invoiceNumber = data.invoiceNumber || `INV-${Date.now().toString().slice(-10).toUpperCase()}`;

  // ===== PAGE 1 =====
  
  // Header - "Invoice" title
  doc.setFontSize(28);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice", margin, yPos);

  // Try to load and add agency logo (top right)
  const logoSize = 30;
  const logoX = pageWidth - margin - logoSize;
  const logoY = yPos - 18;
  let logoAdded = false;

  // Try agency logo URL first, then fall back to default local logo
  const logoSources = [
    data.agencyLogoUrl,
    "/images/logo_simplified.png",
  ].filter(Boolean) as string[];

  for (const logoSrc of logoSources) {
    try {
      const logoBase64 = await loadImageAsBase64(logoSrc);
      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", logoX, logoY, logoSize, logoSize, undefined, "FAST");
        logoAdded = true;
        break;
      }
    } catch (e) {
      console.warn("Failed to load logo from", logoSrc, e);
    }
  }

  // Fallback: Draw text badge if no logo loaded at all
  if (!logoAdded) {
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    const badgeX = pageWidth - margin - 30;
    doc.text("Crestwell", badgeX + 15, yPos - 8, { align: "center" });
    doc.setFontSize(9);
    doc.text("Travel", badgeX + 15, yPos - 3, { align: "center" });
    doc.setFontSize(8);
    doc.text("Services", badgeX + 15, yPos + 2, { align: "center" });
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.roundedRect(badgeX, yPos - 15, 30, 22, 3, 3, "S");
  }

  // Invoice Number and Issue Date
  yPos += 15;
  doc.setFontSize(10);
  doc.setTextColor(...mutedColor);
  doc.setFont("helvetica", "normal");
  doc.text("Invoice Number", margin, yPos);
  doc.text("Issue Date", margin, yPos + 6);
  
  doc.setTextColor(...textColor);
  doc.text(invoiceNumber, margin + 35, yPos);
  doc.text(format(new Date(), "MMM d, yyyy"), margin + 35, yPos + 6);

  // ===== Three Column Header Section =====
  yPos += 20;
  const colWidth = (pageWidth - margin * 2) / 3;
  
  // Column 1: Agency Info
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text(data.agencyName || "Crestwell Travel Services", margin, yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  let agencyY = yPos + 5;
  
  if (data.agencyEmail) {
    doc.text(data.agencyEmail, margin, agencyY);
    agencyY += 4;
  }
  if (data.agencyPhone) {
    doc.text(data.agencyPhone, margin, agencyY);
    agencyY += 4;
  }
  if (data.agencyAddress) {
    const addressLines = doc.splitTextToSize(data.agencyAddress, colWidth - 5);
    doc.text(addressLines, margin, agencyY);
    agencyY += addressLines.length * 4;
  }
  
  // Column 2: Primary Traveler
  const col2X = margin + colWidth;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...mutedColor);
  doc.text("Primary Traveler", col2X, yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.text(data.clientName, col2X, yPos + 5);
  
  let travelerY = yPos + 10;
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  if (data.clientEmail) {
    doc.text(data.clientEmail, col2X, travelerY);
    travelerY += 4;
  }
  if (data.clientPhone) {
    doc.text(data.clientPhone, col2X, travelerY);
    travelerY += 4;
  }
  
  // Column 3: Trip Details
  const col3X = margin + colWidth * 2;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...mutedColor);
  doc.text("Trip Details", col3X, yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.text(data.tripName, col3X, yPos + 5);
  
  if (data.departDate) {
    const dateRange = data.returnDate 
      ? `${format(new Date(data.departDate), "MMM d")} - ${format(new Date(data.returnDate), "MMM d, yyyy")}`
      : format(new Date(data.departDate), "MMM d, yyyy");
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.text(dateRange, col3X, yPos + 10);
  }

  // ===== Remaining Due Section =====
  yPos += 40;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text(`Remaining due: ${formatCurrency(data.totalRemaining)}`, margin, yPos);

  // ===== Payment Table =====
  yPos += 15;
  
  // Table Header
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos - 4, pageWidth - margin * 2, 8, "F");
  doc.setDrawColor(...lightGray);
  doc.line(margin, yPos + 4, pageWidth - margin, yPos + 4);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...mutedColor);
  doc.text("Description", margin + 2, yPos + 1);
  doc.text("Status", margin + 95, yPos + 1);
  doc.text("Amount", pageWidth - margin - 2, yPos + 1, { align: "right" });
  
  yPos += 10;

  // Trip name as header row
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(data.tripName, margin + 2, yPos);
  doc.text(formatCurrency(data.tripTotal), pageWidth - margin - 2, yPos, { align: "right" });
  
  yPos += 7;

  // Payment rows
  doc.setFont("helvetica", "normal");
  data.payments.forEach((payment) => {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 25;
    }

    // Description
    let description = payment.payment_type === "final_balance" 
      ? "Final balance" 
      : payment.payment_type === "deposit"
        ? "Deposit"
        : payment.payment_type.charAt(0).toUpperCase() + payment.payment_type.slice(1).replace(/_/g, " ");
    
    // If it's an installment, try to make a better name
    if (payment.payment_type === "installment") {
      description = "Installment";
    }
    
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    doc.text(description, margin + 2, yPos);
    
    // Status
    const dueDate = payment.due_date ? format(new Date(payment.due_date), "MMM d, yyyy") : "";
    const statusText = payment.status === "paid" 
      ? `${dueDate} · Paid`
      : payment.status === "pending" && dueDate
        ? `Due ${dueDate} · Unpaid`
        : payment.status.charAt(0).toUpperCase() + payment.status.slice(1);
    
    doc.setTextColor(...mutedColor);
    doc.text(statusText, margin + 95, yPos);
    
    // Amount
    doc.setTextColor(...textColor);
    doc.text(formatCurrency(payment.amount), pageWidth - margin - 2, yPos, { align: "right" });
    
    yPos += 6;
  });

  // Supplier and refund info
  yPos += 5;
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  if (data.supplierName) {
    doc.text(`Booking via ${data.supplierName}`, margin + 2, yPos);
    yPos += 4;
  }

  // Divider line
  yPos += 5;
  doc.setDrawColor(...lightGray);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  // ===== Summary Totals =====
  yPos += 10;
  const summaryX = pageWidth - margin - 60;
  
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.text("Estimated Total", summaryX, yPos);
  doc.setTextColor(...textColor);
  doc.text(formatCurrency(data.tripTotal), pageWidth - margin - 2, yPos, { align: "right" });
  
  yPos += 6;
  doc.setTextColor(...mutedColor);
  doc.text("Paid", summaryX, yPos);
  doc.setTextColor(...textColor);
  doc.text(formatCurrency(data.totalPaid), pageWidth - margin - 2, yPos, { align: "right" });
  
  yPos += 6;
  doc.setTextColor(...mutedColor);
  doc.text("Remaining", summaryX, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text(formatCurrency(data.totalRemaining), pageWidth - margin - 2, yPos, { align: "right" });

  // ===== Additional Details Section =====
  yPos += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.text("Additional Details", margin, yPos);
  
  yPos += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Thank you for choosing ${data.agencyName || "Crestwell Travel Services"}`, margin, yPos);
  
  yPos += 8;
  doc.setTextColor(...mutedColor);
  const thankYouText = "We appreciate the opportunity to serve you and are committed to delivering exceptional quality and care. This invoice reflects the services rendered as agreed. If you have any questions regarding the charges or need further documentation, please don't hesitate to reach out.";
  const thankYouLines = doc.splitTextToSize(thankYouText, pageWidth - margin * 2);
  doc.text(thankYouLines, margin, yPos);

  // ===== PAGE 2 - Terms and Footer =====
  doc.addPage();
  yPos = 25;

  doc.setFontSize(9);
  doc.setTextColor(...textColor);
  doc.text("Payment is due upon receipt unless otherwise specified.", margin, yPos);
  
  yPos += 10;
  doc.text("For your convenience, we accept ACH, credit card. Late payments may be subject to a service fee as outlined in your agreement.", margin, yPos, { maxWidth: pageWidth - margin * 2 });
  
  yPos += 15;
  doc.text("We value your business and look forward to continuing to support your travel plans.", margin, yPos);
  
  yPos += 15;
  doc.text("Warm regards,", margin, yPos);
  
  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.text(`The ${data.agencyName || "Crestwell Travel Services"} Team`, margin, yPos);

  // Contact footer
  yPos += 15;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedColor);
  const contactParts = [
    data.agencyPhone || "888.508.6893",
    data.agencyEmail || "info@crestwellgetaways.com",
    data.agencyWebsite || "https://www.crestwellgetaways.com"
  ].filter(Boolean);
  doc.text(contactParts.join(" | "), margin, yPos);

  // Return base64 or blob URL or save the PDF
  if (options?.returnBase64) {
    return doc.output("datauristring").split(",")[1];
  }

  if (options?.returnBlobUrl) {
    const blob = doc.output("blob");
    return URL.createObjectURL(blob);
  }
  
  const fileName = `Invoice_${data.tripName.replace(/[^a-zA-Z0-9]/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}
