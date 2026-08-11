import type { Metadata } from "next";
import Link from "next/link";
import { config } from "../../../config";

type ShareParams = Promise<{ score: string; allocation: string }>;

const numberFrom = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const points = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
const dollars = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);

export async function generateMetadata({ params }: { params: ShareParams }): Promise<Metadata> {
  const { score, allocation } = await params;
  const scoreValue = numberFrom(score);
  const allocationValue = numberFrom(allocation);
  const description = `${points(scoreValue)} points · ${dollars(allocationValue)} modeled allocation. Build your own ${config.name} scenario on Alpha Tools.`;
  return {
    title: `${config.name} result | Alpha Tools`,
    description,
    openGraph: { title: `${config.name} result`, description, type: "website" },
    twitter: { card: "summary_large_image", title: `${config.name} result`, description },
  };
}

export default async function SharePage({ params }: { params: ShareParams }) {
  const { score, allocation } = await params;
  const scoreValue = numberFrom(score);
  const allocationValue = numberFrom(allocation);
  const style = {
    "--accent": config.accent,
    "--accent2": config.accent2,
    "--page": config.background,
    "--surface": config.surface,
    "--ink": config.text,
    "--muted": config.muted,
    backgroundColor: config.background,
    color: config.text,
  } as React.CSSProperties;

  return (
    <main className="sharePage" style={style}>
      <section className="shareCard panel">
        <p className="eyebrow">ALPHA TOOLS · SHARED RESULT</p>
        <h1>{config.name}</h1>
        <div className="sharedMetrics">
          <div><small>POINTS USED</small><strong>{points(scoreValue)}</strong></div>
          <div><small>ESTIMATED ALLOCATION</small><strong>{dollars(allocationValue)}</strong></div>
        </div>
        <p>This result uses the sender&apos;s editable FDV, community pool and total-points assumptions. It is not an official allocation.</p>
        <Link className="cta" href="/">Build your own {config.name} scenario <span>→</span></Link>
        <a className="sharedBy" href="https://x.com/brelgino">Created by @brelgino</a>
      </section>
    </main>
  );
}
