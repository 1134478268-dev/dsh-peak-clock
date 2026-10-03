# dsh-peak-clock

[English](#english) · [中文](#中文)

> DeepSeek 峰谷时段指示器 · DeepSeek Harness (DSH) Web 插件
> Peak/off-peak timing, token usage and spend tracking for the DeepSeek Harness Web UI.

## English

**dsh-peak-clock** is a plugin for the **DeepSeek Harness (DSH) Web UI**. It shows, right in the conversation header:

- **Peak / off-peak status** of DeepSeek's time-of-day pricing (Beijing time), with a live countdown to the next switch
- **Token usage of the current conversation**
- **Estimated spend** for this conversation **and today's spend** (across all sessions), in CNY, priced from the official time-of-day rates

It follows your client language automatically (Chinese / English) and adapts its clock display to your system timezone.

```
Example (idle period, Chinese UI)
❤️ 【　当前时段：闲时　】 · 本次对话 ⭐ 33.28M token ⭐ · 预计消费 ¥1.92 · 今日消费 ¥3.46 ❤️
Example (peak period, English UI)
❤️ [ Current: Peak ] · This chat ⭐ 12.5k tokens ⭐ · Est. cost ¥0.42 · Today ¥3.46 ❤️
```

### Features

- **Official off-peak rule**: Beijing time, Monday to Friday (excluding Chinese statutory holidays) `09:00-12:00` and `14:00-18:00` are peak; everything else — including the `12:00-14:00` lunch gap, evenings, weekends and holidays — is off-peak at half price.
- **Holiday aware**: the 2026 Chinese statutory holiday table is built in (inclusive ranges). Make-up workdays that fall on a weekend are still treated as off-peak, matching the official wording.
- **Priced per call, at the moment it happened**: a single conversation that spans peak and off-peak hours, or switches models mid-way, is priced correctly.
- **Timezone aware**: detects your system timezone and UTC offset (DST included). The peak/off-peak rule always stays in **Beijing time** (that is the billing basis), while the tooltip shows your local time side by side with Beijing time whenever they differ.
- **Bilingual**: all UI strings come from a `zh` / `en` dictionary and follow the client language; missing keys fall back to Chinese.
- **Zero runtime dependencies**, no outbound network requests, and it never touches your credentials.
- **Read-only HTTP API** so other plugins or scripts can query the same numbers.

### Install

```sh
# from npm (once published)
dsh plugin add dsh-peak-clock

# from a local tarball
dsh plugin add ./dsh-peak-clock-<version>.tgz
```

Manual: unpack the package into the profile's `node_modules/`, add `"dsh-peak-clock"` to the
`dsh.profile.bundles` array of that profile's `package.json`, then refresh the Web UI.
### HTTP API (same-origin, read-only, `GET` / `HEAD` only)

| Endpoint | Returns |
| --- | --- |
| `GET /peak-clock/v1/now` | current period (`peak` / `idle`), reason (`window` / `off-window` / `weekend` / `holiday`), Beijing time, **your local time**, system zone + UTC offset, next switch timestamp |
| `GET /peak-clock/v1/session[?id=<sessionId>]` | this session's token buckets + estimated cost, **today's cross-session total**, system zone. Without `id` it picks the most recently active session |

```json
// GET /peak-clock/v1/session?id=session-xxxx
{
  "ok": true,
  "session": {
    "sessionId": "session-xxxx", "model": "deepseek-flash", "provider": "deepseek-account",
    "calls": 194, "peakCalls": 0,
    "tokens": { "input": 118547, "output": 285513, "cacheRead": 32871040, "cacheWrite": 0, "total": 33275100 },
    "cost": 1.91802, "currency": "CNY"
  },
  "today": { "cost": 3.4567, "currency": "CNY", "zone": "Asia/Shanghai", "offsetMinutes": 480, "calls": 42, "sessions": 3 },
  "system": { "zone": "Asia/Shanghai", "offsetMinutes": 480 }
}
```

### Pricing basis

Official DeepSeek time-of-day rates (CNY per 1M tokens; `hit` = cache hit input, `miss` = cache miss input, `out` = output):

| Model | Off-peak (hit / miss / out) | Peak (hit / miss / out) |
| --- | --- | --- |
| `deepseek-flash` (DeepSeek-V4.1-Flash) | 0.02 / 1 / 4 | 0.04 / 2 / 8 |
| `deepseek-v4-pro` | 0.15 / 4.5 / 13.5 | 0.3 / 9 / 27 |

- Usage events are folded per `(turn, step)`: the last cumulative snapshot wins, so nothing is counted twice.
- Cache-write tokens are billed as cache-miss input.
- **The amount is an estimate** (no account-level discounts or grants); DeepSeek's own billing prevails.
- Source: <https://api-docs.deepseek.com/zh-cn/quick_start/pricing/>

### Development

```sh
npm test    # 6 suites, 71 assertions: period logic, pricing, usage, timezone/today, routes, edge cases
```

| File | Role |
| --- | --- |
| `lib/host.js` | host half: period logic, pricing, timezone helpers, the two read-only routes |
| `lib/client.js` | browser half: badge UI, i18n dictionaries, usage polling |
| `cordis.patch.yml` | loader patch that mounts the plugin |
| `smoke*.mjs` | test suites (`npm test`) |

### Notes

- The host half is an **ESM module**: after updating it you must **restart DSH once** (Node caches ESM forever; replacing the file, disabling/re-enabling the plugin row, and even changing the entry filename were all verified *not* to hot-reload it). The client half only needs a page refresh.
- The holiday table must be refreshed once a year from the State Council schedule (two files: `lib/host.js` and `lib/client.js`). Until then the plugin is merely conservative — it would treat a holiday weekday as a working day.
- Prices are pinned per plugin version (no live fetching) so historical sessions can be replayed with the rates that were in effect.

### Credits

Built entirely by **DeepSeek V4.1-Flash** — design, code, tests, audits and documentation.

### License

MIT

---

## 中文

> DeepSeek 峰谷时段指示器 · DeepSeek Harness (DSH) Web 插件
>
> 在会话头部显示**当前处于高峰还是闲时**，并统计**本次对话的 token 用量**、**按官方分时价折算的预计消费**，以及**今日消费（跨会话）**。时间显示**随时区自动适配本机**，并与北京时间对照。

```
闲时：❤️ 【　当前时段：闲时　】 · 本次对话 ⭐ 33.28M token ⭐ · 预计消费 ¥1.92 · 今日消费 ¥3.46 ❤️
高峰：❤️ 【　当前时段：高峰　】 · 本次对话 ⭐ 12.5k token ⭐ · 预计消费 ¥0.42 · 今日消费 ¥3.46 ❤️
```

悬停徽标可查看：本机时间与北京时间（时区不同时并列显示）、距下次切换的时间、今日统计口径、完整计费规则与价格来源。

## 功能

- **峰谷判断**：北京时间周一至周五（不含中国法定节假日）`09:00-12:00`、`14:00-18:00` 为高峰时段；其余为闲时（半价）。**12:00-14:00 午休空档属于闲时**。
- **节假日感知**：自动识别周末与中国法定节假日（含首尾日期）；调休上班的周末仍按闲时，与官方口径一致。
- **本次对话用量**：token 总量 + 预计消费（人民币），每 15 秒刷新。
- **今日消费**：按本机时区当天 00:00 起算，**跨会话合计**（只统计今天发生的调用）。
- **时区自适应**：自动识别本机时区与 UTC 偏移（含夏令时）；峰谷判断始终按官方口径的北京时间，显示则同时给出本机时间。
- **按调用时刻计价**：不是整段按一个价，而是**按每次调用实际发生时刻**的峰谷单价折算；会话中途切换模型也按当时的模型价格计算。
- **零依赖**：无运行时依赖、无对外网络请求、不读取任何凭据。
- **只读接口**：供其它插件/脚本程序化查询（见下）。

## 计费口径

价格取自 DeepSeek 官方定价页（元 / 百万 tokens）：

| 模型 | 闲时 命中/未命中/输出 | 高峰 命中/未命中/输出 |
| --- | --- | --- |
| `deepseek-flash`（V4.1-Flash） | 0.02 / 1 / 4 | 0.04 / 2 / 8 |
| `deepseek-v4-pro` | 0.15 / 4.5 / 13.5 | 0.3 / 9 / 27 |

- 同一 `(turn, step)` 的 usage 是累计快照，只计最后一次（避免重复计数）
- 缓存写入计入"未命中输入"
- **金额为估算**，不含账户级优惠/赠送额度，实际以 DeepSeek 账单为准
- 来源：<https://api-docs.deepseek.com/zh-cn/quick_start/pricing/>
## 安装

```sh
# 方式 1：从 npm 安装（推荐）
dsh plugin add dsh-peak-clock

# 方式 2：从本地 tarball 安装
dsh plugin add ./dsh-peak-clock-<version>.tgz
```

手工方式：把包解压到 profile 的 `node_modules/dsh-peak-clock/`，并在该 profile `package.json` 的
`dsh.profile.bundles` 数组里加入 `"dsh-peak-clock"`。

安装后刷新 Web 界面（Ctrl+Shift+R）即可看到徽标。

## 接口（同源只读）

### `GET|HEAD /peak-clock/v1/now` —— 当前时段

```json
{
  "period": "idle",
  "reason": "holiday",
  "holiday": "国庆节",
  "beijingTime": "2026-10-04 04:26",
  "localTime": "2026-10-04 04:26",
  "systemZone": "Asia/Shanghai",
  "systemOffsetMinutes": 480,
  "timeZone": "Asia/Shanghai",
  "nextChangeAt": 1791421200000,
  "nextPeriod": "peak",
  "peakWindows": ["09:00-12:00", "14:00-18:00"],
  "holidayTableYear": 2026,
  "source": "https://api-docs.deepseek.com/zh-cn/quick_start/pricing/"
}
```

`reason` 取值：`window`（落在高峰窗口）/ `off-window`（午休或晚间清晨）/ `weekend` / `holiday`。

### `GET|HEAD /peak-clock/v1/session[?id=<sessionId>]` —— 会话用量与费用

不带 `id` 时取最近活跃的会话。

```json
{
  "ok": true,
  "session": {
    "sessionId": "session-xxxxxxxx",
    "model": "deepseek-flash",
    "provider": "deepseek-account",
    "calls": 194,
    "peakCalls": 0,
    "tokens": { "input": 118547, "output": 285513, "cacheRead": 32871040, "cacheWrite": 0, "total": 33275100 },
    "cost": 1.91802,
    "currency": "CNY",
    "firstAt": 1791055145990,
    "lastAt": 1791059124598
  },
  "today": {
    "cost": 3.4567, "currency": "CNY",
    "zone": "Asia/Shanghai", "offsetMinutes": 480,
    "calls": 42, "sessions": 3,
    "tokens": { "total": 1234567 }
  },
  "system": { "zone": "Asia/Shanghai", "offsetMinutes": 480 }
}
```

## 自定义

| 想改什么 | 改哪里 |
| --- | --- |
| 时段颜色 | `lib/client.js` → `COLOR_IDLE` / `COLOR_PEAK` |
| 金额颜色 | `lib/client.js` → `PRICE_COLOR` |
| 图标（星星/爱心） | `lib/client.js` → `STAR` / `HEART` |
| 旺季图标（已注释保留） | `lib/client.js` → `EMOJI_PEAK` / `EMOJI_IDLE` |
| 高峰窗口 | `lib/host.js` → `PEAK_WINDOWS`（北京时间小时，左闭右开） |
| 法定节假日表 | `lib/host.js` 的 `HOLIDAYS` **和** `lib/client.js` 的 `HOLIDAYS`（两处，含首尾日期） |
| 价格表 | `lib/host.js` → `PRICES` |

改完重新打包并安装：

```sh
node <node> <pnpm> pack
node <node> <pnpm> add ./dsh-peak-clock-<version>.tgz
```

## 注意

- **今日消费按本机时区**：当天 00:00 起算，跨会话只统计今天发生的调用；价格仍按每次调用时刻的**北京时间**峰谷档位
- **时区**：峰谷判断永远按官方口径（北京时间）；界面显示的时间随时区变化，并与北京时间并列对照（含 UTC 偏移）
- **宿主半边是 ESM 模块**，改动后需**重启一次 DSH** 才生效（Node 会永久缓存 ESM；实测替换文件、禁用/启用插件行、换入口文件名均无法热重载）。客户端半边刷新页面即可。
- **节假日表需按国务院年度安排更新**（每年一次，两处）——停止更新只会让高峰判断在节假日期间偏保守（把假期当成工作日）。
- 价格表随官方调价更新；本插件不会联网抓价，价格随版本固定，便于历史会话按当时价格重放。
- 接口为同源只读，仅接受 `GET` / `HEAD`。

## 开发

```sh
npm test     # 6 个单测：时段逻辑、计价、会话用量、时区与今日消费、接口路由
```

| 文件 | 说明 |
| --- | --- |
| `lib/host.js` | 宿主半边：时段计算 + 两个只读接口 + 会话用量统计与计价 |
| `lib/client.js` | 浏览器半边：徽标渲染、时段刷新、用量轮询 |
| `cordis.patch.yml` | 插件装载补丁（插入 Loader 行） |
| `smoke.mjs` | 时段逻辑单测（边界、午休、周末、节假日、跨春节切换点） |
| `smoke-cost.mjs` | 计价单测（flash/pro × 峰/闲） |
| `smoke-usage.mjs` | 会话用量端到端（累计快照去重、模型切换、合计） |
| `smoke-today.mjs` | 时区随系统 + 今日消费（跨天过滤、计价） |
| `smoke-routes.mjs` | 两个接口的路由级验证（字段、405、HEAD） |
| `smoke-edge.mjs` | 边界与容错（数字格式、节假日映射、空/异常会话、无 id 兜底） |

## 卸载

```sh
cd <profile 目录>
node <node> <pnpm> remove dsh-peak-clock
```

再从 profile 的 `package.json` → `dsh.profile.bundles` 里删掉 `"dsh-peak-clock"`，刷新页面。

## 兼容性

已在 Windows 10（19041）+ DSH Desktop（web profile）+ Node 24 实测；依赖 DSH 提供的
`webServer` / `sessionQuery` 服务与 `conversation.composer.dock` 插槽。

## License

MIT

---

> 本插件由 **DeepSeek V4.1-Flash** 全程制作编写（设计、代码、测试、自检与文档）。
> Built entirely by **DeepSeek V4.1-Flash** (design, code, tests, audits and documentation).
