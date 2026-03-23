import { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  CreditCard, Send, Eye, EyeOff, Clock, Shield, Copy, Loader2, Plus, Lock, AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useCCAuthorizations, CCAuthorization } from "@/hooks/useCCAuthorizations";

interface CCAuthorizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  clientId: string;
  clientName: string;
  bookingAmount: number;
  bookingReference: string;
}

export function CCAuthorizationDialog({
  open, onOpenChange, bookingId, clientId, clientName, bookingAmount, bookingReference,
}: CCAuthorizationDialogProps) {
  const { authorizations, loading, creating, fetchAuthorizations, createAuthorization, decryptCC } = useCCAuthorizations(bookingId);
  const [view, setView] = useState<"list" | "create" | "view-cc">("list");
  const [amount, setAmount] = useState(bookingAmount.toString());
  const [description, setDescription] = useState("");
  
  // View CC state
  const [selectedAuth, setSelectedAuth] = useState<CCAuthorization | null>(null);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [ccData, setCcData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      fetchAuthorizations();
      setView("list");
      setCcData(null);
      setPassword("");
      setTimeLeft(60);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, fetchAuthorizations]);

  // 60-second countdown timer
  useEffect(() => {
    if (ccData && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setCcData(null);
            toast.info("CC information hidden — re-authorize to view again");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [ccData, timeLeft]);

  const handleCreate = async () => {
    const result = await createAuthorization({
      booking_id: bookingId,
      client_id: clientId,
      authorization_amount: parseFloat(amount),
      authorization_description: description || undefined,
    });
    if (result) {
      setView("list");
      setAmount(bookingAmount.toString());
      setDescription("");
    }
  };

  const handleViewCC = async () => {
    if (!selectedAuth || !password) return;
    setVerifying(true);
    const data = await decryptCC(selectedAuth.id, password);
    setVerifying(false);
    if (data) {
      setCcData(data);
      setTimeLeft(60);
      setPassword("");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const PRODUCTION_DOMAIN = "https://agents.crestwelltravels.com";

  const getAuthLink = (token: string) => {
    return `${PRODUCTION_DOMAIN}/authorize/${token}`;
  };

  const copyAuthLink = (token: string) => {
    navigator.clipboard.writeText(getAuthLink(token));
    toast.success("Authorization link copied to clipboard");
  };

  const [sendingEmail, setSendingEmail] = useState(false);

  const sendAuthLinkEmail = async (auth: CCAuthorization) => {
    setSendingEmail(true);
    try {
      const { error } = await (await import("@/integrations/supabase/client")).supabase.functions.invoke("send-email", {
        body: {
          to: null, // will be looked up from client
          clientId: clientId,
          template: "custom",
          subject: `Credit Card Authorization — ${bookingReference}`,
          templateData: {
            clientName: clientName,
            customMessage: `
              <p>Please complete your credit card authorization for booking <strong>${bookingReference}</strong> (${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(auth.authorization_amount)}).</p>
              <p style="margin: 24px 0; text-align: center;">
                <a href="${getAuthLink(auth.access_token)}" style="background-color: #0D7377; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Complete CC Authorization</a>
              </p>
              <p style="font-size: 13px; color: #6b7280;">This is a secure, encrypted form. Your card information is protected.</p>
            `,
          },
        },
      });
      if (error) throw error;
      toast.success("CC authorization link emailed to client");
    } catch (err: any) {
      console.error("Failed to send CC auth email:", err);
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            CC Authorization — {bookingReference}
          </DialogTitle>
          <DialogDescription>
            Manage credit card authorizations for {clientName}
          </DialogDescription>
        </DialogHeader>

        {/* List View */}
        {view === "list" && (
          <div className="space-y-4">
            <Button onClick={() => setView("create")} className="w-full gap-2">
              <Plus className="h-4 w-4" /> Request CC Authorization
            </Button>

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : authorizations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No CC authorizations for this booking yet.
              </p>
            ) : (
              <div className="space-y-3">
                {authorizations.map((auth) => (
                  <Card key={auth.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            ${Number(auth.authorization_amount).toLocaleString()}
                          </p>
                          {auth.authorization_description && (
                            <p className="text-xs text-muted-foreground">{auth.authorization_description}</p>
                          )}
                        </div>
                        <Badge variant={auth.status === "authorized" ? "default" : "secondary"}>
                          {auth.status}
                        </Badge>
                      </div>

                      {auth.status === "authorized" && auth.last_four && (
                        <div className="flex items-center gap-2 text-sm">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span>•••• {auth.last_four}</span>
                          <span className="text-muted-foreground">— {auth.cardholder_name}</span>
                        </div>
                      )}

                      {auth.expires_at && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Expires {format(new Date(auth.expires_at), "MMM d, yyyy")}
                        </div>
                      )}

                      <div className="flex gap-2">
                        {auth.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copyAuthLink(auth.access_token)}>
                              <Copy className="h-3.5 w-3.5" /> Copy Link
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => sendAuthLinkEmail(auth)}
                              disabled={sendingEmail}
                            >
                              {sendingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                              Email to Client
                            </Button>
                          </>
                        )}
                        {auth.status === "authorized" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => {
                              setSelectedAuth(auth);
                              setCcData(null);
                              setView("view-cc");
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" /> View CC Info
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create View */}
        {view === "create" && (
          <div className="space-y-4">
            <div>
              <Label>Authorization Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Initial deposit for cruise booking"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setView("list")}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleCreate}
                disabled={creating || !amount || parseFloat(amount) <= 0}
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {creating ? "Creating..." : "Create & Get Link"}
              </Button>
            </div>
          </div>
        )}

        {/* View CC Info */}
        {view === "view-cc" && selectedAuth && (
          <div className="space-y-4">
            {!ccData ? (
              <>
                <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <Shield className="h-4 w-4 text-warning" />
                  <p className="text-sm text-warning">
                    Re-enter your password to view CC details. Info will be visible for 60 seconds.
                  </p>
                </div>
                <div>
                  <Label>Your Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your account password"
                    onKeyDown={(e) => e.key === "Enter" && handleViewCC()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setView("list")}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleViewCC}
                    disabled={verifying || !password}
                  >
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    {verifying ? "Verifying..." : "Authenticate & View"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Auto-hide in {timeLeft}s</span>
                  </div>
                  <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-destructive transition-all"
                      style={{ width: `${(timeLeft / 60) * 100}%` }}
                    />
                  </div>
                </div>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Card Number</Label>
                      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => copyToClipboard(ccData.card_number, "Card number")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="font-mono text-lg tracking-wider">{ccData.card_number.replace(/(.{4})/g, "$1 ").trim()}</p>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Expiry</Label>
                        <p className="font-mono">{ccData.expiry}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">CVV</Label>
                        <p className="font-mono">{ccData.cvv}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">ZIP</Label>
                        <p className="font-mono">{ccData.billing_zip || "—"}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Cardholder</Label>
                      <p className="font-medium">{ccData.cardholder_name}</p>
                    </div>
                  </CardContent>
                </Card>

                <Button variant="outline" className="w-full" onClick={() => { setCcData(null); setView("list"); }}>
                  <EyeOff className="h-4 w-4 mr-2" /> Hide & Return
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
