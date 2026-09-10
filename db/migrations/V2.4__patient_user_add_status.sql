-- ============================================================
-- 迁移脚本 · V2.4  patient_user 新增 status 列（账号封禁）
-- 日期：2026-09-10    作者：B（组长 A 发起，铁律一对齐后落稿）
-- 关联：dto-contract V1.5 / mock-data V2.5 / 拆解文档 V1.11（4.6.2 患者管理）
-- 背景：管理端 M7 患者管理支持封禁/解封；封禁账号登录 → 1003
-- 说明：本脚本供【已按 init.sql V2.3 及更早版本建库】的环境增量升级；
--       全新环境直接执行 db/init.sql（V2.4 全量基线，已含此列）即可，无需本脚本。
-- ⚠️ 自 V2.4 起 DDL 变更一律走本目录独立脚本，不再直接修改 init.sql（见 AGENTS.md 铁律一）
-- ============================================================

-- 正向：新增 status 列（存量行默认「正常」）
ALTER TABLE `patient_user`
  ADD COLUMN `status` varchar(20) NOT NULL DEFAULT '正常' COMMENT '账号状态：正常 / 已封禁（V2.4；封禁后登录→1003）' AFTER `register_time`,
  ADD CONSTRAINT `chk_user_status` CHECK (`status` IN ('正常','已封禁'));

-- 回滚（如需回退，取消注释执行）：
-- ALTER TABLE `patient_user` DROP CONSTRAINT `chk_user_status`;
-- ALTER TABLE `patient_user` DROP COLUMN `status`;
