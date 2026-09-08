# 接口 DTO 契约 · ReqDto / RespDto 全量字段定义

| 项目 | 内容 |
| --- | --- |
| 文档版本 | V1.2（铁律二变更：DoctorRespDto 新增 registerFee——挂号费对外展示口径；随拆解文档 V1.7） |
| 维护方式 | **由 tools/gen-day-plans.mjs 自动生成，勿手改**；任何变更走 AGENTS.md 铁律二（接口数据结构变更）全组对齐后重新生成 |
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

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| id | Long | 是 | dept.id |
| deptName | String | 是 | 科室名称，≤100 |
| deptCategory | String | 是 | 分类（管理端下拉七类：内科/外科/妇儿/五官/皮肤/中医/其他） |
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

**GET /schedules（S6） · ScheduleRespDto（响应）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| id | Long | 是 | schedule.id；挂号时作为 scheduleId 传入 POST /registrations |
| workDate | LocalDate | 是 | 出诊日期 yyyy-MM-dd |
| timeSegment | String | 是 | 上午 / 下午（中文直传） |
| totalQuota | Integer | 是 | 号源总数 |
| leftQuota | Integer | 是 | 剩余号源；=0 时前端显示「已满」置灰不可选 |

**POST / PUT /admin/departments（S11） · DepartmentSaveReqDto（请求）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| deptName | String | 是 | @NotBlank，≤100 |
| deptCategory | String | 是 | @NotBlank；下拉七类取值 |
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

## 责任分工

| 角色 | 职责 |
| --- | --- |
| 后端 B | auth / members / departments / doctors / schedules / admin 全部 DTO 实现与 @Schema 注解 |
| 后端 A | registrations 三个 DTO 实现与 @Schema 注解 |
| 前端 C | 管理端相关类型从本文件逐字段抄写至 src/api/ |
| 前端 D | 患者端相关类型从本文件逐字段抄写至 common/api/ |
