# issue-05-Flex-insert全字段插入导致create_time非空报错
- 时间：2026-09-11 21:25
- 场景：S8 正常挂号实测（POST /registrations），扣号成功后落库 insert 抛异常，事务回滚（left_quota 未变，验证回滚生效）
- 错误信息原文：`Caused by: java.sql.SQLIntegrityConstraintViolationException: Column 'create_time' cannot be null`（INSERT INTO appointment_record 含 create_time 列）
- 原因分析：MyBatis-Flex 1.8.8 的 `insert(entity)` 是**全字段插入**（null 值也拼进 SQL），把实体的 createTime=null 显式写进 NOT NULL DEFAULT CURRENT_TIMESTAMP 列报错；拆解文档 6.4「Flex insert 默认忽略 null 列」的口径与框架实际行为不符；B 在 AuthServiceImpl 已踩过同一坑并注释「用 insertSelective」
- 解决方案：落库改用 `appointmentRecordMapper.insertSelective(record)`（跳过 null 列，createTime/delmark 交数据库默认值），与 B 的既有写法对齐，并补讲解性注释
- 验证结果：重编译重启后 S8 正常（详见实测记录）
- 是否涉契约：否（框架行为认知修正；建议在《项目拆解设计说明书》6.4 修订该句口径——随下次文档变更一并提出，不阻塞当前联调）
