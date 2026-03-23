import { supabase } from "@/integrations/supabase/client";

interface BookingConfirmationData {
  clientName: string;
  clientEmail: string;
  destination: string;
  departDate: string;
  returnDate: string;
  reference: string;
}

export async function sendBookingConfirmationEmail(booking: BookingConfirmationData): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.error("No session for sending email");
      return false;
    }

    const response = await supabase.functions.invoke("send-email", {
      body: {
        to: booking.clientEmail,
        subject: `Booking Confirmed: ${booking.destination}`,
        template: "booking_confirmation",
        data: {
          clientName: booking.clientName,
          destination: booking.destination,
          dates: `${booking.departDate} - ${booking.returnDate}`,
          reference: booking.reference,
        },
      },
    });

    if (response.error) {
      console.error("Error sending confirmation email:", response.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    return false;
  }
}

interface OverrideApprovalData {
  agentName: string;
  bookingReference: string;
  clientName: string;
  destination: string;
  calculatedCommission: number;
  overrideAmount: number;
  overrideReason: string;
}

export async function sendOverrideApprovalNotification(overrideData: OverrideApprovalData): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.error("No session for sending override notification");
      return false;
    }

    const { data: branding } = await supabase
      .from("branding_settings")
      .select("email_address")
      .single();

    const adminEmail = branding?.email_address;

    if (!adminEmail) {
      console.log("No admin notification email configured in branding settings");
      return false;
    }

    const formatCurrency = (value: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(value);

    const response = await supabase.functions.invoke("send-email", {
      body: {
        to: adminEmail,
        subject: `⚠️ Commission Override Requires Approval - ${overrideData.bookingReference}`,
        template: "commission_override_approval",
        data: {
          agentName: overrideData.agentName,
          bookingReference: overrideData.bookingReference,
          clientName: overrideData.clientName,
          destination: overrideData.destination,
          calculatedCommission: formatCurrency(overrideData.calculatedCommission),
          overrideAmount: formatCurrency(overrideData.overrideAmount),
          overrideReason: overrideData.overrideReason || "No reason provided",
          approvalUrl: `${window.location.origin}/commissions`,
        },
      },
    });

    if (response.error) {
      console.error("Error sending override notification:", response.error);
      return false;
    }

    console.log("Override approval notification sent to admin");
    return true;
  } catch (error) {
    console.error("Error sending override notification:", error);
    return false;
  }
}

interface TripCompletedEmailData {
  clientName: string;
  clientEmail: string;
  destination: string;
  tripName: string | null;
  departDate: string;
  returnDate: string;
  reference: string;
}

export async function sendTripCompletedEmail(booking: TripCompletedEmailData): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.error("No session for sending email");
      return false;
    }

    const response = await supabase.functions.invoke("send-email", {
      body: {
        to: booking.clientEmail,
        subject: `Thanks for traveling with us! - ${booking.destination}`,
        template: "trip_completed",
        data: {
          clientName: booking.clientName,
          destination: booking.destination,
          tripName: booking.tripName || booking.destination,
          dates: `${booking.departDate} - ${booking.returnDate}`,
          reference: booking.reference,
        },
      },
    });

    if (response.error) {
      console.error("Error sending trip completed email:", response.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending trip completed email:", error);
    return false;
  }
}
