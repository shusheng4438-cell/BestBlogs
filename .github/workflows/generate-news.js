/**
 * BestBlogs 自建版 - 深度分析版 AI 早报生成脚本
 *
 * 每天调用 DeepSeek API 生成当日 AI 深度分析早报，
 * 不止于新闻摘要，更关注趋势、机会与风险。
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
  maxArticles: 6,

  // 深度分析系统提示词
  systemPrompt: `你是一位资深科技商业分析师，曾就职于顶级风投和战略咨询公司。
你的读者是创业者、投资人和科技从业者，他们不需要"发生了什么"，他们需要知道"这意味着什么"。

今天是${getTodayCN()}。请基于你对 AI 与科技行业的深度认知，生成一份高质量的商业分析早报。

# 核心原则

1. **事实为基**：每条分析必须基于真实可查的事件，不可编造
2. **洞察优先**：报道"发生了什么"只占 20% 篇幅，80% 用于分析"为什么重要"和"接下来会怎样"
3. **多视角利益分析**：每条分析必须分别阐述对创业者、投资人、普通从业者的具体影响
4. **冷静克制**：不煽动、不炒作、不贩卖焦虑。像 McKinsey 报告一样理性
5. **敢于判断**：给出明确的方向性判断，不要模棱两可的"可能…也可能…"

# 分析框架

每条入选资讯按以下结构分析：

**趋势信号**
- 这件事是一个孤立事件，还是一个更大趋势的缩影？
- 如果是趋势，它处于 Gartner 炒作周期的哪个阶段？
- 过去 6 个月是否有同类事件形成证据链？

**机会识别**
- 创业者：是否存在创业窗口？需要什么资源门槛？
- 投资人：哪个细分赛道值得关注？估值逻辑是否变化？
- 普通人：对职业选择、技能学习、日常使用意味着什么？

**风险评估**
- 是否存在泡沫信号？
- 监管风险、技术瓶颈、商业模式缺陷分别是什么？
- 谁是输家？

# 选题标准

优先选择以下类型的资讯（按优先级排序）：
1. 底层技术突破（模型架构、芯片、训练方法）
2. 商业模式验证或证伪（某 AI 产品找到 PMF / 某方向被证明走不通）
3. 行业格局变化（巨头入场/退出、关键并购、开源vs闭源态势）
4. 监管与政策重大变化
5. 值得关注的创业公司/新产品（必须有独到之处，拒绝 PR 稿）

宁缺毋滥。如果今天没有足够重要的资讯，就只选 3-4 条深入分析，不凑数。`,

  outputFormat: `请严格输出以下 JSON 格式（不要包含 \`\`\`json 标记，确保 JSON 合法可解析）：

{
  "todayThesis": "用一句话概括今日最核心的信号（20字以内，像标题一样有力）",
  "macroContext": "今日宏观背景简述（80-120字）：当前 AI 行业所处的阶段、市场情绪、值得关注的宏观变量",
  "articles": [
    {
      "title": "资讯标题（简洁有力）",
      "factSummary": "事实陈述（80-150字）：只写客观事实，不掺杂观点",
      "trendSignal": "趋势信号分析（80-120字）：这件事反映了什么趋势？是孤立事件还是趋势的一部分？",
      "opportunity": {
        "entrepreneur": "对创业者的机会（40-80字）",
        "investor": "对投资人的启示（40-80字）",
        "individual": "对普通人的影响（40-80字）"
      },
      "risk": "风险与警示（60-100字）：泡沫信号、监管风险、竞争格局变化中的危险",
      "source": "来源名称",
      "category": "分类（如：大模型/AI应用/开源/芯片/政策/商业化）"
    }
  ],
  "opportunityRadar": [
    {
      "direction": "值得关注的方向（10-15字）",
      "rationale": "关注理由（30-50字）",
      "timeHorizon": "时间窗口（短期1-3月/中期3-12月/长期1年+）"
    }
  ]
}

注意事项：
- articles 数组选 3-6 条最重要的资讯
- opportunityRadar 数组列 3-5 个方向
- 所有字段必填，不可省略
- 分析要有观点，敢于下判断，不要泛泛而谈
- 确保 JSON 合法，字符串中的双引号需要转义`
};

// ==================== 工具函数 ====================

function getTodayCN() {
  const now = new Date();
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
      temperature: 0.5,
      max_tokens: 8192,
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
      timeout: 120000
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
  let cleaned = content.trim();

  // 清理 markdown 代码块标记
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  // 尝试提取第一个完整的 JSON 对象
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace > 0) {
    cleaned = cleaned.substring(firstBrace);
  }
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace > 0 && lastBrace < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastBrace + 1);
  }

  try {
    const data = JSON.parse(cleaned);
    // 验证必要字段
    if (!data.articles || !Array.isArray(data.articles)) {
      throw new Error('Missing or invalid "articles" array');
    }
    return data;
  } catch (e) {
    console.error('JSON parse error. Cleaned content (first 500 chars):');
    console.error(cleaned.substring(0, 500));
    throw new Error(`Failed to parse AI response as JSON: ${e.message}`);
  }
}

// ==================== Markdown 渲染 ====================

function generatePostMarkdown(data, dateStr) {
  const articles = data.articles || [];
  const todayCN = getTodayCN();

  let md = `---
layout: post
title: "${data.todayThesis || '深度分析早报 - ' + todayCN}"
date: ${getTodayDate()}T06:00:00+08:00
categories: [AI, 科技, 深度分析, 商业洞察]
description: "${data.todayThesis || '每日AI深度分析'} | 今日机会雷达已更新"
---

> 🤖 本文由 **DeepSeek AI** 以商业分析师视角自动生成，每日 6:00 更新
>
> 📐 **分析框架**: 事实 → 趋势信号 → 机会识别（创业者 · 投资人 · 普通人）→ 风险评估

---

## 📡 宏观背景

${data.macroContext || '今日 AI 行业持续快速演进，以下是关键信号分析。'}

---

## 🔍 深度分析

`;

  // 逐条渲染文章
  articles.forEach((article, index) => {
    const n = index + 1;

    md += `### ${n}. ${article.title || '(无标题)'}\n\n`;

    // 事实陈述
    md += `<blockquote class="fact-box">
<strong>📋 事实</strong><br>
${article.factSummary || article.summary || '(暂无事实陈述)'}
</blockquote>\n\n`;

    // 趋势信号
    if (article.trendSignal) {
      md += `**📈 趋势信号**\n\n${article.trendSignal}\n\n`;
    }

    // 机会分析 — 三列结构
    const opp = article.opportunity || {};
    if (opp.entrepreneur || opp.investor || opp.individual) {
      md += `**🎯 机会识别**\n\n`;
      md += `<div class="opportunity-grid">\n\n`;
      if (opp.entrepreneur) {
        md += `<div class="opp-card entrepreneur">\n\n`;
        md += `**🚀 创业者**\n\n${opp.entrepreneur}\n\n`;
        md += `</div>\n\n`;
      }
      if (opp.investor) {
        md += `<div class="opp-card investor">\n\n`;
        md += `**💰 投资人**\n\n${opp.investor}\n\n`;
        md += `</div>\n\n`;
      }
      if (opp.individual) {
        md += `<div class="opp-card individual">\n\n`;
        md += `**👤 普通人**\n\n${opp.individual}\n\n`;
        md += `</div>\n\n`;
      }
      md += `</div>\n\n`;
    }

    // 风险
    if (article.risk) {
      md += `**⚠️ 风险与警示**\n\n${article.risk}\n\n`;
    }

    // 来源
    md += `<div class="article-meta">\n`;
    md += `📎 <strong>${article.source || '未知来源'}</strong>`;
    if (article.category) {
      md += ` · <span class="category-tag">${article.category}</span>`;
    }
    if (article.url && article.url !== '#') {
      md += ` · <a href="${article.url}" target="_blank" rel="noopener">查看原文 →</a>`;
    }
    md += `\n</div>\n\n`;

    md += `---\n\n`;
  });

  // 今日机会速览
  const radar = data.opportunityRadar || [];
  if (radar.length > 0) {
    md += `## 🧭 今日机会速览\n\n`;
    md += `> 以下是基于今日信号值得关注的方向，按重要性和可操作性排序。\n\n`;

    md += `<div class="radar-table">\n\n`;
    md += `| # | 方向 | 关注理由 | 时间窗口 |\n`;
    md += `|---|------|----------|----------|\n`;
    radar.forEach((item, i) => {
      md += `| ${i + 1} | **${item.direction || ''}** | ${item.rationale || ''} | ${item.timeHorizon || '待观察'} |\n`;
    });
    md += `\n</div>\n\n`;

    // 行动建议
    md += `<details class="action-hint">\n`;
    md += `<summary><strong>💡 今天的行动建议</strong></summary>\n\n`;
    md += `机会雷达不等于投资建议。建议：\n`;
    md += `1. 选择 1-2 个方向深入阅读原文\n`;
    md += `2. 关注处于「短期」窗口的方向，窗口期稍纵即逝\n`;
    md += `3. 「长期」方向适合作为知识储备，持续追踪\n`;
    md += `</details>\n\n`;
  }

  // 页脚
  md += `
---

<div class="newsletter-footer">

## 📬 关于本刊

**深度分析早报** 是基于 [BestBlogs](https://github.com/ginobefun/BestBlogs) 项目的自建深度版。

每早 6:00，由 **DeepSeek AI** 以商业分析师视角生成：
- 🔍 不只说「发生了什么」，更分析「这意味着什么」
- 🎯 为创业者、投资人、普通人分别识别机会
- ⚠️ 诚实评估风险，不贩卖焦虑

- ⭐ [Star BestBlogs](https://github.com/ginobefun/BestBlogs)
- 🔧 [Fork 本项目](https://github.com/shusheng4438-cell/BestBlogs)

</div>
`;

  return md;
}

// ==================== Fallback 文章 ====================

function generateFallbackPost(dateStr) {
  const todayCN = getTodayCN();
  return `---
layout: post
title: "深度分析早报 - ${todayCN}（服务暂不可用）"
date: ${getTodayDate()}T06:00:00+08:00
categories: [AI, 科技, 深度分析]
---

> ⚠️ 今日 AI 分析服务暂时不可用，请检查 API Key 配置或稍后再试。

## 📡 今日状态

深度分析引擎在今天${todayCN}暂时未能完成分析。可能原因：

1. **DeepSeek API Key 未配置或已过期** — 请在 [GitHub Secrets](../../settings/secrets/actions) 中检查 \`DEEPSEEK_API_KEY\`
2. **API 配额不足** — 前往 [platform.deepseek.com](https://platform.deepseek.com) 查看用量
3. **网络临时波动** — 可稍后手动重试

### 🔧 手动重试

前往 [Actions 页面](../../actions/workflows/daily.yml)，点击 **Run workflow** 手动触发。

---

## 📬 关于本刊

**深度分析早报** 是基于 [BestBlogs](https://github.com/ginobefun/BestBlogs) 的自建深度版。
每早 6:00 由 **DeepSeek AI** 以商业分析师视角自动生成。

- ⭐ [Star BestBlogs](https://github.com/ginobefun/BestBlogs)
- 🔧 [Fork 本项目](https://github.com/shusheng4438-cell/BestBlogs)
`;
}

// ==================== 主流程 ====================

async function main() {
  console.log('='.repeat(60));
  console.log('🤖 BestBlogs 深度分析版 - AI 早报生成器');
  console.log('='.repeat(60));

  const dateFilename = getDateFilename();
  const dateStr = getTodayDate();
  console.log(`📅 生成日期: ${getTodayCN()}`);
  console.log(`📁 文件名: ${dateFilename}-deep-analysis.md`);
  console.log(`🎯 模式: 深度商业分析（趋势·机会·风险）`);

  // 检查 API Key
  if (!CONFIG.apiKey || CONFIG.apiKey === '') {
    console.error('❌ DEEPSEEK_API_KEY 未设置！');
    console.log('⚠️  将生成占位内容...');

    const fallbackMd = generateFallbackPost(dateStr);
    const postsDir = path.join(__dirname, '..', '..', '_posts');
    fs.mkdirSync(postsDir, { recursive: true });
    const fallbackPath = path.join(postsDir, `${dateFilename}-deep-analysis.md`);
    fs.writeFileSync(fallbackPath, fallbackMd, 'utf-8');
    console.log('✅ Fallback post created.');
    return;
  }

  try {
    // 1. 调用 DeepSeek API
    console.log('\n📡 正在调用 DeepSeek API...');
    console.log('   Model: deepseek-chat | Temperature: 0.5 | Max Tokens: 8192');

    const messages = [
      { role: 'system', content: CONFIG.systemPrompt },
      { role: 'user', content: `请分析今日（${getTodayCN()}）AI 与科技行业最重要的动态。${CONFIG.outputFormat}` }
    ];

    const response = await callDeepSeekAPI(messages);
    console.log('✅ API 调用成功');

    // 2. 解析与验证
    const data = parseAIResponse(response);
    const articleCount = (data.articles || []).length;
    const radarCount = (data.opportunityRadar || []).length;
    console.log(`✅ 解析成功: ${articleCount} 篇深度分析, ${radarCount} 个机会方向`);
    console.log(`📌 今日主题: ${data.todayThesis || '(未提供)'}`);

    // 3. 生成 Markdown
    const markdown = generatePostMarkdown(data, dateStr);

    // 4. 写入文件
    const postsDir = path.join(__dirname, '..', '..', '_posts');
    fs.mkdirSync(postsDir, { recursive: true });

    const filePath = path.join(postsDir, `${dateFilename}-deep-analysis.md`);
    fs.writeFileSync(filePath, markdown, 'utf-8');

    console.log(`✅ 文章已保存至: _posts/${dateFilename}-deep-analysis.md`);
    console.log(`📏 文件大小: ${(Buffer.byteLength(markdown) / 1024).toFixed(1)} KB`);
    console.log('✅ 完成！');

  } catch (error) {
    console.error('❌ 生成失败:', error.message);
    console.log('⚠️  将生成占位内容...');

    const fallbackMd = generateFallbackPost(dateStr);
    const postsDir = path.join(__dirname, '..', '..', '_posts');
    fs.mkdirSync(postsDir, { recursive: true });
    const fallbackPath = path.join(postsDir, `${dateFilename}-deep-analysis.md`);
    fs.writeFileSync(fallbackPath, fallbackMd, 'utf-8');
    console.log('✅ Fallback post created.');
  }
}

main().catch(console.error);
