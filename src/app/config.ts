export type Field = { key: string; label: string; hint: string; unit: string; defaultValue: number; min?: number; step?: number };
export type CalculatorConfig = {
  slug: string; name: string; eyebrow: string; title: string; description: string; accent: string;
  officialUrl: string; docsUrl: string; portalUrl: string; formulaLabel: string; disclaimer: string;
  fields: Field[]; calculate: (v: Record<string, number>) => { score: number; secondary: string; breakdown: { label: string; value: number }[] };
};
export const config: CalculatorConfig = {
  slug: "nansen", name: "Nansen", eyebrow: "NANSEN · SEASON 3", title: "Nansen Points Calculator",
  description: "Estimate NXP from Hyperliquid perps volume and add the points already visible in your Nansen account.", accent: "#8cffc1",
  officialUrl: "https://app.nansen.ai/points", docsUrl: "https://academy.nansen.ai/articles/2294471-points-from-trading", portalUrl: "https://alpha-tools.pro/",
  formulaLabel: "Official trading rate: 1 NXP per $400 of Hyperliquid perps volume.",
  disclaimer: "Nansen may change rates, eligibility and weekly validation. Subscription, staking, referral and quest rewards must be added from your account.",
  fields: [
    { key: "volume", label: "Weekly perps volume", hint: "Eligible Hyperliquid perps volume executed through Nansen", unit: "$", defaultValue: 10000, min: 0, step: 100 },
    { key: "existing", label: "Existing NXP", hint: "Your activated balance before this week", unit: "NXP", defaultValue: 1000, min: 0, step: 1 },
    { key: "other", label: "Other earned points", hint: "Subscriptions, staking, referrals and onboarding quests", unit: "NXP", defaultValue: 0, min: 0, step: 1 }
  ],
  calculate: (v) => { const trading = v.volume / 400; const score = v.existing + v.other + trading; return { score, secondary: `${trading.toLocaleString("en-US", { maximumFractionDigits: 2 })} NXP from trading`, breakdown: [{label:"Trading",value:trading},{label:"Existing",value:v.existing},{label:"Other",value:v.other}] }; }
};
