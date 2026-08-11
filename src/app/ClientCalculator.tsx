"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { config } from "./config";

type Metric = { label: string; value: string; note?: string };
type CheckResult = {
  title: string;
  status: string;
  metrics: Metric[];
  source: string;
  warning?: string;
};

const referralUrls: Record<string, string> = {
  nansen: "https://nsn.ai/brelgin",
  predictfun: "https://predict.fun?ref=5D64A",
  dreamcash: "https://www.dreamcash.xyz/share?code=0PWE34",
  dyli: "https://www.dyli.io/?code=dr670541",
};

const allocationDefaults: Record<string, { fdv: number; community: number; total: number }> = {
  nansen: { fdv: 1_500_000_000, community: 5, total: 100_000_000 },
  predictfun: { fdv: 1_000_000_000, community: 7.5, total: 100_000_000 },
  dreamcash: { fdv: 500_000_000, community: 10, total: 1_000_000_000 },
  abstract: { fdv: 2_000_000_000, community: 10, total: 10_000_000_000 },
  dyli: { fdv: 250_000_000, community: 8, total: 100_000_000 },
  risex: { fdv: 750_000_000, community: 10, total: 100_000_000 },
};

const fmt = (value: number, digits = 2) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(
    Number.isFinite(value) ? value : 0,
  );
const usd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(Number.isFinite(value) ? value : 0);

export default function ClientCalculator() {
  const officialUrl = referralUrls[config.slug] ?? config.officialUrl;
  const initialAllocation = allocationDefaults[config.slug] ?? allocationDefaults.predictfun;
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(config.fields.map((field) => [field.key, field.defaultValue])),
  );
  const [address, setAddress] = useState("");
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [error, setError] = useState("");
  const [fdv, setFdv] = useState(initialAllocation.fdv);
  const [community, setCommunity] = useState(initialAllocation.community);
  const [totalPoints, setTotalPoints] = useState(initialAllocation.total);
  const [officialPoints, setOfficialPoints] = useState(0);

  const result = useMemo(() => config.calculate(values), [values]);
  const maxPart = Math.max(1, ...result.breakdown.map((item) => item.value));
  const pointsUsed = officialPoints > 0 ? officialPoints : result.score;
  const rewardPool = Math.max(0, fdv) * (Math.max(0, community) / 100);
  const estimatedAllocation =
    Math.max(0, totalPoints) > 0
      ? rewardPool * Math.min(1, Math.max(0, pointsUsed) / totalPoints)
      : 0;

  async function inspect(event: FormEvent) {
    event.preventDefault();
    setError("");
    setCheck(null);
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError("Enter a valid 0x wallet address.");
      return;
    }
    setChecking(true);
    try {
      const response = await fetch(`/api/account?address=${encodeURIComponent(address)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Data source is unavailable");
      setCheck(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not check this address");
    } finally {
      setChecking(false);
    }
  }

  function shareOnX() {
    const origin = window.location.origin;
    const score = Math.max(0, pointsUsed).toFixed(2);
    const allocation = Math.max(0, estimatedAllocation).toFixed(2);
    const resultUrl = `${origin}/share/${encodeURIComponent(score)}/${encodeURIComponent(allocation)}`;
    const checked = check && address ? ` Checked ${address.slice(0, 6)}...${address.slice(-4)}.` : "";
    const text = `My ${config.name} result: ${fmt(pointsUsed)} points and an estimated ${usd(estimatedAllocation)} allocation.${checked} Check yours on Alpha Tools:`;
    window.open(
      `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(resultUrl)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

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
    <main style={style}>
      <nav>
        <a className="brand" href={config.portalUrl}>
          <span className="alpha">α</span><span>ALPHA TOOLS</span>
        </a>
        <div className="navlinks">
          <a href={config.docsUrl} target="_blank" rel="noreferrer">Methodology ↗</a>
          <a href={officialUrl} target="_blank" rel="noreferrer">Open {config.name} ↗</a>
        </div>
      </nav>

      <section className="hero">
        <div className="glow" />
        <Image className="projectLogo" src={config.logo} alt={`${config.name} official logo`} width={260} height={88} priority />
        <p className="eyebrow">{config.eyebrow}</p>
        <h1>{config.title}</h1>
        <p className="lede">{config.description}</p>
        <div className="truth"><span>✓</span>{config.formulaLabel}</div>
      </section>

      <section className="checker panel">
        <div>
          <p className="eyebrow">LIVE ADDRESS CHECK</p>
          <h2>Check project activity</h2>
          <p>{config.checkerText}</p>
        </div>
        <form onSubmit={inspect}>
          <input aria-label="Wallet address" placeholder="0x..." value={address} onChange={(event) => setAddress(event.target.value.trim())} />
          <button disabled={checking}>{checking ? "Checking..." : "Check address"}</button>
        </form>
        {error && <p className="error">{error}</p>}
        {check && (
          <div className="checkResult">
            <div className="checkHead"><strong>{check.title}</strong><span>{check.status}</span></div>
            <div className="metricGrid">
              {check.metrics.map((metric) => (
                <div key={metric.label}>
                  <small>{metric.label}</small><b>{metric.value}</b>{metric.note && <em>{metric.note}</em>}
                </div>
              ))}
            </div>
            {check.warning && <p className="warning">{check.warning}</p>}
            <a href={check.source} target="_blank" rel="noreferrer">Open official source ↗</a>
          </div>
        )}
      </section>

      <section className="calculator">
        <div className="panel inputs">
          <div className="panelTitle">
            <span>YOUR ACTIVITY</span>
            <button onClick={() => setValues(Object.fromEntries(config.fields.map((field) => [field.key, field.defaultValue])))}>Reset</button>
          </div>
          {config.fields.map((field) => (
            <label key={field.key}>
              <div><strong>{field.label}</strong><small>{field.hint}</small></div>
              <div className="inputWrap">
                <span>{field.unit}</span>
                <input
                  type="number"
                  min={field.min ?? 0}
                  step={field.step ?? 1}
                  value={values[field.key]}
                  onChange={(event) => setValues({ ...values, [field.key]: Math.max(field.min ?? 0, Number(event.target.value)) })}
                />
              </div>
            </label>
          ))}
        </div>
        <div className="panel result">
          <p>ESTIMATED SCORE</p>
          <div className="score">{fmt(result.score)}</div>
          <div className="secondary">{result.secondary}</div>
          <div className="bars">
            {result.breakdown.map((item) => (
              <div className="barRow" key={item.label}>
                <div><span>{item.label}</span><b>{fmt(item.value)}</b></div>
                <i><em style={{ width: `${Math.max(2, (item.value / maxPart) * 100)}%` }} /></i>
              </div>
            ))}
          </div>
          <a className="cta" href={officialUrl} target="_blank" rel="noreferrer">Continue to {config.name}<span>↗</span></a>
        </div>
      </section>

      <section className="allocation panel">
        <div className="allocationIntro">
          <p className="eyebrow">TOKEN ALLOCATION SCENARIO</p>
          <h2>Estimated allocation in USD</h2>
          <p>Change the FDV, community pool and total eligible points. This is a transparent scenario, not a promise of tokens.</p>
          <div className="allocationValue">{usd(estimatedAllocation)}</div>
          <small>{fmt(pointsUsed)} points × {fmt((pointsUsed / Math.max(totalPoints, 1)) * 100, 6)}% of the modeled rewards pool</small>
        </div>
        <div className="allocationInputs">
          <label><span>Token FDV</span><div className="inputWrap"><span>$</span><input type="number" min="0" step="1000000" value={fdv} onChange={(event) => setFdv(Math.max(0, Number(event.target.value)))} /></div></label>
          <label><span>Community airdrop</span><div className="inputWrap"><span>%</span><input type="number" min="0" max="100" step="0.1" value={community} onChange={(event) => setCommunity(Math.min(100, Math.max(0, Number(event.target.value))))} /></div></label>
          <label><span>Total eligible points</span><div className="inputWrap"><span>#</span><input type="number" min="1" step="1000000" value={totalPoints} onChange={(event) => setTotalPoints(Math.max(1, Number(event.target.value)))} /></div></label>
          <label><span>Official points override</span><div className="inputWrap"><span>#</span><input aria-label="Official points override" type="number" min="0" step="1" value={officialPoints} onChange={(event) => setOfficialPoints(Math.max(0, Number(event.target.value)))} /></div><small>Leave 0 to use the calculator score. Paste a real signed-in balance when the project keeps it private.</small></label>
        </div>
        <div className="allocationActions">
          <button className="share" onClick={shareOnX}>Share on X</button>
          <span>Includes a branded result card and this checker&apos;s own link.</span>
        </div>
      </section>

      <section className="facts">
        {config.facts.map((fact, index) => <article className="panel" key={fact}><span>0{index + 1}</span><p>{fact}</p></article>)}
      </section>
      <section className="notice">
        <span>i</span><div><strong>Independent estimate</strong><p>{config.disclaimer}</p></div>
      </section>
      <footer>
        <a href={config.portalUrl}>← All Alpha Tools</a>
        <a className="creator" href="https://x.com/brelgino" target="_blank" rel="noreferrer">Created by @brelgino · Independent tools for clearer onchain decisions.</a>
        <span>Public data · transparent assumptions · not financial advice.</span>
      </footer>
    </main>
  );
}
