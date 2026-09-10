# 接口 DTO 契约 · ReqDto / RespDto 全量字段定义

| 项目 | 内容 |
| --- | --- |
| 文档版本 | V1.6（2026-09-10 需求迭代·站内信+MQ：新增站内信接口组——GET /messages 分页、GET /messages/unread-count、POST /messages/{id}/read、POST /messages/read-all、管理端群发 POST /admin/messages（AdminMessageSendReqDto）+ MessageRespDto；MQ 落地定稿——统一通知 topic `his_notification`（type：挂号成功/挂号已取消）+ NotificationMessage 消息体契约，rocketmq-spring-boot-starter 定稿 2.3.1。DDL 走迁移脚本 V2.5__create_site_message.sql（site_message 表，init.sql 基线不变）。随 mock-data V2.6 / 拆解文档 V1.12；错误码新增 4004） |
| 维护方式 | **由 tools/gen-day-plans.mjs 自动生成，勿手改**；任何变更走 AGENTS.md 铁律二（接口数据结构变更）全组对齐后重新生成。⚠️ V1.3–V1.6 为发起方按铁律二/三代拟落稿——B 重新生成前须先把对应变更同步进 gen-day-plans.mjs 内嵌模板，否则重新生成会回退本变更 |
| 用途 | 后端写 DTO、前端写类型定义与请求函数的**唯一字段依据**；与 db/mock-data.md（JSON 示例）、《项目拆解设计说明书》第 4 章（路径与规约）配套 |
| ⚠️ 防漂移 | 40 份日计划内嵌的「当日 DTO 速览」与本文件同源生成；两处不一致时以本文件为准，并立即提对齐 |

## 通用规则

- 所有 DTO 实现 Serializable；日期 LocalDate（yyyy-MM-dd）、时间 LocalDateTime（yyyy-MM-dd HH:mm:ss）、金额 BigDecimal（两位小数）；
- 请求校验：jakarta.validation 注解 + Controller @Validated；业务失败统一 BizException + 错误码（拆解文档 5.2）；
- Entity 一律不出网；后端 DTO 放各域 dto 包；前端类型集中定义（vue-admin：src/api/，鸿蒙：common/api/，规则八前端附加）；
- 响应为空的接口（注册/退出/添加/保存/删除/取消）返回 Result<Void>，无 RespDto；单字段响应可直返简单类型仍由 Result 包装；
- 变更流程：发起方记录 → 对齐确认 → B 更新本文件 + mock-data.md + 拆解文档第 4 章 → 重新生成 → 前后端当天同步各自类型定义与日计划第 10 节对照表。

## DTO 定义（按调用方分组）

### 通用包装

**全部接口 · Result<T>（通用响应包装）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| code | Integer | 是 | 200 成功；其余为错误码（拆解文档 5.2） |
| message | String | 是 | 提示语，前端可直接 Toast |
| data | T | 否 | 业务数据，失败时为 null |

**GET /admin/departments、GET /admin/doctors · PageDTO<T>（通用分页包装）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| total | Long | 是 | 总条数 |
| pageNum | Integer | 是 | 当前页码 |
| pageSize | Integer | 是 | 每页条数 |
| records | List<T> | 是 | 当前页数据（元素为各 RespDto） |

### 认证与用户域（后端 B 实现 / 患者端 D 消费）

**POST /auth/register（S1） · RegisterReqDto（请求）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| username | String | 是 | @NotBlank，4–20 位字母/数字/下划线；全库唯一（重复→1001） |
| password | String | 是 | @NotBlank，6–20 位；BCrypt 加密落库，禁止回传 |
| confirmPassword | String | 是 | @NotBlank；须与 password 一致（不一致→400） |

**POST /auth/login（S2） · LoginReqDto（请求）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| username | String | 是 | @NotBlank |
| password | String | 是 | @NotBlank；校验失败→1002 |

**POST /auth/login（S2） · LoginRespDto（响应）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| token | String | 是 | JWT（HS256，24h）；前端存 AppStorage 并注入 Authorization |
| userId | Long | 是 | patient_user.id |
| username | String | 是 | 用户名；⚠️ 不含密码字段 |

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

### 医院资源域（后端 B 实现 / 患者端 D + 管理端 C 消费）

**GET /departments（S4）、GET /admin/departments（S11） · DepartmentRespDto（响应）**

> V1.3：GET /departments 返回**父子两级平铺列表**（7 个父分类节点 + 全部子科室），前端按 parentId 组两级（患者端 P4 左栏=父分类、右栏=子科室；管理端分类下拉/科室下拉=本列表过滤）。

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| id | Long | 是 | dept.id |
| deptName | String | 是 | 科室名称（父分类节点=分类名，如"内科"），≤100 |
| deptCategory | String | 是 | 分类名称冗余：子科室=父分类名称、父分类节点=自身名称（后端按 parent_id 维护） |
| parentId | Long | 否 | 父分类 id；NULL=自身为父分类节点（仅两级，无孙级） |
| deptIntro | String | 否 | 简介，≤500 |

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

**GET /quotas?deptId=&date=（当天挂号 P4A / 预约挂号 P4B，V1.3 新增） · QuotaRespDto（响应）**

> 按科室+日期返回医生号源行。date 为 yyyy-MM-dd（当天挂号传当天、预约传所选日期）；排序由后端保证：**先上午后下午，同时段内按职称 主任→副主任→主治**（前端不重排）。

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| scheduleId | Long | 是 | schedule.id；挂号时作为 scheduleId 传入 POST /registrations |
| doctorId | Long | 是 | 医生 id |
| doctorName | String | 是 | 医生姓名 |
| title | String | 是 | 主任医师 / 副主任医师 / 主治医师（中文直传） |
| skill | String | 否 | 擅长领域（前端单行截断展示） |
| timeSegment | String | 是 | 上午 / 下午 |
| leftQuota | Integer | 是 | 剩余号源；=0 时前端「已满」置灰不可点 |
| registerFee | BigDecimal | 是 | 挂号费（后端按职称映射：主任30/副主任20/主治15，同 DoctorRespDto）；确认挂号页费用展示来源 |

**GET /quotas/days?deptId=（预约页一周日期条，V1.3 新增） · QuotaDayRespDto（响应）**

> 该科室未来 7 天（当天+1 ~ 当天+7）每日可约状态汇总，供预约页日期条渲染三态。

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| date | LocalDate | 是 | yyyy-MM-dd，共 7 天升序 |
| dayStatus | String | 是 | 可约 / 已满 / 休（中文直传；当日该科室排班 leftQuota 全为 0→已满；无排班→休） |

**GET /schedules?doctorId=（S6）或 ?deptId=（P5 排班总览） · ScheduleRespDto（响应）**

> V1.3：新增 deptId 入参（与 doctorId 二选一，二者都传以 doctorId 为准）供 P5 科室级排班总览，此时响应须带医生信息（前端按医生分组渲染）；查询窗口固定**当天 ~ 当天+6** 共 7 天。

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| id | Long | 是 | schedule.id；挂号时作为 scheduleId 传入 POST /registrations |
| doctorId | Long | 是 | 医生 id（V1.3 新增；按 deptId 查询时作分组键） |
| doctorName | String | 是 | 医生姓名（V1.3 新增，联查 doctor 带出） |
| title | String | 是 | 主任医师 / 副主任医师 / 主治医师（V1.3 新增；职称标签展示） |
| workDate | LocalDate | 是 | 出诊日期 yyyy-MM-dd |
| timeSegment | String | 是 | 上午 / 下午（中文直传） |
| totalQuota | Integer | 是 | 号源总数 |
| leftQuota | Integer | 是 | 剩余号源；=0 时前端显示「已满」置灰不可选 |

**POST / PUT /admin/departments（S11） · DepartmentSaveReqDto（请求）**

> V1.3：deptCategory 改为后端按 parentId 冗余落库，请求不再传分类文本（消灭两个字段漂移的可能）。

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| deptName | String | 是 | @NotBlank，≤100 |
| parentId | Long | 是 | @NotNull；父分类节点 id（父分类节点自身 parentId 为 NULL；本期仅维护子科室，父分类七类由种子预置） |
| deptIntro | String | 否 | ≤500 |

**POST / PUT /admin/doctors（S12） · DoctorSaveReqDto（请求）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| doctorName | String | 是 | @NotBlank，≤50；建议不重名（展示友好，V2.1 起非强制拦截） |
| deptId | Long | 是 | @NotNull；科室须存在（→4001） |
| title | String | 是 | @NotBlank；三档中文职称之一 |
| skill | String | 否 | ≤500 |

### 挂号域（后端 A 实现 / 患者端 D 消费）

**POST /registrations（S8） · RegistrationCreateReqDto（请求）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| scheduleId | Long | 是 | @NotNull；GET /schedules 返回的 id（→3005 排班不存在） |
| memberId | Long | 是 | @NotNull；归属当前用户校验（→3006） |

**POST /registrations（S8） · RegistrationCreateRespDto（响应）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| orderNo | String | 是 | 订单号 yyyyMMddHHmmssSSS+6 位随机（23 位，唯一） |
| registerFee | BigDecimal | 是 | 挂号费（来源：职称映射 主任30/副主任20/主治15，拆解文档 6.5-⑥），两位小数 |

**GET /registrations/my（S9） · RegistrationRespDto（响应）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| orderNo | String | 是 | 唯一订单号 |
| memberName | String | 是 | 联查 patient_member（表内未存就诊人快照） |
| deptName | String | 是 | 下单快照 dept_name_snap |
| doctorName | String | 是 | 下单快照 doctor_name_snap |
| workDate | LocalDate | 是 | 就诊日期 |
| timeSegment | String | 是 | 上午 / 下午 |
| registerFee | BigDecimal | 是 | 挂号费 |
| status | String | 是 | 待就诊 / 已取消（中文直传） |
| createTime | LocalDateTime | 是 | 下单时间；列表按此倒序 |

### 统计域（后端 B 实现 / 管理端 C 消费；V1.4 新增）

> 统一口径（管理端设计稿待对齐 #15 定稿）：趋势 / 排行 / 占比的统计对象 = **近 7 天（含当天）有效挂号单**（appointment_record，status≠已取消）；KPI 环比固定「较昨日」、注册用户环比「较上周同期」；`days` / `limit` 参数本期固定不放开。聚合读 appointment_record / dept / doctor / patient_user（实训单体库直接聚合 SQL，跨域读不拆服务）。

**GET /admin/stats/summary · StatsSummaryRespDto（响应）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| todayRegistrations | Integer | 是 | 今日有效挂号单数（不含已取消） |
| registrationsVsYesterday | Integer | 是 | 今日挂号环比：较昨日，%（正=升↑，负=降↓，前端按正负渲染） |
| todayCancellations | Integer | 是 | 今日取消挂号单数 |
| cancellationsVsYesterday | Integer | 是 | 取消环比：较昨日，% |
| totalUsers | Long | 是 | 注册用户总数（patient_user 全量） |
| usersVsLastWeek | Integer | 是 | 注册用户环比：较上周同期，% |
| todayRevenue | BigDecimal | 是 | 今日收入 = 今日有效单 register_fee 快照求和，两位小数 |
| revenueVsYesterday | Integer | 是 | 收入环比：较昨日，% |
| morningCount | Integer | 是 | 今日上午有效单数（时段分布卡） |
| afternoonCount | Integer | 是 | 今日下午有效单数（与 morningCount 之和 = todayRegistrations） |

**GET /admin/stats/trend?days=7 · StatsTrendRespDto（响应，List）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| date | LocalDate | 是 | yyyy-MM-dd；近 7 天含当天，按日期升序 |
| registrations | Integer | 是 | 当日有效挂号单数（近 7 天折线卡数据源） |

**GET /admin/stats/dept-rank · StatsDeptRankRespDto（响应，List）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| deptName | String | 是 | 子科室名称（父分类节点不挂医生不产生挂号，自然不进榜） |
| count | Integer | 是 | 近 7 天有效单数；固定 TOP4，按 count 降序（科室挂号量柱状卡） |

**GET /admin/stats/doctor-top?limit=5 · StatsDoctorTopRespDto（响应，List）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| doctorName | String | 是 | 医生姓名 |
| deptName | String | 是 | 所属科室名称 |
| count | Integer | 是 | 近 7 天有效单数；固定 TOP5，按 count 降序（医生 TOP5 条形卡） |

**GET /admin/stats/title-ratio · StatsTitleRatioRespDto（响应，List）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| title | String | 是 | 职称中文直传（主任医师 / 副主任医师 / 主治医师） |
| count | Integer | 是 | 近 7 天有效单数 |
| percent | Integer | 是 | 占比 0–100（四舍五入）；三档 percent 之和 ≈ 100（职称占比进度条卡） |

**GET /admin/stats/latest?limit=4 · StatsLatestRespDto（响应，List）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| createTime | LocalDateTime | 是 | 下单时间 yyyy-MM-dd HH:mm:ss；按此倒序取最近 4 条有效单 |
| memberName | String | 是 | 联查 patient_member 得出 |
| deptName | String | 是 | 下单快照 dept_name_snap |
| doctorName | String | 是 | 下单快照 doctor_name_snap |
| registerFee | BigDecimal | 是 | 挂号费快照，两位小数 |

### 管理端运营域（V1.5 新增：患者管理=his-user·B / 挂号单管理=his-registration·A / 排班管理=his-hospital·B；管理端 C 消费）

**GET /admin/users（M7 患者管理分页，支持 keyword 模糊查用户名） · AdminUserRespDto（响应）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| id | Long | 是 | patient_user.id |
| username | String | 是 | 登录用户名 |
| registerTime | LocalDateTime | 是 | 注册时间 yyyy-MM-dd HH:mm:ss |
| status | String | 是 | 正常 / 已封禁（中文直传，V2.4 新列） |
| memberCount | Integer | 是 | 就诊人数量（联查 patient_member 计数；便于演示封禁前核对） |

**POST /admin/users/{id}/ban、POST /admin/users/{id}/unban（封禁/解封）**：无 body，返回 `Result<Void>`；封禁后该账号登录 → **1003 账号已封禁**；id 不存在 → 400。

**GET /admin/registrations（M8 挂号单管理分页，只读；支持 date/status/keyword 筛选） · AdminRegistrationRespDto（响应）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| orderNo | String | 是 | 唯一订单号 |
| username | String | 是 | 下单患者账号（联查 patient_user） |
| memberName | String | 是 | 就诊人（联查 patient_member） |
| deptName | String | 是 | 快照 dept_name_snap |
| doctorName | String | 是 | 快照 doctor_name_snap |
| workDate | LocalDate | 是 | 就诊日期 yyyy-MM-dd |
| timeSegment | String | 是 | 上午 / 下午 |
| registerFee | BigDecimal | 是 | 挂号费快照，两位小数 |
| status | String | 是 | 待就诊 / 已取消（中文直传） |
| createTime | LocalDateTime | 是 | 下单时间；默认按此倒序 |

**GET /admin/schedules（M9 排班列表，doctorId 与日期区间可选筛选） · AdminScheduleRespDto（响应，List）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| id | Long | 是 | schedule.id |
| doctorId | Long | 是 | doctor.id |
| doctorName | String | 是 | 联查 doctor 带出 |
| deptName | String | 是 | 医生所属科室（联查 dept） |
| workDate | LocalDate | 是 | 出诊日期 yyyy-MM-dd |
| timeSegment | String | 是 | 上午 / 下午 |
| totalQuota | Integer | 是 | 号源总数 |
| leftQuota | Integer | 是 | 剩余号源（=totalQuota-已挂号；已挂号数前端可自算） |

**POST /admin/schedules（新增排班） · AdminScheduleSaveReqDto（请求）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| doctorId | Long | 是 | @NotNull；医生须存在且为子科室医生（→4001） |
| workDate | LocalDate | 是 | @NotNull yyyy-MM-dd；仅允许**当天及以后**（过去日期→400） |
| timeSegment | String | 是 | 上午 / 下午（中文直传；与医生+日期组合唯一→5001） |
| totalQuota | Integer | 是 | @Min(1)，≤200；落库 left_quota=total_quota |

**PUT /admin/schedules/{id}（修改排班，仅可改号源数） · AdminScheduleUpdateReqDto（请求）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| totalQuota | Integer | 是 | @Min(1)，≤200；须 ≥ 已挂号数（total_quota-left_quota，否则→5004）；仅未来日期可改（→5002） |

**DELETE /admin/schedules/{id}（删除排班，逻辑删除）**：无 body，返回 `Result<Void>`；已有**有效挂号**（待就诊）→ **5003 该排班已有挂号，不可删除**；仅未来日期可删（→5002）。

### 消息域（后端 A 全链路实现（his-message 模块）：MQ 生产/消费 + 站内信接口；患者端 D + 管理端 C 消费；V1.6 新增）

> 数据表：site_message（迁移脚本 `db/migrations/V2.5__create_site_message.sql`，铁律一）。触发：①挂号成功/取消 → his-registration 经 MQ（topic `his_notification`）异步通知，消费者落库；②管理端群发系统公告（同步直写，按用户逐行落库，不走 MQ）。

**GET /messages（我的站内信分页，isRead 可选筛选，createTime 倒序） · MessageRespDto（响应，PageDTO 包装）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| id | Long | 是 | site_message.id |
| title | String | 是 | 消息标题，≤100 |
| content | String | 是 | 消息正文，≤500 |
| msgType | String | 是 | 挂号成功 / 挂号已取消 / 系统通知（中文直传，前端配色区分） |
| orderNo | String | 否 | 关联订单号（系统公告为 null；可深链至挂号记录） |
| isRead | Integer | 是 | 0 未读 / 1 已读 |
| createTime | LocalDateTime | 是 | 消息时间 yyyy-MM-dd HH:mm:ss，列表按此倒序 |

**GET /messages/unread-count（未读数，首页铃铛红点）**：无 RespDto，单字段响应直返 `Result<Integer>`

**POST /messages/{id}/read（标记已读）**：路径参数，`Result<Void>`；写入 read_time；id 不存在或不属于当前用户 → **4004**

**POST /messages/read-all（全部已读）**：无 body，`Result<Void>`（当前用户全部未读置 1）

**POST /admin/messages（管理端群发系统公告，全员逐行落库） · AdminMessageSendReqDto（请求）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| title | String | 是 | @NotBlank，≤100；公告标题 |
| content | String | 是 | @NotBlank，≤500；公告正文 |

**MQ 消息体契约（内部契约，非 HTTP 接口） · NotificationMessage（topic：`his_notification`）**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| type | String | 是 | 挂号成功 / 挂号已取消（消费者据此生成标题与 msg_type） |
| orderNo | String | 是 | 订单号（落 site_message.order_no） |
| userId | Long | 是 | 接收患者账号 id |
| memberName | String | 是 | 就诊人姓名（正文用） |
| doctorName | String | 是 | 医生姓名（正文用） |
| workDate | LocalDate | 是 | 就诊日期 yyyy-MM-dd |
| timeSegment | String | 是 | 上午 / 下午 |

## 责任分工

| 角色 | 职责 |
| --- | --- |
| 后端 B | auth（含封禁登录拦截 1003，V1.5）/ members / departments / doctors / schedules（含管理端排班 CRUD，V1.5）/ admin（含 stats 统计组 6 RespDto，V1.4；患者管理 AdminUserRespDto，V1.5）全部 DTO 实现与 @Schema 注解 |
| 后端 A | registrations 三个 DTO + 管理端挂号单列表 AdminRegistrationRespDto（V1.5）+ 消息域全部 DTO 与 MQ NotificationMessage（V1.6，his-message 模块）实现与 @Schema 注解 |
| 前端 C | 管理端相关类型从本文件逐字段抄写至 src/api/ |
| 前端 D | 患者端相关类型从本文件逐字段抄写至 common/api/ |
