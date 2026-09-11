# issue-04-Windows-mysql客户端导入UTF-8脚本中文乱码
- 时间：2026-09-11 20:58
- 场景：`mysql -uroot -p123456 < db/init.sql` 导入初始化脚本（Git Bash + Windows MySQL 8.0 客户端）
- 错误信息原文：`ERROR 1064 (42000) at line 40: ... near 'COMMENT '璐﹀彿鐘舵?鏋氫妇绾︽潫锛圴2.4锛? ...'`（中文注释呈 GBK 乱码，且乱码吃掉行尾引号语法结构）
- 原因分析：Windows 下 mysql 客户端默认字符集跟随系统 GBK，按 GBK 读取 UTF-8 编码的 init.sql，中文注释/枚举值乱码并破坏 SQL 语法
- 解决方案：导入时显式指定客户端字符集：`mysql --default-character-set=utf8mb4 ... < init.sql`
- 验证结果：✅ 乱码消除（报错信息中中文恢复正常显示，转入 issue-03 的真正语法问题）；导入成功后种子中文值（科室/职称/时段）回查正常
- 是否涉契约：否（环境问题，脚本本身编码正确）
