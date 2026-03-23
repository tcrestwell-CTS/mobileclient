export type CommissionTier = "none" | "tier_1" | "tier_2" | "tier_3";

export interface TierConfig {
  label: string;
  agentSplit: number;
  agencySplit: number;
  description: string;
}

export const COMMISSION_TIERS: Record<CommissionTier, TierConfig> = {
  none: {
    label: "None",
    agentSplit: 0,
    agencySplit: 100,
    description: "No commission (Office Admin)",
  },
  tier_1: {
    label: "Tier 1",
    agentSplit: 70,
    agencySplit: 30,
    description: "70% Agent / 30% Agency",
  },
  tier_2: {
    label: "Tier 2",
    agentSplit: 80,
    agencySplit: 20,
    description: "80% Agent / 20% Agency",
  },
  tier_3: {
    label: "Tier 3",
    agentSplit: 95,
    agencySplit: 5,
    description: "95% Agent / 5% Agency",
  },
};

// Dev-time assertion: verify all tier splits sum to 100
if (import.meta.env.DEV) {
  Object.entries(COMMISSION_TIERS).forEach(([tier, config]) => {
    if (config.agentSplit + config.agencySplit !== 100) {
      console.error(`Commission tier "${tier}" splits don't sum to 100! (${config.agentSplit} + ${config.agencySplit} = ${config.agentSplit + config.agencySplit})`);
    }
  });
}

export function getTierConfig(tier: CommissionTier | null | undefined): TierConfig {
  return COMMISSION_TIERS[tier || "tier_1"];
}

export function calculateAgentCommission(
  totalCommission: number,
  tier: CommissionTier | null | undefined
): number {
  const config = getTierConfig(tier);
  return (totalCommission * config.agentSplit) / 100;
}

export function calculateAgencyCommission(
  totalCommission: number,
  tier: CommissionTier | null | undefined
): number {
  const config = getTierConfig(tier);
  return (totalCommission * config.agencySplit) / 100;
}

export function getNextTier(tier: CommissionTier | null | undefined): CommissionTier | null {
  const current = tier || "tier_1";
  switch (current) {
    case "none":
      return null; // Office admins don't get promoted
    case "tier_1":
      return "tier_2";
    case "tier_2":
      return "tier_3";
    case "tier_3":
      return null; // Already at max
    default:
      return null;
  }
}
