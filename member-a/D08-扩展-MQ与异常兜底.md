# 成员A（组长 · 后端 · 架构/挂号域/中间件） · 第 8 天：站内信+MQ 与异常兜底

| 项 | 内容 |
| --- | --- |
| 日期 | 2026-09-16（周三） |
| 关联故事 | S8 扩展 / 站内信+MQ（V1.12 转正） |
| 当日主题 | 站内信+MQ（his-message 模块）与异常兜底 |
| 契约依据 | 《项目拆解设计说明书》第 4/6/7 章 · db/init.sql · db/mock-data.md · db/migrations/ |

## 1. 当日目标

挂号成功/取消经 MQ 异步产生站内信；消息中心 + 群发公告接口上线；异常与降级路径全覆盖。

## 2. 前置条件（开工前逐项确认）

- B 已确认迁移脚本 `db/migrations/V2.5__create_site_message.sql`（site_message 表）→ 本机库执行
- Docker 环境：`docker run -d -p 9876:9876 apache/rocketmq:5.3.0`（NameServer）+ Broker（10911，含 broker.conf 配置 namesrvAddr）；命令与排障入 doc/daily 当日记录
- `his.mq.enabled=false`（默认 LoggingMessageSender 降级，真联调时切 true）

## 3. 任务清单（按序执行）

1. ⭐ his-message 模块：执行迁移脚本建 site_message 表 → 实体/Mapper（MyBatis-Flex）
2. ⭐ MQ 链路：his-registration 挂号成功/取消事务提交后（afterCommit）`MessageSender.send("his_notification", NotificationMessage{type, orderNo, userId, memberName, doctorName, workDate, timeSegment})`；`RocketMQMessageSender`（starter 2.3.1）+ `NotificationConsumer`（@RocketMQMessageListener，按 type 生成标题/正文落 site_message）；消费失败重试 + 日志告警
3. ⭐ 站内信接口组（拆解文档 4.9，dto-contract V1.6 消息域）：GET /messages（分页+isRead 筛选，倒序）、GET /messages/unread-count（Result<Integer>）、POST /messages/{id}/read（写 read_time；4004）、POST /messages/read-all、POST /admin/messages（群发公告，全员逐行落库，同步直写不走 MQ）
4. 降级验证：his.mq.enabled=false 时主流程不中断（Logging 可观测），站内信缺失可接受（异步最终一致）
5. 全局异常兜底复查：NPE、参数缺失、Redis/MQ 断连时的降级路径
6. 新接口 Apifox 实测并与 db/mock-data.md V2.6 §5 逐字段 diff（规则八）；演示链路录屏：挂号 → P11 未读 +1 → 取消 → 取消通知（入 doc/screenshots/，命名 D08-站内信MQ演示）

## 4. 涉及契约（表 / 接口 / Key）

- MQ 场景：拆解文档 7.3（V1.12 转正定稿）· 站内信接口组：拆解文档 4.9 · dto-contract V1.6 消息域 · mock-data V2.6 §5
- 表：site_message（迁移脚本 V2.5）

### 当日 DTO 速览（权威定义：db/dto-contract.md，与本表同源生成；冲突以契约文件为准并提对齐，禁止私自加改字段）

**GET /messages（P11 消息分页，isRead 可选） · MessageRespDto（响应，PageDTO 包装）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| id | Long | 是 | site_message.id |
| title | String | 是 | ≤100 |
| content | String | 是 | ≤500 |
| msgType | String | 是 | 挂号成功 / 挂号已取消 / 系统通知（中文直传） |
| orderNo | String | 否 | 关联订单号；系统公告为 null |
| isRead | Integer | 是 | 0 未读 / 1 已读 |
| createTime | LocalDateTime | 是 | 列表按此倒序 |

**GET /messages/unread-count**：单字段响应直返 `Result<Integer>`；**POST /messages/{id}/read**：4004 消息不存在或不属于当前用户；**POST /messages/read-all**：`Result<Void>`

**POST /admin/messages（M10 群发） · AdminMessageSendReqDto（请求）**：`title`（@NotBlank ≤100）、`content`（@NotBlank ≤500）→ `Result<Void>`（全员逐行落库）

**MQ 消息体 · NotificationMessage（topic `his_notification`）**：`type`（挂号成功/挂号已取消）、`orderNo`、`userId`、`memberName`、`doctorName`、`workDate`、`timeSegment`

## 5. 自测清单（DoD，完成打勾）

- [ ] 挂号成功 → MQ 消息可观测（控制台/日志）→ 站内信落库 → P11 mock 可见未读 +1
- [ ] 取消挂号 → 取消通知落库；群发公告 → 全员「系统通知」落库
- [ ] 拔掉 Redis/MQ，主流程仍可跑（降级验证）
- [ ] 站内信 5 接口 Apifox 全绿，与 mock-data V2.6 §5 逐字段一致

## 6. 产出物

- his-message 模块（MQ 链路 + 站内信接口）+ MQ 降级适配 + 演示录屏

## 7. 今日对齐点（涉及契约必读 AGENTS.md 铁律）

- 迁移脚本 V2.5 与 B 确认（B 是 DDL 唯一维护人，脚本由 B 终审）
- 消息正文文案与 D 端 P11 展示口径统一
- 群发公告「不可撤回」口径与 C·D09 确认

## 8. 契约变更记录（涉 DDL / 接口结构 / 接口路径时必填，先对齐再动手）

| # | 时间 | 变更内容（DDL/接口结构/路径） | 影响成员 | 对齐状态 |
| --- | --- | --- | --- | --- |
| 1 | 2026-09-10 | 【铁律一】迁移脚本 `db/migrations/V2.5__create_site_message.sql`：新增站内信表 site_message（init.sql 基线不动） | B（终审）/ C / D | ☑ 已对齐（组长 2026-09-10 确认） |
| 2 | 2026-09-10 | 【铁律二/三】新增站内信接口组（4.9）5 接口 + MQ topic `his_notification` 与 NotificationMessage 消息体（7.3 转正定稿）；错误码 4004；starter 2.3.1 定稿 | B（挂号域发消息协同）/ C（M10）/ D（P11） | ☑ 已对齐（dto-contract V1.6 / mock-data V2.6 已落稿） |

## 9. 答辩积累区（每日收工前必填，AGENTS.md 规则六/七；第 9 天汇总为答辩讲稿与问题库素材）

### a. 今日知识卡片（当日结束时你应能脱稿讲清以下点；「我的理解」必须自己写，不许 AI 代写）

| 技术点（当日预填） | 我的理解（自己写一两句） | 对应代码/文件 | 预判老师追问 |
| --- | --- | --- | --- |
| MQ 异步解耦的适用场景 |  |  |  |
| Noop 降级设计的工程意义 |  |  |  |

### b. 今日最有讲头的问题（从 exception-day08/ 的 issue 中挑 1 条，浓缩成一句话答辩素材；无 issue 则填「今日无」）

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

[← 上一份](D07-扩展-AI导诊(可选).md) · [目录规则](AGENTS.md) · [下一份 →](D09-压测与答辩材料.md)
