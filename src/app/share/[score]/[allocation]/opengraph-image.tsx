import { ImageResponse } from "next/og";
import { config } from "../../../config";

export const alt = `${config.name} result from Alpha Tools`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const safeNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export default async function Image({ params }: { params: Promise<{ score: string; allocation: string }> }) {
  const { score, allocation } = await params;
  const points = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(safeNumber(score));
  const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(safeNumber(allocation));

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", color: config.text, background: `linear-gradient(135deg, ${config.background} 34%, ${config.accent2})` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 24, fontWeight: 700 }}>
        <span>α ALPHA TOOLS</span><span style={{ color: config.accent }}>{config.name.toUpperCase()}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 28, color: config.muted, marginBottom: 12 }}>My modeled result</div>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 800, letterSpacing: "-4px" }}>{points} points</div>
        <div style={{ display: "flex", fontSize: 58, fontWeight: 800, color: config.accent, marginTop: 12 }}>{dollars} estimated</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: config.muted }}>
        <span>Editable FDV · community pool · total points</span><span>Created by @brelgino</span>
      </div>
    </div>,
    size,
  );
}
