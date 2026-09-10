# 成员C（前端 · Vue3 管理端） · 第 7 天：管理端登录页（M5）+ 挂号单管理页（M8）+ 扩展-AI对话页(可选)

| 项 | 内容 |
| --- | --- |
| 日期 | 2026-09-15（周二） |
| 关联故事 | S2（管理端复用）/ 迭代 M8 挂号单管理 / 范围外（AI 对话页） |
| 当日主题 | 管理端登录页（M5）+ 挂号单管理页（M8）+ 扩展-AI对话页(可选) |
| 契约依据 | 《项目拆解设计说明书》第 4/6/7 章 · db/init.sql · db/mock-data.md |

## 1. 当日目标

M5 登录页上线收口 401 规则；挂号单管理页（M8）mock 渲染完成（V1.4 迭代补排期）；AI 对话页为主线外可选项。

## 2. 前置条件（开工前逐项确认）

- 待对齐 #12（管理端登录鉴权口径）已站会销项（初拟：复用 /auth/login + 种子管理员 admin，patient_user 不加 role 列）
- A 的 SSE 接口是否就绪（仅 AI 对话页需要）

### 设计稿先行（页面任务动手前必看——先看稿、后写码）

> 涉及页面的任务，AI 工具与成员必须先查看设计稿截图与规范后再写码；完成后逐张截图对照验收。

- 必读规范：doc/ui/UI统一规范.md
- 截图目录：doc/ui/pen/页面截图/（截图即设计稿，以图片为准）
- ⚠️ AI 对话页暂无设计稿：如需开发，先补设计稿并完成对齐（涉接口走铁律二/三），再动手写页面。

本日对应设计稿截图：

- M5 管理端登录·正常态.png
- M5 管理端登录·错误态.png
- M4 全局-401提示页.png（401 统一跳 /login 实装对照）
- ⚠️ M8 挂号单管理暂无截图：以设计稿 V1.4「M8 挂号单管理页」线框+字段规格为准开发，完成后回补截图。

## 3. 任务清单（按序执行）

1. ⭐ 管理端登录页 M5（/login，免登录路由；已登录访问 /login 重定向 /departments）：两框空按钮禁用；提交 `POST /auth/login`（body=LoginReqDto{username,password}）按钮 loading 防重复；1002 → 输入框红描边+框下红字（行内提示，非 Message 弹出）；成功 token 存 localStorage → 跳 /departments；网络异常 ElMessage.error
2. 401 统一跳转实装（M4 规则收口）：axios 拦截器 401 → 清 token → 跳 /login；无 token 访问受控页（含 /admin/dashboard、/admin/users）被路由守卫拦截
3. ⭐ 挂号单管理页（M8，/admin/registrations，侧边栏第五项，只读）：①`src/api/registration.ts` 定义 GET /admin/registrations（类型从 mock-data.md V2.5 逐字段抄写）；②搜索区（日期选择器+状态下拉 待就诊/已取消+关键字 患者用户名/订单号+查询/重置复位第 1 页）；③表格十列（订单号等宽可复制 Toast、状态 el-tag 待就诊=primary/已取消=info、费用 ¥两位小数）；④只读无写操作；⑤loading/空态按 M2 规范；mock 期用 mock-data.md V2.5 示例值，B 的 A·D05 接口就绪后切真实并填第 10 节对照表
4. 若 SSE 就绪且 M5/M8 完成：管理端/AI 对话页接入（可选）；否则继续支援 D 或回归管理端

## 4. 涉及契约（表 / 接口 / Key）

- M5：`POST /auth/login`（LoginReqDto / LoginRespDto，dto-contract 认证域；鉴权口径按 #12 销项结论）
- M8：拆解文档 4.6.3 · dto-contract V1.5 · mock-data V2.5（A·D05 实现）
- SSE 格式：与 A 对齐的新契约（仅 AI 对话页）

### 当日 DTO 速览（权威定义：db/dto-contract.md，与本表同源生成；冲突以契约文件为准并提对齐，禁止私自加改字段）

**POST /auth/login（M5 复用患者端登录接口，#12 初拟方案 A） · LoginReqDto（请求）/ LoginRespDto（响应）**

| 字段 | 类型 | 必填 | 校验 / 说明 |
| --- | --- | --- | --- |
| username（请求） | String | 是 | 用户名 |
| password（请求） | String | 是 | 密码；1002 → 行内红字提示 |
| token（响应） | String | 是 | JWT，存 localStorage |
| userId（响应） | Long | 是 | 用户 id |
| username（响应） | String | 是 | 回显用户名 |

**GET /admin/registrations（M8，只读分页） · AdminRegistrationRespDto（响应，PageDTO 包装）**：`orderNo, username, memberName, deptName, doctorName, workDate, timeSegment, registerFee, status, createTime`（筛选 `date/status/keyword`；快照字段禁止前端改算）

## 5. 自测清单（DoD，完成打勾）

- [ ] M5 五态齐全（正常/提交中/业务错误红框行内红字/网络错误/空值禁用），对照 M5 两张截图验收
- [ ] 成功登录 token 落 localStorage 并跳 /departments；已登录访问 /login 被重定向
- [ ] 401 → 清 token 跳 /login；无 token 访问 /admin/departments、/admin/dashboard、/admin/users 被路由守卫拦截
- [ ] M8 三筛选组合查询正确且复位第 1 页；订单号复制 Toast；状态双态 el-tag；mock 渲染通过
- [ ] AI 对话页：演示级可用或明确放弃并记录

## 6. 产出物

- 无独立产出物，过程性提交

## 7. 今日对齐点（涉及契约必读 AGENTS.md 铁律）

- M5 登录鉴权口径（#12）与 A 站会销项后再切真实接口
- SSE 响应格式与 A 对齐（走契约变更流程）

## 8. 契约变更记录（涉 DDL / 接口结构 / 接口路径时必填，先对齐再动手）

| # | 时间 | 变更内容（DDL/接口结构/路径） | 影响成员 | 对齐状态 |
| --- | --- | --- | --- | --- |
| 1 | 2026-09-10 | M5 登录页补排期入本日（V1.2 设计稿迭代时未排期）：复用 POST /auth/login（不做新接口）；#12 鉴权口径初拟方案 A（复用 + 种子 admin，不加 role 列） | A / B | ☐ 未对齐（#12 站会销项后转 ☑） |
| 2 | 2026-09-10 | 新增挂号单管理只读接口（M8，铁律二/三）：GET /admin/registrations + AdminRegistrationRespDto，A·D05 实现 | A / C | ☑ 已对齐（组长 2026-09-10 确认；dto-contract V1.5 / mock-data V2.5 / 拆解文档 4.6.3 已落稿） |

## 9. 答辩积累区（每日收工前必填，AGENTS.md 规则六/七；第 9 天汇总为答辩讲稿与问题库素材）

### a. 今日知识卡片（当日结束时你应能脱稿讲清以下点；「我的理解」必须自己写，不许 AI 代写）

| 技术点（当日预填） | 我的理解（自己写一两句） | 对应代码/文件 | 预判老师追问 |
| --- | --- | --- | --- |
| SSE 前端接收方式 |  |  |  |

### b. 今日最有讲头的问题（从 exception-day07/ 的 issue 中挑 1 条，浓缩成一句话答辩素材；无 issue 则填「今日无」）

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

[← 上一份](D06-支援App端与联调.md) · [目录规则](AGENTS.md) · [下一份 →](D08-健壮性回归.md)
