# 成员C（前端 · Vue3 管理端） · 第 4 天：管理端回归与UX + 统计大屏页

| 项 | 内容 |
| --- | --- |
| 日期 | 2026-09-10（周四） |
| 关联故事 | S11/S12/S13（统计大屏） |
| 当日主题 | 管理端回归与UX + 统计大屏页（M6） |
| 契约依据 | 《项目拆解设计说明书》第 4/6/7 章 · db/init.sql · db/mock-data.md |

## 1. 当日目标

缓存链路三方验证；交互细节补齐；统计大屏页（M6）mock 渲染完成。

## 2. 前置条件（开工前逐项确认）

- B 的科室缓存已上线（D4）
- 图表库已定稿：ECharts 5 + vue-echarts（待对齐 #14，组长 2026-09-10 评审通过）

### 设计稿先行（页面任务动手前必看——先看稿、后写码）

> 涉及页面的任务，AI 工具与成员必须先查看下方设计稿截图与规范，布局 / 文案 / 交互状态严格按稿实现，禁止凭想象自由发挥；完成后逐张截图对照验收。

- 必读规范：doc/ui/UI统一规范.md
- 截图目录：doc/ui/pen/页面截图/（截图即设计稿，以图片为准）
- ℹ️ 本日为 UX 完善 + 大屏页开发：以下截图即空态 / loading / 确认弹窗等交互形态的对照基准。

本日对应设计稿截图：

- M6 统计大屏.png（大屏页整稿：七卡布局/环比色/折线样式）
- M2 科室管理-正常.png
- M2 科室管理-新增Dialog.png
- M2 科室管理-删除确认.png
- M2 科室管理-空态.png
- M3 医生管理-正常.png
- M3 医生管理-新增Dialog.png
- M4 全局-401提示页.png
- M4 全局-反馈状态.png

## 3. 任务清单（按序执行）

1. 配合 B 验证『改科室→前台（App）立即可见』缓存链路
2. UX 完善：loading、空态、表单重置、分页参数保持、删除后刷新当前页
3. ⭐ 统计大屏页（M6，/admin/dashboard，侧边栏第三项）：①`npm i echarts vue-echarts` 入基线依赖；②`src/api/stats.ts` 集中定义六接口函数+TS 类型（从 db/mock-data.md V2.4 §4 逐字段抄写：summary/trend/dept-rank/doctor-top/title-ratio/latest）；③七卡按稿渲染——KPI×4（环比 ↑success/↓danger 按正负）、近 7 天折线（面积填充+数据点）、今日时段（上午 96/下午 32 双柱）、科室柱状 TOP4、医生条形 TOP5（前三名次 primary）、职称进度条×3、最新动态列表×4；④每卡 v-loading、接口失败卡内 el-empty+Message、空数据 el-empty（单卡失败不白屏）；⑤顶栏当前日期；mock 期用 mock-data.md V2.4 示例值（与设计稿同源）
4. 大屏页对照「M6 统计大屏.png」逐卡自验截图，入 doc/screenshots/

## 4. 涉及契约（表 / 接口 / Key）

- 统计接口组：拆解文档 4.6.1 · dto-contract V1.4「统计域」 · mock-data V2.4 §4（V1.3 落契约）
- 其余当日不涉及契约文件改动

### 当日 DTO 速览（权威定义：db/dto-contract.md，与本表同源生成；冲突以契约文件为准并提对齐，禁止私自加改字段）

**GET /departments（S4）、GET /admin/departments（S11） · DepartmentRespDto（响应；V2.3 父子平铺）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| id | Long | 是 | dept.id |
| deptName | String | 是 | 科室名称，≤100 |
| deptCategory | String | 是 | 分类名称冗余：子科室=父分类名、父分类节点=自身名（后端按 parentId 维护） |
| parentId | Long | 否 | 父分类 id；NULL=自身为父分类节点（V2.3 新增） |
| deptIntro | String | 否 | 简介，≤500 |

**GET /admin/stats/summary · StatsSummaryRespDto（响应；V1.4 新增，KPI 四卡+时段）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| todayRegistrations | Integer | 是 | 今日有效挂号单数；环比 registrationsVsYesterday（较昨日，%正升负降） |
| todayCancellations | Integer | 是 | 今日取消单数；环比 cancellationsVsYesterday |
| totalUsers | Long | 是 | 注册用户总数；环比 usersVsLastWeek（较上周） |
| todayRevenue | BigDecimal | 是 | 今日收入两位小数；环比 revenueVsYesterday |
| morningCount / afternoonCount | Integer | 是 | 上午/下午单数（时段卡，之和=今日挂号） |

**其余统计五接口（V1.4，src/api/stats.ts 逐字段抄写）**

- `GET /admin/stats/trend?days=7` → `StatsTrendRespDto{date, registrations}`（升序 7 天，折线卡）
- `GET /admin/stats/dept-rank` → `StatsDeptRankRespDto{deptName, count}`（TOP4 降序，柱状卡）
- `GET /admin/stats/doctor-top?limit=5` → `StatsDoctorTopRespDto{doctorName, deptName, count}`（条形卡）
- `GET /admin/stats/title-ratio` → `StatsTitleRatioRespDto{title, count, percent}`（进度条卡）
- `GET /admin/stats/latest?limit=4` → `StatsLatestRespDto{createTime, memberName, deptName, doctorName, registerFee}`（动态列表卡）

**GET /doctors（S5）、GET /admin/doctors（S12） · DoctorRespDto（响应）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| id | Long | 是 | doctor.id |
| doctorName | String | 是 | 医生姓名（建议全库不重名，展示友好；V2.1 起非强制） |
| title | String | 是 | 主任医师 / 副主任医师 / 主治医师（中文直传，无编码） |
| skill | String | 否 | 擅长领域，≤500 |
| deptId | Long | 是 | 所属科室 id |
| deptName | String | 是 | 联查 dept 带出 |
| registerFee | BigDecimal | 是 | 挂号费（后端按职称映射：主任30/副主任20/主治15，拆解文档 6.5-⑥）；确认挂号页费用展示来源，提交时不传、后端重算 |

## 5. 自测清单（DoD，完成打勾）

- [ ] 缓存链路验证通过（记录演示步骤，答辩用）
- [ ] UX 检查单全部通过
- [ ] 大屏页七卡齐全（KPI×4/折线/时段/柱状/条形/占比/动态），与「M6 统计大屏.png」逐卡对照一致
- [ ] 每卡 loading/空态/接口失败三态可演示；侧边栏「统计大屏」选中高亮
- [ ] stats.ts 类型与 mock-data.md V2.4 §4 逐字段一致；组件内无手写 URL/字段

## 6. 产出物

- 缓存即时生效演示步骤记录 + 统计大屏页（mock 版）+ src/api/stats.ts

## 7. 今日对齐点（涉及契约必读 AGENTS.md 铁律）

- 与 B/D 三方验证；发现接口问题走缺陷清单给 B
- 统计口径确认：大屏数值=近 7 天有效单（不含已取消），与 B·D04 实现口径一致（明日切真实接口前复核）

## 8. 契约变更记录（涉 DDL / 接口结构 / 接口路径时必填，先对齐再动手）

| # | 时间 | 变更内容（DDL/接口结构/路径） | 影响成员 | 对齐状态 |
| --- | --- | --- | --- | --- |
| 1 | 2026-09-10 | 新增统计接口组 6 接口（GET /admin/stats/*）：Stats*RespDto ×6 落 dto-contract V1.4「统计域」/ mock-data V2.4 §4 / 拆解文档 4.6.1；图表库定稿 ECharts 5 + vue-echarts（#14，组长评审通过） | B（实现） | ☑ 已对齐（组长 2026-09-10 确认；本日 mock 开发，D05 切真实） |

## 9. 答辩积累区（每日收工前必填，AGENTS.md 规则六/七；第 9 天汇总为答辩讲稿与问题库素材）

### a. 今日知识卡片（当日结束时你应能脱稿讲清以下点；「我的理解」必须自己写，不许 AI 代写）

| 技术点（当日预填） | 我的理解（自己写一两句） | 对应代码/文件 | 预判老师追问 |
| --- | --- | --- | --- |
| 改数据 → 缓存清除 → 前台可见的完整链路 |  |  |  |
| ECharts 按需注册与按卡封装（单卡失败不白屏） |  |  |  |

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

[← 上一份](D03-真实接口与医生管理页.md) · [目录规则](AGENTS.md) · [下一份 →](D05-支援App端与素材.md)
