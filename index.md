---
layout: default
title: 我的早报 - 每日AI精选资讯
---

# 📰 我的早报

> 每日AI精选资讯，由 DeepSeek AI 自动生成与推送

## 最新资讯

{% for post in site.posts limit:10 %}
### [{{ post.title }}]({{ post.url | relative_url }})
📅 {{ post.date | date: "%Y年%m月%d日" }}

{{ post.excerpt | strip_html | truncate: 200 }}

[阅读全文 →]({{ post.url | relative_url }})

---
{% endfor %}

## 关于本站

本网站是基于 [BestBlogs](https://github.com/ginobefun/BestBlogs) 的自建版本，由 **GitHub Actions** 定时触发 **DeepSeek API** 自动生成每日AI精选资讯，并通过 **GitHub Pages** 自动部署发布。

- ⏰ 每日 6:00 自动更新
- 🤖 DeepSeek AI 驱动
- 🔓 完全开源、免费托管
