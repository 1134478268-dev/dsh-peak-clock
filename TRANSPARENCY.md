# 透明说明 / Transparency Notes

[English](#english) · [中文](#中文)

## English

### What this plugin does — and does not do

- It reads DSH **session events** through the host-side `sessionQuery` service and computes everything **locally**.
- It performs **no model requests**, sends **no telemetry**, has **zero runtime dependencies**, makes **no outbound network calls**, and **never reads credentials or API keys**.
- The only HTTP endpoints it registers are **same-origin, read-only** (`GET` / `HEAD`): `/peak-clock/v1/now` and `/peak-clock/v1/session`.
- It writes **no local files**; the only state is two in-memory caches (session usage 5 s, today's total 60 s).

### Sources and references — and what is original

| Area | Where the knowledge came from |
| --- | --- |
| Off-peak rule (Beijing time, Mon–Fri excl. statutory holidays, half price) | DeepSeek official pricing page — <https://api-docs.deepseek.com/zh-cn/quick_start/pricing/> |
| Price table (CNY per 1M tokens, peak vs off-peak) | Same official page |
| 2026 Chinese statutory holiday ranges | State Council annual arrangement, cross-checked against a public holiday API (Nager.Date) |
| DSH plugin API contracts — `window.__ModuleLoader__.load({ id, factory })`, `ctx.slots.register({ name, id, order, locale, inject }, Component)`, `ctx.webServer.register({ kind, path, handler })`, `ctx.locale.register(ns, { zh, en })`, session-projection shape | Learned by **reading the published source of community plugins** (e.g. `dsh-usage-stats`, `dsh-peak-indicator`). These are framework-mandated shapes, not business logic. |
| The fact that `assistant/chunk` usage events are **cumulative snapshots per `(turn, step)`** | Same reading; it is what drives the deduplication in `sessionSteps()` |
| **Everything else** — period logic, per-call peak/off-peak pricing, token & cost aggregation, today's cross-session total, timezone handling, i18n dictionaries, badge UI and colours, tests | Written from scratch for this plugin |

**No code was copied verbatim** from those plugins. If you spot any uncredited overlap, please open an issue — it will be fixed promptly.

### Privacy

- `.dsh/.credentials.yaml` is **never** read by this plugin (not even its key names).
- Amounts are **estimates** derived from the session event log; DeepSeek's own billing prevails.
- Nothing about your sessions leaves the machine.

### Author

Built entirely by **DeepSeek V4.1-Flash** — design, code, tests, audits and documentation — inside a DSH session, at the request of the repository owner.
---

## 中文

### 插件做什么、不做什么

- 只通过宿主侧的 `sessionQuery` 服务读取 DSH **会话事件**，全部在**本地**计算。
- **不发起任何模型请求**、不上报遥测、**零运行时依赖**、**无对外网络请求**、**不读取任何凭据或密钥**。
- 注册的接口只有**同源只读**（`GET` / `HEAD`）两个：`/peak-clock/v1/now`、`/peak-clock/v1/session`。
- **不写任何本地文件**；唯一的状态是两个内存缓存（会话用量 5 秒、今日合计 60 秒）。

### 参考来源与原创范围

| 内容 | 来源 |
| --- | --- |
| 峰谷规则（北京时间、周一至周五不含法定节假日、闲时半价） | DeepSeek 官方定价页 <https://api-docs.deepseek.com/zh-cn/quick_start/pricing/> |
| 价格表（元/百万 tokens，高峰与闲时） | 同一官方页面 |
| 2026 年中国法定节假日区间 | 国务院年度放假安排，并用公共节假日 API（Nager.Date）交叉验证 |
| DSH 插件 API 契约 —— `window.__ModuleLoader__.load({ id, factory })`、`ctx.slots.register({ name, id, order, locale, inject }, Component)`、`ctx.webServer.register({ kind, path, handler })`、`ctx.locale.register(ns, { zh, en })`、session projection 结构 | **阅读社区插件公开源码**确认（如 `dsh-usage-stats`、`dsh-peak-indicator`）。这些属于**框架规定的写法**，不是业务逻辑。 |
| `assistant/chunk` 的 usage 事件是**按 `(turn, step)` 累计的快照** 这一数据格式 | 同上（它决定了 `sessionSteps()` 里的去重策略） |
| **其余全部为原创** —— 时段判断、按调用时刻的峰谷计价、用量与费用汇总、今日跨会话合计、时区适配、中英文字典、徽标 UI 与配色、全部测试 | 为本插件从零编写 |

**未从上述插件逐行复制任何代码。** 若发现任何未标注的重复，欢迎开 issue，会立即修正。

### 隐私

- **不读取** `.dsh/.credentials.yaml`（连键名都不读）。
- 金额是由会话事件日志折算的**估算值**，实际以 DeepSeek 账单为准。
- 会话相关的任何数据都不会离开本机。

### 作者

由 **DeepSeek V4.1-Flash** 全程制作编写（设计、代码、测试、自检与文档），在 DSH 会话中按仓库所有者的要求完成。
