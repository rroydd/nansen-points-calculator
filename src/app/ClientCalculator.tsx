"use client";
import { useMemo, useState } from "react";
import { config } from "./config";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);

export default function ClientCalculator() {
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(config.fields.map((f) => [f.key, f.defaultValue])));
  const result = useMemo(() => config.calculate(values), [values]);
  const maxPart = Math.max(1, ...result.breakdown.map((item) => item.value));
  return <main style={{ "--accent": config.accent } as React.CSSProperties}>
    <nav><a className="brand" href={config.portalUrl}>α <span>ALPHA TOOLS</span></a><div className="navlinks"><a href={config.docsUrl} target="_blank">Methodology ↗</a><a href={config.officialUrl} target="_blank">Open {config.name} ↗</a></div></nav>
    <section className="hero"><div className="glow"/><p className="eyebrow">{config.eyebrow}</p><h1>{config.title}</h1><p className="lede">{config.description}</p><div className="truth"><span>✓</span>{config.formulaLabel}</div></section>
    <section className="calculator">
      <div className="panel inputs"><div className="panelTitle"><span>YOUR ACTIVITY</span><button onClick={() => setValues(Object.fromEntries(config.fields.map(f => [f.key, f.defaultValue])))}>Reset</button></div>
        {config.fields.map((field) => <label key={field.key}><div><strong>{field.label}</strong><small>{field.hint}</small></div><div className="inputWrap"><span>{field.unit}</span><input type="number" min={field.min ?? 0} step={field.step ?? 1} value={values[field.key]} onChange={(e) => setValues({...values, [field.key]: Math.max(field.min ?? 0, Number(e.target.value))})}/></div></label>)}
      </div>
      <div className="panel result"><p>ESTIMATED SCORE</p><div className="score">{fmt(result.score)}</div><div className="secondary">{result.secondary}</div><div className="bars">{result.breakdown.map(item => <div className="barRow" key={item.label}><div><span>{item.label}</span><b>{fmt(item.value)}</b></div><i><em style={{width:`${Math.max(2, item.value / maxPart * 100)}%`}}/></i></div>)}</div><a className="cta" href={config.officialUrl} target="_blank">Continue to {config.name} <span>↗</span></a></div>
    </section>
    <section className="notice"><span>i</span><div><strong>Independent estimate</strong><p>{config.disclaimer}</p></div></section>
    <footer><a href={config.portalUrl}>← All Alpha Tools</a><span>Built for research, not financial advice.</span></footer>
  </main>;
}
