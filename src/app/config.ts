import type { CalculatorConfig } from "./config.types";

export const config: CalculatorConfig = {
  slug: "nansen",
  name: "Nansen",
  eyebrow: "NANSEN · SEASON 3",
  title: "Nansen Points Calculator",
  accent: "#00FFA7",
  accent2: "#09C385",
  background: "#071311",
  surface: "#122927",
  text: "#F2FFFA",
  muted: "#9EB9B0",
  logo: "/logos/nansen.png",
  checkerMode: "nansen",
  checkerText: "Check the real public Nansen Points tier for any wallet. The public endpoint exposes tier, not the exact NXP balance.",
  facts: [
    "Eligible Hyperliquid perps volume through Nansen earns 1 NXP per $400.",
    "The public API returns tier only: none, green, ice, north or star.",
    "Subscription, staking, referral and quest points must be read from the signed-in account.",
  ],
  description: "Estimate NXP from eligible Hyperliquid perps volume, track farming costs and combine it with points already visible in your Nansen account.",
  officialUrl: "https://app.nansen.ai/points",
  docsUrl: "https://docs.nansen.ai/api/points",
  portalUrl: "https://alpha-tools-tau.vercel.app/",
  formulaLabel: "Official trading rate: 1 NXP per $400 of eligible Hyperliquid perps volume.",
  disclaimer: "Nansen may change rates, eligibility and weekly validation. Exact NXP is private; the live checker shows only the official public tier.",
  fields: [
    { key: "volume", label: "Weekly perps volume", hint: "Eligible volume executed through Nansen", unit: "$", defaultValue: 10000, min: 0, step: 100 },
    { key: "fees", label: "Trading fees paid", hint: "Your real farming cost, tracked separately", unit: "$", defaultValue: 5, min: 0, step: 0.01 },
    { key: "existing", label: "Existing NXP", hint: "Activated NXP shown in your signed-in account", unit: "NXP", defaultValue: 1000, min: 0, step: 1 },
    { key: "other", label: "Other earned points", hint: "Subscriptions, staking, referrals and quests", unit: "NXP", defaultValue: 0, min: 0, step: 1 },
  ],
  calculate: (v) => {
    const trading = v.volume / 400;
    return {
      score: v.existing + v.other + trading,
      secondary: `${fmt(trading)} NXP from trading · $${fmt(v.fees)} tracked cost`,
      breakdown: [
        { label: "Trading", value: trading },
        { label: "Existing", value: v.existing },
        { label: "Other", value: v.other },
      ],
    };
  },
};

const fmt = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 2 });
