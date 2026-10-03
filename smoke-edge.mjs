import fs from "node:fs";
import { apply, usageOf, todayUsage } from "./lib/host.js";
let fail = 0;
const ck = (l, c, x) => { if (c) console.log("ok   " + l); else { fail++; console.log("FAIL " + l + (x === undefined ? "" : " :: " + x)); } };
const clientCode = fs.readFileSync("./lib/client.js", "utf8");
let loaded = null;
new Function("window", clientCode)({ __ModuleLoader__: { load(m) { loaded = m; } } });
const T = loaded.factory(() => ({})).__test;

// 1) 数字/金额格式边界
ck("fmtTokens(0)='0'", T.fmtTokens(0) === "0");
ck("fmtTokens(999)='999'", T.fmtTokens(999) === "999");
ck("fmtTokens(1000)='1.0k'", T.fmtTokens(1000) === "1.0k");
ck("fmtTokens(1e6)='1.00M'", T.fmtTokens(1e6) === "1.00M");
ck("fmtTokens(负数/NaN) 兜底为 '0'", T.fmtTokens(-5) === "0" && T.fmtTokens(NaN) === "0");
ck("fmtCost(0)='¥0.00'", T.fmtCost(0) === "\u00A50.00");
ck("fmtCost(0.004) 用 4 位小数", T.fmtCost(0.004) === "\u00A50.0040", T.fmtCost(0.004));
ck("fmtCost(0.42) 用 2 位小数", T.fmtCost(0.42) === "\u00A50.42");
ck("fmtCost(负数) 兜底", T.fmtCost(-1) === "\u00A50.00");

// 2) 节假日映射：直接对源码里的对象求值（不受 \u 转义影响）
const start = clientCode.indexOf("var HOLIDAY_KEY = {");
const objText = clientCode.slice(start, clientCode.indexOf("};", start) + 1).replace("var HOLIDAY_KEY =", "return");
const HK = new Function(objText)();
const names = ["\u5143\u65E6", "\u6625\u8282", "\u6E05\u660E\u8282", "\u52B3\u52A8\u8282", "\u7AEF\u5348\u8282", "\u4E2D\u79CB\u8282", "\u56FD\u5E86\u8282"];
ck("HOLIDAY_KEY 覆盖全部 7 个节假日", names.every((n) => HK[n]), Object.keys(HK).join(","));
ck("每个映射都有中英字典", Object.values(HK).every((v) => T.dict.zh["holiday." + v] && T.dict.en["holiday." + v]));

// 3) host 边界：空列表 / 读取失败 / 无 usage 事件（todayUsage 有 60s 缓存，用推进时间绕过）
const realNow = Date.now;
let clock = realNow();
Date.now = () => clock;
const empty = { sessionQuery: { listSessions: async () => [], readSession: async () => { throw new Error("x"); } } };
const t0 = await todayUsage(empty);
ck("空会话列表 → 全 0", t0.calls === 0 && t0.cost === 0 && t0.tokens.total === 0);
clock += 61000;
const throws = { sessionQuery: { listSessions: async () => [{ header: { id: "bad" } }], readSession: async () => { throw new Error("boom"); } } };
const t1 = await todayUsage(throws);
ck("readSession 抛错被吞掉（不致命）", t1.calls === 0 && t1.sessions === 0);
const noUsage = { sessionQuery: { listSessions: async () => [{ header: { id: "s" } }], readSession: async () => ({ session: { id: "s" }, events: [{ type: "session/start", time: 1 }] }) } };
const u0 = await usageOf(noUsage, "s");
ck("无 usage 事件 → calls=0 / cost=0", u0.calls === 0 && u0.cost === 0 && u0.tokens.total === 0);
Date.now = realNow;

// 4) 路由错误路径：底层抛错 → HTTP 200 + ok:false（前端可降级）
const handlers = {};
const bad = {
  effect: (f) => f(),
  webServer: { register: (s) => { handlers[s.path] = s.handler; return () => {}; } },
  sessionQuery: { listSessions: async () => { throw new Error("list failed"); }, readSession: async () => { throw new Error("read failed"); } }
};
apply(bad);
const call = (path, method, url) => new Promise((res) => {
  const r = { status: 0, body: undefined, setHeader() {}, writeHead(c) { r.status = c; }, end(b) { r.body = b; res(r); } };
  handlers[path]({ method: method, url: url || path }, r);
});
const e1 = await call("/peak-clock/v1/session", "GET");
const ej = JSON.parse(e1.body);
ck("底层报错 → HTTP 200 且 ok:false", e1.status === 200 && ej.ok === false, JSON.stringify(ej).slice(0, 70));
const H2 = {};
const mkSession = (id, updatedAt, usage) => ({ header: { id: id, updatedAt: updatedAt }, events: [
  { type: "request/header", time: 1, data: { header: { config: { model: "deepseek-flash" } } } },
  { type: "assistant/chunk", time: 1, data: { turn: 1, step: 1, chunk: { type: "usage", usage: usage } } }
] });
const oldS = mkSession("old", 1000, { inputTokens: 10 });
const newS = mkSession("new", 2000, { inputTokens: 999 });
const ctx5 = {
  effect: (fn) => fn(),
  webServer: { register: (spec) => { H2[spec.path] = spec.handler; return () => {}; } },
  sessionQuery: { listSessions: async () => [oldS, newS], readSession: async (id) => (id === "new" ? newS : oldS) }
};
apply(ctx5);
const r5 = await new Promise((res) => {
  const r = { status: 0, body: undefined, setHeader() {}, writeHead(c) { r.status = c; }, end(b) { r.body = b; res(r); } };
  H2["/peak-clock/v1/session"]({ method: "GET", url: "/peak-clock/v1/session" }, r);
});
const j5 = JSON.parse(r5.body);
ck("未传 id → 自动选最近活跃会话", j5.session.sessionId === "new", j5.session.sessionId);
ck("未传 id 时用量来自该会话", j5.session.tokens.input === 999, j5.session.tokens.input);
console.log(fail === 0 ? "ALL PASS" : fail + " FAILED");
process.exit(fail === 0 ? 0 : 1);