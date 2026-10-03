// dsh-peak-clock  浏览器（Client）半边
// 在会话头部操作区（conversation.session.header.actions）显示峰谷时段、本次对话用量与今日消费。
// 规则：北京时间周一至周五（不含中国法定节假日）09:00-12:00、14:00-18:00 为高峰时段。
window.__ModuleLoader__.load({
  id: "dsh-peak-clock",
  factory: function (require) {
    var React = require("react");
    var inject = ["slots", "locale"];

    var PEAK_WINDOWS = [[9, 12], [14, 18]];
    var DAY_BOUNDARIES = [0, 9, 12, 14, 18];
    var HOLIDAYS = [
      { start: "2026-01-01", end: "2026-01-03", name: "元旦" },
      { start: "2026-02-15", end: "2026-02-23", name: "春节" },
      { start: "2026-04-04", end: "2026-04-06", name: "清明节" },
      { start: "2026-05-01", end: "2026-05-05", name: "劳动节" },
      { start: "2026-06-19", end: "2026-06-21", name: "端午节" },
      { start: "2026-09-25", end: "2026-09-27", name: "中秋节" },
      { start: "2026-10-01", end: "2026-10-07", name: "国庆节" }
    ];
    var HOUR_MS = 3600 * 1000;
    var DAY_MS = 24 * HOUR_MS;
    var OFFSET_MS = 8 * HOUR_MS;

    function pad(n) { return (n < 10 ? "0" : "") + n; }

    function beijingParts(ms) {
      var d = new Date(ms + OFFSET_MS);
      return {
        dateKey: d.toISOString().slice(0, 10),
        weekday: d.getUTCDay(),
        hour: d.getUTCHours(),
        minute: d.getUTCMinutes()
      };
    }

    function holidayName(dateKey) {
      for (var i = 0; i < HOLIDAYS.length; i++) {
        var h = HOLIDAYS[i];
        if (dateKey >= h.start && dateKey <= h.end) return h.name;
      }
      return null;
    }    function rawPeriod(ms) {
      var p = beijingParts(ms);
      var holiday = holidayName(p.dateKey);
      if (holiday) return { period: "idle", reason: "holiday", holiday: holiday };
      if (p.weekday === 0 || p.weekday === 6) return { period: "idle", reason: "weekend", holiday: null };
      var minutes = p.hour * 60 + p.minute;
      var inPeak = false;
      for (var i = 0; i < PEAK_WINDOWS.length; i++) {
        var w = PEAK_WINDOWS[i];
        if (minutes >= w[0] * 60 && minutes < w[1] * 60) inPeak = true;
      }
      return { period: inPeak ? "peak" : "idle", reason: inPeak ? "window" : "off-window", holiday: null };
    }

    function dayStart(ms) {
      var shifted = ms + OFFSET_MS;
      return Math.floor(shifted / DAY_MS) * DAY_MS - OFFSET_MS;
    }

    function nextChangeAt(ms) {
      var current = rawPeriod(ms).period;
      var base0 = dayStart(ms);
      for (var day = 0; day <= 45; day++) {
        var base = base0 + day * DAY_MS;
        for (var i = 0; i < DAY_BOUNDARIES.length; i++) {
          var t = base + DAY_BOUNDARIES[i] * HOUR_MS;
          if (t <= ms) continue;
          if (rawPeriod(t).period !== current) return t;
        }
      }
      return null;
    }

    function periodAt(ms) {
      var r = rawPeriod(ms);
      var p = beijingParts(ms);
      return {
        now: ms,
        period: r.period,
        reason: r.reason,
        holiday: r.holiday,
        dateKey: p.dateKey,
        beijingTime: p.dateKey + " " + pad(p.hour) + ":" + pad(p.minute),
        nextChangeAt: nextChangeAt(ms),
        nextPeriod: r.period === "peak" ? "idle" : "peak"
      };
    }

    var COLOR_PEAK = "#ef4444";
    var COLOR_IDLE = "#22c55e";
    var PRICE_COLOR = "#22c55e";
    var DOT = "\u00B7";
    var STAR = "\u2B50";
    var HEART = "\u2764\uFE0F";
    // ===== 多语言 =====
    var NS = "dsh-peak-clock";
    // 挂载位置：会话头部操作区（可按需改为 "conversation.composer.dock" 或 "sidebar.footer.action"）
    var SLOT = "conversation.session.header.actions";
    var SLOT_ORDER = 30;
    var DICT = {
      zh: {
        "label.open": "【　当前时段：",
        "label.close": "　】",
        "period.peak": "高峰",
        "period.idle": "闲时",
        "session.prefix": "本次对话",
        "tokens.unit": "token",
        "spend.label": "预计消费",
        "spend.today": "今日消费",
        "tip.localLabel": "本机",
        "tip.beijingLabel": "北京时间",
        "tip.zoneSame": "本机时区与北京时间一致",
        "tip.today": "今日统计：本机时区当天 00:00 起跨会话合计",
        "state.loading": "统计中…",
        "state.needsRestart": "需重启 DSH 后显示",
        "state.unknown": "未知",
        "sep.colon": "：",
        "tip.nowLabel": "当前",
        "tip.nextLabel": "下次切换",
        "tip.rule": "规则：北京时间周一至周五（不含法定节假日）09:00-12:00、14:00-18:00 为高峰，其余为闲时（半价）",
        "tip.cost": "预计消费：按官方分时价（元/百万 tokens）折算的本次对话估算值，仅供参考（以 DeepSeek 账单为准）",
        "tip.sourceLabel": "来源",
        "tip.weekend": "周末",
        "unit.d": "天", "unit.h": "小时", "unit.m": "分", "unit.s": "秒", "unit.sep": "",
        "holiday.new-year": "元旦",
        "holiday.spring-festival": "春节",
        "holiday.qingming": "清明节",
        "holiday.labour-day": "劳动节",
        "holiday.dragon-boat": "端午节",
        "holiday.mid-autumn": "中秋节",
        "holiday.national-day": "国庆节"
      },
      en: {
        "label.open": "[ Current: ",
        "label.close": " ]",
        "period.peak": "Peak",
        "period.idle": "Off-peak",
        "session.prefix": "This chat",
        "tokens.unit": "tokens",
        "spend.label": "Est. cost",
        "spend.today": "Today",
        "tip.localLabel": "Local",
        "tip.beijingLabel": "Beijing",
        "tip.zoneSame": "system timezone matches Beijing",
        "tip.today": "Today: all sessions since local midnight",
        "state.loading": "Loading\u2026",
        "state.needsRestart": "Restart DSH to load",
        "state.unknown": "n/a",
        "sep.colon": ": ",
        "tip.nowLabel": "Now",
        "tip.nextLabel": "Next switch",
        "tip.rule": "Peak: Mon-Fri (excluding CN statutory holidays) 09:00-12:00 & 14:00-18:00 Beijing time; everything else, including weekends and holidays, is off-peak at half price.",
        "tip.cost": "Est. cost: this chat priced with the official time-of-day rates (CNY per 1M tokens). Estimate only, DeepSeek billing prevails.",
        "tip.sourceLabel": "Source",
        "tip.weekend": "weekend",
        "unit.d": "d", "unit.h": "h", "unit.m": "m", "unit.s": "s", "unit.sep": " ",
        "holiday.new-year": "New Year",
        "holiday.spring-festival": "Spring Festival",
        "holiday.qingming": "Qingming",
        "holiday.labour-day": "Labour Day",
        "holiday.dragon-boat": "Dragon Boat",
        "holiday.mid-autumn": "Mid-Autumn",
        "holiday.national-day": "National Day"
      }
    };

    var HOLIDAY_KEY = {
      "\u5143\u65E6": "new-year", "\u6625\u8282": "spring-festival", "\u6E05\u660E\u8282": "qingming",
      "\u52B3\u52A8\u8282": "labour-day", "\u7AEF\u5348\u8282": "dragon-boat",
      "\u4E2D\u79CB\u8282": "mid-autumn", "\u56FD\u5E86\u8282": "national-day"
    };

    function fallbackText(key) {
      var v = DICT.zh[key];
      return v === undefined ? key : v;
    }
    function makeT(props) {
      var t = props && props.t;
      if (typeof t !== "function") return fallbackText;
      return function (key) {
        var v = null;
        try { v = t(key); } catch (e) { v = null; }
        if (v === undefined || v === null || v === "" || v === key) return fallbackText(key);
        return v;
      };
    }
    function holidayLabel(t, name) {
      if (!name) return "";
      var k = HOLIDAY_KEY[name];
      return k ? t("holiday." + k) : name;
    }
    function fmtCountdownT(t, ms) {
      if (!isFinite(ms) || ms < 0) ms = 0;
      var s = Math.floor(ms / 1000);
      var d = Math.floor(s / 86400); s -= d * 86400;
      var h = Math.floor(s / 3600); s -= h * 3600;
      var m = Math.floor(s / 60); s -= m * 60;
      if (d > 0) return d + t("unit.d") + t("unit.sep") + h + t("unit.h");
      if (h > 0) return h + t("unit.h") + t("unit.sep") + pad(m) + t("unit.m");
      return m + t("unit.m") + t("unit.sep") + pad(s) + t("unit.s");
    }
    function systemZone() {
      try { var z = Intl.DateTimeFormat().resolvedOptions().timeZone; if (z) return z; } catch (e) {}
      return "local";
    }
    function systemOffsetMinutes() { return -new Date().getTimezoneOffset(); }
    function localTimeString(ms) {
      var d = new Date(ms + systemOffsetMinutes() * 60000);
      return d.toISOString().slice(0, 10) + " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes());
    }
    function offsetLabel(min) {
      var sign = min >= 0 ? "+" : "-";
      var a = Math.abs(min);
      return "UTC" + sign + Math.floor(a / 60) + (a % 60 ? ":" + pad(a % 60) : "");
    }

    function useNow() {
      var st = React.useState(Date.now());
      var now = st[0], setNow = st[1];
      React.useEffect(function () {
        var t = setInterval(function () { setNow(Date.now()); }, 1000);
        return function () { clearInterval(t); };
      }, []);
      return now;
    }

    function PeakClockChip(props) {
      var t = makeT(props);
      var now = useNow();
      var s = periodAt(now);
      var usage = useSessionUsage(props && props.sessionId);
      var session = usage && usage.session ? usage.session : null;
      var today = usage && usage.today ? usage.today : null;
      var isPeak = s.period === "peak";
      var accent = isPeak ? COLOR_PEAK : COLOR_IDLE;
      var name = t(isPeak ? "period.peak" : "period.idle");
      var nextName = t(isPeak ? "period.idle" : "period.peak");
      var left = s.nextChangeAt ? fmtCountdownT(t, s.nextChangeAt - now) : t("state.unknown");
      var extra = s.holiday ? " " + DOT + " " + holidayLabel(t, s.holiday) : (s.reason === "weekend" ? " " + DOT + " " + t("tip.weekend") : "");
      var zone = systemZone();
      var offMin = systemOffsetMinutes();
      var sameZone = offMin === 480;
      var timeLines = sameZone
        ? t("tip.beijingLabel") + t("sep.colon") + s.beijingTime + " " + DOT + " " + t("tip.zoneSame")
        : t("tip.localLabel") + t("sep.colon") + localTimeString(now) + " (" + zone + ", " + offsetLabel(offMin) + ")" + "\n" + t("tip.beijingLabel") + t("sep.colon") + s.beijingTime;
      var tip = timeLines + extra
        + "\n" + t("tip.nextLabel") + t("sep.colon") + nextName + " " + left
        + "\n" + t("tip.today") + " (" + zone + ", " + offsetLabel(offMin) + ")"
        + "\n" + t("tip.rule")
        + "\n" + t("tip.cost")
        + "\n" + t("tip.sourceLabel") + t("sep.colon") + "api-docs.deepseek.com/zh-cn/quick_start/pricing/";
      var box = {
        display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12,
        lineHeight: "16px", padding: "1px 8px", borderRadius: 10,
        border: "1px solid rgba(128,128,128,0.35)", opacity: 0.92, cursor: "default", userSelect: "none"
      };
      return React.createElement("div", { title: tip, style: box },
        React.createElement("span", { style: { opacity: 0.9 } }, HEART),
        React.createElement("span", null, t("label.open"), React.createElement("span", { style: { color: accent, fontWeight: 600 } }, name), t("label.close")),
        React.createElement("span", { style: { opacity: 0.7 } }, DOT + " " + t("session.prefix") + " "),
        session
          ? React.createElement("span", { style: { fontWeight: 600 } }, STAR + " " + fmtTokens(session.tokens.total) + " " + t("tokens.unit") + " " + STAR)
          : React.createElement("span", { style: { opacity: 0.7 } }, usage && usage.missing ? t("state.needsRestart") : t("state.loading")),
        session ? React.createElement("span", { style: { opacity: 0.7 } }, " " + DOT + " " + t("spend.label") + " ") : null,
        session ? React.createElement("span", { style: { color: PRICE_COLOR, fontWeight: 600 } }, fmtCost(session.cost)) : null,
        today ? React.createElement("span", { style: { opacity: 0.7 } }, " " + DOT + " " + t("spend.today") + " ") : null,
        today ? React.createElement("span", { style: { color: PRICE_COLOR, fontWeight: 600 } }, fmtCost(today.cost)) : null,
        React.createElement("span", { style: { opacity: 0.9 } }, HEART)
      );
    }

    var sessionCache = {};
    function fmtTokens(n) {
      if (!isFinite(n) || n <= 0) return "0";
      if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
      if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
      return String(Math.round(n));
    }
    function fmtCost(c) {
      if (!isFinite(c) || c <= 0) return "\u00A50.00";
      return "\u00A5" + (c < 0.01 ? c.toFixed(4) : c.toFixed(2));
    }
    function useSessionUsage(sessionId) {
      var key = sessionId || "";
      var st = React.useState(sessionCache[key] || null);
      var data = st[0], setData = st[1];
      React.useEffect(function () {
        var alive = true;
        function load() {
          fetch("/peak-clock/v1/session" + (key ? "?id=" + encodeURIComponent(key) : ""))
            .then(function (r) {
              if (r.status === 404) { if (alive) { sessionCache[key] = { missing: true }; setData({ missing: true }); } return null; }
              return r.ok ? r.json() : null;
            })
            .then(function (j) { if (alive && j && j.session) { sessionCache[key] = j; setData(j); } })
            .catch(function () {});
        }
        load();
        var timer = setInterval(load, 15000);
        return function () { alive = false; clearInterval(timer); };
      }, [key]);
      return data;
    }
    function apply(ctx) {
      ctx.effect(function () { return ctx.locale.register(NS, DICT); }, "dsh-peak-clock: locale dictionaries");
      ctx.slots.inject(SLOT, function () {
        return ctx.slots.register(
          { name: SLOT, id: "peak-clock", order: SLOT_ORDER, locale: NS, inject: function (sessionId) { return { sessionId: sessionId }; } },
          PeakClockChip
        );
      });
    }

    return { apply: apply, inject: inject, __test: { periodAt: periodAt, fmtTokens: fmtTokens, fmtCost: fmtCost, dict: DICT, makeT: makeT, seed: function (id, d) { sessionCache[id || ""] = d; } } };
  }
});