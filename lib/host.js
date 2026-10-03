// dsh-peak-clock  Host（Node）半边
//
// 提供同源只读接口 GET/HEAD /peak-clock/v1/now，返回当前峰谷时段与下一次切换时间。
//
// 口径来源（DeepSeek 官方定价页）：
//   https://api-docs.deepseek.com/zh-cn/quick_start/pricing/
//   北京时间周一至周五（不含中国法定节假日）09:00-12:00、14:00-18:00 为高峰时段；
//   其余时段（含周末与中国法定节假日全天）为空闲时段，空闲价格为高峰的一半。
//
// 纯函数（beijingParts / holidayName / nextChangeAt / periodAt）全部导出，便于单测。

export const name = "dsh-peak-clock";
export const inject = ["sessionQuery", "webServer"];

/** 高峰窗口（北京时间小时，左闭右开） */
export const PEAK_WINDOWS = [[9, 12], [14, 18]];

/** 每天可能发生切换的边界点（北京时间小时） */
const DAY_BOUNDARIES = [0, 9, 12, 14, 18];

/** 法定节假日放假区间（含首尾，北京时间 YYYY-MM-DD）每年按国务院安排更新 */
export const HOLIDAYS = [
  { start: "2026-01-01", end: "2026-01-03", name: "元旦" },
  { start: "2026-02-15", end: "2026-02-23", name: "春节" },
  { start: "2026-04-04", end: "2026-04-06", name: "清明节" },
  { start: "2026-05-01", end: "2026-05-05", name: "劳动节" },
  { start: "2026-06-19", end: "2026-06-21", name: "端午节" },
  { start: "2026-09-25", end: "2026-09-27", name: "中秋节" },
  { start: "2026-10-01", end: "2026-10-07", name: "国庆节" }
];

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;
const BEIJING_OFFSET_MS = 8 * HOUR_MS;

function pad(n) {
  return (n < 10 ? "0" : "") + n;
}

/** 时间戳 -> 北京时间字段（中国无夏令时，固定 UTC+8） */
export function beijingParts(ms) {
  const d = new Date(ms + BEIJING_OFFSET_MS);
  return {
    dateKey: d.toISOString().slice(0, 10),
    weekday: d.getUTCDay(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes()
  };
}

/** 命中的法定节假日名称；未命中返回 null */
export function holidayName(dateKey) {
  for (let i = 0; i < HOLIDAYS.length; i++) {
    const h = HOLIDAYS[i];
    if (dateKey >= h.start && dateKey <= h.end) return h.name;
  }
  return null;
}

/** 只看"日期 + 时刻"判定时段，不算切换点（避免递归） */
export function rawPeriod(ms) {
  const p = beijingParts(ms);
  const holiday = holidayName(p.dateKey);
  if (holiday) return { period: "idle", reason: "holiday", holiday: holiday };
  if (p.weekday === 0 || p.weekday === 6) {
    return { period: "idle", reason: "weekend", holiday: null };
  }
  const minutes = p.hour * 60 + p.minute;
  let inPeak = false;
  for (let i = 0; i < PEAK_WINDOWS.length; i++) {
    const w = PEAK_WINDOWS[i];
    if (minutes >= w[0] * 60 && minutes < w[1] * 60) inPeak = true;
  }
  return { period: inPeak ? "peak" : "idle", reason: inPeak ? "window" : "off-window", holiday: null };
}

/** 北京时间当天 00:00 对应的 UTC 毫秒 */
function beijingDayStart(ms) {
  const shifted = ms + BEIJING_OFFSET_MS;
  return Math.floor(shifted / DAY_MS) * DAY_MS - BEIJING_OFFSET_MS;
}

/** 下一次时段切换的时间戳；最多向后扫 45 天 */
export function nextChangeAt(ms) {
  const current = rawPeriod(ms).period;
  const dayStart = beijingDayStart(ms);
  for (let day = 0; day <= 45; day++) {
    const base = dayStart + day * DAY_MS;
    for (let i = 0; i < DAY_BOUNDARIES.length; i++) {
      const t = base + DAY_BOUNDARIES[i] * HOUR_MS;
      if (t <= ms) continue;
      if (rawPeriod(t).period !== current) return t;
    }
  }
  return null;
}

/** 汇总：当前时段 + 下次切换点 */
export function periodAt(ms) {
  const r = rawPeriod(ms);
  const p = beijingParts(ms);
  return {
    now: ms,
    period: r.period,
    reason: r.reason,
    holiday: r.holiday,
    dateKey: p.dateKey,
    beijingTime: p.dateKey + " " + pad(p.hour) + ":" + pad(p.minute),
    weekday: p.weekday,
    nextChangeAt: nextChangeAt(ms),
    nextPeriod: r.period === "peak" ? "idle" : "peak"
  };
}

export function apply(ctx) {
  ctx.effect(function () {
    return ctx.webServer.register({
      kind: "exact",
      path: "/peak-clock/v1/now",
      handler: function (req, res) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        if (req.method !== "GET" && req.method !== "HEAD") {
          res.writeHead(405);
          res.end();
          return;
        }
        try {
          const info = periodAt(Date.now());
          const sys = systemZoneInfo(Date.now());
          const body = JSON.stringify({
            period: info.period,
            reason: info.reason,
            holiday: info.holiday,
            beijingTime: info.beijingTime,
            dateKey: info.dateKey,
            timeZone: "Asia/Shanghai",
            nextChangeAt: info.nextChangeAt,
            nextPeriod: info.nextPeriod,
            peakWindows: ["09:00-12:00", "14:00-18:00"],
            holidayTableYear: 2026,
            localTime: localTimeString(Date.now()),
            systemZone: sys.zone,
            systemOffsetMinutes: sys.offsetMinutes,
            source: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing/"
          });
          res.writeHead(200);
          res.end(req.method === "HEAD" ? undefined : body);
        } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ ok: false, error: String((err && err.message) || err) }));
        }
      }
    });
  });
  ctx.effect(function () {
    return ctx.webServer.register({
      kind: "exact",
      path: "/peak-clock/v1/session",
      handler: sessionHandler(ctx)
    });
  });
}

// ===================== 会话用量 / 费用 =====================
// 价格来源：https://api-docs.deepseek.com/zh-cn/quick_start/pricing/（元 / 百万 tokens）
// hit = 缓存命中输入，miss = 缓存未命中输入（缓存写入按未命中计），out = 输出
export const PRICES = {
  "deepseek-flash": { idle: { hit: 0.02, miss: 1, out: 4 }, peak: { hit: 0.04, miss: 2, out: 8 } },
  "deepseek-v4-pro": { idle: { hit: 0.15, miss: 4.5, out: 13.5 }, peak: { hit: 0.3, miss: 9, out: 27 } }
};

/** 模型名 -> 价格档（未知模型按名字里的 pro/flash/chat/reasoner 兜底） */
export function priceFor(model) {
  const key = String(model || "").toLowerCase();
  if (PRICES[key]) return PRICES[key];
  if (key.indexOf("pro") >= 0) return PRICES["deepseek-v4-pro"];
  if (key.indexOf("flash") >= 0 || key.indexOf("chat") >= 0 || key.indexOf("reasoner") >= 0) return PRICES["deepseek-flash"];
  return null;
}

/** 单次调用费用（元） */
export function costOfUsage(model, period, usage) {
  const p = priceFor(model);
  if (!p) return 0;
  const t = period === "peak" ? p.peak : p.idle;
  const miss = (usage.inputTokens || 0) + (usage.cacheWriteTokens || 0);
  const hit = usage.cacheReadTokens || 0;
  return (miss * t.miss + hit * t.hit + (usage.outputTokens || 0) * t.out) / 1e6;
}

const USAGE_CACHE_TTL_MS = 5000;
const usageCache = new Map();

// ===================== 时区（随系统） =====================
/** 本机时区信息：Node 跟随系统时区（含夏令时） */
export function systemZoneInfo(ms) {
  const d = new Date(ms === undefined ? Date.now() : ms);
  let zone = "";
  try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (err) { zone = ""; }
  return { zone: zone || "local", offsetMinutes: -d.getTimezoneOffset() };
}

/** 本机时区"当天 00:00"的时间戳 */
export function localDayStart(ms) {
  const off = -new Date(ms).getTimezoneOffset() * 60000;
  return Math.floor((ms + off) / 86400000) * 86400000 - off;
}

/** 本机时区时间字符串 YYYY-MM-DD HH:mm */
export function localTimeString(ms) {
  const off = -new Date(ms).getTimezoneOffset() * 60000;
  const d = new Date(ms + off);
  return d.toISOString().slice(0, 10) + " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes());
}

/** 从会话事件中抽取"每次调用"：按 (turn, step) 去重，取最后一次累计快照 */
function sessionSteps(events) {
  const steps = new Map();
  let provider, model;
  for (const ev of events) {
    if (!ev) continue;
    if (ev.type === "request/header") {
      const c = ev.data && ev.data.header && ev.data.header.config;
      if (c) { if (c.provider) provider = c.provider; if (c.model) model = c.model; }
      continue;
    }
    let usage = null;
    if (ev.type === "assistant/chunk" && ev.data && ev.data.chunk && ev.data.chunk.type === "usage") usage = ev.data.chunk.usage;
    else if (ev.type === "assistant/message" && ev.data && ev.data.usage !== undefined) usage = ev.data.usage;
    if (!usage) continue;
    const key = String(ev.data.turn === undefined ? "x" : ev.data.turn) + ":" + String(ev.data.step === undefined ? ev.seq : ev.data.step);
    steps.set(key, { usage: usage, time: ev.time || Date.now(), model: model });
  }
  return { list: Array.from(steps.values()), provider: provider, model: model };
}

/** 汇总若干"调用"：within 可选过滤；返回 token/费用/调用数/首末时间 */
function summarizeSteps(steps, within, fallbackModel) {
  const tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let cost = 0, calls = 0, peakCalls = 0, firstAt = null, lastAt = null;
  for (const st of steps) {
    if (within && !within(st.time)) continue;
    const u = st.usage;
    tokens.input += u.inputTokens || 0;
    tokens.output += u.outputTokens || 0;
    tokens.cacheRead += u.cacheReadTokens || 0;
    tokens.cacheWrite += u.cacheWriteTokens || 0;
    const period = rawPeriod(st.time).period;
    if (period === "peak") peakCalls++;
    cost += costOfUsage(st.model || fallbackModel, period, u);
    if (firstAt === null || st.time < firstAt) firstAt = st.time;
    if (lastAt === null || st.time > lastAt) lastAt = st.time;
    calls++;
  }
  return {
    calls: calls,
    peakCalls: peakCalls,
    firstAt: firstAt,
    lastAt: lastAt,
    cost: cost,
    tokens: {
      input: tokens.input, output: tokens.output,
      cacheRead: tokens.cacheRead, cacheWrite: tokens.cacheWrite,
      total: tokens.input + tokens.output + tokens.cacheRead + tokens.cacheWrite
    }
  };
}
/** 统计某会话：按 (turn, step) 去重同一 step 的 usage 是累计快照，取最后一次 */
export async function usageOf(ctx, id) {
  const cached = usageCache.get(id);
  if (cached && Date.now() - cached.at < USAGE_CACHE_TTL_MS) return cached.value;
  const s = await ctx.sessionQuery.readSession(id);
  const header = (s && (s.session || s.header)) || null;
  const collected = sessionSteps((s && s.events) || []);
  const sum = summarizeSteps(collected.list, null, collected.model);
  const value = {
    sessionId: (header && header.id) || id,
    model: collected.model || null,
    provider: collected.provider || null,
    calls: sum.calls,
    peakCalls: sum.peakCalls,
    tokens: sum.tokens,
    cost: Math.round(sum.cost * 1e6) / 1e6,
    currency: "CNY",
    firstAt: sum.firstAt,
    lastAt: sum.lastAt
  };
  usageCache.set(id, { at: Date.now(), value: value });
  return value;
}

/** 未传 id 时兜底：最近活跃的会话 */
async function latestSessionId(ctx) {
  const list = await ctx.sessionQuery.listSessions();
  if (!list || list.length === 0) return null;
  let best = null, bestAt = -1;
  for (const r of list) {
    const h = (r && r.header) || {};
    const t = h.updatedAt || h.lastEventAt || h.createdAt || 0;
    if (t > bestAt) { bestAt = t; best = h.id || null; }
  }
  return best;
}

/** GET/HEAD /peak-clock/v1/session[?id=...] */
function sessionHandler(ctx) {
  return async function (req, res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); res.end(); return; }
    let payload;
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      let id = url.searchParams.get("id") || "";
      if (!id) id = (await latestSessionId(ctx)) || "";
      const sys = systemZoneInfo(Date.now());
      payload = { ok: true, serverTime: Date.now(), system: { zone: sys.zone, offsetMinutes: sys.offsetMinutes }, session: id ? await usageOf(ctx, id) : null, today: await todayUsage(ctx) };
    } catch (err) {
      payload = { ok: false, error: String((err && err.message) || err) };
    }
    const body = JSON.stringify(payload);
    res.writeHead(200);
    res.end(req.method === "HEAD" ? undefined : body);
  };
}

// ===================== 今日消费（本机时区） =====================
const TODAY_CACHE_TTL_MS = 60000;
let todayCache = { at: 0, value: null };

/** 今日（本机时区当天 00:00 起）跨会话消费合计 */
export async function todayUsage(ctx) {
  const now = Date.now();
  if (todayCache.value && now - todayCache.at < TODAY_CACHE_TTL_MS) return todayCache.value;
  const from = localDayStart(now);
  const to = from + 86400000;
  const within = function (t) { return t >= from && t < to; };
  const list = (await ctx.sessionQuery.listSessions()) || [];
  const tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let cost = 0, calls = 0, sessions = 0;
  for (const rec of list) {
    const id = rec && rec.header && rec.header.id;
    if (!id) continue;
    let snap = null;
    try { snap = await ctx.sessionQuery.readSession(id); } catch (err) { continue; }
    const sum = summarizeSteps(sessionSteps((snap && snap.events) || []).list, within);
    if (sum.calls === 0) continue;
    sessions++;
    calls += sum.calls;
    cost += sum.cost;
    tokens.input += sum.tokens.input;
    tokens.output += sum.tokens.output;
    tokens.cacheRead += sum.tokens.cacheRead;
    tokens.cacheWrite += sum.tokens.cacheWrite;
  }
  const info = systemZoneInfo(now);
  const value = {
    from: from, to: to,
    zone: info.zone, offsetMinutes: info.offsetMinutes,
    cost: Math.round(cost * 1e6) / 1e6, currency: "CNY",
    calls: calls, sessions: sessions,
    tokens: {
      input: tokens.input, output: tokens.output,
      cacheRead: tokens.cacheRead, cacheWrite: tokens.cacheWrite,
      total: tokens.input + tokens.output + tokens.cacheRead + tokens.cacheWrite
    }
  };
  todayCache = { at: now, value: value };
  return value;
}
