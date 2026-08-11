import { config } from "../../config";

type JsonRecord = Record<string, unknown>;

const valid = (value: string | null): value is string => Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
const money = (value: number) => `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const numeric = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

async function json(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) throw new Error(`Upstream service returned ${response.status}`);
  return response.json() as Promise<JsonRecord>;
}

async function evmRpc(rpcUrl: string, method: string, params: unknown[]) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  const payload = await response.json() as { result?: string; error?: { message?: string } };
  if (!response.ok || payload.error || payload.result === undefined) {
    throw new Error(payload.error?.message || "RPC request failed");
  }
  return payload.result;
}

async function abstractPublicProfile(address: string) {
  const base = "https://backend.portal.abs.xyz/api";
  const [profile, sessions, votes, streak] = await Promise.all([
    json(`${base}/user/address/${address}`),
    json(`${base}/user/${address}/sessions`).catch(() => ({ sessions: [] })),
    json(`${base}/user/${address}/votes`).catch(() => ({ votedApps: [] })),
    json(`${base}/user/${address}/vote-streak`).catch(() => ({})),
  ]);
  return { profile, sessions, votes, streak };
}

async function checkNansen(address: string) {
  const data = await json(`https://app.nansen.ai/api/points-leaderboard/${address}`);
  const tier = String(data.tier ?? "none");
  return Response.json({
    title: "Nansen public points record",
    status: "LIVE · NANSEN",
    metrics: [
      { label: "Points tier", value: tier.toUpperCase(), note: "Official public response" },
      { label: "Exact NXP", value: "Private", note: "Not exposed by the public API" },
      { label: "Refresh", value: "Daily", note: "Nansen refresh schedule" },
    ],
    source: `https://app.nansen.ai/points?address=${address}`,
    warning: "A NONE tier can include wallets below the public threshold; it does not prove a zero private NXP balance.",
  });
}

async function checkAbstract(address: string) {
  const rpcUrl = "https://api.mainnet.abs.xyz";
  const [balanceHex, nonceHex, code, portal] = await Promise.all([
    evmRpc(rpcUrl, "eth_getBalance", [address, "latest"]),
    evmRpc(rpcUrl, "eth_getTransactionCount", [address, "latest"]),
    evmRpc(rpcUrl, "eth_getCode", [address, "latest"]),
    abstractPublicProfile(address),
  ]);
  const user = (portal.profile.user ?? {}) as JsonRecord;
  const streak = portal.streak as JsonRecord;
  const badges = Array.isArray(user.badges) ? user.badges as JsonRecord[] : [];
  const claimedBadges = badges.filter((entry) => entry.claimed === true).length;
  const sessionList = Array.isArray(portal.sessions.sessions) ? portal.sessions.sessions as JsonRecord[] : [];
  const appNames = new Set(sessionList.map((entry) => (entry.app as JsonRecord | undefined)?.name).filter(Boolean));
  const votedApps = Array.isArray(portal.votes.votedApps) ? portal.votes.votedApps.length : 0;
  const tierLevel = numeric(user.tierV2);
  const tier = tierLevel === 8 ? "Gold II" : tierLevel > 0 ? `Level ${tierLevel}` : "Unranked";
  const balance = Number(BigInt(balanceHex)) / 1e18;
  const nonce = Number(BigInt(nonceHex));

  return Response.json({
    title: "Abstract Portal + mainnet account",
    status: "LIVE · OFFICIAL PUBLIC DATA",
    metrics: [
      { label: "Portal tier", value: tier, note: tierLevel > 0 ? `Public tier level ${tierLevel}` : "No public tier" },
      { label: "Claimed badges", value: claimedBadges.toLocaleString("en-US"), note: "Public Portal profile" },
      { label: "Connected apps", value: appNames.size.toLocaleString("en-US"), note: `${sessionList.length} public session(s)` },
      { label: "Longest vote streak", value: `${numeric(streak.longestStreakDays)} days`, note: `${votedApps} app vote(s) this epoch` },
      { label: "Exact Portal XP", value: "Sign-in required", note: "Public wallet response omits total XP" },
      { label: "ETH balance", value: balance.toLocaleString("en-US", { maximumFractionDigits: 6 }), note: "Abstract mainnet" },
      { label: "Transaction nonce", value: nonce.toLocaleString("en-US"), note: "Direct account transactions" },
      { label: "Account type", value: code !== "0x" ? "Contract" : "EOA", note: "AGW is usually a smart account" },
    ],
    source: `https://portal.abs.xyz/profile/${address}`,
    warning: "The public Portal endpoint exposes tier, claimed badges, app sessions and votes, but not totalExperiencePoints. Paste the 537,694 XP shown in your signed-in profile into ‘Official points override’ to model this wallet without fabricating a value.",
  });
}

async function checkDreamcash(address: string) {
  const post = async (type: string) => {
    const response = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, user: address }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Hyperliquid API unavailable");
    return response.json() as Promise<unknown>;
  };
  const [fillsData, stateData] = await Promise.all([post("userFills"), post("clearinghouseState")]);
  const fills = Array.isArray(fillsData) ? fillsData as JsonRecord[] : [];
  const state = (stateData ?? {}) as JsonRecord;
  const volume = fills.reduce((sum, fill) => sum + numeric(fill.sz) * numeric(fill.px), 0);
  const fees = fills.reduce((sum, fill) => sum + Math.abs(numeric(fill.fee)), 0);
  const symbols = new Set(fills.map((fill) => String(fill.coin ?? "")).filter(Boolean));
  const positionsRaw = Array.isArray(state.assetPositions) ? state.assetPositions as JsonRecord[] : [];
  const positions = positionsRaw.filter((entry) => numeric((entry.position as JsonRecord | undefined)?.szi) !== 0).length;
  const marginSummary = (state.marginSummary ?? {}) as JsonRecord;
  return Response.json({
    title: "Dreamcash underlying trading wallet",
    status: "LIVE · HYPERLIQUID",
    metrics: [
      { label: "Returned fills", value: fills.length.toLocaleString("en-US"), note: `${symbols.size} traded market(s)` },
      { label: "Fill notional", value: money(volume), note: "All Hyperliquid frontends" },
      { label: "Fees paid", value: money(fees), note: "Absolute fees in returned fills" },
      { label: "Account value", value: money(numeric(marginSummary.accountValue)), note: `${positions} open position(s)` },
    ],
    source: "https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint",
    warning: "Hyperliquid does not identify the originating frontend in this response. Only Dreamcash-routed Mobile/WebApp volume should be copied into the XP calculator.",
  });
}

async function checkPredict(address: string) {
  const apiKey = process.env.PREDICT_API_KEY;
  if (apiKey) {
    const payload = await json(`https://api.predict.fun/v1/positions/${address}`, { headers: { "x-api-key": apiKey } });
    const raw = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.positions) ? payload.positions : [];
    const positions = raw as JsonRecord[];
    const value = positions.reduce((sum, position) => sum + numeric(position.valueUsd ?? position.value_usd), 0);
    const pnl = positions.reduce((sum, position) => sum + numeric(position.pnlUsd ?? position.pnl_usd), 0);
    const size = positions.reduce((sum, position) => sum + numeric(position.amount), 0);
    return Response.json({
      title: "Predict.fun wallet positions",
      status: "LIVE · PREDICT API",
      metrics: [
        { label: "Positions", value: positions.length.toLocaleString("en-US"), note: "Official Predict API" },
        { label: "Position value", value: money(value), note: "Current USD value" },
        { label: "Position PnL", value: money(pnl), note: "Reported by Predict" },
        { label: "Outcome tokens", value: size.toLocaleString("en-US", { maximumFractionDigits: 2 }), note: "Aggregate amount" },
      ],
      source: "https://dev.predict.fun/get-positions-by-address-32675934e0",
      warning: "Predict points and their weekly weights are not returned by the positions endpoint.",
    });
  }

  const rpcUrl = "https://bsc-dataseed.bnbchain.org";
  const [balanceHex, nonceHex, code] = await Promise.all([
    evmRpc(rpcUrl, "eth_getBalance", [address, "latest"]),
    evmRpc(rpcUrl, "eth_getTransactionCount", [address, "latest"]),
    evmRpc(rpcUrl, "eth_getCode", [address, "latest"]),
  ]);
  return Response.json({
    title: "Predict.fun settlement wallet",
    status: "LIVE · BNB CHAIN",
    metrics: [
      { label: "BNB balance", value: (Number(BigInt(balanceHex)) / 1e18).toLocaleString("en-US", { maximumFractionDigits: 6 }), note: "Current onchain balance" },
      { label: "Transaction nonce", value: Number(BigInt(nonceHex)).toLocaleString("en-US"), note: "Direct BNB Chain transactions" },
      { label: "Account type", value: code !== "0x" ? "Contract" : "EOA", note: "Public chain state" },
      { label: "Predict positions", value: "API key required", note: "Official API access is gated" },
    ],
    source: "https://dev.predict.fun/get-positions-by-address-32675934e0",
    warning: "Live Predict positions require a project-issued API key. The checker still returns real BNB Chain account data and never invents private points.",
  });
}

async function checkDyli(address: string) {
  const rpcUrl = "https://api.mainnet.abs.xyz";
  const usdcContract = "0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1";
  const calldata = `0x70a08231000000000000000000000000${address.slice(2).toLowerCase()}`;
  const [balanceHex, nonceHex, usdcHex, portal] = await Promise.all([
    evmRpc(rpcUrl, "eth_getBalance", [address, "latest"]),
    evmRpc(rpcUrl, "eth_getTransactionCount", [address, "latest"]),
    evmRpc(rpcUrl, "eth_call", [{ to: usdcContract, data: calldata }, "latest"]),
    abstractPublicProfile(address).catch(() => null),
  ]);
  const user = (portal?.profile.user ?? {}) as JsonRecord;
  const badges = Array.isArray(user.badges) ? user.badges as JsonRecord[] : [];
  const dyliBadges = badges.filter((entry) => String((entry.badge as JsonRecord | undefined)?.name ?? "").toLowerCase().includes("dyli") && entry.claimed === true).length;
  return Response.json({
    title: "DYLI wallet on Abstract",
    status: "LIVE · ABSTRACT MAINNET",
    metrics: [
      { label: "USDC balance", value: money(Number(BigInt(usdcHex)) / 1e6), note: "Collecting currency on Abstract" },
      { label: "ETH balance", value: (Number(BigInt(balanceHex)) / 1e18).toLocaleString("en-US", { maximumFractionDigits: 6 }), note: "Gas balance" },
      { label: "Transaction nonce", value: Number(BigInt(nonceHex)).toLocaleString("en-US"), note: "Direct wallet transactions" },
      { label: "Public DYLI badges", value: dyliBadges.toLocaleString("en-US"), note: "Matching claimed Portal badges" },
      { label: "Exact Diamonds", value: "Sign-in required", note: "Private DYLI rewards ledger" },
    ],
    source: "https://docs.dyli.io/core-features/your-profile/dyli-wallet",
    warning: "Balances are live onchain data. Purchases, Dabble actions, referrals and exact Diamonds remain in the authenticated DYLI account.",
  });
}

async function checkRisex(address: string) {
  const payload = await json(`https://api.rise.trade/v1/portfolio/details?account=${address}`);
  const data = (payload.data ?? {}) as JsonRecord;
  const summary = (data.summary ?? {}) as JsonRecord;
  const positionsRaw = Array.isArray(data.positions) ? data.positions as JsonRecord[] : [];
  const activePositions = positionsRaw.filter((position) => numeric(position.size) !== 0);
  return Response.json({
    title: "RISEx portfolio",
    status: "LIVE · RISE API",
    metrics: [
      { label: "Account value", value: money(numeric(summary.total_account_value)), note: "Official portfolio summary" },
      { label: "Total notional", value: money(numeric(summary.total_notional)), note: "Current exposure" },
      { label: "Realized PnL", value: money(numeric(summary.realized_pnl)), note: "Official account value" },
      { label: "Unrealized PnL", value: money(numeric(summary.total_unrealized_pnl)), note: `${activePositions.length} active position(s)` },
      { label: "Free collateral", value: money(numeric(summary.free_collateral)), note: "Available margin" },
      { label: "Risk level", value: String(summary.risk_level ?? "Unknown"), note: `Leverage ${numeric(summary.account_leverage).toLocaleString("en-US", { maximumFractionDigits: 2 })}x` },
    ],
    source: "https://developer.rise.trade/reference/accountservice_getportfoliodetails",
    warning: "These are real portfolio metrics from the public RISEx API. Exact Ignite points and internal weekly weights are not exposed.",
  });
}

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");
  if (!valid(address)) return Response.json({ error: "Invalid wallet address" }, { status: 400 });
  try {
    switch (config.slug) {
      case "nansen": return await checkNansen(address);
      case "abstract": return await checkAbstract(address);
      case "dreamcash": return await checkDreamcash(address);
      case "predictfun": return await checkPredict(address);
      case "dyli": return await checkDyli(address);
      case "risex": return await checkRisex(address);
      default: throw new Error("Unsupported project checker");
    }
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upstream source unavailable" }, { status: 502 });
  }
}
