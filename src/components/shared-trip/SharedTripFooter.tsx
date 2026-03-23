interface SharedTripFooterProps {
  branding: {
    agency_name: string | null;
    tagline: string | null;
    website: string | null;
  } | null;
  advisor: {
    name: string | null;
    agency_name: string | null;
  } | null;
}

export default function SharedTripFooter({ branding, advisor }: SharedTripFooterProps) {
  const agencyName = branding?.agency_name || advisor?.agency_name;

  return (
    <div className="text-center text-sm text-gray-400 pt-10 pb-6 border-t">
      {agencyName && <p>Prepared by <span className="font-medium text-gray-500">{agencyName}</span></p>}
      {branding?.tagline && <p className="mt-1 italic">{branding.tagline}</p>}
      {branding?.website && (
        <a
          href={branding.website}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-gray-400 hover:text-gray-600 underline"
        >
          {branding.website.replace(/^https?:\/\//, "")}
        </a>
      )}
    </div>
  );
}
