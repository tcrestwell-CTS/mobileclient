import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard, Shield, CheckCircle, Loader2, Calendar, DollarSign, FileText, PenTool,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AuthInfo {
  id: string;
  status: string;
  authorization_amount: number;
  authorization_description: string | null;
  booking: {
    booking_reference: string;
    destination: string;
    trip_name: string | null;
    depart_date: string;
    return_date: string;
    total_amount: number;
    gross_sales: number;
  } | null;
  client: { name: string; first_name: string | null; email: string | null } | null;
  agency_name: string;
  agency_logo: string | null;
}

export default function CCAuthorize() {
  const { token } = useParams<{ token: string }>();
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [billingZip, setBillingZip] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);

  // Signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    fetchAuthInfo();
  }, [token]);

  const fetchAuthInfo = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cc-authorization?action=get-auth-info&token=${token}`,
        { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAuthInfo(data);
      if (data.client?.name) setCardholderName(data.client.name);
    } catch (err: any) {
      setError(err.message || "Authorization not found");
    } finally {
      setLoading(false);
    }
  };

  // Canvas drawing handlers
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 16);
    return cleaned.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 4);
    if (cleaned.length >= 3) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return cleaned;
  };

  const handleSubmit = async () => {
    if (!token) return;
    const cleanCard = cardNumber.replace(/\s/g, "");
    if (cleanCard.length < 13) { toast.error("Please enter a valid card number"); return; }
    if (expiry.length < 5) { toast.error("Please enter a valid expiry (MM/YY)"); return; }
    if (cvv.length < 3) { toast.error("Please enter a valid CVV"); return; }
    if (!cardholderName.trim()) { toast.error("Please enter the cardholder name"); return; }
    if (!acknowledged) { toast.error("Please acknowledge the authorization"); return; }
    if (!tosAccepted) { toast.error("Please accept the Terms of Service"); return; }
    if (!hasSigned) { toast.error("Please provide your electronic signature"); return; }

    setSubmitting(true);
    try {
      const signatureData = canvasRef.current?.toDataURL("image/png") || null;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cc-authorization?action=submit`,
        {
          method: "POST",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access_token: token,
            card_number: cleanCard,
            cvv,
            expiry,
            cardholder_name: cardholderName.trim(),
            billing_zip: billingZip || null,
            signature_data: signatureData,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit authorization");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !authInfo) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="p-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authorization Not Found</h2>
            <p className="text-muted-foreground">
              {error || "This authorization link is invalid or has expired."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authInfo.status !== "pending") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="p-8">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Already Authorized</h2>
            <p className="text-muted-foreground">This payment has already been authorized.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="p-8">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authorization Complete</h2>
            <p className="text-muted-foreground">
              Your payment authorization has been securely submitted. Your travel advisor has been notified.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const booking = authInfo.booking;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          {authInfo.agency_logo && (
            <img src={authInfo.agency_logo} alt={authInfo.agency_name} className="h-12 mx-auto mb-3" />
          )}
          <h1 className="text-2xl font-bold">{authInfo.agency_name}</h1>
          <p className="text-muted-foreground mt-1">Credit Card Authorization Form</p>
        </div>

        {/* Trip Summary */}
        {booking && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Trip Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trip</span>
                <span className="font-medium">{booking.trip_name || booking.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destination</span>
                <span>{booking.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Travel Dates</span>
                <span>
                  {format(new Date(booking.depart_date), "MMM d")} — {format(new Date(booking.return_date), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono text-xs">{booking.booking_reference}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-base font-semibold">
                <span>Authorization Amount</span>
                <span className="text-primary">${Number(authInfo.authorization_amount).toLocaleString()}</span>
              </div>
              {authInfo.authorization_description && (
                <p className="text-xs text-muted-foreground pt-1">{authInfo.authorization_description}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* CC Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Cardholder Name</Label>
              <Input
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="Name as shown on card"
              />
            </div>
            <div>
              <Label>Card Number</Label>
              <Input
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                inputMode="numeric"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Expiry</Label>
                <Input
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  inputMode="numeric"
                />
              </div>
              <div>
                <Label>CVV</Label>
                <Input
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="123"
                  maxLength={4}
                  inputMode="numeric"
                  type="password"
                />
              </div>
              <div>
                <Label>Billing ZIP</Label>
                <Input
                  value={billingZip}
                  onChange={(e) => setBillingZip(e.target.value.slice(0, 10))}
                  placeholder="12345"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acknowledgment */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(!!checked)}
                className="mt-0.5"
              />
              <label htmlFor="acknowledge" className="text-sm leading-relaxed cursor-pointer">
                I, <strong>{cardholderName || authInfo.client?.name || "the cardholder"}</strong>, authorize{" "}
                <strong>{authInfo.agency_name}</strong> to charge my credit card in the amount of{" "}
                <strong>${Number(authInfo.authorization_amount).toLocaleString()}</strong> for the travel services
                described above. This authorization is valid for 30 days from the date of submission.
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Terms of Service */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="tos"
                checked={tosAccepted}
                onCheckedChange={(checked) => setTosAccepted(!!checked)}
                className="mt-0.5"
              />
              <label htmlFor="tos" className="text-sm leading-relaxed cursor-pointer">
                I have read and agree to the{" "}
                <strong>Terms of Service</strong> and{" "}
                <strong>Cancellation Policy</strong>. I understand that charges are subject to the terms outlined by{" "}
                <strong>{authInfo.agency_name}</strong>, including any applicable cancellation fees, change fees, or
                non-refundable deposits. I acknowledge that my card may be charged in partial or full amounts as
                services are rendered.
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Signature */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <PenTool className="h-4 w-4" /> Electronic Signature
              </CardTitle>
              {hasSigned && (
                <Button size="sm" variant="ghost" onClick={clearSignature}>Clear</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                width={440}
                height={150}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Sign above using your mouse or finger
            </p>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          className="w-full h-12 text-base gap-2"
          onClick={handleSubmit}
          disabled={submitting || !acknowledged || !tosAccepted || !hasSigned || !cardNumber || !cvv || !expiry || !cardholderName}
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Shield className="h-5 w-5" />
          )}
          {submitting ? "Submitting Securely..." : "Authorize Payment"}
        </Button>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          Your information is encrypted and securely transmitted
        </div>
      </div>
    </div>
  );
}
