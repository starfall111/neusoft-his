# 成员B（后端 · 用户域/医院域/数据库） · 第 3 天：CRUD高产日

| 项 | 内容 |
| --- | --- |
| 日期 | 2026-09-09（周三） |
| 关联故事 | S6/S7/S3/S11/S12 |
| 当日主题 | CRUD高产日 |
| 契约依据 | 《项目拆解设计说明书》第 4/6/7 章 · db/init.sql · db/mock-data.md |

## 1. 当日目标

当日 12 个接口全部上线（含 V1.9 号源组）。

## 2. 前置条件（开工前逐项确认）

- D2 五接口全绿；多模块拆分完成

## 3. 任务清单（按序执行）

1. S6 GET /schedules：doctorId 与 deptId 二选一（都传以 doctorId 为准），查询窗口固定**当天~当天+6**；ScheduleRespDto 带 doctorId/doctorName/title（V1.9），deptId 科室级查询无排班返回空数组
2. V1.9 号源组：GET /quotas?deptId=&date=（QuotaRespDto；后端排序**先上午后下午、时段内职称主任→副主任→主治**）、GET /quotas/days?deptId=（QuotaDayRespDto，当天+1~+7 共 7 天三态 可约/已满/休）
3. S7 POST /members（上限 3 人→2001；Hutool IdcardUtil→2002）、GET /members
4. S3 POST /auth/logout
5. S11 /admin/departments 四接口（Flex paginate → PageDTO，字段按 mock-data.md；V2.3：保存改传 parentId，删除父分类节点时其下仍有子科室 → 400「该分类下存在科室，无法删除」）
6. S12 /admin/doctors 四接口（deptId 不存在→4001；删除医生=逻辑删除 delmark=1 且同事务将其未来排班逻辑删除 delmark=1，见 6.5-②）
7. 12 接口全部 Apifox 实测并与 db/mock-data.md 逐字段 diff；填第 10 节对照表（规则八）

## 4. 涉及契约（表 / 接口 / Key）

- 接口：拆解文档 4.4/4.5/4.6
- 表：schedule / patient_member

### 当日 DTO 速览（权威定义：db/dto-contract.md，与本表同源生成；冲突以契约文件为准并提对齐，禁止私自加改字段）

**GET /schedules（S6，doctorId 与 deptId 二选一，窗口当天~当天+6） · ScheduleRespDto（响应）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| id | Long | 是 | schedule.id；挂号时作为 scheduleId 传入 POST /registrations |
| doctorId | Long | 是 | doctor.id（V1.9 新增；deptId 查询时前端按医生分组渲染） |
| doctorName | String | 是 | 联查 doctor 带出（V1.9 新增） |
| title | String | 是 | 职称中文直传（V1.9 新增） |
| workDate | LocalDate | 是 | 出诊日期 yyyy-MM-dd |
| timeSegment | String | 是 | 上午 / 下午（中文直传） |
| totalQuota | Integer | 是 | 号源总数 |
| leftQuota | Integer | 是 | 剩余号源；=0 时前端显示「已满」置灰不可选 |

**GET /quotas?deptId=&date=（V1.9 新增，P4A/P4B 医生号源卡数据源） · QuotaRespDto（响应，List）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| scheduleId | Long | 是 | schedule.id；挂号时作为 scheduleId 传入 POST /registrations |
| doctorId | Long | 是 | doctor.id |
| doctorName | String | 是 | 医生姓名 |
| title | String | 是 | 职称中文直传 |
| skill | String | 否 | 擅长领域 |
| timeSegment | String | 是 | 上午 / 下午；后端排序先上午后下午、时段内职称主任→副主任→主治 |
| leftQuota | Integer | 是 | 剩余号源；=0 该时段行不可选 |
| registerFee | BigDecimal | 是 | 挂号费（后端按职称映射：主任30/副主任20/主治15），确认页费用展示来源 |

**GET /quotas/days?deptId=（V1.9 新增，P4B 日期条） · QuotaDayRespDto（响应，List）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| date | LocalDate | 是 | yyyy-MM-dd；当天+1~+7 共 7 天 |
| dayStatus | String | 是 | 可约 / 已满 / 休（三态中文直传） |

**POST /members（S7） · MemberCreateReqDto（请求）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| memberName | String | 是 | @NotBlank，≤50 |
| gender | String | 是 | @NotBlank；中文直传「男」/「女」 |
| idCard | String | 是 | @NotBlank；18 位身份证，前后端双侧校验（格式错→2002） |
| phone | String | 是 | @NotBlank；11 位数字（DDL NOT NULL，V2.0 起必填） |
| birthday | LocalDate | 否 | yyyy-MM-dd，@Past |

**GET /members（S7） · MemberRespDto（响应）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| id | Long | 是 | patient_member.id |
| memberName | String | 是 | 就诊人姓名 |
| gender | String | 是 | 男 / 女 |
| idCard | String | 是 | 身份证号 |
| phone | String | 是 | 手机号 |
| birthday | LocalDate | 否 | 出生日期 |

**POST / PUT /admin/departments（S11） · DepartmentSaveReqDto（请求）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| deptName | String | 是 | @NotBlank，≤100 |
| parentId | Long | 是 | @NotNull；父分类节点 id（GET /departments 过滤 parentId 为空的七类；V2.3 改传 id 不再传分类文本） |
| deptIntro | String | 否 | ≤500 |

**POST / PUT /admin/doctors（S12） · DoctorSaveReqDto（请求）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| doctorName | String | 是 | @NotBlank，≤50；建议不重名（展示友好，V2.1 起非强制拦截） |
| deptId | Long | 是 | @NotNull；科室须存在（→4001） |
| title | String | 是 | @NotBlank；三档中文职称之一 |
| skill | String | 否 | ≤500 |

**GET /admin/departments、GET /admin/doctors · PageDTO<T>（通用分页包装）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| total | Long | 是 | 总条数 |
| pageNum | Integer | 是 | 当前页码 |
| pageSize | Integer | 是 | 每页条数 |
| records | List<T> | 是 | 当前页数据（元素为各 RespDto） |

## 5. 自测清单（DoD，完成打勾）

- [ ] 当日 12 接口 Apifox 全绿
- [ ] 对照拆解文档 4.3–4.6 抽查字段名/类型一致（含 PageDTO 结构）
- [ ] /quotas 排序正确（上午在前、时段内主任→副主任→主治）；/quotas/days 三态正确

## 6. 产出物

- 患者浏览（含 V1.9 号源组）与后台管理全量接口

## 7. 今日对齐点（涉及契约必读 AGENTS.md 铁律）

- 与 C 约定明日切真实接口
- 与 D 确认空数组→『暂无排班』、/quotas 医生卡与日期条渲染
- 删除父分类节点 400 拦截口径与 C 演示场景对齐

## 8. 契约变更记录（涉 DDL / 接口结构 / 接口路径时必填，先对齐再动手）

| # | 时间 | 变更内容（DDL/接口结构/路径） | 影响成员 | 对齐状态 |
| --- | --- | --- | --- | --- |
| 1 | 2026-09-10 | V1.9 号源组 GET /quotas、/quotas/days 实现排期补入本日（schedule 查询域，his-hospital）；GET /schedules 按 V1.9 定稿口径实现（deptId 二选一、窗口当天~+6、响应带医生字段） | A（放行清单）/ C / D | ☑ 已对齐（拆解文档 V1.9/V1.10 定稿） |
| 2 | 2026-09-10 | V2.3 科室父子分类同步：DepartmentSaveReqDto 改传 parentId、DepartmentRespDto 增 parentId、删除父分类 400 校验 | C / D | ☑ 已对齐（init.sql V2.3 / dto-contract V1.3，2026-09-08） |

## 9. 答辩积累区（每日收工前必填，AGENTS.md 规则六/七；第 9 天汇总为答辩讲稿与问题库素材）

### a. 今日知识卡片（当日结束时你应能脱稿讲清以下点；「我的理解」必须自己写，不许 AI 代写）

| 技术点（当日预填） | 我的理解（自己写一两句） | 对应代码/文件 | 预判老师追问 |
| --- | --- | --- | --- |
| Flex paginate 分页原理 |  |  |  |
| 身份证/手机号前后端双侧校验的意义 |  |  |  |

### b. 今日最有讲头的问题（从 exception-day03/ 的 issue 中挑 1 条，浓缩成一句话答辩素材；无 issue 则填「今日无」）

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

[← 上一份](D02-登录注册与首批查询.md) · [目录规则](AGENTS.md) · [下一份 →](D04-科室缓存CacheAside.md)
