import { localDayStart, systemZoneInfo, todayUsage } from "../lib/host.js";
let fail = 0;
const ck = (l, c, x) => { if (c) console.log("ok   " + l); else { fail++; console.log("FAIL " + l + (x === undefined ? "" : " :: " + x)); } };
const ISO = (ms) => new Date(ms).toISOString();

// 1) 时区随系统：不同 TZ 下"当天 00:00"应不同
const cases = [
  ["Asia/Shanghai", "2026-10-03T16:00:00.000Z"],
  ["UTC", "2026-10-04T00:00:00.000Z"],
  ["America/New_York", "2026-10-04T04:00:00.000Z"]
];
const probe = Date.parse("2026-10-04T12:00:00Z");
for (const c of cases) {
  process.env.TZ = c[0];
  const got = ISO(localDayStart(probe));
  ck("TZ=" + c[0] + " 当天00:00 -> " + c[1], got === c[1], got);
}
process.env.TZ = "Asia/Shanghai";
const zi = systemZoneInfo(probe);
ck("zone 名称跟随系统", zi.zone === "Asia/Shanghai", zi.zone);
ck("偏移 +480 分钟", zi.offsetMinutes === 480, zi.offsetMinutes);

// 2) 今日消费：只统计本机时区"今天"的调用
const realNow = Date.now;
Date.now = () => Date.parse("2026-10-04T12:00:00+08:00");
const P = (s) => Date.parse(s);
const ev = (time, model, usage, turn, step) => ([
  { type: "request/header", time: time, data: { header: { config: { provider: "p", model: model } } } },
  { type: "assistant/chunk", time: time, data: { turn: turn, step: step, chunk: { type: "usage", usage: usage } } }
]);
const sessions = [
  { header: { id: "s1" }, events: [].concat(
    ev(P("2026-10-04T10:00:00+08:00"), "deepseek-flash", { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 2000 }, 1, 1),
    ev(P("2026-10-03T23:00:00+08:00"), "deepseek-flash", { inputTokens: 9999, outputTokens: 9999 }, 1, 2)
  ) },
  { header: { id: "s2" }, events: ev(P("2026-10-05T01:00:00+08:00"), "deepseek-flash", { inputTokens: 111, outputTokens: 111 }, 1, 1) }
];
const ctx = { sessionQuery: {
  listSessions: async () => sessions,
  readSession: async (id) => sessions.find((s) => s.header.id === id)
} };
const v = await todayUsage(ctx);
ck("只计当天调用数", v.calls === 1, v.calls);
ck("只计有当天调用的会话数", v.sessions === 1, v.sessions);
ck("input=1000（不含前一天/次日）", v.tokens.input === 1000, v.tokens.input);
ck("output=500", v.tokens.output === 500, v.tokens.output);
ck("cacheRead=2000", v.tokens.cacheRead === 2000, v.tokens.cacheRead);
ck("cost=0.00304（国庆+周日=闲时，flash 闲时价）", Math.abs(v.cost - 0.00304) < 1e-9, v.cost);
ck("返回本机时区信息", v.zone === "Asia/Shanghai" && v.offsetMinutes === 480, v.zone + "/" + v.offsetMinutes);
ck("返回当天范围", ISO(v.from) === "2026-10-03T16:00:00.000Z" && ISO(v.to) === "2026-10-04T16:00:00.000Z", ISO(v.from) + " ~ " + ISO(v.to));
Date.now = realNow;
console.log(fail === 0 ? "ALL PASS" : fail + " FAILED");
process.exit(fail === 0 ? 0 : 1);