-- ============================================================
-- 迁移脚本 · V2.5  新增站内信表 site_message
-- 日期：2026-09-10    作者：B（组长 A 发起，铁律一对齐后落稿；B 站会终审）
-- 关联：dto-contract V1.6 / mock-data V2.6 / 拆解文档 V1.12（4.9 站内信接口组、7.3 MQ 转正）
-- 背景：MQ 异步通知（挂号成功/挂号已取消）+ 管理端群发系统公告 → 消费者/群发逻辑落库本表
-- 适用：已按 init.sql V2.4 建库的环境增量升级；全新环境跑完 init.sql 后按版本号顺序执行本脚本
-- ============================================================

-- 正向：建站内信表
CREATE TABLE `site_message` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `user_id` bigint NOT NULL COMMENT '接收患者账号id，patient_user.id；群发公告按用户逐行落库',
  `title` varchar(100) NOT NULL COMMENT '消息标题',
  `content` varchar(500) NOT NULL COMMENT '消息正文',
  `msg_type` varchar(20) NOT NULL DEFAULT '系统通知' COMMENT '消息类型：挂号成功 / 挂号已取消 / 系统通知（中文直传）',
  `order_no` varchar(32) NULL COMMENT '关联订单号（业务通知填 appointment_record.order_no；系统公告为 NULL）',
  `is_read` tinyint NOT NULL DEFAULT '0' COMMENT '已读标记：0未读，1已读',
  `read_time` datetime NULL COMMENT '阅读时间（标记已读时写入）',
  `delmark` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除标记：0正常，1已删除（本期无删除接口，全库口径统一预留）',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '消息产生时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_read` (`user_id`,`is_read`) COMMENT '未读数统计与未读列表索引',
  KEY `idx_user_create` (`user_id`,`create_time`) COMMENT '按用户查消息列表（倒序）索引',
  CONSTRAINT `chk_msg_type` CHECK (`msg_type` IN ('挂号成功','挂号已取消','系统通知')) COMMENT '消息类型枚举约束（V2.5）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='站内信表（V2.5 新增：MQ 异步通知 + 管理端群发公告）';

-- 回滚（如需回退，取消注释执行）：
-- DROP TABLE IF EXISTS `site_message`;
