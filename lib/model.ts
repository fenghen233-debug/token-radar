// Token Radar value model and data generator.
// Ranks protocols that record no token in DefiLlama data.

export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  is_watchlist: boolean;
  age_days: number | null;
  implied_value_usd: number;
  category_ratio: number;
  momentum_mult: number;
  maturity_mult: number;
  chain_mult: number;
  jitter_mult: number;
  farm_steps: string[];
}

export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  median_implied_usd: number;
  rows: BoardRow[];
}

export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

// Deterministic calendar day arithmetic using Rata Die algorithm (no Date object).
function parseYMDToDays(s: string): number {
  const parts = s.split('-');
  const y = parseInt(parts[0]!, 10);
  const m = parseInt(parts[1]!, 10);
  const d = parseInt(parts[2]!, 10);
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
}

export function daysBetween(asOf: string, listedAt: string | null): number | null {
  if (!listedAt) return null;
  return Math.max(0, parseYMDToDays(asOf) - parseYMDToDays(listedAt));
}

// 32-bit FNV-1a hash of slug for deterministic tie-breaking under 0.1% (no Math.random).
export function slugHash(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

export function isPreToken(p: SnapshotProtocol): boolean {
  return p.gecko_id === null && p.symbol === null;
}

export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && p.category !== 'CEX' && !VERSIONED.test(p.name);
}

export function generateFarmSteps(p: SnapshotProtocol): string[] {
  const name = p.name;
  const chain = p.chains.length > 0 ? p.chains[0]! : 'Ethereum';
  const cat = (p.category ?? '').toLowerCase();

  if (cat.includes('lend') || cat.includes('cdp') || cat.includes('collateral')) {
    return [
      `Prepare a dedicated web3 wallet on ${chain} to interact with ${name}; deposit $20 for network gas. Est. USD cost: $20. Est. time: 5 minutes.`,
      `Supply $100 of USDC or base collateral into ${name} liquidity pool on ${chain} to establish protocol balance. Est. USD cost: $100 deposit plus $4 gas. Est. time: 10 minutes.`,
      `Borrow $40 of secondary stable asset against deposited collateral on ${name} on ${chain} to accrue active borrower score. Est. USD cost: $5 gas fee. Est. time: 8 minutes.`,
      `Repay 10% of borrowed balance periodically on ${name} using ${chain} to establish multi-transaction wallet history. Est. USD cost: $3 gas fee. Est. time: 6 minutes.`,
      `Maintain active health factor above 1.8 on ${name} across ${chain} for at least 45 days. Est. USD cost: $0 ongoing carry cost. Est. time: 45 days retention.`,
      `Review official reward dashboard for ${name} on ${chain} and claim accrued protocol points without signing external permits. Est. USD cost: $2 gas fee. Est. time: 5 minutes.`
    ];
  }
  if (cat.includes('dex') || cat.includes('yield') || cat.includes('swap') || cat.includes('farm')) {
    return [
      `Set up a clean wallet funded with native gas on ${chain} to route decentralized trades through ${name}. Est. USD cost: $15 gas fund. Est. time: 5 minutes.`,
      `Swap $75 worth of native tokens into primary quote assets via ${name} router on ${chain}. Est. USD cost: $75 swap volume and $3 fee. Est. time: 5 minutes.`,
      `Provide $150 of two-sided liquidity into the top USDC pair on ${name} on ${chain} to earn LP shares. Est. USD cost: $150 capital and $6 gas. Est. time: 12 minutes.`,
      `Perform two routine low-slippage rebalances on ${name} on ${chain} to build continuous volume metrics. Est. USD cost: $4 network fees. Est. time: 8 minutes.`,
      `Maintain active LP position in ${name} on ${chain} for at least 30 consecutive days to qualify for long-term LP tier. Est. USD cost: $0 hold fee. Est. time: 30 days.`,
      `Harvest accumulated trading fee rewards from ${name} on ${chain} and verify transaction receipt in ledger. Est. USD cost: $2 claim gas. Est. time: 6 minutes.`
    ];
  }
  if (cat.includes('bridge')) {
    return [
      `Configure destination network RPC on ${chain} and fund native gas for ${name} bridging operations. Est. USD cost: $25 gas reserve. Est. time: 5 minutes.`,
      `Initiate cross-chain transfer of $100 USDC to ${chain} via ${name} canonical bridge gateway. Est. USD cost: $100 transfer plus $8 bridge fee. Est. time: 15 minutes.`,
      `Verify transaction finality on ${chain} explorer and confirm arrival of assets routed by ${name}. Est. USD cost: $0 verification fee. Est. time: 10 minutes.`,
      `Execute reverse transfer of $50 back through ${name} across ${chain} to prove bi-directional route usage. Est. USD cost: $7 protocol fee. Est. time: 15 minutes.`,
      `Hold bridged liquidity on ${chain} inside ${name} partner contracts for 21 days to register snapshot presence. Est. USD cost: $0 holding fee. Est. time: 21 days.`,
      `Complete official ${name} route survey on ${chain} to register verified user credentials onchain. Est. USD cost: $1 gas verification. Est. time: 5 minutes.`
    ];
  }
  if (cat.includes('stake') || cat.includes('restak')) {
    return [
      `Acquire native staking currency on ${chain} ready for deployment into ${name} validator contract. Est. USD cost: $20 gas reserve. Est. time: 5 minutes.`,
      `Deposit $100 of tokens into ${name} liquid staking pool on ${chain} and receive receipt derivative tokens. Est. USD cost: $100 deposit and $4 network gas. Est. time: 10 minutes.`,
      `Deploy ${name} receipt tokens into an approved lending or liquidity module on ${chain}. Est. USD cost: $3 routing fee. Est. time: 8 minutes.`,
      `Restake or rebalance yield distributions on ${name} across ${chain} to reflect active capital management. Est. USD cost: $2 gas fee. Est. time: 5 minutes.`,
      `Hold liquid staking tokens issued by ${name} on ${chain} for a minimum of 40 days across snapshot intervals. Est. USD cost: $0 carry cost. Est. time: 40 days.`,
      `Unstake a nominal portion or claim accrued yield from ${name} on ${chain} to verify complete withdrawal loop. Est. USD cost: $4 unstake gas. Est. time: 10 minutes.`
    ];
  }
  if (cat.includes('derivative') || cat.includes('perpetual') || cat.includes('option') || cat.includes('basis')) {
    return [
      `Deposit $20 of native gas tokens on ${chain} to support high-frequency interaction with ${name}. Est. USD cost: $20 gas. Est. time: 5 minutes.`,
      `Transfer $100 USDC into ${name} margin account on ${chain} to establish initial collateral foundation. Est. USD cost: $100 margin plus $3 gas. Est. time: 8 minutes.`,
      `Open a conservative 1.5x hedged derivative position on ${name} on ${chain} to generate verified trading volume. Est. USD cost: $2 trading fee. Est. time: 10 minutes.`,
      `Adjust stop-loss or take-profit parameters on ${name} on ${chain} to record interactive position management. Est. USD cost: $1 gas update. Est. time: 5 minutes.`,
      `Keep open position active on ${name} on ${chain} for at least 14 days while maintaining safe liquidation margin. Est. USD cost: $0 funding buffer. Est. time: 14 days.`,
      `Close the derivative position on ${name} on ${chain} and settle remaining balance back to your wallet. Est. USD cost: $3 settlement gas. Est. time: 5 minutes.`
    ];
  }
  if (cat.includes('curator') || cat.includes('allocator')) {
    return [
      `Fund gas balance on ${chain} to interact with ${name} curated vault infrastructure. Est. USD cost: $15 gas reserve. Est. time: 5 minutes.`,
      `Allocate $150 of USDC into ${name} top risk-managed strategy vault on ${chain}. Est. USD cost: $150 capital and $5 gas fee. Est. time: 12 minutes.`,
      `Delegate vault governance or strategy voting power on ${name} on ${chain} to register protocol participation. Est. USD cost: $2 voting gas. Est. time: 6 minutes.`,
      `Reallocate $30 between strategy tranches on ${name} on ${chain} to trigger internal vault accounting events. Est. USD cost: $4 gas fee. Est. time: 8 minutes.`,
      `Maintain vault allocation in ${name} on ${chain} for at least 35 days across accounting epochs. Est. USD cost: $0 maintenance fee. Est. time: 35 days.`,
      `Redeem earned vault shares and audit settlement payout on ${name} on ${chain}. Est. USD cost: $3 redemption gas. Est. time: 7 minutes.`
    ];
  }
  return [
    `Establish clean wallet environment on ${chain} and fund transaction gas for ${name}. Est. USD cost: $15 gas. Est. time: 5 minutes.`,
    `Deposit $100 into ${name} primary application gateway on ${chain} according to protocol specifications. Est. USD cost: $100 allocation plus $4 gas. Est. time: 10 minutes.`,
    `Execute primary utility action within ${name} on ${chain} such as minting, trading, or verifying asset proofs. Est. USD cost: $3 interaction gas. Est. time: 8 minutes.`,
    `Conduct periodic health and balance check-ins with ${name} smart contracts on ${chain}. Est. USD cost: $2 verification fee. Est. time: 5 minutes.`,
    `Retain active protocol commitments with ${name} on ${chain} for a qualifying horizon of 30 days. Est. USD cost: $0 retention cost. Est. time: 30 days.`,
    `Claim protocol points, rewards or settled yields directly from ${name} on ${chain}. Est. USD cost: $2 claim gas. Est. time: 5 minutes.`
  ];
}

export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: RadarData } {
  // 1. Compute per-category median mcap/TVL ratio of tokenized protocols in the same category
  const tokenized = snapshot.protocols.filter(
    (p) => (p.gecko_id !== null || p.symbol !== null) && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0
  );
  const allRatios = tokenized.map((p) => p.mcap_usd! / p.tvl_usd);
  const globalMedianRatio = median(allRatios);

  const catRatios = new Map<string, number[]>();
  for (const p of tokenized) {
    const cat = p.category ?? 'Uncategorized';
    if (!catRatios.has(cat)) catRatios.set(cat, []);
    catRatios.get(cat)!.push(p.mcap_usd! / p.tvl_usd);
  }

  const catMedians = new Map<string, number>();
  for (const [cat, ratios] of catRatios.entries()) {
    catMedians.set(cat, median(ratios));
  }

  // 2. Select rows: EVERY watchlist slug must be included, then add more pre-token protocols by TVL to at least 220 rows
  const bySlug = new Map(snapshot.protocols.map((p) => [p.slug, p]));
  const watchlistSet = new Set(snapshot.watchlist);
  const chosen = new Map<string, SnapshotProtocol>();

  for (const slug of snapshot.watchlist) {
    const p = bySlug.get(slug);
    if (p && isPreToken(p)) {
      chosen.set(slug, p);
    }
  }

  const additionalPreToken = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : 1));

  // Add protocols until we have 250 rows (exceeds the 220 minimum)
  const targetTotal = 250;
  for (const p of additionalPreToken) {
    if (chosen.size >= targetTotal) break;
    chosen.set(p.slug, p);
  }

  // 3. Implied value calculation
  const scored = [...chosen.values()].map((p) => {
    const ratio = (p.category && catMedians.has(p.category)) ? catMedians.get(p.category)! : globalMedianRatio;
    const base = p.tvl_usd * ratio;

    // Momentum factor from change_7d (clamped)
    const rawChange = p.change_7d ?? 0;
    const clampedChange = Math.max(-50, Math.min(100, rawChange));
    const momentumMult = 1 + (clampedChange / 100) * 0.4;

    // Maturity premium from listed_at age (capped)
    const ageDays = daysBetween(snapshot.as_of, p.listed_at);
    const ageForModel = ageDays ?? 365;
    const maturityMult = 0.70 + (Math.min(Math.max(ageForModel, 0), 1095) / 1095) * 0.30;

    // Small chain-breadth factor
    const chainCount = p.chains.length > 0 ? p.chains.length : 1;
    const chainMult = 1 + Math.min(Math.max(chainCount - 1, 0), 5) * 0.02;

    // Deterministic slug-hash jitter strictly under 0.1% so values are not tied
    const jitterFraction = (slugHash(p.slug) % 1000) / 1000000;
    const jitterMult = 1 + jitterFraction;

    // Round to whole dollars
    const implied = Math.max(1, Math.round(base * momentumMult * maturityMult * chainMult * jitterMult));

    return {
      p,
      ageDays,
      ratio,
      momentumMult,
      maturityMult,
      chainMult,
      jitterMult,
      implied,
    };
  });

  // Sort by implied value desc, tiebreak by slug
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : 1));

  const board: BoardRow[] = scored.map((s, index) => ({
    rank: index + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    is_watchlist: watchlistSet.has(s.p.slug),
    age_days: s.ageDays,
    implied_value_usd: s.implied,
    category_ratio: Math.round(s.ratio * 10000) / 10000,
    momentum_mult: Math.round(s.momentumMult * 10000) / 10000,
    maturity_mult: Math.round(s.maturityMult * 10000) / 10000,
    chain_mult: Math.round(s.chainMult * 10000) / 10000,
    jitter_mult: Math.round(s.jitterMult * 1000000) / 1000000,
    farm_steps: generateFarmSteps(s.p),
  }));

  const allImplied = board.map((r) => r.implied_value_usd);
  const medianImplied = median(allImplied);

  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model_version: 'radar-v2-implied-market',
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    median_implied_usd: medianImplied,
    rows: board,
  };

  return { board, radar };
}

export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new SnapshotError('snapshot.json is not a JSON object');
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) {
    throw new SnapshotError('snapshot.json has no valid as_of date');
  }
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) {
    throw new SnapshotError('snapshot.json has no floor_usd');
  }
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) {
    throw new SnapshotError('snapshot.json has no watchlist of slugs');
  }

  const protocols: SnapshotProtocol[] = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
      throw new SnapshotError(`protocol ${i} is not an object`);
    }
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number') {
      throw new SnapshotError(`protocol ${i} lacks slug, name, or TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });

  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `board misses ${missing.length} watchlist slugs: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) {
    if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  }
  for (let i = 1; i < board.length; i++) {
    if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) {
      return `row ${i + 1} outranks row ${i} on implied value`;
    }
  }
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all rows share same implied value: $${board[0]!.implied_value_usd}`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) {
      if (s.length < 20 || s.length > 600) return `${r.slug} has step with length ${s.length}`;
    }
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) {
      return `${r.slug} has invalid implied value ${r.implied_value_usd}`;
    }
  }
  return null;
}

export function dataScript(radar: RadarData): string {
  const json = JSON.stringify(radar);
  return `window.BOARD_DATA = ${json};\nwindow.RADAR = window.BOARD_DATA;\n`;
}
