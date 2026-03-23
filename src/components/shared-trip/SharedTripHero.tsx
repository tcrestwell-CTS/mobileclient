import { Mail, Phone, Globe } from "lucide-react";

interface SharedTripHeroProps {
  branding: {
    agency_name: string | null;
    logo_url: string | null;
    primary_color: string | null;
    tagline: string | null;
    video_intro_url?: string | null;
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
  primaryColor: string;
}

export default function SharedTripHero({ branding, advisor, primaryColor }: SharedTripHeroProps) {
  const certifications = [
    { label: "CLIA", value: advisor?.clia_number },
    { label: "CCRA", value: advisor?.ccra_number },
    { label: "ASTA", value: advisor?.asta_number },
    { label: "Embarc ID", value: advisor?.embarc_number },
  ].filter(c => c.value);

  return (
    <div className="relative w-full" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}>
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-start md:items-center gap-6">
        {/* Left side - branding */}
        <div className="flex-1 flex flex-col items-start gap-3">
          {branding?.logo_url && (
            <img src={branding.logo_url} alt="" className="h-12 w-auto rounded bg-white/90 p-1" />
          )}
          <h2 className="text-white text-xl font-semibold">
            {branding?.agency_name || "Travel Itinerary"}
          </h2>
         {branding?.tagline && (
            <p className="text-white/80 text-sm italic">{branding.tagline}</p>
          )}
          {branding?.video_intro_url && (
            <div className="mt-3 rounded-lg overflow-hidden max-w-sm">
              <iframe
                src={branding.video_intro_url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                className="w-full aspect-video rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Meet your advisor"
              />
            </div>
          )}
        </div>

        {/* Right side - advisor card */}
        {advisor?.name && (
          <div className="bg-white/95 backdrop-blur rounded-lg p-5 shadow-lg min-w-[260px]">
            <div className="flex items-center gap-3 mb-3">
              {advisor.avatar_url ? (
                <img
                  src={advisor.avatar_url}
                  alt={advisor.name}
                  className="h-14 w-14 rounded-full object-cover border-2"
                  style={{ borderColor: primaryColor }}
                />
              ) : (
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center text-white text-lg font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {advisor.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Your Advisor</p>
                <p className="font-semibold text-gray-900">{advisor.name}</p>
                {advisor.agency_name && (
                  <p className="text-xs text-gray-500">{advisor.agency_name}</p>
                )}
              </div>
            </div>

            {/* Certification numbers */}
            {certifications.length > 0 && (
              <div className="mb-3 space-y-0.5 text-sm text-gray-700">
                {certifications.map(c => (
                  <p key={c.label}>
                    <span className="font-medium">{c.label}:</span> {c.value}
                  </p>
                ))}
              </div>
            )}

            <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
              {advisor.email && (
                <a href={`mailto:${advisor.email}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                  <Mail className="h-3.5 w-3.5" /> {advisor.email}
                </a>
              )}
              {advisor.phone && (
                <a href={`tel:${advisor.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                  <Phone className="h-3.5 w-3.5" /> {advisor.phone}
                </a>
              )}
              {advisor.website && (
                <a href={advisor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                  <Globe className="h-3.5 w-3.5" /> {advisor.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
