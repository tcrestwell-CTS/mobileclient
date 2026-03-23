import jsPDF from "jspdf";
import { format } from "date-fns";

const PRIMARY: [number, number, number] = [0, 150, 167];
const TEXT: [number, number, number] = [33, 33, 33];
const MUTED: [number, number, number] = [100, 100, 100];
const LIGHT: [number, number, number] = [220, 220, 220];
const WHITE: [number, number, number] = [255, 255, 255];
const BG: [number, number, number] = [245, 250, 251];

interface FlowNode {
  id: string;
  label: string;
  sublabel?: string;
  type: "start" | "end" | "step" | "decision" | "action";
  x: number;
  y: number;
  w: number;
  h: number;
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  branch?: "yes" | "no" | "left" | "right";
}

function drawNode(doc: jsPDF, node: FlowNode) {
  const { x, y, w, h, type, label, sublabel } = node;
  const cx = x + w / 2;
  const cy = y + h / 2;

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.6);

  if (type === "start" || type === "end") {
    // Pill / capsule shape
    const r = h / 2;
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(x, y, w, h, r, r, "FD");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text(label, cx, cy + 3.2, { align: "center" });
  } else if (type === "decision") {
    // Diamond
    doc.setFillColor(...BG);
    const hw = w / 2;
    const hh = h / 2;
    doc.lines(
      [[hw, -hh], [hw, hh], [-hw, hh], [-hw, -hh]],
      cx,
      cy,
      [1, 1],
      "FD",
      true
    );
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PRIMARY);
    doc.text(label, cx, cy + 2.8, { align: "center" });
  } else if (type === "action") {
    // Parallelogram-ish — use rounded rect with accent
    doc.setFillColor(230, 248, 250);
    doc.roundedRect(x, y, w, h, 2, 2, "FD");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT);
    doc.text(label, cx, sublabel ? cy - 0.5 : cy + 3, { align: "center" });
    if (sublabel) {
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(sublabel, cx, cy + 5, { align: "center" });
    }
  } else {
    // Standard step
    doc.setFillColor(...WHITE);
    doc.roundedRect(x, y, w, h, 3, 3, "FD");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(label, w - 6);
    const lineH = 4.5;
    const totalH = lines.length * lineH;
    const startY = cy - totalH / 2 + lineH - 1;
    lines.forEach((line: string, i: number) => {
      doc.text(line, cx, startY + i * lineH, { align: "center" });
    });
    if (sublabel) {
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(sublabel, cx, startY + lines.length * lineH + 1, { align: "center" });
    }
  }
}

function nodeCenter(node: FlowNode): [number, number] {
  return [node.x + node.w / 2, node.y + node.h / 2];
}

function drawArrow(
  doc: jsPDF,
  x1: number, y1: number,
  x2: number, y2: number,
  label?: string,
  color: [number, number, number] = MUTED
) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.5);
  doc.line(x1, y1, x2, y2);

  // Arrowhead
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const aLen = 3;
  doc.setFillColor(...color);
  doc.triangle(
    x2, y2,
    x2 - aLen * Math.cos(angle - 0.4), y2 - aLen * Math.sin(angle - 0.4),
    x2 - aLen * Math.cos(angle + 0.4), y2 - aLen * Math.sin(angle + 0.4),
    "F"
  );

  if (label) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...PRIMARY);
    doc.text(label, mx + 2, my - 1);
  }
}

export async function generateBookingFlowPDF() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 14;

  // Background
  doc.setFillColor(...BG);
  doc.rect(0, 0, PW, PH, "F");

  // Header bar
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, PW, 22, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text("Booking Process Flow", M, 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Crestwell Travel Services  ·  Generated ${format(new Date(), "MMMM d, yyyy")}`, PW - M, 14, { align: "right" });

  // ---- Layout constants ----
  const NW = 52;   // node width
  const NH = 14;   // node height
  const DNW = 36;  // decision diamond width
  const DNH = 14;  // decision diamond height
  const COL1 = M + 4;
  const COL2 = M + (PW - M * 2) / 2 - NW / 2;
  const COL3 = PW - M - NW - 4;
  const CX = PW / 2; // center x

  // ---- Node definitions ----
  const nodes: FlowNode[] = [
    // Row 1 – Start
    { id: "start",      label: "Start",               type: "start",    x: CX - 20,    y: 28,  w: 40,  h: 10 },

    // Row 2 – Create trip
    { id: "trip",       label: "Create Trip",          type: "step",     x: CX - NW/2, y: 44,  w: NW,  h: NH },

    // Row 3 – Decision: primary client?
    { id: "hasClient",  label: "Primary\nClient?",     type: "decision", x: CX - DNW/2, y: 64, w: DNW, h: DNH },

    // Row 4 – two branches
    { id: "autoClient", label: "Auto-assign Client",   type: "action",   x: COL1,      y: 84,  w: NW,  h: NH },
    { id: "manualClient", label: "Select Client\nManually", type: "action", x: COL3,   y: 84,  w: NW,  h: NH },

    // Row 5 – Add booking
    { id: "addBooking", label: "Add Booking",          type: "step",     x: CX - NW/2, y: 104, w: NW,  h: NH },

    // Row 6 – Fill details
    { id: "details",    label: "Booking Details",      sublabel: "Destination · Dates · Supplier", type: "step", x: CX - NW/2, y: 122, w: NW, h: NH },

    // Row 7 – Financials
    { id: "financials", label: "Set Financials",       sublabel: "Gross · Net · Commission", type: "step", x: CX - NW/2, y: 140, w: NW, h: NH },

    // Row 8 – Decision: status
    { id: "status",     label: "Booking\nStatus?",     type: "decision", x: CX - DNW/2, y: 160, w: DNW, h: DNH },

    // Row 9 – Cancelled branch
    { id: "cancelled",  label: "Cascade Cancel\nto Child Bookings", type: "action", x: COL3, y: 180, w: NW, h: NH },

    // Row 9 – Active branch
    { id: "travelers",  label: "Add Travelers",        type: "step",     x: CX - NW/2, y: 180, w: NW,  h: NH },

    // Row 10 – CC Auth
    { id: "ccAuth",     label: "CC Auth Request\n(Optional)",    type: "action",   x: CX - NW/2, y: 198, w: NW, h: NH },

    // Row 11 – Payment
    { id: "payment",    label: "Collect Payment",      type: "step",     x: CX - NW/2, y: 216, w: NW,  h: NH },

    // Row 12 – Payment method decision
    { id: "payMethod",  label: "Method?",              type: "decision", x: CX - DNW/2, y: 236, w: DNW, h: DNH },

    // Row 13 – Stripe / Manual
    { id: "stripe",     label: "Stripe Checkout\nLink Generated",   type: "action", x: COL1,  y: 256, w: NW, h: NH },
    { id: "manual",     label: "Record Manual\nPayment",            type: "action", x: COL3,  y: 256, w: NW, h: NH },

    // Row 14 – Verified
    { id: "verified",   label: "Payment Verified",    type: "step",     x: CX - NW/2, y: 276, w: NW,  h: NH },

    // End
    { id: "end",        label: "Booking Complete ✓",  type: "end",      x: CX - 28,   y: 294, w: 56,  h: 10 },
  ];

  const nodeMap: Record<string, FlowNode> = {};
  nodes.forEach(n => nodeMap[n.id] = n);

  // ---- Draw nodes ----
  nodes.forEach(n => drawNode(doc, n));

  // ---- Helper to get bottom/top/left/right center points ----
  const bot  = (id: string): [number, number] => { const n = nodeMap[id]; return [n.x + n.w/2, n.y + n.h]; };
  const top  = (id: string): [number, number] => { const n = nodeMap[id]; return [n.x + n.w/2, n.y]; };
  const left = (id: string): [number, number] => { const n = nodeMap[id]; return [n.x, n.y + n.h/2]; };
  const right= (id: string): [number, number] => { const n = nodeMap[id]; return [n.x + n.w, n.y + n.h/2]; };

  // ---- Edges ----
  // Start → Trip
  drawArrow(doc, ...bot("start"), ...top("trip"));
  // Trip → hasClient
  drawArrow(doc, ...bot("trip"), ...top("hasClient"));

  // hasClient → autoClient (Yes, left)
  const hcL = left("hasClient");
  const acT = top("autoClient");
  drawArrow(doc, hcL[0], hcL[1], acT[0], acT[1], "Yes");

  // hasClient → manualClient (No, right)
  const hcR = right("hasClient");
  const mcT = top("manualClient");
  drawArrow(doc, hcR[0], hcR[1], mcT[0], mcT[1], "No");

  // autoClient → addBooking (merge back to center, go down then right)
  const acB = bot("autoClient");
  const abT = top("addBooking");
  const mergeY = abT[1] - 2;
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.5);
  doc.line(acB[0], acB[1], acB[0], mergeY);
  doc.line(acB[0], mergeY, abT[0], mergeY);
  drawArrow(doc, abT[0], mergeY, abT[0], abT[1]);

  // manualClient → addBooking
  const mcB = bot("manualClient");
  doc.line(mcB[0], mcB[1], mcB[0], mergeY);
  doc.line(mcB[0], mergeY, abT[0], mergeY);

  // addBooking → details → financials
  drawArrow(doc, ...bot("addBooking"), ...top("details"));
  drawArrow(doc, ...bot("details"), ...top("financials"));
  // financials → status
  drawArrow(doc, ...bot("financials"), ...top("status"));

  // status → cancelled (right, No/Cancelled)
  const stR = right("status");
  const canT = top("cancelled");
  drawArrow(doc, stR[0], stR[1], canT[0], canT[1], "Cancelled");

  // status → travelers (down, Active)
  drawArrow(doc, ...bot("status"), ...top("travelers"), "Active");

  // travelers → ccAuth → payment
  drawArrow(doc, ...bot("travelers"), ...top("ccAuth"));
  drawArrow(doc, ...bot("ccAuth"), ...top("payment"));
  // payment → payMethod
  drawArrow(doc, ...bot("payment"), ...top("payMethod"));

  // payMethod → stripe (left)
  const pmL = left("payMethod");
  const strT = top("stripe");
  drawArrow(doc, pmL[0], pmL[1], strT[0], strT[1], "Stripe");

  // payMethod → manual (right)
  const pmR = right("payMethod");
  const manT = top("manual");
  drawArrow(doc, pmR[0], pmR[1], manT[0], manT[1], "Manual");

  // stripe → verified (merge left side)
  const strB = bot("stripe");
  const verT = top("verified");
  const mergeY2 = verT[1] - 2;
  doc.setDrawColor(...MUTED);
  doc.line(strB[0], strB[1], strB[0], mergeY2);
  doc.line(strB[0], mergeY2, verT[0], mergeY2);
  drawArrow(doc, verT[0], mergeY2, ...verT);

  // manual → verified (merge right side)
  const manB = bot("manual");
  doc.line(manB[0], manB[1], manB[0], mergeY2);
  doc.line(manB[0], mergeY2, verT[0], mergeY2);

  // verified → end
  drawArrow(doc, ...bot("verified"), ...top("end"));

  // ---- Legend ----
  const legendY = PH - 22;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(M, legendY, PW - M * 2, 18, 2, 2, "FD");
  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, legendY, PW - M * 2, 18, 2, 2, "S");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...MUTED);
  doc.text("LEGEND", M + 4, legendY + 6);

  const items = [
    { label: "Process Step", color: WHITE, border: PRIMARY },
    { label: "Decision", color: BG, border: PRIMARY },
    { label: "Action / Optional", color: [230, 248, 250] as [number,number,number], border: PRIMARY },
    { label: "Terminal", color: PRIMARY, border: PRIMARY },
  ];

  items.forEach((item, i) => {
    const ix = M + 30 + i * 46;
    doc.setFillColor(...item.color);
    doc.setDrawColor(...item.border);
    doc.setLineWidth(0.4);
    doc.roundedRect(ix, legendY + 4, 16, 7, 1, 1, "FD");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT);
    doc.text(item.label, ix + 19, legendY + 9);
  });

  doc.save(`Crestwell_Booking_Flow_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
