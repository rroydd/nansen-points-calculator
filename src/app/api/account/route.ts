import { config } from "../../config";

const valid=(value:string|null)=>Boolean(value&&/^0x[a-fA-F0-9]{40}$/.test(value));
const money=(value:number)=>`$${value.toLocaleString("en-US",{maximumFractionDigits:2})}`;

export async function GET(request:Request){
 const address=new URL(request.url).searchParams.get("address");
 if(!valid(address))return Response.json({error:"Invalid wallet address"},{status:400});
 try{
  if(config.checkerMode==="nansen"){
   const response=await fetch(`https://app.nansen.ai/api/points-leaderboard/${address}`,{cache:"no-store"});
   if(!response.ok)throw new Error("Nansen points service is unavailable");
   const data=await response.json(); const tier=String(data.tier??"none");
   return Response.json({title:"Nansen public points record",status:"LIVE · NANSEN",metrics:[{label:"Points tier",value:tier.toUpperCase(),note:"Official public response"},{label:"Exact NXP",value:"Private",note:"Not exposed by API"},{label:"Refresh",value:"Daily",note:"Around 11:00 UTC"}],source:"https://docs.nansen.ai/api/points",warning:"A ‘none’ tier can include wallets below the public threshold; it does not prove a zero private balance."});
  }
  if(config.checkerMode==="abstract"){
   const rpc=async(method:string)=>{const r=await fetch("https://api.mainnet.abs.xyz",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params:[address,"latest"]}),cache:"no-store"});const j=await r.json();if(j.error)throw new Error(j.error.message);return j.result as string};
   const [balanceHex,nonceHex,code]=await Promise.all([rpc("eth_getBalance"),rpc("eth_getTransactionCount"),rpc("eth_getCode")]);
   const balance=Number(BigInt(balanceHex))/1e18,nonce=Number(BigInt(nonceHex));
   return Response.json({title:"Abstract mainnet account",status:"LIVE · CHAIN 2741",metrics:[{label:"ETH balance",value:balance.toLocaleString("en-US",{maximumFractionDigits:6}),note:"Current onchain balance"},{label:"Transaction nonce",value:nonce.toLocaleString("en-US"),note:"Direct account transactions"},{label:"Account type",value:code!=="0x"?"Contract":"EOA",note:"AGW is usually a smart account"},{label:"Explorer",value:"Abscan",note:"Open source below"}],source:`https://abscan.org/address/${address}`,warning:"These are real chain metrics, not Abstract Portal XP. Smart-account internal calls and app activity can exceed the transaction nonce."});
  }
  if(config.checkerMode==="hyperliquid"){
   const post=async(type:string)=>{const r=await fetch("https://api.hyperliquid.xyz/info",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type,user:address}),cache:"no-store"});if(!r.ok)throw new Error("Hyperliquid API unavailable");return r.json()};
   const [fills,state]=await Promise.all([post("userFills"),post("clearinghouseState")]);
   const volume=(fills as Array<Record<string,string>>).reduce((s,f)=>s+Number(f.sz||0)*Number(f.px||0),0),fees=(fills as Array<Record<string,string>>).reduce((s,f)=>s+Number(f.fee||0),0),positions=(state.assetPositions||[]).filter((p:{position?:{szi?:string}})=>Number(p.position?.szi||0)!==0).length;
   return Response.json({title:"Hyperliquid wallet activity",status:"LIVE · HYPERLIQUID",metrics:[{label:"Returned fills",value:fills.length.toLocaleString("en-US"),note:"API history window"},{label:"Fill notional",value:money(volume),note:"All Hyperliquid frontends"},{label:"Fees in fills",value:money(fees),note:"Signed fee values"},{label:"Account value",value:money(Number(state.marginSummary?.accountValue||0)),note:`${positions} open position(s)`}],source:"https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint",warning:"Hyperliquid cannot identify which frontend created every fill here. Do not treat the total as Dreamcash-eligible XP volume."});
  }
  return Response.json({title:`${config.name} rewards`,status:"OFFICIAL PROFILE REQUIRED",metrics:[{label:"Public wallet API",value:"Not available",note:"No documented stable endpoint"},{label:"Exact points",value:"Private",note:"Check signed-in profile"},{label:"Calculator",value:"Scenario",note:"Published signals only"}],source:config.officialUrl,warning:"No number is fabricated: connect this wallet on the official project page to view the authoritative rewards balance."});
 }catch(error){return Response.json({error:error instanceof Error?error.message:"Upstream source unavailable"},{status:502})}
}
