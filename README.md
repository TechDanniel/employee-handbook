# 项目概览

该项目用 VitePress 快速构建文档，用于搭建个人知识库。

# 技术栈

VitePress / Vue / Vite

# 快速开始

- 启动 Vite（App，默认端口 5173）：`pnpm run dev:app`
- 启动 VitePress（Docs，端口 5174）：`pnpm run docs:dev`
- 同时启动（App + Docs）：`pnpm run dev:all`

## 部署到 GitHub Pages

本仓库已包含 GitHub Actions 工作流：`.github/workflows/deploy-pages.yml`。

1. 将代码推到 GitHub，并确保默认分支是 `main` 或 `master`
2. 在 GitHub 仓库设置中启用 Pages：
   - Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**
3. 之后每次 push 到默认分支会自动构建并发布

说明：该工作流会同时构建 App（输出到 `dist/`）和 VitePress 文档（合并到 `dist/docs/`）。

## AI 问答秘钥怎么处理？

- **如果你部署在 GitHub Pages（纯静态站点）**：不要把 `VITE_OPENROUTER_API_KEY` 之类的 Key 写进仓库，也不要在 Actions 里注入后参与前端构建。
  因为任何以 `VITE_` 开头的变量都会被打包进前端 JS，访问站点的人都能在浏览器里拿到。
- **GitHub Secrets 的正确用途**：只适用于“服务端/CI 运行时”的秘钥（例如在 CI 里运行 `knowledge-base` CLI 生成摘要），而不是给前端页面直接调用模型。
- **想在公网开启 AI 问答的可选方案**：把模型调用放到你自己的后端（如 Cloudflare Workers / Vercel / 自建服务）做转发，前端只请求你的后端；Key 存在后端环境变量里。

## 拓展功能

设置环境变量：

- `OPENAI_BASE_URL`：OpenAI-compatible 网关地址
- `OPENAI_MODEL`：模型名称

为 Markdown 自动生成摘要（需要 `OPENAI_API_KEY`）：

`knowledge-base ai summarize --cwd note-demo --file docs/index.md --target generic --install`
