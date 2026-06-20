# 📰 我的早报 — BestBlogs 自建版

> 基于 BestBlogs 的 GitHub Pages 自建版本
> 每日 AI 精选资讯，由 DeepSeek AI 自动生成

## 🚀 快速开始

### 1. Fork 此仓库

### 2. 设置 Secrets

在 Settings → Secrets and variables → Actions 中添加：
- `DEEPSEEK_API_KEY` — 你的 DeepSeek API Key

### 3. 启用 GitHub Pages

Settings → Pages → Source 选择 **GitHub Actions**

### 4. 启用 Actions 权限

Settings → Actions → General → Workflow permissions:
选择 **Read and write permissions**

### 5. 手动触发

前往 Actions 标签 → Daily AI News Digest → Run workflow

## 📡 站点地址

部署成功后，网站将在 `https://你的用户名.github.io/BestBlogs` 上线

## ⚙️ 自定义

编辑 `_config.yml` 修改站点标题、描述等配置。

## 📜 致谢

- [BestBlogs](https://github.com/ginobefun/BestBlogs) — 原始项目
- [DeepSeek](https://deepseek.com) — AI 模型
- [GitHub Pages](https://pages.github.com) — 托管平台
