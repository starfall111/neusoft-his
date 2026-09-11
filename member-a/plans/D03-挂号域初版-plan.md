# D03 挂号域初版 · 编码计划（Plan）

> 成员A · 2026-09-11 · 代码工作区：`E:\aaaaa\group-fourteen`（Maven 工程在子目录 `neusoft-his/`）
> 分支：`feature/a-D03-registration`（已基于最新 master `7c8a96c` 创建，pull 已验证）
> 状态：待用户审核（规则二）

## 1. 目标

挂号域三接口业务闭环（his-registration 模块从 package-info 占位充实为可运行初版）：

- **S8** `POST /registrations` 挂号下单（校验编排 → 原子扣号 → 快照落库）
- **S9** `GET /registrations/my` 我的挂号记录（create_time 倒序）
- **S10** `POST /registrations/{orderNo}/cancel` 取消挂号（事务内状态回转 + 号源回补）

高并发防护（3003 限流等）按日计划归 D04，本次不做。

## 2. 涉及契约（规则八·编码前复述）

**不改任何契约文件**（DDL 不动、接口路径/结构照抄、放行清单为补录执行），编码中若发现必须改 → 立即停下走铁律二/三。

### S8 `POST /registrations`（出处：拆解文档 4.7 + db/dto-contract.md + db/mock-data.md）

- 请求 `RegistrationCreateReqDto`：`scheduleId: Long @NotNull`、`memberId: Long @NotNull`（body）
- 响应 `Result<RegistrationCreateRespDto>`：`orderNo: String`（23 位：yyyyMMddHHmmssSSS+6 位随机，uk_order_no 唯一）、`registerFee: BigDecimal`（两位小数；**后端按职称重算 主任30/副主任20/主治15（RegisterFeeConstant 已存在），请求体不含任何费用字段（6.5-⑥ 防篡改）**）
- 成功 message：`挂号成功`（mock-data 原文）；D03 错误分支：3006（就诊人不存在或不属于当前用户）→ 3005（排班不存在）→ 3001（该时段号源已约满，条件更新失败）
- 3002/3003 不在 D03 日计划任务清单（3003 归 D04 限流），本次不实现

### S9 `GET /registrations/my`（出处同上）

- 无参，userId 从 Token（拦截器已挂 request attribute `CLAIM_USER_ID`）
- 响应 `Result<List<RegistrationRespDto>>`，9 字段：`orderNo, memberName（联查 patient_member，表内不存快照）, deptName（快照 dept_name_snap）, doctorName（快照 doctor_name_snap）, workDate（yyyy-MM-dd）, timeSegment（上午/下午）, registerFee, status（待就诊/已取消 中文直传）, createTime（yyyy-MM-dd HH:mm:ss，倒序）`

### S10 `POST /registrations/{orderNo}/cancel`（出处同上）

- 路径参数 `orderNo`；响应 `Result<Void>`，成功 message `取消成功`
- 同一 `@Transactional`：status→`已取消` + 按订单内 `schedule_id` 直达 `left_quota + 1` 回补（拆解 6.5-①，V2.1 口径）
- 错误分支：订单不存在或不属于当前用户 → 3006（4.7 口径「记录不存在」）；状态非「待就诊」→ 3004

### 放行清单补录（日计划任务 7）

`GET /quotas`、`GET /quotas/days` 追加进 AuthInterceptor 方法级放行（与 /departments、/doctors、/schedules 同级）。
**性质判定**：拆解文档 4.1/4.5 V1.9 已定稿这两个接口为患者端公开查询，D02 拦截器注释为「待 15:00 评审会销项」遗留；本项 = 按已定稿契约**补录执行**，非契约变更，不触铁律三。（若您认定评审会未销项，此项跳过，不影响其余任务。）

## 3. 涉及文件清单（新建 9 + 修改 1，全部在 `neusoft-his/` 子目录）

| # | 文件（com.neusoft.his.registration 包下，除 #10） | 类型 | 改动点 |
| --- | --- | --- | --- |
| 1 | `entity/AppointmentRecord.java` | 新建 | @Table("appointment_record") 继承 BaseEntity：orderNo/patientUserId/memberId/doctorId/scheduleId/deptNameSnap/doctorNameSnap/workDate/timeSegment/registerFee/status（列名逐字对 DDL） |
| 2 | `mapper/AppointmentRecordMapper.java` | 新建 | extends BaseMapper\<AppointmentRecord\>（@MapperScan `com.neusoft.his.**.mapper` 已覆盖，无需改启动类） |
| 3 | `dto/RegistrationCreateReqDto.java` | 新建 | scheduleId/memberId + @NotNull + @Schema（描述同 mock-data.md） |
| 4 | `dto/RegistrationCreateRespDto.java` | 新建 | orderNo/registerFee + @Schema |
| 5 | `dto/RegistrationRespDto.java` | 新建 | 9 字段 + @Schema；createTime 标 @JsonFormat(pattern="yyyy-MM-dd HH:mm:ss")（拆解 4.1 时间格式；项目尚无全局 jackson 配置，LocalDate 默认输出即 yyyy-MM-dd 合契约） |
| 6 | `util/OrderIdUtil.java` | 新建 | 静态工具：yyyyMMddHHmmssSSS + 6 位随机 → 23 位 String |
| 7 | `service/RegistrationService.java` | 新建 | create(userId, reqDto) / listMy(userId) / cancel(userId, orderNo) |
| 8 | `service/impl/RegistrationServiceImpl.java` | 新建 | S8/S9/S10 编排（见 §4 关键设计）；讲解性注释按规则六保留 |
| 9 | `controller/RegistrationController.java` | 新建 | 三个端点，Controller 不写 try-catch（拆解 5.3 规约），成功用 Result.ok("挂号成功"/"取消成功", data) |
| 10 | `his-api/.../config/AuthInterceptor.java` | 修改 | PUBLIC_GET_PATHS 追加 "/quotas"、"/quotas/days" 两行 + 注释同步 |

his-registration 的 pom 已依赖 his-common/user/hospital（D02 备好），**无需改 pom**。

## 4. 关键设计决策（含今日对齐点①）

1. **跨模块调用方式（对齐点：与 B 对齐 MemberService/ScheduleService 调用）**：
   - 注入 **his-hospital** 的 `ScheduleMapper`/`DoctorMapper`/`DeptMapper`（3005 排班存在校验 + 快照三查：schedule→doctor→dept + title 取费）与 **his-user** 的 `PatientMemberMapper`（3006 归属校验 selectOneById + patientUserId 比对；S9 联查 memberName）；
   - **不修改 B 的任何文件**（feature/b-D03-crud 在途，避免合并冲突）；依赖方向 registration → user/hospital 单向合法（拆解 3.2）；
   - 备选（答辩可讲）：B 在 ScheduleService/MemberService 补 by-id 方法后切换为服务调用——列入站会通报项。
2. **原子扣号/回补**：`UpdateChain.of(Schedule.class).setRaw(Schedule::getLeftQuota, "left_quota - 1").where(id).and(left_quota > 0)`（拆解 6.4 原文写法，禁止先查再改）；回补 `setRaw(..., "left_quota + 1")`。
3. **事务边界**：S8 扣号+落库同 `@Transactional`（落库失败自动回滚扣号）；S10 状态回转+回补同 `@Transactional`（日计划任务 6）。
4. **快照口径（6.5-①）**：dept/doctor 名称下单时刻固化落库；doctorId/scheduleId 同时存（取消按 schedule_id 直达回补）；memberName 不落库、S9 联查。
5. **订单号唯一性**：时间戳（17 位）+6 位随机；`uk_order_no` 唯一索引兜底（撞号插入报错→理论概率极低，D04 再议重试策略，答辩考点）。

## 5. 自测方式

1. `mvn -q compile`（或 package -DskipTests）编译通过；
2. 本地起 his-api（MySQL `neusoft_hospital` 种子数据），先 `/auth/register`+`/auth/login` 拿 Token，curl 实测：
   - S8 正常路径（200 + orderNo 23 位 + registerFee 与职称映射一致）；
   - 3006（伪造他人 memberId）/ 3005（不存在 scheduleId）/ S10 后再 S10 同单 → 3004；
   - S9 倒序与中文直传字段核对；
3. **DoD#2（防超卖实证）**：SQL 将某排班 `left_quota` 调为 1 → 连续两次 POST 同一排班 → 第二次返回 3001（数据库条件更新兜底）→ 测后恢复种子值；
4. 真实响应与 db/mock-data.md **逐字段 diff** → 输出「契约字段 ↔ 代码字段」对照清单（规则八第 3 步）→ 填日计划第 10 节；
5. Apifox 用例（正常 + 3001/3005/3006/3004）由成员 A 在 Apifox 侧建用例回归，AI 提供 curl 等价验证记录供比对。

## 6. 过程材料（规则五/六/七）

- 过程错误当场记 `member-a/exception-day03/issue-*.md`（含刚才网络拉取失败一次，若复现）；
- 编码逐段讲解 + 完成后给「2 分钟复述稿」要点，答辩积累区由成员 A 本人填写；
- 演示截图（curl/实测结果）当日入 `doc/screenshots/D03-*`；
- 代码改动在 group-fourteen 的 `feature/a-D03-registration` 分支提交（feat: 前缀），收工推送并申请合并 master；文档改动（本 Plan、日计划 DoD/第 8/10 节）在 neusoft-his 当前分支提交。

## 7. 不做清单（防蔓延）

- 3002 重复挂号、3003 限流（D04）、Redis 相关（D04）、/quotas 接口本体（B 域）、管理端挂号单列表 M8（4.6.3 另行安排）。
