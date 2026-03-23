import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  clientEmail: string;
  onEmailSent?: () => void;
}

type EmailTemplate = "custom" | "welcome" | "quote" | "itinerary";

const templateSubjects: Record<EmailTemplate, string> = {
  custom: "",
  welcome: "Welcome to Your Travel Journey! 🌍",
  quote: "Your Personalized Travel Quote 💼",
  itinerary: "Your Travel Itinerary 📋",
};

export function SendEmailDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  clientEmail,
  onEmailSent,
}: SendEmailDialogProps) {
  const [sending, setSending] = useState(false);
  const [template, setTemplate] = useState<EmailTemplate>("custom");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleTemplateChange = (value: EmailTemplate) => {
    setTemplate(value);
    if (value !== "custom") {
      setSubject(templateSubjects[value]);
    }
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }

    if (template === "custom" && !message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSending(true);
    try {
      const body: Record<string, unknown> = {
        to: clientEmail,
        subject,
        template,
        data: { clientName },
        clientId,
      };

      if (template === "custom") {
        body.customHtml = message;
      }

      const { data, error } = await supabase.functions.invoke("send-email", {
        body,
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to send email");
      }

      toast.success("Email sent successfully!");
      onOpenChange(false);
      setSubject("");
      setMessage("");
      setTemplate("custom");
      onEmailSent?.();
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Email to {clientName}</DialogTitle>
          <DialogDescription>
            Compose and send an email to {clientEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="template">Email Type</Label>
            <Select value={template} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select email type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Message</SelectItem>
                <SelectItem value="welcome">Welcome Email</SelectItem>
                <SelectItem value="quote">Quote Email</SelectItem>
                <SelectItem value="itinerary">Itinerary Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input id="to" value={clientEmail} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>

          {template === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message here..."
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Your agency branding and footer will be automatically added to the email.
              </p>
            </div>
          )}

          {template !== "custom" && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                A pre-designed {template.replace("_", " ")} email will be sent with your agency branding.
                The client's name will be automatically personalized.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
