import { Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AgencyCertificationsProps {
  cliaNumber?: string | null;
  ccraNumber?: string | null;
  astaNumber?: string | null;
  embarcNumber?: string | null;
  compact?: boolean;
}

export function AgencyCertifications({
  cliaNumber,
  ccraNumber,
  astaNumber,
  embarcNumber,
  compact = false,
}: AgencyCertificationsProps) {
  const certs = [
    { label: "CLIA", value: cliaNumber },
    { label: "CCRA", value: ccraNumber },
    { label: "ASTA", value: astaNumber },
    { label: "Embarc ID", value: embarcNumber },
  ].filter((c) => c.value);

  if (certs.length === 0) return null;

  return (
    <div className={compact ? "mt-2" : "mt-3 pt-3 border-t border-border"}>
      <div className={`flex items-center gap-${compact ? "1" : "2"} text-${compact ? "xs" : "sm"} font-medium text-${compact ? "muted-foreground" : "card-foreground"} mb-1.5`}>
        <Award className={`h-${compact ? "3" : "4"} w-${compact ? "3" : "4"} text-muted-foreground`} />
        Agency Certifications
      </div>
      <div className="flex flex-wrap gap-1.5">
        {certs.map((c) => (
          <Badge key={c.label} variant="outline" className="text-xs">
            {c.label}: {c.value}
          </Badge>
        ))}
      </div>
    </div>
  );
}
