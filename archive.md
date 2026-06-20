---
layout: default
title: 资讯归档
---

# 📚 资讯归档

所有历史 AI 精选资讯。

{% assign posts_by_year = site.posts | group_by_exp: "post", "post.date | date: '%Y'" %}

{% for year in posts_by_year %}
## {{ year.name }} 年

{% for post in year.items %}
- 📅 **{{ post.date | date: "%m月%d日" }}** — [{{ post.title }}]({{ post.url | relative_url }})
{% endfor %}

{% endfor %}
