-- ============================================================
-- 东软云医院挂号预约系统 · 数据库初始化脚本（DDL 定稿 V2.3）
-- 契约级别：本文件是全组唯一数据契约（表结构 + 种子数据）
--   来源：cloud_hospital.sql 定稿 + 2026-09-08 安全审查修复（全组对齐）
--   ⚠️ 任何修改必须先全组对齐（见根目录 AGENTS.md 铁律一）
--   ⚠️ 前端 mock 数据必须与种子数据一致（db/mock-data.md）
-- 库名：neusoft_hospital（utf8mb4_unicode_ci）
-- V2.1 审查修复项（相对 cloud_hospital.sql 原稿）：
--   ① schedule 增加 (doctor_id, work_date, time_segment) 唯一键（防重复排班/扣号错行）；
--   ② appointment_record 新增 doctor_id / schedule_id 列（取消挂号直达回补，不依赖姓名反查）；
--   ③ title / time_segment / gender / status 增加 CHECK 枚举约束（MySQL 8.0.16+ 生效，防脏数据）；
--   ④ left_quota 增加 >=0 且 <=total_quota 的 CHECK（数据库层兜底超卖）。
-- V2.2 调整（全组对齐）：
--   ⑤ schedule / appointment_record 补齐 delmark——逻辑删除是防数据丢失的统一手段，六表齐备；
--     "不删除"的业务限制由后端代码层实现（订单不提供删除接口、排班过期靠时间窗过滤），
--     而不是靠表结构缺字段；删除医生的联动排班处理由"物理删除"改为"逻辑删除 delmark=1"。
-- V2.3 调整（2026-09-08 需求迭代·挂号流程改版，全组对齐）：
--   ⑥ dept 新增 parent_id：科室父子两级分类——父分类节点（内科/外科/妇儿/五官/皮肤/中医/其他，
--     种子 id 5–11）+ 子科室挂 parent_id（原 4 个子科室 id 1–4 保持不变）；仅两级，不允许孙级；
--   ⑦ 排班种子窗口由"未来 7 天(+1~+7)"扩为"当天 ~ +7 天"(n=0..7)，支撑当天挂号；
--     时段规则改为 id%4=3 下午、其余上午（心血管内科 id1/id2 均上午，演示"下午暂无号源"空态）；
--     设休息日 + 号源差异化取值，覆盖 充足/紧张/已满/休 四档演示（数值与 mock-data.md V2.3 一致）。
-- 执行方式：mysql -uroot -p < init.sql（或 source init.sql）
-- ============================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS neusoft_hospital
DEFAULT CHARACTER SET utf8mb4
DEFAULT COLLATE utf8mb4_unicode_ci;

USE neusoft_hospital;

-- 1、patient_user 患者账号表（S1 S2 S3 注册登录）
CREATE TABLE `patient_user` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `username` varchar(50) NOT NULL COMMENT '登录用户名，全局唯一',
  `password` varchar(100) NOT NULL COMMENT '加密后的密码，禁止明文存储',
  `register_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '账号注册时间',
  `delmark` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除标记：0正常，1已删除',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`) COMMENT '用户名唯一索引，防止重复注册'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='患者账号表';


-- 2、dept 科室表（S4 S11科室管理）
-- ⚠️ V2.3：父子两级分类——parent_id 为 NULL 即父分类节点（七类，种子 id 5–11），
--   子科室挂 parent_id；仅两级结构，不允许孙级；dept_category 冗余存父分类名称（后端维护，管理端列表直显）
CREATE TABLE `dept` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `dept_name` varchar(100) NOT NULL COMMENT '科室名称（父分类节点=分类名，如"内科"）',
  `dept_category` varchar(100) NOT NULL COMMENT '分类名称冗余：子科室=父分类名称，父分类节点=自身名称',
  `parent_id` bigint NULL COMMENT '父分类id，关联dept.id；NULL=自身为父分类节点（V2.3）',
  `dept_intro` varchar(500) NULL COMMENT '科室简介',
  `delmark` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除标记：0正常，1已删除',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`) COMMENT '按父分类查子科室索引（V2.3）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='科室信息表（父子两级）';


-- 3、doctor 医生表（S5 S12医生管理）
CREATE TABLE `doctor` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `dept_id` bigint NOT NULL COMMENT '所属科室id，关联dept.id，医生必须归属科室',
  `doctor_name` varchar(50) NOT NULL COMMENT '医生姓名',
  `title` varchar(30) NOT NULL COMMENT '职称：主任医师/副主任医师/主治医师',
  `skill` varchar(500) NULL COMMENT '擅长领域简介',
  `delmark` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除标记：0正常，1已删除',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_dept_id` (`dept_id`) COMMENT '根据科室id查询医生索引',
  CONSTRAINT `chk_title` CHECK (`title` IN ('主任医师','副主任医师','主治医师')) COMMENT '职称枚举约束（V2.1）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='医生信息表';


-- 4、schedule 排班表（S6查看医生排班）
-- ⚠️ 既定设计（拆解文档 6.5）：
--   ① 过期排班不主动删除：由"近 7 天"查询时间窗自然过滤（delmark 供逻辑删除使用，V2.2 补齐）；
--   ② 唯一键 uk_doctor_date_segment 防止同医生同天同时段出现两条排班
--      （重复排班会导致挂号条件更新各扣各的 → 超卖/回补错行）；
--   ③ 删除医生时，同事务将其未来排班逻辑删除（delmark=1，V2.2 起不再物理删除）。
CREATE TABLE `schedule` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `doctor_id` bigint NOT NULL COMMENT '医生id，关联doctor.id',
  `work_date` date NOT NULL COMMENT '出诊日期',
  `time_segment` varchar(10) NOT NULL COMMENT '出诊时段：上午 / 下午',
  `total_quota` int NOT NULL DEFAULT 0 COMMENT '该时段号源总数量',
  `left_quota` int NOT NULL DEFAULT 0 COMMENT '剩余可预约号源数量',
  `delmark` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除标记：0正常，1已删除',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_doctor_date_segment` (`doctor_id`,`work_date`,`time_segment`) COMMENT '医生+日期+时段唯一（V2.1），兼作按医生+日期查询索引',
  CONSTRAINT `chk_segment` CHECK (`time_segment` IN ('上午','下午')) COMMENT '时段枚举约束（V2.1）',
  CONSTRAINT `chk_quota` CHECK (`total_quota` >= 0 AND `left_quota` >= 0 AND `left_quota` <= `total_quota`) COMMENT '号源非负且不超总量（V2.1，兜底超卖）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='医生排班表';


-- 5、patient_member 就诊人表（S7添加就诊人，家庭代挂号）
CREATE TABLE `patient_member` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `patient_user_id` bigint NOT NULL COMMENT '归属患者账号id，关联patient_user.id',
  `member_name` varchar(50) NOT NULL COMMENT '就诊人姓名',
  `gender` varchar(10) NOT NULL COMMENT '就诊人性别',
  `id_card` varchar(18) NOT NULL COMMENT '身份证号码，前后端校验格式',
  `phone` varchar(11) NOT NULL COMMENT '就诊人手机号',
  `birthday` date NULL COMMENT '就诊人出生日期',
  `delmark` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除标记：0正常，1已删除',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_patient_user_id` (`patient_user_id`) COMMENT '查询当前账号下所有就诊人',
  CONSTRAINT `chk_gender` CHECK (`gender` IN ('男','女')) COMMENT '性别枚举约束（V2.1）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='就诊人（家庭成员档案）表';


-- 6、appointment_record 挂号订单记录表（S8 S9 S10挂号、查看记录、取消挂号）
-- ⚠️ 既定设计（拆解文档 6.5）：
--   ① V2.1 新增 doctor_id / schedule_id：取消挂号按 schedule_id 直达回补号源，
--      不再依赖姓名快照反查（医生改名不断链）；名称快照仅作历史展示；
--   ② 订单不提供删除接口（审计保留）——该限制由后端代码层实现（V2.2 口径），
--      表结构与其他表统一携带 delmark（防数据丢失的统一兜底）。
CREATE TABLE `appointment_record` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `order_no` varchar(32) NOT NULL COMMENT '挂号唯一订单号：时间戳+6位随机数字',
  `patient_user_id` bigint NOT NULL COMMENT '操作挂号的患者账号id，patient_user.id',
  `member_id` bigint NOT NULL COMMENT '就诊人id，patient_member.id',
  `doctor_id` bigint NOT NULL COMMENT '医生id，doctor.id（V2.1新增：业务关联/统计，防改名断链）',
  `schedule_id` bigint NOT NULL COMMENT '排班id，schedule.id（V2.1新增：取消挂号按此直达回补号源）',
  `dept_name_snap` varchar(100) NOT NULL COMMENT '科室名称快照，保存下单时刻信息',
  `doctor_name_snap` varchar(50) NOT NULL COMMENT '医生姓名快照，保存下单时刻信息',
  `work_date` date NOT NULL COMMENT '就诊日期',
  `time_segment` varchar(10) NOT NULL COMMENT '就诊时段：上午 / 下午',
  `register_fee` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '挂号费用（来源：按职称映射，见拆解文档6.5）',
  `status` varchar(20) NOT NULL COMMENT '订单状态：待就诊、已取消',
  `delmark` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除标记：0正常，1已删除（V2.2补齐；后端不提供删除接口）',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '挂号下单时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '订单更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`) COMMENT '订单号全局唯一索引',
  KEY `idx_patient_user_id` (`patient_user_id`) COMMENT '查询个人全部挂号记录索引',
  KEY `idx_schedule_id` (`schedule_id`) COMMENT '按排班回查/对账索引（V2.1）',
  CONSTRAINT `chk_order_status` CHECK (`status` IN ('待就诊','已取消')) COMMENT '订单状态枚举约束（V2.1）',
  CONSTRAINT `chk_fee` CHECK (`register_fee` >= 0) COMMENT '费用非负（V2.1）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='挂号订单记录表';

-- ============================================================
-- 种子数据（演示与前端 mock 的数据基准，取值须与 db/mock-data.md 一致）
-- 口径：title / time_segment / gender / status 直接存中文（V2.x 契约）
-- 挂号费口径：主任医师 30 / 副主任医师 20 / 主治医师 15（Service 层职称映射，见拆解文档 6.5）
-- ============================================================

-- 科室（V2.3 两级结构：7 个父分类节点 id 5–11 + 4 个子科室 id 1–4；id 1–4 取值不变，便于既有 mock/联调）
INSERT INTO `dept` (`id`,`dept_name`,`dept_category`,`parent_id`,`dept_intro`) VALUES
(1,'心血管内科','内科',5,'高血压、冠心病、心律失常等心血管疾病的诊断与治疗'),
(2,'消化内科','内科',5,'胃肠疾病、肝胆胰腺疾病的内镜诊疗与综合治疗'),
(3,'普通外科','外科',6,'普外科常见病、多发病的手术与综合治疗'),
(4,'儿科','妇儿',7,'儿童呼吸道、消化道常见病的诊疗与儿童保健'),
(5,'内科','内科',NULL,'内科系统疾病诊治（父分类节点）'),
(6,'外科','外科',NULL,'外科系统疾病诊治（父分类节点）'),
(7,'妇儿','妇儿',NULL,'妇儿疾病诊治（父分类节点）'),
(8,'五官','五官',NULL,'眼、耳鼻喉、口腔疾病诊治（父分类节点）'),
(9,'皮肤','皮肤',NULL,'皮肤与过敏性疾病诊治（父分类节点）'),
(10,'中医','中医',NULL,'中医辨证论治（父分类节点）'),
(11,'其他','其他',NULL,'其他科室（父分类节点）');

-- 医生（8 名，职称三档均有；建议姓名不重复——展示与选择友好，非数据库强制）
INSERT INTO `doctor` (`id`,`dept_id`,`doctor_name`,`title`,`skill`) VALUES
(1,1,'周建国','主任医师','冠心病、高血压及其并发症的综合治疗'),
(2,1,'吴敏','副主任医师','心律失常、心力衰竭的药物治疗'),
(3,2,'郑毅','主任医师','消化道早癌筛查、疑难肝病的诊治'),
(4,2,'王芳','主治医师','慢性胃炎、胃溃疡的规范化治疗'),
(5,3,'李强','副主任医师','腹腔镜微创手术、疝与腹壁外科'),
(6,3,'赵静','主治医师','体表肿物、外科感染与外伤处理'),
(7,4,'陈晓云','副主任医师','小儿肺炎、小儿腹泻的诊治'),
(8,4,'刘洋','主治医师','儿童保健与儿科常见病诊治');

-- 排班（V2.3 口径）：每名医生"当天 ~ +7 天"(n=0..7) 至多一条时段记录，支撑当天挂号与未来一周预约
--   日期用 CURDATE()+N 动态生成：任何时候重置库，当天与未来 7 天都有数据
--   时段：id%4=3 的医生下午出诊、其余上午——心血管内科（id 1、2）两名医生均上午，
--         演示当天挂号页"下午 · 暂无号源"分组空态
--   号源：按职称 主任 30 / 副主任 20 / 主治 15；下列差异化取值覆盖 充足/紧张/已满 三档演示
--     · n=0 且 id=2（吴敏当天）余 3 —— 紧张档（当天挂号页）
--     · n=3 且 id∈(1,2) 余 0       —— 心血管内科 +3 日全满（预约页日期条"已满"演示）
--     · id=1 且 n=2 余 3           —— 周建国 +2 日紧张档（预约页选中日演示）
--     · id=1 且 n=6 余 25          —— 周建国 +6 日
--   休息日：周建国休 n∈{4,5,7}、吴敏休 n∈{2,4,5,7} → 心血管内科 +4/+5/+7 日（以 09-08 为当天即
--           09-12/09-13/09-15）全科无排班，演示预约页日期条"休"态（日期状态由 GET /quotas/days 聚合）
--   每医生每天仅一条记录，满足唯一键 uk_doctor_date_segment
INSERT INTO `schedule` (`doctor_id`,`work_date`,`time_segment`,`total_quota`,`left_quota`)
SELECT d.`id`,
       CURDATE() + INTERVAL x.n DAY,
       CASE WHEN d.`id` % 4 = 3 THEN '下午' ELSE '上午' END,
       CASE d.`title` WHEN '主任医师' THEN 30 WHEN '副主任医师' THEN 20 ELSE 15 END,
       CASE WHEN x.n = 0 AND d.`id` = 2 THEN 3
            WHEN x.n = 3 AND d.`id` IN (1,2) THEN 0
            WHEN d.`id` = 1 AND x.n = 2 THEN 3
            WHEN d.`id` = 1 AND x.n = 6 THEN 25
            ELSE CASE d.`title` WHEN '主任医师' THEN 30 WHEN '副主任医师' THEN 20 ELSE 15 END
       END
FROM `doctor` d
CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7) x
WHERE NOT (d.`id` = 1 AND x.n IN (4,5,7))
  AND NOT (d.`id` = 2 AND x.n IN (2,4,5,7));

-- 用户：不预置（密码为 BCrypt 密文，无法手写）
--   演示/联调账号统一通过 POST /api/auth/register 创建，例：
--   {"username":"zhangsan","password":"a123456","confirmPassword":"a123456"}

-- 就诊人 / 挂号记录：不预置，由业务流程产生（保证订单号、号源扣减数据真实一致）
