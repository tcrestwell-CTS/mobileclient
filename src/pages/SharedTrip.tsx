import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import SharedTripHero from "@/components/shared-trip/SharedTripHero";
import SharedTripMeta from "@/components/shared-trip/SharedTripMeta";
import SharedTripItinerary from "@/components/shared-trip/SharedTripItinerary";
import SharedTripInvestment from "@/components/shared-trip/SharedTripInvestment";
import SharedTripBudgetConfirmation from "@/components/shared-trip/SharedTripBudgetConfirmation";
import SharedTripFooter from "@/components/shared-trip/SharedTripFooter";
import PaymentTimelineVisual from "@/components/shared-trip/PaymentTimelineVisual";
import { Card, CardContent } from "@/components/ui/card";

export interface SharedTripData {
  trip: {
    trip_name: string;
    destination: string | null;
    depart_date: string | null;
    return_date: string | null;
    status: string;
    trip_type: string | null;
    notes: string | null;
    total_cost: number | null;
    cover_image_url: string | null;
  };
  deposit: {
    required: boolean;
    amount: number;
  };
  cancellationTerms: string[];
  paymentDeadlines: { label: string; date: string }[];
  itinerary: any[];
  bookings: any[];
  branding: {
    agency_name: string | null;
    logo_url: string | null;
    primary_color: string | null;
    accent_color: string | null;
    tagline: string | null;
    email_address: string | null;
    phone: string | null;
    website: string | null;
  } | null;
  advisor: {
    name: string | null;
    avatar_url: string | null;
    agency_name: string | null;
    job_title: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    clia_number: string | null;
    ccra_number: string | null;
    asta_number: string | null;
    embarc_number: string | null;
  } | null;
}

export default function SharedTrip() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedTripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shared-trip?token=${token}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        if (!res.ok) {
          setError(res.status === 404 ? "This trip page is not available." : "Something went wrong.");
          return;
        }
        setData(await res.json());
      } catch {
        setError("Unable to load trip.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Skeleton className="h-[400px] w-full" />
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">{error || "Trip not found."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryColor = data.branding?.primary_color || "#1a365d";

  return (
    <div className="min-h-screen bg-white">
      {data.trip.cover_image_url && (
        <div className="relative w-full h-[40vh] overflow-hidden">
          <img
            src={data.trip.cover_image_url}
            alt={data.trip.trip_name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">{data.trip.trip_name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-white/90 text-sm">
              {data.trip.destination && <span>📍 {data.trip.destination}</span>}
              {data.trip.depart_date && (
                <span>📅 {new Date(data.trip.depart_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {data.trip.return_date && ` – ${new Date(data.trip.return_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      <SharedTripHero branding={data.branding} advisor={data.advisor} primaryColor={primaryColor} />

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {!data.trip.cover_image_url && (
          <SharedTripMeta trip={data.trip} primaryColor={primaryColor} />
        )}

        {data.trip.notes && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Trip Details</h2>
            <p className="text-gray-500 leading-relaxed whitespace-pre-wrap">{data.trip.notes}</p>
          </div>
        )}

        <SharedTripItinerary
          itinerary={data.itinerary}
          departDate={data.trip.depart_date}
          primaryColor={primaryColor}
          optionBlocks={(data as any).optionBlocks || []}
        />

        {(data as any).budget?.range && (
          <SharedTripBudgetConfirmation
            budgetRange={(data as any).budget.range}
            confirmed={(data as any).budget.confirmed}
            confirmedAt={(data as any).budget.confirmed_at}
            changeRequested={(data as any).budget.change_requested}
            changeRequestMessage={(data as any).budget.change_request_message}
            primaryColor={primaryColor}
            shareToken={token || undefined}
          />
        )}

        <SharedTripInvestment
          trip={data.trip}
          deposit={data.deposit || { required: false, amount: 0 }}
          cancellationTerms={data.cancellationTerms || []}
          paymentDeadlines={data.paymentDeadlines || []}
          primaryColor={primaryColor}
          upgradeNotes={(data as any).upgrade_notes}
          shareToken={token || undefined}
        />

        <PaymentTimelineVisual
          deposit={data.deposit || { required: false, amount: 0 }}
          paymentDeadlines={data.paymentDeadlines || []}
          totalCost={data.trip.total_cost || 0}
          primaryColor={primaryColor}
        />

        <SharedTripFooter branding={data.branding} advisor={data.advisor} />
      </div>
    </div>
  );
}
