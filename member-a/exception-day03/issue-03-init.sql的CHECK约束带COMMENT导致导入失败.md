# issue-03-init.sql的CHECK约束带COMMENT导致导入失败
- 时间：2026-09-11 21:00
- 场景：本地空库按标准路径初始化（`db/init.sql` V2.4 全量基线，为 D03 联调自测准备数据）
- 错误信息原文：`ERROR 1064 (42000) at line 40: You have an error in your SQL syntax; ... near 'COMMENT '账号状态枚举约束（V2.4）'`
- 原因分析：MySQL 8.0 的 CHECK 约束语法为 `[CONSTRAINT [symbol]] CHECK (expr) [[NOT] ENFORCED]`，**不支持 COMMENT 子句**；init.sql 共 8 处 `CHECK (...) COMMENT '...'`（chk_user_status/chk_title/chk_segment/chk_quota/chk_gender/chk_order_status/chk_fee 等，V2.1/V2.4 引入）——首次在任何 MySQL 8.0 全新环境执行该文件必然失败，"init.sql → migrations"标准初始化路径被阻断；此前各成员本地库应是旧版脚本建的，未暴露
- 解决方案：**不改契约文件**（init.sql 已定格，铁律一禁止直改）。本地造临时副本 `sed` 剥离 8 处 CHECK 后的 ` COMMENT '...'` 子句（约束语义零变化，仅去元数据），用副本完成本地导入与 D03 自测；契约修复（删 COMMENT 或改用 COMMENT 等价手段）走铁律一对齐，由契约负责人更新
- 验证结果：临时副本导入成功，六表+种子齐备（详见后续验证输出）；正式修复待对齐
- 是否涉契约：**是（DDL 契约文件缺陷）→ 提请铁律一对齐**：请与后端 A、B 及前端 C、D 对齐修复方案，由契约负责人更新 init.sql（或按迁移规则出修正脚本），并同步《项目拆解设计说明书》6.3
