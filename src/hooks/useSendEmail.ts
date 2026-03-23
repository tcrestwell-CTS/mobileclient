import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type EmailTemplate = "welcome" | "booking_confirmation" | "itinerary" | "quote";

interface SendEmailParams {
  to: string;
  subject: string;
  template: EmailTemplate;
  data?: Record<string, string>;
}

export function useSendEmail() {
  const [sending, setSending] = useState(false);

  const sendEmail = async ({ to, subject, template, data }: SendEmailParams) => {
    setSending(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("send-email", {
        body: { to, subject, template, data },
      });

      if (error) {
        console.error("Error sending email:", error);
        toast.error("Failed to send email");
        return false;
      }

      if (!result.success) {
        console.error("Email send failed:", result.error);
        toast.error(result.error || "Failed to send email");
        return false;
      }

      toast.success("Email sent successfully!");
      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email");
      return false;
    } finally {
      setSending(false);
    }
  };

  const sendTestEmail = async (to: string, template: EmailTemplate = "welcome") => {
    const subjects: Record<EmailTemplate, string> = {
      welcome: "Welcome to Your Travel Journey! 🌍",
      booking_confirmation: "Your Booking is Confirmed! ✈️",
      itinerary: "Your Travel Itinerary 📋",
      quote: "Your Personalized Travel Quote 💼",
    };

    return sendEmail({
      to,
      subject: subjects[template],
      template,
      data: {
        clientName: "Test Client",
        destination: "Paris, France",
        dates: "March 15-22, 2025",
        reference: "CTS-2025-001",
        tripName: "European Adventure",
        duration: "7 nights",
        amount: "$4,500",
        validUntil: "14 days",
      },
    });
  };

  return {
    sendEmail,
    sendTestEmail,
    sending,
  };
}
