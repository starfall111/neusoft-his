# issue-02-his-registration编译缺lombok
- 时间：2026-09-11 20:52
- 场景：D03 编码完成后 `mvn compile` 全模块编译
- 错误信息原文：`程序包lombok不存在` / `找不到符号: 类 Getter/Setter/RequiredArgsConstructor/AllArgsConstructor`（全部位于 his-registration 新增文件）
- 原因分析：lombok 在 his-common 中声明为 `<optional>true</optional>`，optional 依赖不随 Maven 传递——D02 建 his-registration 骨架 pom 时只挂了 his-common/user/hospital 三个模块依赖，漏声明 lombok（对照 his-user/pom.xml：his-common + lombok 两项，印证每个业务模块都要自己声明）
- 解决方案：his-registration/pom.xml 增加 `org.projectlombok:lombok`（optional=true，与 his-user/his-hospital 写法一致）
- 验证结果：✅ `mvn -q compile` EXIT=0，Flex 注解处理器正常生成 TableDef
- 是否涉契约：否（构建依赖，非 DDL/接口契约）
