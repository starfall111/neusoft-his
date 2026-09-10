# 成员B（后端 · 用户域/医院域/数据库） · 第 4 天：科室缓存CacheAside

| 项 | 内容 |
| --- | --- |
| 日期 | 2026-09-10（周四） |
| 关联故事 | S4/S11/S13（统计大屏） |
| 当日主题 | 科室缓存CacheAside + 统计大屏接口组 |
| 契约依据 | 《项目拆解设计说明书》第 4/6/7 章 · db/init.sql · db/mock-data.md |

## 1. 当日目标

科室查询走缓存，管理端写时删缓存；统计大屏 6 接口上线供 C 联调。

## 2. 前置条件（开工前逐项确认）

- A 的 CacheService 可用（D4 当天并行）
- D03 的 12 接口全绿（统计口径依赖有效挂号单数据，可先造数）

## 3. 任务清单（按序执行）

1. GET /departments 接入 CacheService：key=dept:list:{delmark}（V2.3 全量平铺、无 category 入参），TTL 1800s+随机抖动，只缓存 List 不缓存分页
2. 科室增/改/删后 evictByPrefix 清缓存
3. ⭐ 统计大屏接口组 6 接口实现（拆解文档 4.6.1 · dto-contract V1.4「统计域」）：GET /admin/stats/summary、/trend?days=7、/dept-rank、/doctor-top?limit=5、/title-ratio、/latest?limit=4；口径=近 7 天（含当天）有效单（status≠已取消）、KPI 环比较昨日、注册用户较上周；聚合 SQL 直查 appointment_record/dept/doctor/patient_user
4. 统计 6 接口 Apifox 实测并与 db/mock-data.md V2.4 §4 逐字段 diff；填第 10 节对照表（规则八）
5. 与 A 互验缓存链路（命中日志）

## 4. 涉及契约（表 / 接口 / Key）

- 缓存 key：拆解文档 7.1
- 统计接口组：拆解文档 4.6.1 · dto-contract V1.4「统计域」 · mock-data V2.4 §4

### 当日 DTO 速览（权威定义：db/dto-contract.md，与本表同源生成；冲突以契约文件为准并提对齐，禁止私自加改字段）

**GET /departments（S4）、GET /admin/departments（S11） · DepartmentRespDto（响应）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| id | Long | 是 | dept.id |
| deptName | String | 是 | 科室名称，≤100 |
| deptCategory | String | 是 | 分类名称冗余：子科室=父分类名、父分类节点=自身名（后端按 parentId 维护，V2.3） |
| parentId | Long | 否 | 父分类 id；NULL=自身为父分类节点（仅两级，V2.3 新增） |
| deptIntro | String | 否 | 简介，≤500 |

**GET /admin/stats/summary · StatsSummaryRespDto（响应；V1.4 新增）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| todayRegistrations | Integer | 是 | 今日有效挂号单数（不含已取消） |
| registrationsVsYesterday | Integer | 是 | 较昨日环比，%（正升负降） |
| todayCancellations | Integer | 是 | 今日取消单数 |
| cancellationsVsYesterday | Integer | 是 | 较昨日环比，% |
| totalUsers | Long | 是 | 注册用户总数（patient_user 全量） |
| usersVsLastWeek | Integer | 是 | 较上周同期环比，% |
| todayRevenue | BigDecimal | 是 | 今日有效单 register_fee 快照求和，两位小数 |
| revenueVsYesterday | Integer | 是 | 较昨日环比，% |
| morningCount / afternoonCount | Integer | 是 | 今日上午/下午有效单数（之和=todayRegistrations） |

**GET /admin/stats/trend?days=7 · StatsTrendRespDto（响应，List）**：`date`（yyyy-MM-dd 升序，近 7 天含当天）+ `registrations`（当日有效单数）

**GET /admin/stats/dept-rank · StatsDeptRankRespDto（响应，List）**：`deptName`（子科室）+ `count`（近 7 天有效单，TOP4 降序）

**GET /admin/stats/doctor-top?limit=5 · StatsDoctorTopRespDto（响应，List）**：`doctorName` + `deptName` + `count`（TOP5 降序）

**GET /admin/stats/title-ratio · StatsTitleRatioRespDto（响应，List）**：`title`（中文直传）+ `count` + `percent`（0–100 四舍五入）

**GET /admin/stats/latest?limit=4 · StatsLatestRespDto（响应，List）**：`createTime`（倒序取 4 条）+ `memberName` + `deptName`（快照）+ `doctorName`（快照）+ `registerFee`（快照）

## 5. 自测清单（DoD，完成打勾）

- [ ] 科室二次查询命中（日志无 SQL）；后台改科室后前台立即可见
- [ ] 管理端分页查询不进缓存
- [ ] 统计 6 接口 Apifox 全绿且口径正确：已取消单不计入挂号量/收入；morningCount+afternoonCount=todayRegistrations
- [ ] 统计响应与 db/mock-data.md V2.4 §4 逐字段一致（字段名/类型/格式）

## 6. 产出物

- 科室缓存接入 + 统计大屏接口组（C·D05 可切真实）

## 7. 今日对齐点（涉及契约必读 AGENTS.md 铁律）

- 与 A 联调互验
- 与 C/D 三方验证『改科室→App 即时可见』
- 统计口径（近 7 天有效单/环比）与 C 大屏页展示口径确认（C·D05 联调前）

## 8. 契约变更记录（涉 DDL / 接口结构 / 接口路径时必填，先对齐再动手）

| # | 时间 | 变更内容（DDL/接口结构/路径） | 影响成员 | 对齐状态 |
| --- | --- | --- | --- | --- |
| 1 | 2026-09-10 | 新增统计接口组 6 接口（GET /admin/stats/*，路径铁律三+结构铁律二）：6 个 Stats*RespDto；口径定稿（近 7 天有效单/环比较昨日/注册用户较上周） | C（消费） | ☑ 已对齐（组长 2026-09-10 确认；dto-contract V1.4 / mock-data V2.4 / 拆解文档 4.6.1 已落稿） |

## 9. 答辩积累区（每日收工前必填，AGENTS.md 规则六/七；第 9 天汇总为答辩讲稿与问题库素材）

### a. 今日知识卡片（当日结束时你应能脱稿讲清以下点；「我的理解」必须自己写，不许 AI 代写）

| 技术点（当日预填） | 我的理解（自己写一两句） | 对应代码/文件 | 预判老师追问 |
| --- | --- | --- | --- |
| Cache-Aside：为什么删缓存而不是改缓存 |  |  |  |
| 为什么只缓存 List 不缓存分页 |  |  |  |
| 统计口径：为什么排除已取消单、收入用费用快照求和 |  |  |  |

### b. 今日最有讲头的问题（从 exception-day04/ 的 issue 中挑 1 条，浓缩成一句话答辩素材；无 issue 则填「今日无」）

| 问题一句话 | 怎么定位 | 怎么解决 | issue 文件名 |
| --- | --- | --- | --- |
|  |  |  |  |

### c. 素材归档

今日演示级素材（截图/录屏/数据）已存 doc/screenshots/，文件名：　　　（无则填「无」）

### d. 复述自检（规则六）

- [ ] 已把今日核心改动讲给至少一位组员听（2 分钟版），对方表示听懂

## 10. 接口一致性对照表（当日有接口编码/对接必填，AGENTS.md 规则八三步绑定；无则写「当日不涉及接口编码」）

| 接口（方法+路径） | 我方端 | 契约出处 | 编码前契约复述 | 编码后逐字段对照 | 不一致→处理（缺陷清单/铁律） |
| --- | --- | --- | --- | --- | --- |
|  | FE / BE | 拆解文档 4.x / mock §x | ☐ | ☐ |  |

> 填写规则（规则八）：每实现/对接一个接口记一行——编码前先向 AI 核对契约原文（第 1 步），编码后逐字段对照并打勾（第 3 步）；发现不一致走第 8 节契约变更记录或缺陷清单，**严禁私自做字段映射适配**。

---

[← 上一份](D03-CRUD高产日.md) · [目录规则](AGENTS.md) · [下一份 →](D05-接口文档与联调支撑.md)
