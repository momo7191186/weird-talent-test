# 邪门天赋测试 · 前端

此目录是 GitHub Pages 的纯静态前端。`data.js` 只有题目、维度和结果映射，没有 12 份完整报告、兑换码或 Supabase 密钥。完整报告和兑换码核验由 Supabase Edge Function 提供。

## 上线前

1. 先按后端目录的 README 创建 Supabase 项目、数据库和 `quiz-api` Edge Function。
2. 把真实的 `https://<project-ref>.supabase.co/functions/v1/quiz-api` 填进 `config.js` 的 `redeemEndpoint`。
3. 将本目录的内容上传到 GitHub 仓库根目录，在 Settings → Pages 中选择 `main` 分支和根目录发布。
4. 用一枚尚未发出的兑换码在手机浏览器走完解锁、24 题、结果页、说明书；再在另一设备验证同码不能重复激活。

不要把 `work/site`、`outputs`、后端的 `results.json` 或发货兑换码 CSV 一起推到公开仓库。修改原始题库或报告后，运行 `node ../supabase-backend/tools/split-data.mjs` 重新拆分，并同时更新前端与后端。

`config.js` 已连接到 `https://ltzrualniczcufveobkd.supabase.co/functions/v1/quiz-api`。2026-10-11 已在本地网页完成真实后端联调：兑换、24 题、报告、岗位建议、刷新重进，以及另一浏览器存储标识重复激活被拒绝。待 GitHub Pages 发布后，再验证正式网址。
