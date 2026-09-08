// 生成 40 份逐天工作计划 + AGENTS.md + README
// 用法：node tools/gen-day-plans.mjs（在 neusoft-his 根目录下执行）
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/admin/Downloads/neusoft-his';
const DATES = {
  1:['2026-09-07','周一'], 2:['2026-09-08','周二'], 3:['2026-09-09','周三'], 4:['2026-09-10','周四'], 5:['2026-09-11','周五'],
  6:['2026-09-14','周一'], 7:['2026-09-15','周二'], 8:['2026-09-16','周三'], 9:['2026-09-17','周四'], 10:['2026-09-18','周五'],
};

// ============ 共享：契约变更三条铁律（写入全部 AGENTS.md） ============
const IRON = `本项目的硬性契约共四份：**db/init.sql**（DDL+种子数据）、**db/mock-data.md**（前端 mock 数据）、**db/dto-contract.md**（全部 ReqDto/RespDto 字段契约）、《项目拆解设计说明书》第 4 章（接口路径与规约）。任何工作（写代码、改文档、改计划）一旦涉及下列变更，必须先停下、向用户发出提醒，未完成对齐前不得修改契约文件与相关代码：

### 铁律一 · 数据库 DDL 变更（表/字段增删改、类型、索引、种子数据调整）
提醒话术：「⚠️ 本次修改涉及数据库 DDL。请先与后端 A、B 及依赖该表的前端 C、D 对齐（站会或群内）；由 B 统一更新 db/init.sql 与《项目拆解设计说明书》第 6 章，并同步 db/mock-data.md；各成员确认后在自己的当日计划文档『契约变更记录』表追加记录并调整后续计划。」

### 铁律二 · 接口请求/响应数据结构变更（ReqDto/RespDto 字段增删改、类型、校验规则）
提醒话术：「⚠️ 本次修改涉及接口数据结构，前端并行开发依赖 mock。请与对接方对齐（后端改动→通知前端 C/D；前端提出→找后端 A/B），更新《项目拆解设计说明书》第 4 章、Apifox 用例与 db/mock-data.md，并提醒对方在其当日计划文档追加契约变更记录。」

### 铁律三 · 接口路径变更（路径、HTTP 方法、参数位置、放行/鉴权范围）
提醒话术：「⚠️ 接口路径变更影响所有调用方与 Apifox mock。必须全员对齐后，由该接口的后端负责人更新《项目拆解设计说明书》第 4 章与 Apifox，逐一通知 C/D 修改请求代码，并在双方当日计划文档记录。」

### 变更流程（三条铁律通用）
发起方在当日文档记录 → 站会/接口评审会确认 → 契约负责人（DDL 与两份契约文档：B；接口实现：对应后端 A/B）更新定稿 → 相关成员当日文档追加『契约变更记录』并同步调整后续计划。`;

// ============ 共享：每日工作流规则（分支 → Plan → 归档 → 环境登记） ============
const workflowRules = (rows) => `### 规则一 · 特性分支先行（每日开工第一步）

当天开始当日工作（D01–D10，尤其编码）前，必须先创建并切换到当日特性分支，禁止直接在 dev / master 上开发：

- 分支命名：\`feature/{成员标识}-D{天数}-{主题简拼}\`，例：\`feature/a-D03-registration\`、\`feature/c-D02-admin-dept\`；
- 当日收工：推送特性分支并向组长 A 发起合并到 dev 的请求；次日开工再从 dev 拉当日新分支；
- AI 助手检测到当前处于 dev / master 分支时，必须先提醒：「⚠️ 当前在 dev/master 分支。按规则我先创建今日特性分支 feature/xxx，再开始工作。」

### 规则二 · 编码前先出 Plan，审核通过后才能编码

任何编码任务（新建/修改代码文件）开始前，必须先产出编码计划（Plan）提交用户审核：

- Plan 必含：目标、涉及文件清单、改动点说明、涉及契约（DDL / 接口结构 / 接口路径——若有，必须在此阶段就触发对应铁律的提醒话术）、自测方式；
- 未获用户明确批准（「同意」「开始」「按计划执行」等）前，不得创建或修改任何代码文件；
- 提醒话术：「⚠️ 按规则需先审核 Plan：以下为本次编码计划，请确认批准后我再开始编码。」

### 规则三 · Plan 归档在本目录

所有 Plan 产出必须存放在（或备份到）本目录的 \`plans/\` 子目录下，命名 \`D{天数}-{主题}-plan.md\`（例：\`D03-挂号域初版-plan.md\`），随仓库提交作为过程性考核材料，不得只留在对话记录中。

### 规则四 · 编码工作环境确认（登记后免问）

每次收到用户指令时：

1. 先查下方「工作环境登记表」：对应成员/工程的编码工作目录**已登记 → 直接使用，不再询问**；
2. **未登记 → 必须先向用户确认编码工作环境**（该成员代码工程在本机的完整路径），得到答案后立即写入下表（含确认时间），此后不再重复询问。

#### 工作环境登记表（已登记则不再询问）

| 对象 | 确认时间 | 编码工作目录（本机完整路径） | 备注 |
| --- | --- | --- | --- |
${rows}

### 规则五 · 错误与困难记录（exception-dayXxx，当日汇总）

每日 AI 工具运行中遇到的任何错误（编译/启动失败、接口报错、联调异常、环境问题等）必须当场记录「遇到的困难 + 解决方案」，汇总到当前目录的当日例外目录，**禁止只口头解决不留痕**：

- **目录**：\`exception-day{NN}/\`（NN=两位天数，位于本成员目录下，如 \`exception-day03/\`），当日首次遇到错误时创建；
- **文件**：每个问题一个 \`issue-{序号}-{关键词}.md\`，必含：时间、错误信息原文（完整堆栈/响应）、发生场景、原因分析、解决方案、验证结果、是否涉契约（涉契约须同时走铁律对齐）；
- **收工检查**：当日 DoD 暴露过的问题都能在 exception 目录找到对应记录；目录随仓库提交，作为过程性考核与答辩「踩坑与解决」素材。

#### issue 文件模板（复制使用）

\`\`\`markdown
# issue-01-关键词
- 时间：
- 场景：（做什么时出现）
- 错误信息原文：（完整粘贴）
- 原因分析：
- 解决方案：
- 验证结果：
- 是否涉契约：否 / 是（DDL/接口结构/路径 → 已按铁律对齐）
\`\`\`

### 规则六 · 理解验证（答辩防线，零基础特别条款）

AI 每完成一段编码，必须同步输出**逐段讲解**：这段做什么、为什么这样写、有什么替代方案；关键代码处保留讲解性注释。成员必须能**用自己的话复述当日核心改动（2 分钟版）**——做不到 = 当日任务未完成，必须返场让 AI 重新讲解直到能复述。当日日计划第 9 节「答辩积累区」的 a / b / d 三项**必填**，空着视为未收工。

### 规则七 · 答辩素材随手归档（与规则五的分工：规则五记问题，本条攒亮点）

可演示的过程证据（功能截图、录屏、压测数据、缓存命中日志、Apifox 用例结果、彩排记录）**当日**归档入 doc/screenshots/，命名 \`D{NN}-{说明}\`。第 9 天各成员汇总本人日计划的「答辩积累区」，生成答辩讲稿与问题库素材——答辩材料是每天攒出来的，不是最后三天赶出来的。

### 规则八 · 接口编码契约绑定（前后端一致性防线，联调防卡死核心规则）

AI 编写任何涉及接口的代码（前端请求 / 后端 Controller·DTO）时，必须执行**三步契约绑定**：

1. **编码前 · 复述契约**：先向用户复述本次涉及的接口（方法+路径）与全部请求/响应字段，并标明出处（《项目拆解设计说明书》第 4 章 / db/mock-data.md / Apifox）。**当前上下文没有契约原文时，必须先请用户提供契约内容，禁止凭训练记忆、常见惯例或自行设计编造字段、路径、类型、日期格式**；
2. **编码中 · 逐字对照**：字段名（含大小写/驼峰拼写）、类型（字符串/数字/日期格式）、路径、参数位置（query / body / path）、响应包装（\`Result{code,message,data}\`）与契约逐字一致；禁止"顺手优化"命名、增删字段、改参数位置、改包装结构；
3. **编码后 · 输出对照清单**：列出「契约字段 ↔ 代码字段」对照并声明 100% 一致，同时填写当日日计划第 10 节「接口一致性对照表」；发现不一致 → 立即停下走铁律二/三，对齐前不得提交。

**联调冲突裁决**：联调发现前后端对不上 → 先对照契约，**谁偏离契约谁改**；双方都符合契约但契约本身不合理 → 走铁律对齐改契约。**严禁 AI 用前端字段映射/转换去"适配"后端偏离**（私自适配 = 掩盖不一致，给联调和答辩埋雷）。

**前端附加（C/D）**：接口类型定义与请求函数必须集中在统一文件（vue-admin：\`src/api/\`；鸿蒙：\`common/api/\`），类型从 db/mock-data.md **逐字段抄写**；页面组件内禁止手写 URL 与字段名，只调用 api 层。

**后端附加（A/B）**：DTO 字段与契约一致（\`@Schema\` 描述同 mock-data.md）；每个接口完成后必须用 Apifox 实测真实响应，与 db/mock-data.md **逐字段 diff** 通过才算 DoD。

### 规则九 · 日报生成（先确认当前成员是谁，仅在其本人目录收集与产出）

成员要求生成日报时，AI 必须严格按以下顺序执行：

1. **第一步 · 确认当前成员是谁（必做；身份不明禁止开工）**：优先从当前工作上下文判断（正在操作哪个 \`member-x\` 目录、该目录 AGENTS.md 角色卡）；**无法唯一确定时，必须先询问用户「当前是哪位成员（A/B/C/D）？」**，确认后才继续；
2. **第二步 · 只收集本成员数据**：仅汇总 \`member-{x}/exception-day{NN}/issue-*.md\` 与**本人**当日日计划（DoD 勾选、第 8 节契约变更、第 10 节接口对照），**禁止跨目录读取其他成员数据混合生成**；
3. **精简硬性要求**：**每条错误描述 ≤100 字**（现象 / 根因 / 解决各一句概括），全文 ≤500 字一屏读完；issue 原文禁止整段照抄；
4. **第三步 · 产出到本成员目录**：\`member-{x}/D{NN}-日报.md\`，结构固定（占位模板如下）：

\`\`\`markdown
# D{NN} 个人日报 · 成员X（YYYY-MM-DD）
## 1. 今日完成（引自当日计划 DoD，逐条勾选状态）
## 2. 问题与解决（每条 ≤100 字）
- 现象 → 根因 → 解决（一句话）
## 3. 契约变更（无则写「无」）
## 4. 风险与求助
## 5. 明日计划
\`\`\`

5. 本人当日无 exception 目录或记录不全 → 第 2 节如实写「当日无记录」，**禁止编造或脑补内容**；
6. **组级日报（可选归档）**：当日轮值成员在四人个人日报基础上**合并引用**生成 \`doc/daily/D{NN}-日报.md\`（只引用不重写，同样精简），供过程考核归档。`;

// ============ 前端专属规则（仅 member-c / member-d） ============
const FE = `## 5. 前端工作专属规则（必须逐条执行）

### 规则F1 · 模型检查：glm-5.3-flash

每次开始前端任务时，AI 助手先确认 ZCode 当前运行模型是否为 **glm-5.3-flash**：

- 是 → 正常开工；
- 不是或无法确认 → 先尝试切换至 glm-5.3-flash；无法自行切换时，立即提醒用户：「⚠️ 请在 ZCode 中将模型切换为 glm-5.3-flash 后再继续前端任务」，**未确认前不开始前端编码**。

### 规则F2 · 实时打开浏览器，观察并测试页面

前端编码过程中必须保持浏览器实时打开（本地 dev server / ZCode 浏览器能力），做到「改一步、看一步」：

- 每完成一处页面改动，立即在浏览器中自查：**样式是否合理**（布局/间距/空态/错误态）与**流程能否走通**（如 登录→列表→表单→提交→提示 完整链路）；
- 发现样式错乱或流程走不通 → 按规则F3 截图记入当日 \`exception-day{NN}/\` 后修复，修复后再次走查确认；
- **不允许「全部写完才第一次打开页面」**。

### 规则F3 · 前端问题必须截图

前端遇到的一切问题（样式异常、报错、流程走不通、联调异常）都必须截图留证：

- 截图存放：当日 \`exception-day{NN}/\` 目录内（png/jpg，文件名含关键词），并在对应 issue 文件中引用；
- 截图同时作为答辩「问题与解决」素材。

`;

// ============ 每日答辩知识卡片预填（当日结束时成员应能脱稿讲清的点） ============
const KP = {
  a: [
    ['Result 统一响应体为什么这样设计', '@RestControllerAdvice 全局异常处理原理', 'port 接口与依赖倒置：为什么先定接口、后接 Redis'],
    ['JWT 三段结构与会话无状态', '拦截器放行清单为什么这么定', '多模块拆分 = DDD 限界上下文'],
    ['订单号=时间戳+随机的唯一性保障', '条件更新防超卖原理（WHERE left_quota > 0）', '挂号记录为何同时存 id 关联与名称快照（拆解文档 6.5-①）', '挂号费防篡改：后端算、前端不传（6.5-⑥）', '@Transactional 事务边界'],
    ['SETNX 分布式锁原理与误删问题（finally 释放）', '计数器限流（INCR + EXPIRE）', '缓存穿透/雪崩/击穿三连问'],
    ['可重复执行的数据脚本设计', '号源重置与业务数据一致性'],
    ['取消挂号：一个事务改两张表', '构造异常验证回滚的方法'],
    ['SSE 流式输出与 HTTP 长连接'],
    ['MQ 异步解耦的适用场景', 'Noop 降级设计的工程意义'],
    ['压测指标：QPS/错误率/限流触发怎么解读', '锁与限流在压测中的实际表现'],
    ['架构演进三阶段完整口述（3 分钟版）'],
  ],
  b: [
    ['逻辑删除 vs 物理删除（六表统一 delmark，"不删"的限制放后端代码层）', 'create_time/update_time 交给数据库默认值的原因', '唯一索引的兜底作用（username / order_no / 排班三元组）', 'CHECK 约束防脏数据（V2.1，MySQL 8 特性）'],
    ['BCrypt 相对 MD5 的优势', '登录响应为什么绝不返回密码'],
    ['Flex paginate 分页原理', '身份证/手机号前后端双侧校验的意义'],
    ['Cache-Aside：为什么删缓存而不是改缓存', '为什么只缓存 List 不缓存分页'],
    ['接口文档与代码一致性的维护方法'],
    ['交付物清单口径（需求文档 6.2）'],
    ['当日实际所做内容的复述口径'],
    ['@NotBlank 等校验注解原理', '逻辑删除后查询自动过滤的注解原理'],
    ['三范式 vs 快照冗余（适度反范式）的权衡'],
    ['六表 ER 关系完整口述'],
  ],
  c: [
    ['axios 拦截器统一处理的意义', 'Pinia / 路由各自职责一句话'],
    ['mock 并行开发为什么可行', '契约字段对齐的纪律性'],
    ['PageDTO 分页结构', '错误码 → 用户提示的映射'],
    ['改数据 → 缓存清除 → 前台可见的完整链路'],
    ['组件拆分与复用', '静态页与数据绑定分离'],
    ['用浏览器 Network 面板定位联调问题'],
    ['SSE 前端接收方式'],
    ['HTTP 401 与业务码的处理分工'],
    ['运行说明要让陌生人能跑起来'],
    ['管理端演示话术'],
  ],
  d: [
    ['模拟器访问宿主机服务为什么用 IP 不用 localhost'],
    ['AppStorage 存 Token 的方案', '请求拦截器统一注入 Authorization'],
    ['「已满 / 暂无排班」空态与置灰交互设计'],
    ['前端校验与后端校验为什么都要做'],
    ['withLogin 守卫 = 前端路由拦截', '守卫清单必须与后端放行清单一致'],
    ['全流程演示口径：S4→S10 每一步调了哪个接口'],
    ['SSE 流式渲染实现'],
    ['网络异常 / 业务异常的统一 Toast 策略'],
    ['演示脚本：路径 + 讲解词 + 翻车预案'],
    ['患者端演示话术'],
  ],
};

// ============ DTO 主数据（唯一来源：生成 db/dto-contract.md + 各日计划速览） ============
// fields: [字段, 类型, 必填, 校验/说明]；与 DDL V2.1（cloud_hospital.sql + 安全审查修复）逐列对齐
const DTO = {
  result: { name: 'Result<T>（通用响应包装）', api: '全部接口', fields: [
    ['code', 'Integer', '是', '200 成功；其余为错误码（拆解文档 5.2）'],
    ['message', 'String', '是', '提示语，前端可直接 Toast'],
    ['data', 'T', '否', '业务数据，失败时为 null']] },
  page: { name: 'PageDTO<T>（通用分页包装）', api: 'GET /admin/departments、GET /admin/doctors', fields: [
    ['total', 'Long', '是', '总条数'],
    ['pageNum', 'Integer', '是', '当前页码'],
    ['pageSize', 'Integer', '是', '每页条数'],
    ['records', 'List<T>', '是', '当前页数据（元素为各 RespDto）']] },
  registerReq: { name: 'RegisterReqDto（请求）', api: 'POST /auth/register（S1）', fields: [
    ['username', 'String', '是', '@NotBlank，4–20 位字母/数字/下划线；全库唯一（重复→1001）'],
    ['password', 'String', '是', '@NotBlank，6–20 位；BCrypt 加密落库，禁止回传'],
    ['confirmPassword', 'String', '是', '@NotBlank；须与 password 一致（不一致→400）']] },
  loginReq: { name: 'LoginReqDto（请求）', api: 'POST /auth/login（S2）', fields: [
    ['username', 'String', '是', '@NotBlank'],
    ['password', 'String', '是', '@NotBlank；校验失败→1002']] },
  loginResp: { name: 'LoginRespDto（响应）', api: 'POST /auth/login（S2）', fields: [
    ['token', 'String', '是', 'JWT（HS256，24h）；前端存 AppStorage 并注入 Authorization'],
    ['userId', 'Long', '是', 'patient_user.id'],
    ['username', 'String', '是', '用户名；⚠️ 不含密码字段']] },
  memberCreateReq: { name: 'MemberCreateReqDto（请求）', api: 'POST /members（S7）', fields: [
    ['memberName', 'String', '是', '@NotBlank，≤50'],
    ['gender', 'String', '是', '@NotBlank；中文直传「男」/「女」'],
    ['idCard', 'String', '是', '@NotBlank；18 位身份证，前后端双侧校验（格式错→2002）'],
    ['phone', 'String', '是', '@NotBlank；11 位数字（DDL NOT NULL，V2.0 起必填）'],
    ['birthday', 'LocalDate', '否', 'yyyy-MM-dd，@Past']] },
  memberResp: { name: 'MemberRespDto（响应）', api: 'GET /members（S7）', fields: [
    ['id', 'Long', '是', 'patient_member.id'],
    ['memberName', 'String', '是', '就诊人姓名'],
    ['gender', 'String', '是', '男 / 女'],
    ['idCard', 'String', '是', '身份证号'],
    ['phone', 'String', '是', '手机号'],
    ['birthday', 'LocalDate', '否', '出生日期']] },
  deptResp: { name: 'DepartmentRespDto（响应）', api: 'GET /departments（S4）、GET /admin/departments（S11）', fields: [
    ['id', 'Long', '是', 'dept.id'],
    ['deptName', 'String', '是', '科室名称，≤100'],
    ['deptCategory', 'String', '是', '分类（管理端下拉七类：内科/外科/妇儿/五官/皮肤/中医/其他）'],
    ['deptIntro', 'String', '否', '简介，≤500']] },
  doctorResp: { name: 'DoctorRespDto（响应）', api: 'GET /doctors（S5）、GET /admin/doctors（S12）', fields: [
    ['id', 'Long', '是', 'doctor.id'],
    ['doctorName', 'String', '是', '医生姓名（建议全库不重名，展示友好；V2.1 起非强制）'],
    ['title', 'String', '是', '主任医师 / 副主任医师 / 主治医师（中文直传，无编码）'],
    ['skill', 'String', '否', '擅长领域，≤500'],
    ['deptId', 'Long', '是', '所属科室 id'],
    ['deptName', 'String', '是', '联查 dept 带出'],
    ['registerFee', 'BigDecimal', '是', '挂号费（后端按职称映射：主任30/副主任20/主治15，拆解文档 6.5-⑥）；确认挂号页费用展示来源，提交时不传、后端重算']] },
  scheduleResp: { name: 'ScheduleRespDto（响应）', api: 'GET /schedules（S6）', fields: [
    ['id', 'Long', '是', 'schedule.id；挂号时作为 scheduleId 传入 POST /registrations'],
    ['workDate', 'LocalDate', '是', '出诊日期 yyyy-MM-dd'],
    ['timeSegment', 'String', '是', '上午 / 下午（中文直传）'],
    ['totalQuota', 'Integer', '是', '号源总数'],
    ['leftQuota', 'Integer', '是', '剩余号源；=0 时前端显示「已满」置灰不可选']] },
  deptSaveReq: { name: 'DepartmentSaveReqDto（请求）', api: 'POST / PUT /admin/departments（S11）', fields: [
    ['deptName', 'String', '是', '@NotBlank，≤100'],
    ['deptCategory', 'String', '是', '@NotBlank；下拉七类取值'],
    ['deptIntro', 'String', '否', '≤500']] },
  doctorSaveReq: { name: 'DoctorSaveReqDto（请求）', api: 'POST / PUT /admin/doctors（S12）', fields: [
    ['doctorName', 'String', '是', '@NotBlank，≤50；建议不重名（展示友好，V2.1 起非强制拦截）'],
    ['deptId', 'Long', '是', '@NotNull；科室须存在（→4001）'],
    ['title', 'String', '是', '@NotBlank；三档中文职称之一'],
    ['skill', 'String', '否', '≤500']] },
  regCreateReq: { name: 'RegistrationCreateReqDto（请求）', api: 'POST /registrations（S8）', fields: [
    ['scheduleId', 'Long', '是', '@NotNull；GET /schedules 返回的 id（→3005 排班不存在）'],
    ['memberId', 'Long', '是', '@NotNull；归属当前用户校验（→3006）']] },
  regCreateResp: { name: 'RegistrationCreateRespDto（响应）', api: 'POST /registrations（S8）', fields: [
    ['orderNo', 'String', '是', '订单号 yyyyMMddHHmmssSSS+6 位随机（23 位，唯一）'],
    ['registerFee', 'BigDecimal', '是', '挂号费（来源：职称映射 主任30/副主任20/主治15，拆解文档 6.5-⑥），两位小数']] },
  regResp: { name: 'RegistrationRespDto（响应）', api: 'GET /registrations/my（S9）', fields: [
    ['orderNo', 'String', '是', '唯一订单号'],
    ['memberName', 'String', '是', '联查 patient_member（表内未存就诊人快照）'],
    ['deptName', 'String', '是', '下单快照 dept_name_snap'],
    ['doctorName', 'String', '是', '下单快照 doctor_name_snap'],
    ['workDate', 'LocalDate', '是', '就诊日期'],
    ['timeSegment', 'String', '是', '上午 / 下午'],
    ['registerFee', 'BigDecimal', '是', '挂号费'],
    ['status', 'String', '是', '待就诊 / 已取消（中文直传）'],
    ['createTime', 'LocalDateTime', '是', '下单时间；列表按此倒序']] },
};

// 每人每天涉及的 DTO（渲染进当日日计划速览）
const DAY_DTO = {
  a: [['result','page'], ['loginResp'], ['regCreateReq','regCreateResp','regResp'], ['regCreateReq','regCreateResp'], [], ['regResp'], [], [], [], []],
  b: [[], ['registerReq','loginReq','loginResp','deptResp','doctorResp'], ['scheduleResp','memberCreateReq','memberResp','deptSaveReq','doctorSaveReq','page'], ['deptResp'], [], ['registerReq','loginReq','loginResp','memberCreateReq','memberResp','deptResp','doctorResp','scheduleResp','deptSaveReq','doctorSaveReq','regCreateReq','regCreateResp','regResp','page'], [], ['registerReq','memberCreateReq','deptSaveReq','doctorSaveReq'], [], []],
  c: [['result','page'], ['deptSaveReq','deptResp','page'], ['deptSaveReq','deptResp','doctorSaveReq','doctorResp','page'], ['deptResp','doctorResp'], ['regCreateResp','regResp'], ['regResp'], [], [], [], []],
  d: [['result'], ['registerReq','loginReq','loginResp'], ['deptResp','doctorResp','scheduleResp'], ['memberCreateReq','memberResp','regCreateReq','regCreateResp'], ['registerReq','loginReq','loginResp','deptResp','doctorResp','scheduleResp','memberCreateReq','memberResp'], ['regCreateResp','regResp'], [], [], [], []],
};

const dtoBlock = (keys) => {
  if (!keys || keys.length === 0) return '当日不涉及接口 DTO。';
  return keys.map(k => {
    const d = DTO[k];
    return `**${d.api} · ${d.name}**\n\n| 字段 | 类型 | 必填 | 校验 / 说明 |\n| --- | --- | --- | --- |\n` +
      d.fields.map(f => `| ${f[0]} | ${f[1]} | ${f[2]} | ${f[3]} |`).join('\n');
  }).join('\n\n');
};

const DTO_ORDER = ['result','page','registerReq','loginReq','loginResp','memberCreateReq','memberResp','deptResp','doctorResp','scheduleResp','deptSaveReq','doctorSaveReq','regCreateReq','regCreateResp','regResp'];

const dtoContract = `# 接口 DTO 契约 · ReqDto / RespDto 全量字段定义

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

${dtoBlock(['result', 'page'])}

### 认证与用户域（后端 B 实现 / 患者端 D 消费）

${dtoBlock(['registerReq', 'loginReq', 'loginResp', 'memberCreateReq', 'memberResp'])}

### 医院资源域（后端 B 实现 / 患者端 D + 管理端 C 消费）

${dtoBlock(['deptResp', 'doctorResp', 'scheduleResp', 'deptSaveReq', 'doctorSaveReq'])}

### 挂号域（后端 A 实现 / 患者端 D 消费）

${dtoBlock(['regCreateReq', 'regCreateResp', 'regResp'])}

## 责任分工

| 角色 | 职责 |
| --- | --- |
| 后端 B | auth / members / departments / doctors / schedules / admin 全部 DTO 实现与 @Schema 注解 |
| 后端 A | registrations 三个 DTO 实现与 @Schema 注解 |
| 前端 C | 管理端相关类型从本文件逐字段抄写至 src/api/ |
| 前端 D | 患者端相关类型从本文件逐字段抄写至 common/api/ |
`;

// ============ 四位成员 × 十天 内容 ============
// 每天字段：[主题, 关联故事, 目标, 前置条件[], 任务[], 涉及契约[], DoD[], 产出物[], 对齐点[]]
const PLAN = {
a: {
  dir: 'member-a',
  title: '成员A（组长 · 后端 · 架构/挂号域/中间件）',
  role: '负责全局工程骨架（his-common、JWT、port 四接口）与挂号域（S8/S9/S10）、Redis 缓存/分布式锁/限流、扩展 MQ；主持接口评审会与多模块拆分。',
  storyLine: 'S8 / S9 / S10 + 全局骨架与中间件',
  notes: [
    '你是唯一有权限合并 dev → master 的人；合并前须确认 Apifox 回归全绿。',
    '技术栈版本以《项目拆解设计说明书》1.4 基线为准，版本升降同样属于契约变更，需全员知会。',
    'his-registration 需要调用 user/hospital 域新方法时，先与 B 对齐（跨模块依赖保持单向：registration → user/hospital）。',
    'Redis key 变更属于契约变更（拆解文档 7.1 章），需与 B 对齐后更新文档。',
  ],
  days: [
    ['项目启动与工程骨架','全局','仓库与单模块骨架就绪、公共基础件可用，全组可并行开工',
      ['环境已核对：JDK 17 / Maven 阿里云镜像 / MySQL 8 / Redis','《任务分工说明书》已签字认领'],
      ['主持启动会（30 分钟）：宣读任务分工与分支模型（master 受保护 / dev / feature-*）、Apifox 工作区邀请全员，确认全员入仓入工作区',
       '建 Git 仓库：master 保护 + dev 分支 + 组员 developer 权限',
       '搭建单模块 his-api：pom 严格按拆解文档 1.4 基线锁版本（SB 3.1.5 / Flex 1.8.8 / java-jwt 4.4.0 / Knife4j 4.4.0 / Hutool），启动类 + application.yml（8080、context-path /api、数据源）',
       '实现 his-common 基础件：Result、PageDTO、ErrorCode（16 码）、BizException、GlobalExceptionHandler',
       '定义 port 四接口（CacheService / DistributedLockService / RateLimitService / MessageSender）+ Noop/Logging 默认实现，yml 预留 his.middleware.* 开关',
       '新增 GET /hello 验证统一响应与 Knife4j 文档'],
      ['统一响应体/错误码：拆解文档 5.1–5.3','port 设计：拆解文档 2.4'],
      ['/doc.html 可访问；GET /hello 返回 code=200','dev 分支全员可 pull/push','port 接口可注入启动，切换 yml 开关不报错'],
      ['Git 仓库与分支策略','his-api 骨架 + his-common 基础件'],
      ['与 B 确认 init.sql 今日评审并执行','与 C/D 确认 Apifox 工作区与 mock-data.md 使用方式']],
    ['JWT底座与多模块拆分','S1/S2 协同','认证底座可用；接口契约 11 项待对齐全部销项；完成五模块拆分并回归',
      ['D1 骨架可用','B 已执行 init.sql，S1/S2 开发中'],
      ['JwtUtil（java-jwt 4.4.0，HS256，claims：userId/username/role，有效期 24h，密钥读 yml）',
       'AuthInterceptor + WebMvcConfig：放行清单=拆解文档 4.1（/auth/**、GET /departments、/doctors、/schedules），/admin/** 预留 ADMIN 校验位',
       '协同 B 联调 S1/S2 的 Token 全链路（注册→登录→携 Token 访问受保护接口→401 场景）',
       '15:00 主持接口评审会：逐条销拆解文档 4.8 的 11 项待对齐，当场更新文档与 Apifox 用例',
       '17:00–18:00 按拆解文档 2.3 五步清单主导多模块拆分（common/user/hospital/registration/api），迁移后全量回归'],
      ['放行清单与路径：拆解文档 4.1','错误码 401：拆解文档 5.2','模块依赖规则：拆解文档 2.3'],
      ['无 Token 访问 /members 返回 HTTP 401 + code 401','4.8 待对齐 11 项全部有结论并落文档','五模块编译启动通过，既有接口回归全绿'],
      ['JwtUtil + 登录拦截器','五模块工程结构'],
      ['评审会全员必到','拆分后通知 C/D：契约与请求路径不变，仅工程结构变化']],
    ['挂号域初版','S8/S9/S10','挂号下单/记录/取消三接口业务闭环（高并发防护 D4 再加）',
      ['多模块拆分完成','B 的域接口（就诊人/排班查询）可调用'],
      ['OrderIdUtil：yyyyMMddHHmmssSSS + 6 位随机数',
       'RegistrationCreateReqDto / RegistrationCreateRespDto（字段严格按拆解文档 4.7）',
       'S8 编排：就诊人归属校验(3006) → 排班存在(3005) → 原子扣号（UpdateChain 条件更新，失败 3001）→ 落库（名称快照 + doctorId/scheduleId，拆解文档 6.5-①）',
       '挂号费计算：his-common 常量按医生 title 映射（主任30/副主任20/主治15，6.5-⑥），落库为快照 register_fee；前端传入的任何费用字段一律忽略（防篡改）',
       'S9 GET /registrations/my：按 create_time 倒序',
       'S10 POST /registrations/{orderNo}/cancel：@Transactional 内 status→已取消 + 号源 +1 回补',
       'Apifox 用例：正常路径 + 3001/3005/3006/3004 错误分支',
       '接口完成后 Apifox 实测：真实响应与 db/mock-data.md 逐字段 diff（规则八后端附加），填第 10 节对照表'],
      ['表：appointment_record / schedule / patient_member（db/init.sql）','接口：拆解文档 4.7','原子扣号写法：拆解文档 6.4'],
      ['Apifox 用例全绿','连续两次提交同一排班，第二次因 left_quota=0 返回 3001（数据库条件更新兜底）'],
      ['his-registration 模块初版'],
      ['与 B 对齐 MemberService/ScheduleService 跨模块调用方式','与 D 确认 3001/3002/3003 的 Toast 文案']],
    ['Redis接入与高并发','S8/S4','缓存/分布式锁/限流三大能力上线（里程碑 M3）',
      ['D3 挂号初版全绿','本机或机房 Redis 可用'],
      ['实现 RedisCacheService（StringRedisTemplate + JSON，TTL 1800s+随机抖动）',
       '实现 RedisSetnxLockService（setIfAbsent，30s 兜底过期，unlock 必须在 finally 中调用）',
       '实现 RedisCounterRateLimitService（INCR + EXPIRE 60s，超过 5 次拒绝）',
       '挂号编排插入：限流(3003) → 锁(3002，抢锁失败即拒) → 既有链路',
       'yml his.middleware.redis.enabled=true 切换验证；关闭后 Noop 降级主流程仍可跑',
       '编写并发自测脚本（Apifox runner 或 curl 循环）'],
      ['Redis key 设计：拆解文档 7.1','port 装配开关：拆解文档 2.4.2'],
      ['并发 10 次同一『患者+医生+日期+时段』仅 1 单成功（其余 3002）','60 秒内第 6 次挂号请求返回 3003','与 B 联调：科室二次查询命中缓存不回源（日志验证）'],
      ['Redis 三件套实现 + 并发自测脚本'],
      ['与 B 互验科室缓存链路','限流/锁提示文案与 D 对齐']],
    ['联调支撑与造数','全局','App 联调缺陷当日闭环；演示数据完备可重复重置',
      ['D5 前联调缺陷清单（来自 D）'],
      ['修复 D 反馈的挂号链路联调缺陷（当日清单当日清零）',
       '排班造数/重置脚本入 db/：可重复执行（重置号源为满额、补未来 7 天排班）',
       '15 分钟代码走读：带 B 过挂号域全链路（互备要求，B 需能独立处理挂号域小缺陷）'],
      ['种子数据契约：db/init.sql'],
      ['联调缺陷闭环率 100%','造数脚本重复执行无副作用','B 复述挂号编排链路无误'],
      ['db/ 造数与重置脚本'],
      ['D 的每日缺陷清单','走读后与 B 互认挂号域责任人']],
    ['全流程串联与事务复核','S10','后端侧满足 M4：事务正确、回归集合可用',
      ['D4 Redis 三件套上线'],
      ['取消挂号事务复核：status=已取消 且 left_quota+1，同一事务内完成（按订单内 schedule_id 直达回补，拆解文档 6.5-①）',
       '构造扣号后异常（手动抛 BizException）验证事务回滚、号源不丢',
       '整理 Apifox 一键回归集合（19 个接口全量）',
       '配合 D 走 S4→S10 全流程演示脚本第一轮（计时）'],
      ['事务要求：拆解文档 5.3','全部接口：拆解文档第 4 章'],
      ['事务用例通过；后端 19 接口全绿','M4 前置条件（后端侧）完成'],
      ['Apifox 回归集合'],
      ['与 D 对演示脚本','与 C 确认管理端回归不阻塞']],
    ['扩展-AI导诊(可选)','范围外','AI 导诊 SSE 接口演示级可用（主线优先，M4 未稳则放弃）',
      ['M4 全流程已稳定（主线优先原则）'],
      ['Spring AI + DeepSeek/DashScope 接入，开发 /ai/chat SSE 流式接口（demo 级）',
       '主线未稳时：本日全部投入缺陷修复，扩展明示放弃并记录原因'],
      ['范围外专题：需求文档第 7 章'],
      ['SSE 演示可用，或明确记录『放弃扩展』（不影响验收）'],
      ['AI 导诊接口（可选）'],
      ['若做：SSE 响应格式与 C/D 对齐（新增接口同样走契约变更流程）']],
    ['扩展-MQ与异常兜底','S8 扩展','挂号成功通知走 MQ；异常与降级路径全覆盖',
      ['D7 已决断扩展/放弃'],
      ['RocketMQMessageSender（topic：his_registration_success；消息体：orderNo/userId/memberName/workDate/timeSegment）',
       'MQ 不可用时降级 LoggingMessageSender，保证可演示',
       '全局异常兜底复查：NPE、参数缺失、Redis 断连时的降级路径'],
      ['MQ 场景：拆解文档 7.3'],
      ['挂号成功后消息可观察（日志或 MQ 控制台）','拔掉 Redis/MQ，主流程仍可跑（降级验证）'],
      ['RocketMQ 适配（可选）'],
      ['扩展范围，不影响既有契约']],
    ['压测与答辩材料','全局','压测数据入 PPT；彩排一轮完成',
      ['M4/M5 已收口'],
      ['JMeter 压测挂号链路：并发 50 / 持续 1 分钟，记录 QPS、错误率、限流触发次数，截图入 PPT',
       'PPT：架构演进三阶段图、缓存/锁/限流原理图、分工表',
       '组织答辩彩排第一轮（演示脚本走位 + 计时）'],
      ['验收口径：需求文档 6.3'],
      ['压测数据成表入 PPT','彩排问题清单全部指派到人'],
      ['压测记录与 PPT 架构章节'],
      ['全员彩排时间','演示分工确认（A 架构 / B 数据库 / C 管理端 / D App）']],
    ['答辩日','全局','答辩通过；交付物归档齐全',
      ['彩排完成，交付物清单核对过'],
      ['答辩讲解：架构演进、分布式锁与限流；准备模拟面试高频问题（缓存穿透/雪崩/击穿、锁误删、事务边界）',
       '组长归档：按《需求分析说明书》6.2 交付物清单逐项核对入库（PPT、压缩包、过程文档、日报）'],
      ['交付物清单：需求文档 6.2'],
      ['答辩通过；交付物齐全'],
      ['归档记录'],
      ['全员']],
  ],
},
b: {
  dir: 'member-b',
  title: '成员B（后端 · 用户域/医院域/数据库）',
  role: '负责六表 DDL 与种子数据（唯一维护人）、S1–S7/S11/S12 全部接口、接口文档与数据库设计文档。',
  storyLine: 'S1 S2 S3 S4 S5 S6 S7 S11 S12',
  notes: [
    '你是 DDL 与契约文档的唯一维护人：收到对齐结论后，当天更新 db/init.sql、db/mock-data.md 与拆解文档第 4/6 章，并在群里通知全员。',
    '定稿口径不得擅改（V2.2 契约）：title（主任医师/副主任医师/主治医师）、time_segment（上午/下午）、gender（男/女）、status（待就诊/已取消）中文直传且带 CHECK 枚举；逻辑删除字段 delmark **六表齐备**（订单不提供删除接口是后端代码层限制，非表结构限制）；schedule 有 uk_doctor_date_segment 唯一键；取消挂号按订单 schedule_id 直达回补。',
    '种子数据调整（哪怕只是演示用数据）同样触发铁律一。',
    '排班日期用 CURDATE()+N 动态生成，任何时候重置库，『未来 7 天』都有数据。',
  ],
  days: [
    ['环境核对与数据库定稿','全局','init.sql 定稿并一键执行成功，成为全组数据契约',
      ['组员环境安装完成（JDK/Maven/MySQL/Redis/Node/DevEco）'],
      ['出《环境核对清单》并逐人签字：JDK 17、Maven 阿里云镜像、MySQL 8、Redis、Node 18+、DevEco 6.1',
       '执行 db/init.sql（V2.2 = cloud_hospital.sql + 安全审查修复 + delmark 六表补齐）：建库 neusoft_hospital、六表、种子数据（4 科室 / 8 医生 / 每医生未来 7 天排班）',
       '验证：唯一键（username / order_no / doctor+work_date+time_segment）、CHECK 约束（title/segment/gender/status/号源非负）、公共字段默认值、delmark 六表齐全；确认"订单不提供删除接口"属后端代码层限制（拆解文档 6.5-⑤）',
       '确认 V2.1 契约口径：中文直传 + CHECK 枚举、delmark 逻辑删除、订单表 doctor_id/schedule_id 关联设计（拆解文档 6.5）'],
      ['数据契约：db/init.sql（拆解文档第 6 章）'],
      ['init.sql 在空库一键执行成功','种子数据查询可见；排班日期=执行日+1~+7','环境清单全员签字'],
      ['db/init.sql（入仓库）'],
      ['与 A 确认 DDL 无遗留待对齐','提醒 C/D：mock 数据必须与 db/mock-data.md 完全一致']],
    ['登录注册与首批查询','S1/S2/S4/S5','五个基础接口上线并接入 JWT',
      ['D1 数据库定稿；A 的骨架与 JwtUtil 可用'],
      ['S1 注册：用户名唯一校验(1001)、Hutool BCrypt 加密落库',
       'S2 登录：校验(1002)、LoginRespDto（token/userId/username，绝不返回密码），Token 用 A 的 JwtUtil 签发',
       'S4 GET /departments（category 可选过滤，响应按 mock-data.md 字段）',
       'S5 GET /doctors?deptId=（按职称权重排序：主任→副主任→主治，Service 内存排序，见拆解文档 6.4）',
       '15:00 参加接口评审会（负责记录字段结论）',
       '17:00 配合 A 拆分：迁移 user/hospital 两包并回归',
       '每个接口 Apifox 实测：真实响应与 db/mock-data.md 逐字段 diff（规则八后端附加），填第 10 节对照表'],
      ['接口：拆解文档 4.3/4.5','表：patient_user / dept / doctor'],
      ['5 接口 Apifox 全绿（含 1001/1002 分支）','拆分后回归通过'],
      ['his-user / his-hospital 首批接口'],
      ['LoginRespDto 字段与 D 确认（评审会 #1/#3）']],
    ['CRUD高产日','S6/S7/S3/S11/S12','当日 10 个接口全部上线',
      ['D2 五接口全绿；多模块拆分完成'],
      ['S6 GET /schedules?doctorId=：近 7 天（当天+1~+7），无排班返回空数组',
       'S7 POST /members（上限 3 人→2001；Hutool IdcardUtil→2002）、GET /members',
       'S3 POST /auth/logout',
       'S11 /admin/departments 四接口（Flex paginate → PageDTO，字段按 mock-data.md）',
       'S12 /admin/doctors 四接口（deptId 不存在→4001；删除医生=逻辑删除 delmark=1 且同事务将其未来排班逻辑删除 delmark=1，见 6.5-②）',
       '10 接口全部 Apifox 实测并与 db/mock-data.md 逐字段 diff；填第 10 节对照表（规则八）'],
      ['接口：拆解文档 4.4/4.5/4.6','表：schedule / patient_member'],
      ['当日 10 接口 Apifox 全绿','对照拆解文档 4.3–4.6 抽查字段名/类型一致（含 PageDTO 结构）'],
      ['患者浏览与后台管理全量接口'],
      ['与 C 约定明日切真实接口','与 D 确认空数组→『暂无排班』渲染']],
    ['科室缓存CacheAside','S4/S11','科室查询走缓存，管理端写时删缓存',
      ['A 的 CacheService 可用（D4 当天并行）'],
      ['GET /departments 接入 CacheService：key=dept:list:{category}:{delmark}，TTL 1800s+随机抖动，只缓存 List 不缓存分页',
       '科室增/改/删后 evictByPrefix 清缓存',
       '与 A 互验缓存链路（命中日志）'],
      ['缓存 key：拆解文档 7.1'],
      ['科室二次查询命中（日志无 SQL）；后台改科室后前台立即可见','管理端分页查询不进缓存'],
      ['科室缓存接入'],
      ['与 A 联调互验','与 C/D 三方验证『改科室→App 即时可见』']],
    ['接口文档与联调支撑','全局','文档质量提升；联调缺陷闭环',
      ['C/D 联调缺陷清单'],
      ['Knife4j 注解补全（@Tag/@Operation/@Schema，与 mock-data.md 字段描述一致）',
       '修复 C/D 反馈的联调缺陷',
       '造数完善：测试账号（走注册接口创建）、号源重置脚本配合 A'],
      ['接口契约：拆解文档第 4 章 + db/mock-data.md'],
      ['Knife4j 文档字段完整可读','缺陷当日闭环'],
      ['完善的在线接口文档'],
      ['C/D 缺陷清单']],
    ['接口文档交付稿','全局','接口文档成为正式交付物',
      ['D5 文档完善'],
      ['Apifox 导出 markdown 入库 doc/api/',
       '拆解文档 4.8 待对齐表全部标注最终结论',
       '支撑 M4 后端回归（跑 A 的 19 接口回归集合）'],
      ['交付物清单：需求文档 6.2'],
      ['接口文档与实现 100% 一致'],
      ['接口文档交付稿（doc/api/）'],
      ['文档使用方：全员']],
    ['缓冲与扩展协同','全局','主线补强或扩展协同（二选一，主线优先）',
      ['与 A 商定当日安排'],
      ['选项一：协同 A 准备 AI 导诊测试数据',
       '选项二：提前做 D8 边界复查（校验注解、逻辑删除）'],
      [],
      ['当日安排有结论并记录'],
      [],
      ['与 A 商定并同步日报']],
    ['边界完善','全局','校验与逻辑删除全覆盖',
      [],
      ['全部 ReqDto 校验注解复查（@NotBlank/@Pattern/@Size，与 mock-data.md 错误示例一致）',
       '逻辑删除专项：删科室/医生→患者端查询不可见且缓存已清；删医生同事务逻辑删未来排班 delmark=1（6.5-②）',
       '数据一致性抽查：取消挂号后号源恢复 +1'],
      ['参数校验约定：拆解文档 4.2'],
      ['校验缺失=0；逻辑删除用例通过；取消恢复号源用例通过'],
      ['边界用例记录'],
      ['若需 DDL 变更：按 AGENTS.md 铁律一全组对齐后再动']],
    ['数据库设计文档','全局','数据库设计文档定稿（交付物）',
      ['DDL 已定稿无待对齐项'],
      ['编写《数据库设计文档》：ER 图、字段字典、公共字段约定、三范式与快照冗余说明',
       'PPT 素材：数据库设计与接口规范截图'],
      ['交付物清单：需求文档 6.2'],
      ['与 A 交叉审阅后定稿'],
      ['数据库设计文档'],
      ['与 A 交叉审阅']],
    ['答辩日','全局','数据库与接口规范讲解通过',
      ['材料齐备'],
      ['答辩讲解：数据库设计思路、统一响应体/异常/DTO 规范',
       '协助演示：后台修改科室→前台数据即时生效'],
      [],
      ['答辩通过'],
      [],
      ['全员']],
  ],
},
c: {
  dir: 'member-c',
  title: '成员C（前端 · Vue3 管理端）',
  role: '负责 vue-admin 管理端（S11/S12 界面）与联调，第 5–6 天硬性支援鸿蒙端静态页面，答辩截图素材库维护。',
  storyLine: 'S11 / S12（Web 管理端）+ 支援 S8/S9 静态页',
  notes: [
    'mock 只允许使用 db/mock-data.md 的字段与取值；缺字段/字段不符 → 记录到当日『契约变更记录』并在站会提对齐诉求，不得自行编造字段。',
    '仅调用契约内接口（/admin/** 等）；需要新接口 → 找 A/B 走铁律二/三。',
    '所有展示编码映射（职称/时段/性别/状态/科室分类）以 mock-data.md 映射表为准，不得自造文案。',
    '页面布局与视觉以 doc/ui/管理端页面设计稿.md 与 doc/ui/UI统一规范.md 为准（Element Plus 默认令牌）；设计稿的「元素-字段映射」与状态矩阵即页面验收标准。',
    'D5–D6 支援 D 的静态页面是硬性任务，不是可选项。',
  ],
  days: [
    ['脚手架与布局','全局','管理端框架可跑，网络层就绪',
      ['Node 18+ 已装；Apifox 工作区已入'],
      ['Vite 创建 vue-admin：Vue3 + Element Plus + Vue Router + Pinia',
       '布局框架：侧边菜单（科室管理/医生管理）+ 顶栏 + 内容区',
       'axios 封装：baseURL http://localhost:8080/api、code!==200 统一 ElMessage(message)、HTTP 401 跳登录占位、全局 loading',
       '准备本地 mock 开关（评审会前用本地 mock，会后切 Apifox mock）'],
      ['统一响应体 Result：拆解文档 5.1','mock 数据：db/mock-data.md'],
      ['框架可跑','拦截器对三种形态（成功/业务错/401）处理正确'],
      ['vue-admin 框架 + axios 封装'],
      ['与 B 确认 PageDTO 字段（评审会 #2）','与 D 统一错误码→提示的处理约定']],
    ['Mock先行-科室管理页','S11','不依赖后端，用 mock 完整演示科室管理',
      ['接口契约已导入 Apifox（评审会版本）'],
      ['Apifox 导入契约并开启 mock',
       '科室管理页：分页表格 + 新增/编辑 Dialog（名称必填、分类下拉用七类定稿取值）+ 删除二次确认',
       '纯 mock 演示：列表→新增→编辑→删除全流程',
       'src/api/ 统一定义接口类型与请求函数：类型从 db/mock-data.md 逐字段抄写，组件内禁止手写 URL/字段（规则八前端附加）'],
      ['/admin/departments 四接口：拆解文档 4.6','mock 字段：deptName/deptCategory/deptIntro（db/mock-data.md）'],
      ['后端未完工也可完整演示（前后端并行的关键）','表单校验与错误提示符合 mock-data.md 示例'],
      ['科室管理页（mock 版）'],
      ['mock 字段必须与 db/mock-data.md 完全一致；任何字段疑问走待对齐流程']],
    ['真实接口与医生管理页','S11/S12','管理端对真实库增删改查全通',
      ['B 的 S11/S12 接口全绿'],
      ['S11 切真实接口：分页、增删改、错误码提示（400/4001）',
       '医生管理页：表格（含科室名称列）+ 表单（科室下拉必选、职称下拉：主任医师/副主任医师/主治医师，中文直传）+ 删除确认',
       '真实库增删改查全流程验证',
       '切真实接口后逐接口比对真实响应与 mock 版字段，填第 10 节对照表；不一致→缺陷清单（谁偏离契约谁改，规则八裁决）'],
      ['/admin/doctors 四接口：拆解文档 4.6','枚举取值（中文直传）：db/mock-data.md §2'],
      ['对真实库 CRUD 全通；4001/400 错误提示正确','职称三档下拉与编码对应正确'],
      ['医生管理页 + 科室管理真实版'],
      ['与 B 联调','职称编码显示映射与 D 统一']],
    ['管理端回归与UX','S11/S12','缓存链路三方验证；交互细节补齐',
      ['B 的科室缓存已上线（D4）'],
      ['配合 B 验证『改科室→前台（App）立即可见』缓存链路',
       'UX 完善：loading、空态、表单重置、分页参数保持、删除后刷新当前页'],
      [],
      ['缓存链路验证通过（记录演示步骤，答辩用）','UX 检查单全部通过'],
      ['缓存即时生效演示步骤记录'],
      ['与 B/D 三方验证；发现接口问题走缺陷清单给 B']],
    ['支援App端与素材','S8/S9 静态页','支援 D 搭建 App 静态页面；管理端收尾',
      ['管理端主体完工（D3）'],
      ['⭐ 硬性安排：支援 D 搭建挂号成功页、我的挂号记录页静态布局（数据绑定由 D 完成）',
       '管理端缺陷修复',
       '答辩截图素材采集入 doc/screenshots/'],
      ['页面字段参考：db/mock-data.md §3'],
      ['静态页交付并经 D 验收','素材入库'],
      ['App 静态页两份 + 截图素材'],
      ['与 D 每日交接页面清单与样式约定']],
    ['支援App端与联调','全局','支撑 M4 全流程打通',
      ['D 的页面骨架就绪'],
      ['继续支援 D：取消挂号二次确认弹窗等静态部分',
       '管理端参与 M4 全流程回归（造数：改科室/医生数据配合演示场景）'],
      [],
      ['M4 中管理端角色无阻塞'],
      [],
      ['与 A/B/D 联调会']],
    ['扩展-AI对话页(可选)','范围外','AI 对话页接入或继续支援（主线优先）',
      ['A 的 SSE 接口是否就绪'],
      ['若 SSE 就绪：管理端/AI 对话页接入；否则继续支援 D 或回归管理端'],
      ['SSE 格式：与 A 对齐的新契约'],
      ['演示级可用或明确放弃并记录'],
      [],
      ['SSE 响应格式与 A 对齐（走契约变更流程）']],
    ['健壮性回归','全局','异常场景全覆盖',
      [],
      ['停服/超时 UI 兜底提示；HTTP 401 统一跳转验证',
       'Chrome / Edge 双浏览器过一遍全部页面'],
      ['401 行为：评审会 #9 结论'],
      ['断网/停服场景提示友好；双浏览器无样式错乱'],
      ['回归记录'],
      ['与 A 确认 401 行为（仅未登录返 HTTP 401）']],
    ['运行说明与PPT','全局','管理端交付材料齐备',
      [],
      ['vue-admin 运行说明（README：Node 版本、npm install / npm run dev、接口地址配置）',
       'PPT：管理端功能截图与亮点（含缓存即时生效演示）'],
      ['交付物清单：需求文档 6.2'],
      ['按 README 可一键跑起管理端'],
      ['管理端运行说明'],
      ['与 A 对齐 PPT 大纲分工']],
    ['答辩日','全局','管理端现场演示通过',
      ['材料齐备'],
      ['现场演示：科室/医生管理全流程（新增→列表可见→编辑→删除）',
       '协助回答前端与管理端问题'],
      [],
      ['演示无卡顿、无报错'],
      [],
      ['全员']],
  ],
},
d: {
  dir: 'member-d',
  title: '成员D（前端 · 鸿蒙患者端）',
  role: '负责患者端 App 全部页面（S1–S10）、withLogin 守卫与 axios 封装、答辩全流程演示主操。',
  storyLine: 'S1–S10（患者端界面与登录态）',
  notes: [
    'mock 只允许使用 db/mock-data.md 的字段与取值；缺字段/字段不符 → 记录到当日『契约变更记录』并在站会提对齐诉求，不得自行编造字段。',
    '编码展示映射（职称/时段/性别/状态/科室分类）以 db/mock-data.md §2 映射表为准；错误码 Toast 文案与 A 对齐。',
    '页面布局与视觉以 doc/ui/鸿蒙端页面设计稿.md 与 doc/ui/UI统一规范.md 为准（vp/fp 令牌）；九页线框、元素-字段映射与状态矩阵（尤其「已满/暂无排班」）即页面验收标准。',
    'withLogin 守卫的放行/拦截清单若调整，须与后端放行清单（拆解文档 4.1）对齐，防止前端拦了后端放行的接口（或反之）。',
    '模拟器访问宿主机后端用本机 IP 而非 localhost；真机需同一网段；网络问题找 A。',
  ],
  days: [
    ['环境与工程','全局','DevEco 工程可请求到本机后端',
      ['DevEco Studio 6.1 + API 13 SDK 已装'],
      ['DevEco 创建工程并在模拟器跑通模板页面',
       'module.json5 申请 ohos.permission.INTERNET',
       '引入 @ohos/axios 2.2.10',
       '验证模拟器请求本机后端：GET /api/hello（模拟器用宿主机 IP，非 localhost）'],
      ['统一响应体 Result：拆解文档 5.1'],
      ['模拟器页面打印出后端 code=200 响应'],
      ['鸿蒙工程骨架'],
      ['与 A 确认宿主机 IP 与访问方式','真机联调需同一网段（提前知会组员）']],
    ['网络层与登录注册页','S1/S2','网络层封装完成；注册登录双通道可用',
      ['D1 工程可请求后端'],
      ['axios 封装：Token 存 AppStorage、请求拦截器注入 Authorization（是否带 Bearer 以评审会 #3 结论为准）、code!==200 统一 Toast、网络异常统一『网络连接异常，请检查网络』',
       '注册页：用户名/密码/确认密码（两次一致校验、1001 重复提示）',
       '登录页：成功存 Token 跳首页',
       'common/api/ 统一定义 ArkTS 接口类型与请求函数：类型从 db/mock-data.md 逐字段抄写，页面内禁止手写 URL/字段（规则八前端附加）'],
      ['/auth/register、/auth/login：拆解文档 4.3','LoginRespDto：db/mock-data.md §3'],
      ['mock 与真实双通道均可注册→登录→携带 Token','错误码 1001/1002 Toast 正确'],
      ['网络层封装 + 登录/注册页'],
      ['Bearer 前缀与 A 统一','mock 字段与 db/mock-data.md 一致']],
    ['浏览主线页面','S4/S5/S6','科室/医生/排班三页 mock 渲染通过',
      ['D2 网络层就绪'],
      ['首页：科室列表（名称+分类，点击进入医生列表）',
       '医生列表页：姓名/职称/擅长（后端已按职称排序，直接展示）',
       '排班页：近 7 天列表、剩余号源数、leftQuota=0 显示『已满』置灰不可选、空数组显示『暂无排班』'],
      ['GET /departments、/doctors、/schedules：拆解文档 4.5','mock：db/mock-data.md §3'],
      ['三页 mock 渲染通过','『已满』『暂无排班』两种状态均可演示'],
      ['三个主线页面'],
      ['timeSegment 中文直传展示，无编码映射（与 C 统一口径）']],
    ['就诊人与确认挂号','S7/S8','就诊人管理与确认挂号页 mock 可用',
      ['D3 三页就绪'],
      ['就诊人页：列表 + 添加表单（姓名/性别/身份证/手机号/出生日期；身份证前端正则校验，提示文案与后端 2002 一致）',
       '确认挂号页：就诊人/科室/医生/就诊日期/时段/挂号费六要素核对 + 提交；3001/3002/3003 Toast 展示（挂号费取自 DoctorRespDto.registerFee，前端不做价格映射）'],
      ['POST /members、POST /registrations：拆解文档 4.4/4.7'],
      ['mock 提交成功返回 orderNo','三类错误码 Toast 正确；身份证校验前后端口径一致'],
      ['就诊人页 + 确认挂号页'],
      ['错误码提示文案与 A 对齐']],
    ['登录态与联调','S1–S7','守卫全覆盖；S1–S7 真接口跑通',
      ['B 的患者端接口全绿（D3）'],
      ['withLogin 守卫封装（无 Token 跳登录页），需登录页面全部接入',
       '切真实接口联调 S1–S7；缺陷清单当日反馈 A/B（复现步骤+截图）',
       '联调对照：S1–S7 每个接口真实响应与 db/mock-data.md 逐字段比对，填第 10 节对照表；不一致→缺陷清单（规则八裁决）'],
      ['放行清单：拆解文档 4.1（守卫口径须一致）'],
      ['无 Token 访问受控页自动跳登录','主流程（注册→登录→浏览→就诊人）真接口全通'],
      ['withLogin 守卫 + 联调缺陷清单'],
      ['每日缺陷清单给 A/B','字段不一致处走 4.8 待对齐流程']],
    ['全流程收口','S8/S9/S10/S3','M4：全流程真联通',
      ['A 的挂号接口含锁/限流已上线（D4）'],
      ['挂号成功页：订单号展示/复制',
       '我的挂号记录页：按时间倒序 + 状态标签（待就诊/已取消）',
       '取消挂号：二次确认弹窗→成功刷新列表',
       'S3 退出登录：清 Token 回登录页，返回键验证守卫生效',
       '模拟器/真机走通 S4→S5→S6→S7→S8→S9→S10 全流程（演示脚本初版 + 录屏备份）'],
      ['挂号域接口：拆解文档 4.7','事务行为：取消后号源恢复（配合验证）'],
      ['M4 验收：全流程真联通（有录屏备份）','取消挂号后该排班 left_quota+1（与 B 核对）'],
      ['全流程可用 App + 演示脚本初版'],
      ['与 A/B/C 联调会','C 支援的静态页今日全部合入']],
    ['扩展-AI管家(可选)','范围外','AI 管家页接入或回归修复（主线优先）',
      ['A 的 SSE 接口是否就绪'],
      ['若后端 SSE 就绪：『AI 管家-小医』对话页（流式渲染）；否则全页面回归修复'],
      ['SSE 格式：与 A 对齐的新契约'],
      ['演示级可用或明确放弃并记录'],
      [],
      ['SSE 响应格式与 A 对齐（走契约变更流程）']],
    ['回归与素材','全局','全页面回归通过；素材齐备',
      [],
      ['全页面回归（重点：错误码 Toast、网络异常、空数据三种形态）',
       '截图与录屏素材入 doc/screenshots/'],
      [],
      ['回归清单全部通过','素材入库'],
      ['回归记录 + 素材'],
      ['发现接口问题走缺陷清单']],
    ['演示脚本与真机','全局','答辩演示就绪（双保险）',
      [],
      ['演示脚本定稿：页面点击路径 + 讲解词（对应验收：选科室→选医生→选排班→确认挂号→查看记录→取消）',
       '真机准备 + 备用模拟器双保险；演示账号与数据提前造好',
       'PPT 患者端章节素材'],
      ['演示要求：需求文档 6.2/6.3'],
      ['演示脚本全程计时 ≤ 5 分钟','真机/模拟器均可完成全流程'],
      ['演示脚本定稿 + 演示数据'],
      ['演示数据与 B 协同准备（走注册/挂号真实流程生成）']],
    ['答辩日','全局','App 全流程现场演示通过',
      ['演示脚本与数据就绪'],
      ['App 全流程现场演示（主操）；协助回答前端问题'],
      [],
      ['演示无卡顿、无报错'],
      [],
      ['全员']],
  ],
},
};

// ============ 渲染 ============
const pad = n => String(n).padStart(2, '0');
const list = (arr, mark) => arr.map(x => (mark === 'box' ? '- [ ] ' : mark === 'num' ? '' : '- ') + x).join('\n');

function dayDoc(m, key, i) {
  const [t, s, goal, pre, tasks, ct, dod, out, al] = m.days[i];
  const kp = (KP[key] || [])[i] || ['复述今日实际完成的工作与理由'];
  const nn = pad(i + 1);
  const [date, week] = DATES[i + 1];
  const prev = i > 0 ? `D${pad(i)}-${m.days[i - 1][0]}.md` : null;
  const next = i < 9 ? `D${pad(i + 2)}-${m.days[i + 1][0]}.md` : null;
  const nav = [prev ? `[← 上一份](${prev})` : '', '[目录规则](AGENTS.md)', next ? `[下一份 →](${next})` : ''].filter(Boolean).join(' · ');
  return `# ${m.title} · 第 ${i + 1} 天：${t}

| 项 | 内容 |
| --- | --- |
| 日期 | ${date}（${week}） |
| 关联故事 | ${s} |
| 当日主题 | ${t} |
| 契约依据 | 《项目拆解设计说明书》第 4/6/7 章 · db/init.sql · db/mock-data.md |

## 1. 当日目标

${goal}。

## 2. 前置条件（开工前逐项确认）

${list(pre.length ? pre : ['无特殊前置，按计划开工'])}

## 3. 任务清单（按序执行）

${tasks.map((x, idx) => `${idx + 1}. ${x}`).join('\n')}

## 4. 涉及契约（表 / 接口 / Key）

${list(ct.length ? ct : ['当日不涉及契约文件改动'])}

### 当日 DTO 速览（权威定义：db/dto-contract.md，与本表同源生成；冲突以契约文件为准并提对齐，禁止私自加改字段）

${dtoBlock((DAY_DTO[key] || [])[i] || [])}

## 5. 自测清单（DoD，完成打勾）

${list(dod, 'box')}

## 6. 产出物

${list(out.length ? out : ['无独立产出物，过程性提交'])}

## 7. 今日对齐点（涉及契约必读 AGENTS.md 铁律）

${list(al.length ? al : ['无'])}

## 8. 契约变更记录（涉 DDL / 接口结构 / 接口路径时必填，先对齐再动手）

| # | 时间 | 变更内容（DDL/接口结构/路径） | 影响成员 | 对齐状态 |
| --- | --- | --- | --- | --- |
|  |  |  |  | ☐ 未对齐 / ☑ 已对齐 |

## 9. 答辩积累区（每日收工前必填，AGENTS.md 规则六/七；第 9 天汇总为答辩讲稿与问题库素材）

### a. 今日知识卡片（当日结束时你应能脱稿讲清以下点；「我的理解」必须自己写，不许 AI 代写）

| 技术点（当日预填） | 我的理解（自己写一两句） | 对应代码/文件 | 预判老师追问 |
| --- | --- | --- | --- |
${kp.map(k => `| ${k} |  |  |  |`).join('\n')}

### b. 今日最有讲头的问题（从 exception-day${nn}/ 的 issue 中挑 1 条，浓缩成一句话答辩素材；无 issue 则填「今日无」）

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

${nav}
`;
}

function memberAgents(m, key) {
  const isFE = key === 'c' || key === 'd';
  return `# AGENTS.md · ${m.title} 工作规则

> 本文件对本目录所有文档生效，供本人与 AI 编程助手（ZCode/Claude 等）共同遵守。执行本目录任何任务前，先读完本文件。

## 1. 角色卡

- **角色**：${m.title}
- **职责**：${m.role}
- **关联故事**：${m.storyLine}
- **契约文档**（本目录外，只读，变更走铁律）：根目录《需求分析说明书》《项目拆解设计说明书》《任务分工说明书》、db/init.sql、db/mock-data.md

## 2. 本目录文件

- \`AGENTS.md\`：本规则文件
- \`D01-*.md\` … \`D10-*.md\`：逐天工作计划（每日开工先读当日文档，收工更新 DoD 勾选与变更记录）
- \`plans/\`：编码计划（Plan）归档目录（见规则三）
- \`exception-dayNN/\`：当日错误与困难记录目录（见规则五，当日首次遇到错误时创建）

## 3. 协作节奏

- 09:00 站会；每日 Git 提交（feat:/fix:/optimize:）；21:00 前完成**本人日报**（规则九：AI 先确认当前成员身份，仅汇总本人 exception-day{NN}/ 产出至本成员目录 D{NN}-日报.md，每条错误 ≤100 字）；轮值成员再合并四份入 doc/daily/
- 第 2 天 15:00 接口评审会全员必到；缺陷清单当日反馈、当日响应

## 4. 每日工作流规则（AI 助手必须逐条执行）

${workflowRules(`| ${m.title} | | | |`)}
${isFE ? FE : ''}## ${isFE ? 6 : 5}. 契约变更三条铁律（AI 助手必须主动提醒，未对齐前不得动手改契约）

${IRON}

## ${isFE ? 7 : 6}. 本角色专属注意事项

${m.notes.map(x => '- ' + x).join('\n')}
`;
}

const rootAgents = `# AGENTS.md · 东软云医院挂号预约系统（项目根）

> 对整个仓库生效。任何 AI 助手在本仓库内工作，必须先遵守本文件；进入 member-* 子目录还须遵守该目录的 AGENTS.md。

## 1. 项目与目录

东软云医院挂号预约系统（四人小组 · 实训 10 天 · 后端 Spring Boot 3.1.5 + MyBatis-Flex + MySQL + Redis，患者端 HarmonyOS，管理端 Vue3）。

\`\`\`
neusoft-his/
├── AGENTS.md                 # 本文件（全局规则）
├── README.md                 # 目录与使用说明
├── 需求分析说明书.md          # S1–S12 需求来源（只读基准）
├── 项目拆解设计说明书.md      # 架构/技术栈基线/接口契约/DDL（V1.3）
├── 任务分工说明书.md          # 四人分工概览
├── db/
│   ├── init.sql              # ★ 数据契约：DDL 定稿 + 种子数据
│   ├── dto-contract.md       # ★ DTO 契约：全部 ReqDto/RespDto 字段/类型/校验
│   └── mock-data.md          # ★ 前端 mock 数据契约（字段=接口DTO，取值=种子数据）
├── member-a|b|c|d/           # 每人 10 份逐天工作计划 + 各自 AGENTS.md + plans/ 编码计划归档
├── doc/                      # ui（页面设计稿+UI规范）/ api 导出 / daily 日报 / screenshots 截图
└── tools/                    # 文档生成脚本（gen-day-plans.mjs）
\`\`\`

## 2. 协作模式（契约先行 → mock 并行 → 联调）

1. **数据先行**：db/init.sql 定稿（六表 + 种子数据），db/mock-data.md 与其一一对应；
2. **前后端并行**：前端只用 mock-data.md 开发，不等待后端；后端按《项目拆解设计说明书》第 4 章实现；
3. **后期联调**：第 5–6 天切真实接口，缺陷走清单当日闭环；
4. 一切顺畅的前提是**契约不被单方面改动**——见第 5 节铁律。

## 3. 每日工作流规则（AI 助手必须逐条执行）

${workflowRules(['| 后端仓库（A/B 使用） | | | |', '| vue-admin 管理端（C 使用） | | | |', '| HarmonyOS 患者端工程（D 使用） | | | |'].join('\n'))}

## 4. 契约变更三条铁律（AI 助手必须主动提醒，未对齐前不得动手改契约）

${IRON}

## 5. 公共规范

- Git：master 受保护，dev 日常集成，feature/* 按日拉特性分支（命名见第 3 节规则一）；commit 前缀 feat:/fix:/optimize:
- 每日站会 09:00；日报 21:00 前：各成员按第 3 节规则九生成**个人日报**（AI 先确认当前成员身份 → 仅汇总其本人 exception-dayXxx/ → 产出到本成员目录，每条错误 ≤100 字，禁止编造）；轮值成员合并四份为 doc/daily/D{NN}-日报.md
- 第 2 天 15:00 接口评审会是契约基线点：会后任何契约改动都必须走三条铁律
- 错误与困难当日记录至各成员目录 \`exception-dayXxx/\`（第 3 节规则五）；前端（C/D）另有专属规则：ZCode 模型须为 **glm-5.3-flash**（否则提醒用户切换）、实时打开浏览器自查样式与流程、问题必须截图，见 member-c / member-d 的 AGENTS.md 第 5 节
- **答辩防线（第 3 节规则六/七 + 日计划第 9 节「答辩积累区」）**：AI 编码必须逐段讲解、成员能复述当日核心改动（2 分钟版）才算完成；演示素材当日入 doc/screenshots/，第 9 天各成员汇总本人日计划的答辩积累区，生成答辩讲稿与问题库素材
- **接口一致性防线（第 3 节规则八 + 日计划第 10 节「接口一致性对照表」）**：AI 编码接口必须"编码前复述契约 → 逐字对照 → 编码后输出对照清单"；联调冲突以契约为唯一裁决依据，谁偏离契约谁改，严禁前端私自做字段映射适配
`;

const readme = `# 东软云医院挂号预约系统 · 项目根目录

四人小组实训项目：文档协作工作区 + **AI 辅助开发工作台**（代码仓库后续也以此目录为根）。本 README 回答两个问题：**文档体系怎么用**、**如何用 AI 工具把本项目快速开发出来**。

## 1. 目录结构

| 路径 | 内容 |
| --- | --- |
| \`需求分析说明书.md\` | S1–S12 用户故事与验收标准（需求基准） |
| \`项目拆解设计说明书.md\` | 架构演进、技术栈基线（1.4 硬性前提）、接口契约（第 4 章）、DDL（第 6 章）、Redis/MQ（第 7 章） |
| \`任务分工说明书.md\` | 四人分工概览与里程碑责任人 |
| \`db/init.sql\` | **数据契约（V2.2）**：六表 DDL + 种子数据；六表齐备 delmark，3 唯一键 + 6 CHECK 约束 |
| \`db/dto-contract.md\` | **DTO 契约**：全部接口请求/响应字段、类型、校验（脚本生成，防漂移的唯一权威） |
| \`db/mock-data.md\` | **mock 契约**：前端并行开发的唯一 mock 数据来源（字段=DTO，取值=种子数据） |
| \`doc/ui/\` | **页面设计稿与 UI 统一规范**：鸿蒙端（9 页）/ 管理端（3 模块）每页线框、元素-字段映射、五态与跳转（视觉令牌基准） |
| \`member-a/b/c/d/\` | 每人 10 份逐天工作计划（D01–D10）+ 各自 \`AGENTS.md\` 规则 + \`plans/\` 编码计划 + \`exception-dayNN/\` 踩坑记录 |
| \`doc/\` | ui（页面设计稿 + UI 规范）/ api（接口文档导出）/ daily（日报）/ screenshots（答辩截图素材） |
| \`tools/\` | \`gen-day-plans.mjs\` 文档生成脚本（改计划/规则后重跑即全量同步） |

## 2. 五分钟看懂本项目

- **做什么**：医院挂号预约——患者端（鸿蒙 App）+ 管理端（Vue3）+ 后端（SpringBoot 3.1.5 + MyBatis-Flex + MySQL + Redis），覆盖 S1–S12 用户故事；
- **契约体系**：init.sql（表）+ dto-contract.md（字段）+ mock-data.md（数据）+ 拆解文档第 4 章（路径）——**这是 AI 写代码时唯一可信的字段来源，AI 不得凭记忆编造**；
- **四个人**：A 组长后端（骨架/挂号域/Redis）、B 后端（用户域+医院域+数据库）、C Vue 管理端、D 鸿蒙患者端；
- **节奏**：契约先行 → 前后端 mock 并行（D1–D4）→ 切真实接口联调（D5–D6）→ 扩展与答辩（D7–D10）。

## 3. 如何用 AI 工具快速开发（零基础照做即可）

### 3.1 一次性准备（Day 1，每人 10 分钟）

1. 用 ZCode 等 AI 编程工具**打开本目录**——根 \`AGENTS.md\` 自动生效（九条工作流规则 + 契约三条铁律）；
2. **进入自己的成员目录**（member-a/b/c/d），目录级 \`AGENTS.md\`（角色卡 + 专属红线）自动叠加生效；
3. 前端 C/D 另有 F1–F3 前端规则（模型 glm-5.3-flash、实时打开浏览器看页面、问题必截图）；
4. 首次让 AI 编码时，它会按**规则四**询问你的代码工程路径——回答一次即写入登记表，此后免问。

### 3.2 每日标准循环（开工第一句话照抄）

> 「读 member-x/AGENTS.md 与今日 D{NN} 文档，按计划开工：先建今日特性分支（feature/x-D{NN}-主题），复述今日任务与涉及契约，然后出编码 Plan 给我审核」

之后 AI 会自动走完整条流水线：

**Plan 待你批准（规则二）→ 契约绑定编码：动手前先复述 dto-contract.md 对应字段（规则八）→ 逐段讲解代码（规则六，你要能复述）→ Apifox 实测并与 mock-data.md 逐字段 diff → 填日计划第 10 节对照表**。

收工对 AI 说：「**生成本人今日日报**」（规则九：自动汇总你 exception-day{NN}/ 的踩坑，每条 ≤100 字，产出到你的目录）。

### 3.3 高频指令速查（复制即用）

| 场景 | 直接对 AI 说 |
| --- | --- |
| 开工 | 读 AGENTS.md 与今日 D{NN}，建特性分支并出 Plan |
| 写后端接口 | 按 db/dto-contract.md 的 {DTO 名} 实现，编码前先复述字段，完成后 Apifox 实测并与 mock 逐字段 diff |
| 写前端页面 | 用 db/mock-data.md 的字段与取值写页面；类型集中定义在 src/api/（或 common/api/），禁止组件里手写字段 |
| 联调对不上 | 与契约逐字段比对，谁偏离契约谁改；严禁前端做映射适配 |
| 踩坑了 | 按模板记录到 exception-day{NN}/issue-XX.md（截图一并归档） |
| 答辩准备 | 汇总我 D01–D09 的答辩积累区，生成我的答辩讲稿与预判追问 |

### 3.4 AI 红线（AI 会主动提醒，违反即停）

- 未经全组对齐，**不改** db/init.sql、dto-contract.md、mock-data.md、接口路径（三条铁律：DDL / 结构 / 路径变更必须先对齐再动手）；
- **不凭记忆编造**字段、类型、路径、价格——上下文没有契约原文时必须先向你要；
- 不在 dev / master 直接编码；**不出 Plan 不编码**；
- 前端不自造字段；挂号费用只信接口返回的 \`registerFee\`（后端职称映射：主任 30 / 副主任 20 / 主治 15，前端不建价格表）;
- 代码写完你必须能用自己的话复述（讲不出 = 当日任务未完成，返场重讲）。

### 3.5 快速开发总路线（10 天）

| 阶段 | 天 | 关键动作 | 里程碑 |
| --- | --- | --- | --- |
| 契约与骨架 | 1–2 | 执行 init.sql 建库 → his-common 基础件 → JWT → 多模块拆分；**前端同时用 mock 开工，不等后端** | M1 骨架 / M2 全接口 |
| 全量功能 | 3–4 | 19 个接口全部上线；Redis 缓存/分布式锁/限流接入挂号 | M3 高并发生效 |
| 联调收口 | 5–6 | App 切真实接口；S4→S10 全流程真联通（录屏备份） | M4 全流程 |
| 扩展与交付 | 7–10 | AI 导诊 / RocketMQ（**可选，可整体放弃不影响验收**）→ JMeter 压测 → 答辩材料汇总 | M5 / M6 答辩 |

进度告急的取舍顺序：**主线 S1–S10 > 管理端联调 > 扩展专题**。每人第 9 天从日计划"答辩积累区"回收讲稿素材——答辩材料是每天攒的，不是最后赶的。

## 4. 新人上手路径（第一天必做）

1. 读根目录 \`AGENTS.md\`（契约三条铁律 + 九条工作流规则）；
2. 读《任务分工说明书》自己的章节 → 进入 \`member-x/\` 读 \`AGENTS.md\` 与 \`D01-*.md\`；
3. 前端另读 \`db/mock-data.md\`；后端另读《项目拆解设计说明书》1.4 技术栈基线与 \`db/init.sql\`。

## 5. 协作模式与变更纪律

契约先行（DDL + DTO + mock 定稿）→ 前后端 mock 并行（第 1–4 天）→ 切真实接口联调（第 5–6 天）→ 扩展与交付（第 7–10 天）。
**任何 DDL / 接口结构 / 接口路径的变更，必须先按 AGENTS.md 三条铁律完成全组对齐，再由 B 统一更新契约文件并重跑 \`node tools/gen-day-plans.mjs\` 同步全部文档。**
`;

// ============ 写文件 ============
let count = 0;
for (const [key, m] of Object.entries(PLAN)) {
  const dir = path.join(ROOT, m.dir);
  m.days.forEach((d, i) => {
    const name = `D${pad(i + 1)}-${d[0]}.md`;
    writeFileSync(path.join(dir, name), dayDoc(m, key, i), 'utf8');
    count++;
  });
  writeFileSync(path.join(dir, 'AGENTS.md'), memberAgents(m, key), 'utf8');
}
writeFileSync(path.join(ROOT, 'AGENTS.md'), rootAgents, 'utf8');
writeFileSync(path.join(ROOT, 'README.md'), readme, 'utf8');
writeFileSync(path.join(ROOT, 'db', 'dto-contract.md'), dtoContract, 'utf8');
console.log(`OK: ${count} day docs + 4 member AGENTS + root AGENTS + README + db/dto-contract.md`);
