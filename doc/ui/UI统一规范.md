# UI 统一规范（鸿蒙患者端 + Web 管理端）

| 项目 | 内容 |
| --- | --- |
| 文档版本 | V1.1（2026-09-09：3.2 补管理端 M5 登录页与 M6 统计大屏布局规范；新增 3.4 图表用色规范，全部复用既有 EP 令牌，不新增色值） |
| 编写日期 | 2026-09-08（V1.1：2026-09-09） |
| 适用对象 | 前端 C（Vue 管理端）、前端 D（鸿蒙患者端） |
| 上游契约 | db/dto-contract.md（字段）、db/mock-data.md（取值与文案）、《项目拆解设计说明书》第 4 章（接口） |
| 配套设计稿 | doc/ui/鸿蒙端页面设计稿.md、doc/ui/管理端页面设计稿.md（V1.2 含 M5/M6） |

---

## 1. 全局设计原则（两端通用，AI 编码时逐条遵守）

1. **契约驱动**：页面展示的每一个字段、每一段文案（错误提示、枚举值）都来自 db/mock-data.md 与 db/dto-contract.md；**禁止自造字段、自造文案、自建价格/编码映射**（挂号费只用接口返回的 `registerFee`；职称/时段/性别/状态为中文直传，直接展示）；
2. **五态完备**：每个页面必须设计并实现 5 种状态——**加载中（loading/骨架）、空态、错误态、正常、禁用项**（如已约满时段），缺一态视为未完成（联调时最容易漏的就是空态与错误态）；
3. **错误反馈统一**：业务错误（HTTP 200 但 code≠200）→ Toast/Message 展示后端 `message` 原文；**网络异常 → 固定文案「网络连接异常，请检查网络」**；HTTP 401 → 清除登录态并跳登录页（管理端为提示页）；
4. **二次确认**：一切不可逆/重要操作（取消挂号、删除科室/医生）必须有确认弹窗，确认按钮用危险色；
5. **禁用优先于隐藏**：不可用的操作（已满时段、按钮缺参）用**置灰+不可点**表达，而不是藏起来（用户需要知道"为什么不能点"）；
6. **不重复造轮子**：鸿蒙用 ArkUI 内置组件（TextInput/Button/Dialog/Toast 等），管理端一律用 Element Plus 现成组件与默认令牌；自造样式仅限本规范定义的令牌范围；
7. **零基础实现口径**：先保证**布局正确 + 状态齐全 + 数据正确**，再打磨视觉；不允许为视觉细节阻塞联调。

## 2. 鸿蒙患者端设计令牌（ArkUI，单位 vp/fp）

### 2.1 色彩

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| primary | `#1677FF` | 主按钮、链接、选中态、可点图标 |
| primary-light | `#E6F4FF` | 职称标签底、选中卡片描边底 |
| success | `#52C41A` | 成功图标（挂号成功）、号源充足 |
| warning | `#FA8C16` | 号源紧张（≤10）、「待就诊」标签 |
| danger | `#FF4D4F` | 错误提示、删除/取消类确认按钮 |
| disabled-text | `#BFBFBF` | 已满时段文字 |
| disabled-bg | `#F5F5F5` | 禁用按钮/卡片背景 |
| page-bg | `#F5F6F8` | 页面背景 |
| card-bg | `#FFFFFF` | 卡片背景 |
| divider | `#EDEDED` | 分割线 |
| text-primary | `#262626` | 主文本 |
| text-secondary | `#595959` | 次要文本 |
| text-tertiary | `#8C8C8C` | 辅助/占位文本 |

### 2.2 字体（HarmonyOS Sans）

| 层级 | 字号/字重 | 用途 |
| --- | --- | --- |
| 页面大标题 | 20fp / Bold | 登录注册页系统名 |
| 页内标题 | 18fp / Medium | 顶栏标题、卡片标题 |
| 正文 | 16fp / Regular | 列表主文本、表单输入 |
| 辅助 | 14fp / Regular | 次要信息（简介、快照、订单号） |
| 标签 | 12fp / Medium | 分类标签、状态标签 |

### 2.3 布局与形状

| 令牌 | 值 |
| --- | --- |
| 页面左右边距 | 16vp |
| 卡片内边距 | 16vp；卡片间距 12vp；列表项内边距 12vp |
| 圆角 | 卡片 12vp / 按钮 24vp（胶囊）/ 弹窗 16vp / 标签 4vp |
| 主按钮 | 通栏宽 × 40vp 高，primary 底白字；禁用态 disabled-bg + disabled-text |
| 次按钮 | 白底 primary 描边 |
| 顶栏 | 高 56vp，白底，左返回箭头，中标题 |
| 点击态 | 透明度 0.8（按压反馈） |

### 2.4 文案与反馈规范（鸿蒙）

| 场景 | 文案 / 行为 | 来源 |
| --- | --- | --- |
| 业务错误 | Toast 后端 `message` 原文（如「用户名已存在」） | code≠200 |
| 网络异常 | 固定文案「网络连接异常，请检查网络」 | 请求失败 |
| 未登录 | 清 Token → 跳登录页（withLogin 守卫） | HTTP 401 |
| 空态文案 | 「暂无排班」「暂无就诊人」「暂无挂号记录」（居中，辅助色+占位图） | 空数组 |
| 二次确认 | AlertDialog：标题=动作名，正文说明后果（如「取消后号源将释放」），取消=白底、确认=danger | 取消挂号等 |
| 成功提示 | Toast「注册成功 / 添加成功 / 取消成功」等后端 message | code=200 且有文案 |

## 3. Web 管理端设计令牌（Element Plus 默认令牌，不自造色值）

### 3.1 色彩与文本（直接使用 EP 变量，不写死十六进制）

| 用途 | EP 令牌 |
| --- | --- |
| 主色（链接、主按钮、选中） | `--el-color-primary`（#409EFF） |
| 成功 / 警告 / 危险 | `--el-color-success / warning / danger` |
| 主文本 / 常规 / 次要 | `--el-text-color-primary / regular / secondary` |
| 边框 / 填充 | `--el-border-color`、`--el-fill-color-light` |

### 3.2 布局

| 区域 | 规范 |
| --- | --- |
| 侧边栏 | 宽 220px，浅色底（`--el-fill-color-light`），el-menu 竖向：科室管理 / 医生管理 / 统计大屏（V1.1 新增第三项，/admin/dashboard） |
| 顶栏 | 高 56px，白底，左侧系统名「东软云医院管理端」 |
| 内容区 | padding 16px；页头（标题 + 操作按钮同行）→ 表格卡片 → 分页右下 |
| 表格 | stripe 斑马纹；表头底 `--el-fill-color-light`；**操作列固定右侧**（编辑=primary 文字钮、删除=danger 文字钮）；长文本列（简介/擅长）`show-overflow-tooltip` |
| 分页 | el-pagination 右对齐：total / sizes(10,20,50) / prev-next；翻页保持筛选参数 |
| 表单弹窗 | Dialog 宽 520px；label 宽 100px 右对齐；必填红星由 rules 驱动；底部取消+确定（确定 loading 防重复提交） |
| 删除确认 | `ElMessageBox.confirm('删除后前台将不可见，是否继续？', '删除确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })` |
| 登录页（M5，V1.1） | 独立页无侧边栏/顶栏；页面底 `--el-fill-color-light` 系浅灰；登录卡片 400px 宽水平居中（白底圆角 8 + 阴影）；Logo 48×48 primary 块；输入框 40px 高带左侧图标；错误态=输入框 danger 描边 + 行内 danger 红字（非 Message 弹出）；主按钮通栏 40px |
| 统计大屏（M6，V1.1） | 沿用侧边栏+顶栏框架；内容区卡片网格（KPI 行 → 折线+时段 → 柱状+条形+占比/动态），卡间 16px；卡片=白底 + border-color 描边 + 圆角 4；每卡 loading / 失败与空数据 el-empty |

### 3.3 文案与反馈规范（管理端）

| 场景 | 行为 |
| --- | --- |
| 业务错误 | `ElMessage.error(message)`（后端 message 原文）；M5 登录 1002 除外——行内红字+红框 |
| 操作成功 | `ElMessage.success(message)` 后刷新列表/关闭弹窗 |
| 网络异常 | `ElMessage.error('网络连接异常，请检查网络')` |
| HTTP 401 | `ElMessage.warning('登录已失效')` → 清 token → 跳 /login（V1.1 起管理端自带登录页，原"提示页"方案废弃） |
| 空态 | el-empty（表格 data 为空自带；M6 图表卡同） |

### 3.4 图表用色（M6 统计大屏，V1.1 新增）

> 全部复用 3.1 既有 EP 令牌，**不自造色值、不引入深色大屏主题**（大屏与管理端同框架同浅色）。

| 图表元素 | 令牌 |
| --- | --- |
| 折线 / 主柱体 / 条形 / KPI 主图标底 | `--el-color-primary`（线宽 2.5px；面积填充 primary 10% 透明） |
| 语义分组（时段下午/职称副主任/环比↑） | `--el-color-success` |
| 语义分组（职称主治） | `--el-color-warning` |
| 环比下降 / 今日取消 | `--el-color-danger` |
| 图标淡色底 | 对应语义色 `-light`（primary-light / success-light / warning-light / danger-light） |
| 网格线 / 条形槽 / 进度条槽 | `--el-border-color-light`、`--el-fill-color-light` |
| 轴刻度 / 数值标签 / 口径说明 | `--el-text-color-secondary` |
| 图表主数值 / TOP3 名次 | `--el-text-color-primary` / `--el-color-primary` |

## 4. 通用页面状态矩阵（两端对照，验收逐页勾选）

| 状态 | 鸿蒙端 | 管理端 | 触发 |
| --- | --- | --- | --- |
| 加载中 | LoadingProgress / 骨架占位 | v-loading 指令 | 请求发出 |
| 空态 | 居中占位图 + 空态文案 | el-empty | data 为空数组 |
| 业务错误 | Toast message | ElMessage.error | code≠200 |
| 网络错误 | 固定文案 Toast + 可重试 | ElMessage.error | 请求 reject |
| 正常 | 列表/表单渲染 | 表格渲染 | code=200 |
| 禁用项 | 置灰不可点（已满时段、按钮缺参） | 按钮disabled | 业务规则 |

## 5. 视觉产出物约定

- 本规范 + 两份页面设计稿（ASCII 低保真线框 + 交互说明）即为**设计基准**；如需高保真，可用即时设计/Figma 按本文令牌制作，但**布局结构、状态、字段不得偏离设计稿**；
- 页面验收 = 设计稿的"元素-字段映射"逐条对照 + 第 4 节状态矩阵逐项演示（空态/错误态用 Apifox mock 与断网模拟触发）；
- 设计稿与契约冲突时：**字段以 dto-contract.md 为准，文案以 mock-data.md 为准，路径以拆解文档第 4 章为准**，并按 AGENTS.md 铁律提起对齐。
