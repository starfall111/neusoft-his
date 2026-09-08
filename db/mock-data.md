# 前端 Mock 数据契约（与 db/init.sql V2.3 种子数据一致）

| 项目 | 内容 |
| --- | --- |
| 文档版本 | V2.3（2026-09-08 需求迭代·挂号流程改版：①GET /departments 父子两级结构（parentId）；②新增 GET /quotas 按科室+日期查号源；③新增 GET /quotas/days 日期条状态；④GET /schedules 支持 deptId 且响应带医生字段；⑤排班种子改当天~+7 并差异化余号/休息日。随 dto-contract V1.3 / init.sql V2.3） |
| 适用对象 | 前端 C（Vue 管理端）、前端 D（鸿蒙患者端） |
| 核心约定 | **字段名 = 接口 DTO 字段（小驼峰）**；**取值 = init.sql 种子数据**；前后端并行开发期间，前端 mock 只允许使用本文档字段与取值 |
| ⚠️ 铁律 | 缺字段 / 字段不符 / 需要新取值 → **不要自行编造**，记录到当日计划文档「契约变更记录」并在站会提对齐诉求（见 AGENTS.md 铁律二） |

---

## 1. 通用响应包装（所有接口统一）

```json
{ "code": 200, "message": "成功", "data": null }
```

- `code === 200` 成功取 `data`；否则 Toast `message`；HTTP 401（未登录/Token 失效）统一跳登录页；
- 日期格式 `yyyy-MM-dd`，时间 `yyyy-MM-dd HH:mm:ss`，金额为数字（两位小数）。

### 错误码速查

| code | 含义 | code | 含义 |
| --- | --- | --- | --- |
| 200 | 成功 | 3001 | 该时段号源已约满 |
| 400 | 参数校验失败 | 3002 | 重复挂号（同人+医生+日期+时段） |
| 401 | 未登录/Token 失效（HTTP 同步 401） | 3003 | 操作频繁，请稍后再试（限流） |
| 500 | 系统异常 | 3004 | 当前状态不可取消 |
| 1001 | 用户名已存在 | 3005 | 排班不存在 |
| 1002 | 用户名或密码错误 | 3006 | 就诊人不存在或不属于当前用户 |
| 2001 | 就诊人已达上限（3 人） | 4001 | 科室不存在 |
| 2002 | 身份证格式错误 | | |

## 2. 枚举取值表（V2.0 契约：中文直传，前端零映射）

| 字段 | 合法取值（接口直接传输中文字符串） |
| --- | --- |
| title（职称） | 主任医师 / 副主任医师 / 主治医师（列表排序口径：主任→副主任→主治，由后端按此顺序返回，前端直接展示） |
| registerFee（挂号费） | 由后端按职称映射计算返回：**主任医师 30.00 / 副主任医师 20.00 / 主治医师 15.00**；前端直接展示即可，**禁止自行维护价格映射**；提交挂号时不传费用（后端重算，防篡改） |
| timeSegment（时段） | 上午 / 下午 |
| gender（性别） | 男 / 女 |
| status（挂号状态） | 待就诊 / 已取消 |
| dayStatus（日期条状态，V2.3） | 可约 / 已满 / 休（GET /quotas/days 返回；当日科室排班 leftQuota 全为 0→已满，无排班→休） |
| deptCategory（科室分类） | V2.3 起为父分类名称冗余：子科室=父分类名、父分类节点=自身名称（七类父节点种子预置：内科/外科/妇儿/五官/皮肤/中医/其他）；管理端保存科室改传 parentId，不再传分类文本 |

> V2.0 变更要点：职称/时段/性别/状态由"数字编码+前端映射"改为**中文字符串直传**（与 cloud_hospital.sql 一致），前端不再需要编码映射表。

## 3. 患者端接口 Mock

### POST /api/auth/register

```json
// 请求
{ "username": "zhangsan", "password": "a123456", "confirmPassword": "a123456" }
// 成功响应
{ "code": 200, "message": "注册成功", "data": null }
// 失败（用户名重复）
{ "code": 1001, "message": "用户名已存在", "data": null }
```

### POST /api/auth/login

```json
// 请求
{ "username": "zhangsan", "password": "a123456" }
// 成功响应（不含密码字段）
{ "code": 200, "message": "登录成功",
  "data": { "token": "eyJhbGciOiJIUzI1NiJ9.mock-token", "userId": 1, "username": "zhangsan" } }
// 失败
{ "code": 1002, "message": "用户名或密码错误", "data": null }
```

### GET /api/departments（科室列表，S4；V2.3 父子两级平铺，前端按 parentId 组两级）

```json
{ "code": 200, "message": "成功", "data": [
  { "id": 5,  "deptName": "内科",   "deptCategory": "内科", "parentId": null, "deptIntro": "内科系统疾病诊治（父分类节点）" },
  { "id": 6,  "deptName": "外科",   "deptCategory": "外科", "parentId": null, "deptIntro": "外科系统疾病诊治（父分类节点）" },
  { "id": 7,  "deptName": "妇儿",   "deptCategory": "妇儿", "parentId": null, "deptIntro": "妇儿疾病诊治（父分类节点）" },
  { "id": 8,  "deptName": "五官",   "deptCategory": "五官", "parentId": null, "deptIntro": "眼、耳鼻喉、口腔疾病诊治（父分类节点）" },
  { "id": 9,  "deptName": "皮肤",   "deptCategory": "皮肤", "parentId": null, "deptIntro": "皮肤与过敏性疾病诊治（父分类节点）" },
  { "id": 10, "deptName": "中医",   "deptCategory": "中医", "parentId": null, "deptIntro": "中医辨证论治（父分类节点）" },
  { "id": 11, "deptName": "其他",   "deptCategory": "其他", "parentId": null, "deptIntro": "其他科室（父分类节点）" },
  { "id": 1, "deptName": "心血管内科", "deptCategory": "内科", "parentId": 5, "deptIntro": "高血压、冠心病、心律失常等心血管疾病的诊断与治疗" },
  { "id": 2, "deptName": "消化内科",   "deptCategory": "内科", "parentId": 5, "deptIntro": "胃肠疾病、肝胆胰腺疾病的内镜诊疗与综合治疗" },
  { "id": 3, "deptName": "普通外科",   "deptCategory": "外科", "parentId": 6, "deptIntro": "普外科常见病、多发病的手术与综合治疗" },
  { "id": 4, "deptName": "儿科",       "deptCategory": "妇儿", "parentId": 7, "deptIntro": "儿童呼吸道、消化道常见病的诊疗与儿童保健" }
] }
```

> 渲染规则：`parentId === null` 为父分类（患者端 P4 左栏 / 管理端分类下拉）；`parentId !== null` 为子科室（P4 右栏 / 医生挂靠下拉）。五官/皮肤/中医/其他暂无子科室 → 对应右栏空态「该分类暂无科室」。

### GET /api/doctors?deptId=1（按科室查医生，S5；后端按 主任→副主任→主治 排序返回）

```json
{ "code": 200, "message": "成功", "data": [
  { "id": 1, "doctorName": "周建国", "title": "主任医师",   "skill": "冠心病、高血压及其并发症的综合治疗", "deptId": 1, "deptName": "心血管内科", "registerFee": 30.00 },
  { "id": 2, "doctorName": "吴敏",   "title": "副主任医师", "skill": "心律失常、心力衰竭的药物治疗",         "deptId": 1, "deptName": "心血管内科", "registerFee": 20.00 }
] }
```

### GET /api/quotas?deptId=1&date=2026-09-08（当天/预约挂号号源，V2.3 新增；示例 date=当天）

按科室+日期返回医生号源行；**后端排序：先上午后下午、同时段按职称 主任→副主任→主治**（前端不重排）。示例以 2026-09-08 为当天（周建国余 30 充足 / 吴敏余 3 紧张，均上午出诊）。

```json
{ "code": 200, "message": "成功", "data": [
  { "scheduleId": 101, "doctorId": 1, "doctorName": "周建国", "title": "主任医师",
    "skill": "冠心病、高血压及其并发症的综合治疗", "timeSegment": "上午", "leftQuota": 30, "registerFee": 30.00 },
  { "scheduleId": 106, "doctorId": 2, "doctorName": "吴敏", "title": "副主任医师",
    "skill": "心律失常、心力衰竭的药物治疗", "timeSegment": "上午", "leftQuota": 3, "registerFee": 20.00 }
] }
```

```json
// 同接口 date=2026-09-10（预约选中日：当日仅周建国出诊、余 3 紧张档）
{ "code": 200, "message": "成功", "data": [
  { "scheduleId": 103, "doctorId": 1, "doctorName": "周建国", "title": "主任医师",
    "skill": "冠心病、高血压及其并发症的综合治疗", "timeSegment": "上午", "leftQuota": 3, "registerFee": 30.00 }
] }
```

> 渲染规则：`leftQuota = 0` → 「已满」整卡置灰、按钮禁用；某时段无记录 → 该分组渲染「暂无号源」空态。

### GET /api/quotas/days?deptId=1（预约页一周日期条状态，V2.3 新增）

返回该科室 **当天+1 ~ 当天+7** 共 7 天的可约状态（示例以 2026-09-08 为当天：09-11 全科号源为 0 → 已满；09-12/13/15 无排班 → 休）。

```json
{ "code": 200, "message": "成功", "data": [
  { "date": "2026-09-09", "dayStatus": "可约" },
  { "date": "2026-09-10", "dayStatus": "可约" },
  { "date": "2026-09-11", "dayStatus": "已满" },
  { "date": "2026-09-12", "dayStatus": "休" },
  { "date": "2026-09-13", "dayStatus": "休" },
  { "date": "2026-09-14", "dayStatus": "可约" },
  { "date": "2026-09-15", "dayStatus": "休" }
] }
```

### GET /api/schedules?doctorId=1（近 7 天排班，S6；V2.3 起亦支持 ?deptId= 科室级查询）

查询窗口 = **当天 ~ 当天+6**（示例以 2026-09-08 为当天）；`?deptId=` 查询时响应带医生字段，前端按医生分组渲染（P5 排班总览）。周建国休 09-12/13/15（种子休息日），故示例仅 5 条。

```json
{ "code": 200, "message": "成功", "data": [
  { "id": 101, "doctorId": 1, "doctorName": "周建国", "title": "主任医师",
    "workDate": "2026-09-08", "timeSegment": "上午", "totalQuota": 30, "leftQuota": 30 },
  { "id": 102, "doctorId": 1, "doctorName": "周建国", "title": "主任医师",
    "workDate": "2026-09-09", "timeSegment": "上午", "totalQuota": 30, "leftQuota": 30 },
  { "id": 103, "doctorId": 1, "doctorName": "周建国", "title": "主任医师",
    "workDate": "2026-09-10", "timeSegment": "上午", "totalQuota": 30, "leftQuota": 3 },
  { "id": 104, "doctorId": 1, "doctorName": "周建国", "title": "主任医师",
    "workDate": "2026-09-11", "timeSegment": "上午", "totalQuota": 30, "leftQuota": 0 },
  { "id": 105, "doctorId": 1, "doctorName": "周建国", "title": "主任医师",
    "workDate": "2026-09-14", "timeSegment": "上午", "totalQuota": 30, "leftQuota": 25 }
] }
```

> 渲染规则：`leftQuota = 0` → 显示「已满」置灰不可选；无排班日期 → 前端渲染「暂无排班」。

### POST /api/members（添加就诊人，S7）

```json
// 请求（5 字段，已封装 ReqDto；phone 必填——与表 NOT NULL 一致）
{ "memberName": "张小满", "gender": "男", "idCard": "362502199001011234", "phone": "13800001111", "birthday": "1990-01-01" }
// 成功
{ "code": 200, "message": "添加成功", "data": null }
// 失败示例
{ "code": 2001, "message": "就诊人已达上限（3 人）", "data": null }
{ "code": 2002, "message": "身份证格式错误", "data": null }
```

### GET /api/members（就诊人列表，S7）

```json
{ "code": 200, "message": "成功", "data": [
  { "id": 1, "memberName": "张小满", "gender": "男", "idCard": "362502199001011234", "phone": "13800001111", "birthday": "1990-01-01" },
  { "id": 2, "memberName": "张奶奶", "gender": "女", "idCard": "362502196203085678", "phone": "13800002222", "birthday": "1962-03-08" }
] }
```

### POST /api/registrations（确认挂号，S8）

```json
// 请求
{ "scheduleId": 101, "memberId": 1 }
// 成功（响应 ≥2 字段，封装 RespDto）
{ "code": 200, "message": "挂号成功",
  "data": { "orderNo": "202609081030221234567890", "registerFee": 30.00 } }
// 失败示例
{ "code": 3001, "message": "该时段号源已约满", "data": null }
{ "code": 3002, "message": "重复挂号：同医生同日期同时段仅可预约一次", "data": null }
{ "code": 3003, "message": "操作频繁，请稍后再试", "data": null }
```

### GET /api/registrations/my（我的挂号记录，S9；按创建时间倒序）

> 字段来源：deptName/doctorName 取自表内快照列（dept_name_snap / doctor_name_snap），
> memberName 由后端联查 patient_member 得出（表内未存就诊人姓名快照）；
> 取消挂号的号源回补由后端按订单内 schedule_id 直达处理（V2.1，数据库新增列，不体现在接口上），与前端无关。

```json
{ "code": 200, "message": "成功", "data": [
  { "orderNo": "202609081030221234567890", "memberName": "张小满", "deptName": "心血管内科",
    "doctorName": "周建国", "workDate": "2026-09-09", "timeSegment": "上午", "registerFee": 30.00,
    "status": "待就诊", "createTime": "2026-09-08 10:30:22" },
  { "orderNo": "202609071521039876543210", "memberName": "张奶奶", "deptName": "儿科",
    "doctorName": "陈晓云", "workDate": "2026-09-10", "timeSegment": "下午", "registerFee": 20.00,
    "status": "已取消", "createTime": "2026-09-07 15:21:03" }
] }
```

### POST /api/registrations/{orderNo}/cancel（取消挂号，S10）

```json
{ "code": 200, "message": "取消成功", "data": null }
{ "code": 3004, "message": "当前状态不可取消（仅待就诊可取消）", "data": null }
```

## 4. 管理端接口 Mock（C 使用）

### GET /api/admin/departments?pageNum=1&pageSize=10（分页 PageDTO 结构）

```json
{ "code": 200, "message": "成功",
  "data": { "total": 4, "pageNum": 1, "pageSize": 10, "records": [
    { "id": 1, "deptName": "心血管内科", "deptCategory": "内科", "deptIntro": "高血压、冠心病、心律失常等心血管疾病的诊断与治疗" }
  ] } }
```

### POST /api/admin/departments（新增科室；修改为 PUT /{id}，删除为 DELETE /{id}）

```json
// 请求（V2.3：parentId=父分类节点 id，来自 GET /departments 过滤 parentId 为空；不再传分类文本）
{ "deptName": "皮肤科", "parentId": 9, "deptIntro": "皮肤病、过敏性疾病的诊疗" }
// 成功
{ "code": 200, "message": "保存成功", "data": null }
```

> 删除约束（V2.3）：DELETE 父分类节点时若其下仍有子科室 → 400「该分类下存在科室，无法删除」（后端校验）；删除子科室不受影响。

### POST /api/admin/doctors（新增医生；修改为 PUT /{id}，删除为 DELETE /{id}）

```json
// 请求（4 字段，封装 ReqDto；deptId 必须为已有科室，否则 4001；title 直接传中文）
{ "doctorName": "孙一", "deptId": 4, "title": "主治医师", "skill": "新生儿疾病诊治" }
// 失败示例
{ "code": 4001, "message": "科室不存在", "data": null }
```
