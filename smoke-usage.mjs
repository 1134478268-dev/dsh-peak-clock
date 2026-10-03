import { usageOf } from "./lib/host.js";
let fail = 0;
const eq = (l, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) { fail++; console.log("FAIL " + l + " got=" + JSON.stringify(got) + " want=" + JSON.stringify(want)); } else console.log("ok   " + l + " = " + JSON.stringify(got)); };
const T = (s) => Date.parse(s);
const events = [
  { type: "request/header", seq: 1, time: T("2026-10-14T13:00:00+08:00"), data: { header: { config: { provider: "deepseek-account", model: "deepseek-flash" } } } },
  { type: "assistant/chunk", seq: 2, time: T("2026-10-14T13:00:05+08:00"), data: { turn: 1, step: 1, chunk: { type: "usage", usage: { inputTokens: 1000, outputTokens: 200, cacheReadTokens: 5000 } } } },
  { type: "assistant/chunk", seq: 3, time: T("2026-10-14T13:00:07+08:00"), data: { turn: 1, step: 1, chunk: { type: "usage", usage: { inputTokens: 1000, outputTokens: 400, cacheReadTokens: 9000 } } } },
  { type: "assistant/message", seq: 4, time: T("2026-10-14T13:00:09+08:00"), data: { turn: 1, step: 1, usage: { inputTokens: 1000, outputTokens: 400, cacheReadTokens: 9000 }, message: { id: "m1" } } },
  { type: "request/header", seq: 5, time: T("2026-10-14T10:00:00+08:00"), data: { header: { config: { provider: "deepseek-account", model: "deepseek-v4-pro" } } } },
  { type: "assistant/chunk", seq: 6, time: T("2026-10-14T10:00:05+08:00"), data: { turn: 2, step: 1, chunk: { type: "usage", usage: { inputTokens: 2000, outputTokens: 100, cacheReadTokens: 0 } } } }
];
const ctx = { sessionQuery: { readSession: async () => ({ session: { id: "sess-test" }, events }) } };
const v = await usageOf(ctx, "sess-test");
eq("calls(去重后)", v.calls, 2);
eq("peakCalls", v.peakCalls, 1);
eq("tokens.input", v.tokens.input, 3000);
eq("tokens.output", v.tokens.output, 500);
eq("tokens.cacheRead", v.tokens.cacheRead, 9000);
eq("tokens.total", v.tokens.total, 12500);
eq("cost(flash idle 0.00278 + pro peak 0.0207)", v.cost, 0.02348);
eq("sessionId", v.sessionId, "sess-test");
console.log(fail === 0 ? "ALL PASS" : fail + " FAILED");
process.exit(fail === 0 ? 0 : 1);