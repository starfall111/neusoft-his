# issue-01-文档仓库git-pull网络失败
- 时间：2026-09-11 20:21
- 场景：D03 开工执行规则十一（neusoft-his 文档仓库 git pull）
- 错误信息原文：`fatal: unable to access 'https://github.com/starfall111/neusoft-his.git/': Recv failure: Connection was reset`
- 原因分析：本机访问 GitHub 的网络链路被重置（代理/防火墙环境问题），非仓库或命令问题
- 解决方案：暂停后续动作；用户更新网络环境后重试 `git pull`，返回 Already up to date
- 验证结果：✅ 拉取成功，后续按最新 master 继续工作
- 是否涉契约：否
