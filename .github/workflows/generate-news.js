/**
 * BestBlogs 自建版 - AI 资讯生成脚本
 *
 * 每天调用 DeepSeek API 生成当日 AI 精选资讯，
 * 创建为 Jekyll post 并更新首页。
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ==================== 配置 ====================

const CONFIG = {
  // DeepSeek API 配置
  apiKey: process.env.DEEPSEEK_API_KEY,
  apiUrl: 'api.deepseek.com',
  model: 'deepseek-chat',

  // 站点配置
  siteTitle: '我的早报',
  maxArticles: 8,

  // 内容生成提示词
  systemPrompt: `你是一位专业的AI/科技资讯编辑。请生成今日（${getTodayCN()}）最重要的AI和科技领域精选资讯。

要求：
1. 选择 5-8 条今日最重要的 AI/科技新闻
2. 每条包含：标题、摘要（100-200字）、来源、分类标签
3. 整体包含一段"今日焦点"简短评论（200字以内）
4. 内容覆盖：AI大模型、AI应用、AI开源、科技公司动态等方向
5. 语言：中文
6. 严格按JSON格式输出，不要包含markdown代码块标记`,

  outputFormat: `请严格按以下JSON格式输出（不要包含\`\`\`json标记）：
{
  "highlight": "今日焦点评论（200字以内）",
  "articles": [
    {
      "title": "文章标题",
      "summary": "文章摘要 100-200字",
      "source": "来源名称",
      "category": "分类标签",
      "url": "原始链接(如果没有就填#)"
    }
  ]
}`
};

// ==================== 工具函数 ====================

function getTodayCN() {
  const now = new Date();
  // 使用北京时间
  const options = { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('zh-CN', options);
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}年${month}月${day}日`;
}

function getTodayDate() {
  const now = new Date();
  const options = { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('zh-CN', options);
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}-${month}-${day}`;
}

function getDateFilename() {
  const now = new Date();
  const options = { timeZone: 'Asia/Shanghai' };
  const bjTime = new Date(now.toLocaleString('en-US', options));
  const y = bjTime.getFullYear();
  const m = String(bjTime.getMonth() + 1).padStart(2, '0');
  const d = String(bjTime.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ==================== API 调用 ====================

function callDeepSeekAPI(messages) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: CONFIG.model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 4096,
      stream: false
    });

    const options = {
      hostname: CONFIG.apiUrl,
      port: 443,
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.apiKey}`,
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 60000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.error(`DeepSeek API error: HTTP ${res.statusCode}`);
          console.error(body);
          reject(new Error(`API returned status ${res.statusCode}: ${body}`));
          return;
        }
        try {
          const result = JSON.parse(body);
          const content = result.choices?.[0]?.message?.content;
          if (!content) {
            reject(new Error('No content in API response'));
            return;
          }
          resolve(content);
        } catch (e) {
          reject(new Error(`Failed to parse API response: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(data);
    req.end();
  });
}

// ==================== 内容解析 ====================

function parseAIResponse(content) {
  // 清理可能的 markdown 代码块标记
  let cleaned = content.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  try {
    const data = JSON.parse(cleaned);
    return data;
  } catch (e) {
    console.error('JSON parse error. Raw content:');
    console.error(content);
    throw new Error(`Failed to parse AI response as JSON: ${e.message}`);
  }
}

// ==================== 内容生成 ====================

function generatePostMarkdown(data, dateStr) {
  const articles = data.articles || [];

  let md = `---
layout: post
title: "每日AI精选资讯 - ${getTodayCN()}"
date: ${getTodayDate()}T06:00:00+08:00
categories: [AI, 科技, 每日资讯]
---

> 🤖 本文由 **DeepSeek AI** 自动生成，每日 6:00 更新

## 🔥 今日焦点

${data.highlight || '今日暂无焦点评论'}

---

## 📰 今日精选资讯

`;

  articles.forEach((article, index) => {
    md += `### ${index + 1}. ${article.title}\n\n`;
    md += `${article.summary}\n\n`;
    md += `📎 来源: **${article.source || '未知'}** · 🏷️ ${article.category || '综合'}\n`;
    if (article.url && article.url !== '#') {
      md += `🔗 [查看原文](${article.url})\n`;
    }
    md += `\n---\n\n`;
  });

  md += `
## 📬 关于 BestBlogs 自建版

本网站是基于 [BestBlogs](https://github.com/ginobefun/BestBlogs) 项目的自建版本。
由 **GitHub Actions** 定时触发 **DeepSeek API** 自动生成内容，通过 **GitHub Pages** 免费托管。

- ⭐ [Star BestBlogs](https://github.com/ginobefun/BestBlogs)
- 🔧 [Fork 本项目](https://github.com/shusheng4438-cell/BestBlogs)
`;

  return md;
}

function generateFallbackPost(dateStr) {
  const todayCN = getTodayCN();
  return `---
layout: post
title: "每日AI精选资讯 - ${todayCN}"
date: ${getTodayDate()}T06:00:00+08:00
categories: [AI, 科技, 每日资讯]
---

> ⚠️ 今日 AI 生成内容暂时不可用，请检查 API Key 配置或稍后再试。

## 🔥 今日焦点

今天是${todayCN}，AI 生成服务暂时遇到了一些问题。这通常是因为：

1. **DeepSeek API Key 未配置或已过期** —— 请在 GitHub Secrets 中检查 \`DEEPSEEK_API_KEY\`
2. **API 配额不足**
3. **网络临时波动**

请前往 [GitHub Actions](../../actions) 查看详细日志，或手动触发重新生成。

---

## 📬 关于 BestBlogs 自建版

本网站是基于 [BestBlogs](https://github.com/ginobefun/BestBlogs) 项目的自建版本。

- 每日 6:00 自动更新
- 由 **DeepSeek API** 驱动
- 通过 **GitHub Pages** 免费托管
`;
}

// ==================== 主流程 ====================

async function main() {
  console.log('='.repeat(60));
  console.log('🤖 BestBlogs 自建版 - AI 资讯生成器');
  console.log('='.repeat(60));

  const dateFilename = getDateFilename();
  const dateStr = getTodayDate();
  console.log(`📅 生成日期: ${getTodayCN()}`);
  console.log(`📁 文件名: ${dateFilename}-ai-news-digest.md`);

  // 检查 API Key
  if (!CONFIG.apiKey || CONFIG.apiKey === '') {
    console.error('❌ DEEPSEEK_API_KEY 未设置！');
    console.log('⚠️  将生成占位内容...');

    const fallbackMd = generateFallbackPost(dateStr);
    const fallbackPath = path.join(__dirname, '..', '..', '_posts', `${dateFilename}-ai-news-digest.md`);
    fs.mkdirSync(path.dirname(fallbackPath), { recursive: true });
    fs.writeFileSync(fallbackPath, fallbackMd, 'utf-8');
    console.log('✅ Fallback post created.');
    return;
  }

  try {
    // 调用 DeepSeek API
    console.log('\n📡 正在调用 DeepSeek API...');

    const messages = [
      { role: 'system', content: CONFIG.systemPrompt },
      { role: 'user', content: `请生成今日（${getTodayCN()}）的AI精选资讯。${CONFIG.outputFormat}` }
    ];

    const response = await callDeepSeekAPI(messages);
    console.log('✅ API 调用成功');

    // 解析结果
    const data = parseAIResponse(response);
    console.log(`✅ 解析成功: ${(data.articles || []).length} 篇文章`);

    // 生成 Markdown
    const markdown = generatePostMarkdown(data, dateStr);

    // 写入文件
    const postsDir = path.join(__dirname, '..', '..', '_posts');
    fs.mkdirSync(postsDir, { recursive: true });

    const filePath = path.join(postsDir, `${dateFilename}-ai-news-digest.md`);
    fs.writeFileSync(filePath, markdown, 'utf-8');

    console.log(`✅ 文章已保存至: _posts/${dateFilename}-ai-news-digest.md`);
    console.log('✅ 完成！');

  } catch (error) {
    console.error('❌ 生成失败:', error.message);
    console.log('⚠️  将生成占位内容...');

    const fallbackMd = generateFallbackPost(dateStr);
    const fallbackPath = path.join(__dirname, '..', '..', '_posts', `${dateFilename}-ai-news-digest.md`);
    fs.mkdirSync(path.dirname(fallbackPath), { recursive: true });
    fs.writeFileSync(fallbackPath, fallbackMd, 'utf-8');
    console.log('✅ Fallback post created.');
  }
}

main().catch(console.error);
