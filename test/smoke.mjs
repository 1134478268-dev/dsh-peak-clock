import { periodAt } from "../lib/host.js";
let fail = 0;
function eq(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fail++; console.log("FAIL " + label + " got=" + JSON.stringify(got) + " want=" + JSON.stringify(want)); }
  else console.log("ok   " + label + " => " + JSON.stringify(got));
}
const P = (s) => Date.parse(s);
function p(s) { const r = periodAt(P(s)); return r.period + "/" + r.reason + (r.holiday ? "/" + r.holiday : ""); }
function nx(s) { return new Date(periodAt(P(s)).nextChangeAt).toISOString(); }
eq("工作日10:30", p("2026-10-14T10:30:00+08:00"), "peak/window");
eq("午休12:30", p("2026-10-14T12:30:00+08:00"), "idle/off-window");
eq("边界12:00", p("2026-10-14T12:00:00+08:00"), "idle/off-window");
eq("边界14:00", p("2026-10-14T14:00:00+08:00"), "peak/window");
eq("周六", p("2026-10-10T10:30:00+08:00"), "idle/weekend");
eq("国庆周一", p("2026-10-05T10:30:00+08:00"), "idle/holiday/国庆节");
eq("调休周六", p("2026-02-14T10:30:00+08:00"), "idle/weekend");
eq("普通周一", p("2026-10-12T10:30:00+08:00"), "peak/window");
eq("10:30->12:00", nx("2026-10-14T10:30:00+08:00"), new Date(P("2026-10-14T12:00:00+08:00")).toISOString());
eq("周五18:30->周一09:00", nx("2026-10-16T18:30:00+08:00"), new Date(P("2026-10-19T09:00:00+08:00")).toISOString());
eq("春节前->节后09:00", nx("2026-02-13T18:30:00+08:00"), new Date(P("2026-02-24T09:00:00+08:00")).toISOString());
const now = periodAt(Date.now());
console.log("当前: " + now.beijingTime + " " + now.period + "/" + now.reason + " 下次切换=" + new Date(now.nextChangeAt).toISOString());
console.log(fail === 0 ? "ALL PASS" : fail + " FAILED");