"use client";
import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { config } from "./config";

type Metric={label:string;value:string;note?:string};
type CheckResult={title:string;status:string;metrics:Metric[];source:string;warning?:string};
const fmt=(n:number)=>new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(Number.isFinite(n)?n:0);

export default function ClientCalculator(){
 const [values,setValues]=useState<Record<string,number>>(()=>Object.fromEntries(config.fields.map(f=>[f.key,f.defaultValue])));
 const [address,setAddress]=useState(""); const [checking,setChecking]=useState(false); const [check,setCheck]=useState<CheckResult|null>(null); const [error,setError]=useState("");
 const result=useMemo(()=>config.calculate(values),[values]); const maxPart=Math.max(1,...result.breakdown.map(i=>i.value));
 async function inspect(e:FormEvent){e.preventDefault();setError("");setCheck(null);if(!/^0x[a-fA-F0-9]{40}$/.test(address)){setError("Enter a valid 0x wallet address.");return}setChecking(true);try{const r=await fetch(`/api/account?address=${encodeURIComponent(address)}`);const data=await r.json();if(!r.ok)throw new Error(data.error||"Data source is unavailable");setCheck(data)}catch(err){setError(err instanceof Error?err.message:"Could not check this address") }finally{setChecking(false)}}
 const style={"--accent":config.accent,"--accent2":config.accent2,"--page":config.background,"--surface":config.surface,"--ink":config.text,"--muted":config.muted} as React.CSSProperties;
 return <main style={style}>
  <nav><a className="brand" href={config.portalUrl}><span className="alpha">α</span><span>ALPHA TOOLS</span></a><div className="navlinks"><a href={config.docsUrl} target="_blank">Methodology ↗</a><a href={config.officialUrl} target="_blank">Open {config.name} ↗</a></div></nav>
  <section className="hero"><div className="glow"/><Image className="projectLogo" src={config.logo} alt={`${config.name} official logo`} width={260} height={88} priority/><p className="eyebrow">{config.eyebrow}</p><h1>{config.title}</h1><p className="lede">{config.description}</p><div className="truth"><span>✓</span>{config.formulaLabel}</div></section>
  <section className="checker panel"><div><p className="eyebrow">LIVE ADDRESS CHECK</p><h2>Check public wallet data</h2><p>{config.checkerText}</p></div><form onSubmit={inspect}><input aria-label="Wallet address" placeholder="0x…" value={address} onChange={e=>setAddress(e.target.value.trim())}/><button disabled={checking}>{checking?"Checking…":"Check address"}</button></form>{error&&<p className="error">{error}</p>}{check&&<div className="checkResult"><div className="checkHead"><strong>{check.title}</strong><span>{check.status}</span></div><div className="metricGrid">{check.metrics.map(m=><div key={m.label}><small>{m.label}</small><b>{m.value}</b>{m.note&&<em>{m.note}</em>}</div>)}</div>{check.warning&&<p className="warning">{check.warning}</p>}<a href={check.source} target="_blank">Open source ↗</a></div>}</section>
  <section className="calculator"><div className="panel inputs"><div className="panelTitle"><span>YOUR ACTIVITY</span><button onClick={()=>setValues(Object.fromEntries(config.fields.map(f=>[f.key,f.defaultValue])))}>Reset</button></div>{config.fields.map(field=><label key={field.key}><div><strong>{field.label}</strong><small>{field.hint}</small></div><div className="inputWrap"><span>{field.unit}</span><input type="number" min={field.min??0} step={field.step??1} value={values[field.key]} onChange={e=>setValues({...values,[field.key]:Math.max(field.min??0,Number(e.target.value))})}/></div></label>)}</div><div className="panel result"><p>ESTIMATED SCORE</p><div className="score">{fmt(result.score)}</div><div className="secondary">{result.secondary}</div><div className="bars">{result.breakdown.map(item=><div className="barRow" key={item.label}><div><span>{item.label}</span><b>{fmt(item.value)}</b></div><i><em style={{width:`${Math.max(2,item.value/maxPart*100)}%`}}/></i></div>)}</div><a className="cta" href={config.officialUrl} target="_blank">Continue to {config.name}<span>↗</span></a></div></section>
  <section className="facts">{config.facts.map((fact,i)=><article className="panel" key={fact}><span>0{i+1}</span><p>{fact}</p></article>)}</section>
  <section className="notice"><span>i</span><div><strong>Independent estimate</strong><p>{config.disclaimer}</p></div></section><footer><a href={config.portalUrl}>← All Alpha Tools</a><span>Public data · transparent assumptions · not financial advice.</span></footer>
 </main>
}
