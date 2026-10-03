import { apply } from "./lib/host.js";
process.env.TZ = "Asia/Shanghai";
let fail = 0;
const ck = (l, c, x) => { if (c) console.log("ok   " + l); else { fail++; console.log("FAIL " + l + (x === undefined ? "" : " :: " + x)); } };
const realNow = Date.now;
Date.now = () => Date.parse("2026-10-04T12:00:00+08:00");
const P = (s) => Date.parse(s);
const events = [
  { type: "request/header", time: P("2026-10-04T12:00:00+08:00"), data: { header: { config: { provider: "deepseek-account", model: "deepseek-flash" } } } },
  { type: "assistant/chunk", time: P("2026-10-04T12:00:00+08:00"), data: { turn: 1, step: 1, chunk: { type: "usage", usage: { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 2000 } } } }
];
const sessions = [{ header: { id: "s1" }, events: events }];
const handlers = {};
const ctx = {
  effect: (fn) => fn(),
  webServer: { register: (spec) => { handlers[spec.path] = spec.handler; return () => {}; } },
  sessionQuery: { listSessions: async () => sessions, readSession: async (id) => sessions.find((s) => s.header.id === id) }
};
apply(ctx);
ck("注册了两个只读路由", !!handlers["/peak-clock/v1/now"] && !!handlers["/peak-clock/v1/session"]);
function call(path, method, url) {
  return new Promise((resolve) => {
    const res = {
      h: {}, status: 0, body: undefined, ended: false,
      setHeader: (k, v) => { res.h[k.toLowerCase()] = v; },
      writeHead: (code) => { res.status = code; },
      end: (b) => { res.body = b; res.ended = true; resolve(res); }
    };
    handlers[path]({ method: method, url: url || path }, res);
  });
}
const now = await call("/peak-clock/v1/now", "GET");
ck("/now HTTP 200", now.status === 200, now.status);
ck("/now 响应头 JSON + no-store", /application\/json/.test(now.h["content-type"]) && now.h["cache-control"] === "no-store");
const nj = JSON.parse(now.body);
ck("/now 字段齐全", ["period", "reason", "beijingTime", "localTime", "systemZone", "systemOffsetMinutes", "nextChangeAt", "nextPeriod", "peakWindows", "source"].every((k) => nj[k] !== undefined), Object.keys(nj).join(","));
ck("/now 本机时间正确", nj.localTime === "2026-10-04 12:00", nj.localTime);
ck("/now 北京时间正确", nj.beijingTime === "2026-10-04 12:00", nj.beijingTime);
ck("/now 国庆假期=闲时", nj.period === "idle" && nj.holiday === "国庆节", nj.period + "/" + nj.holiday);
const ses = await call("/peak-clock/v1/session", "GET", "/peak-clock/v1/session?id=s1");
const sj = JSON.parse(ses.body);
ck("/session ok=true", sj.ok === true);
ck("/session 用量正确", sj.session.calls === 1 && sj.session.tokens.input === 1000 && sj.session.tokens.total === 3500, JSON.stringify(sj.session.tokens));
ck("/session 费用=0.00304(闲时 flash)", Math.abs(sj.session.cost - 0.00304) < 1e-9, sj.session.cost);
ck("/session today 字段含时区", !!sj.today && sj.today.zone === "Asia/Shanghai" && sj.today.offsetMinutes === 480, JSON.stringify(sj.today && sj.today.zone));
ck("/session today 当日合计", sj.today.calls === 1 && Math.abs(sj.today.cost - 0.00304) < 1e-9, sj.today && sj.today.cost);
ck("/session system 字段", !!sj.system && sj.system.zone === "Asia/Shanghai");
const bad = await call("/peak-clock/v1/now", "POST");
ck("非 GET/HEAD → 405", bad.status === 405, bad.status);
const head = await call("/peak-clock/v1/session", "HEAD");
ck("HEAD → 200 且无 body", head.status === 200 && head.body === undefined);
Date.now = realNow;
console.log(fail === 0 ? "ALL PASS" : fail + " FAILED");
process.exit(fail === 0 ? 0 : 1);