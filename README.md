# VPN 市场增长信息中心

这是一个面向 VPN 产品增长和运营团队的情报看板，支持 GitHub Pages 静态展示和 GitHub Actions 每日自动更新。

## 功能

- 每日/每周高优先级情报简报
- 需求型主题与竞品动作主题
- 核心证据和参考信息分层
- 增长机会池与可行性建议
- 6 类信源状态追踪

## 数据结构

- `data/intelligence.json`: 看板实际读取的数据
- `data/source-rules.json`: 自动更新使用的信源和关键词规则
- `scripts/update_daily.mjs`: 每日抓取、轻量分类、写回数据的脚本

## GitHub Pages 自动更新

`.github/workflows/update-and-deploy.yml` 会在每天北京时间 07:10 自动执行：

1. 安装依赖
2. 运行 `npm run update:daily`
3. 提交更新后的 `data/intelligence.json`
4. 构建 GitHub Pages 静态站点
5. 发布到 GitHub Pages

在 GitHub 仓库中启用方式：

1. 打开 `Settings > Pages`
2. 将 `Build and deployment` 的 `Source` 设为 `GitHub Actions`
3. 到 `Actions` 手动运行一次 `Update and deploy intelligence center`

## 本地命令

```bash
npm install
npm run update:daily
npm run build:pages
```

本地只检查更新脚本但不写入数据：

```bash
node scripts/update_daily.mjs --dry-run
```
