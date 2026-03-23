export type IntegrationType = "api" | "redirect" | "hybrid";

export interface Supplier {
  id: string;
  name: string;
  url: string;
  logo?: string;
  description: string;
  category: "flights" | "cruises" | "hotels" | "transportation" | "all-inclusive";
  isFavorite: boolean;
  notes: string;
  lastVisited?: Date;
  visitCount: number;
  integrationType: IntegrationType;
  apiStatus?: "available" | "coming_soon" | "none";
}
