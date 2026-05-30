import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import MarkdownIt from "markdown-it";
import { chromium } from "playwright-core";

const DEFAULT_WIDTH = 720;
const DEFAULT_SCALE = 2;
const BROWSER_CANDIDATES = [
  process.env.KECHUANG_BROWSER,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
].filter(Boolean);

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false
});

function usage() {
  console.error("Usage: node render_long_image.mjs <input.md> [output.png]");
}

function splitKeywords(value) {
  return value
    .split(/[、，,｜|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function fileExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function detectBrowserExecutable() {
  for (const candidate of BROWSER_CANDIDATES) {
    if (candidate && await fileExists(candidate)) {
      return candidate;
    }
  }
  throw new Error("No supported browser executable found. Set KECHUANG_BROWSER to Edge or Chrome.");
}

function parseMarkdownReport(raw) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let idx = 0;

  while (idx < lines.length && !lines[idx].trim()) {
    idx += 1;
  }

  let title = "科创升学早报";
  if (idx < lines.length && lines[idx].trim().startsWith("#")) {
    title = lines[idx].replace(/^#+\s*/, "").trim() || title;
    idx += 1;
  }

  while (idx < lines.length && !lines[idx].trim()) {
    idx += 1;
  }

  const metaLines = [];
  while (idx < lines.length && lines[idx].trim().startsWith(">")) {
    metaLines.push(lines[idx].replace(/^>\s?/, "").trim());
    idx += 1;
  }

  while (idx < lines.length && !lines[idx].trim()) {
    idx += 1;
  }

  const body = lines.slice(idx).join("\n").trim();
  return { title, metaLines, body };
}

function parseMetaLines(metaLines) {
  const items = metaLines.map((line) => {
    const normalized = line.replace(/\s+/g, " ").trim();
    const match = normalized.match(/^([^：:]+)[：:]\s*(.+)$/);
    if (!match) {
      return { label: "", value: normalized };
    }
    return { label: `${match[1]}：`, value: match[2].trim() };
  });

  return {
    source: items.find((item) => item.label === "信息来源：")?.value ?? "",
    timing: items.find((item) => item.label === "时效筛选：")?.value ?? "",
    keywords: items.find((item) => item.label === "重点关键词：")?.value
      ?? items.find((item) => item.label === "重点覆盖：")?.value
      ?? "",
    extra: items.filter((item) => !["信息来源：", "时效筛选：", "重点关键词：", "重点覆盖："].includes(item.label))
  };
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function extractDisplayDate(title) {
  return title.match(/(\d{1,2}月\d{1,2}日)/)?.[1] ?? "";
}

function renderMeta(parsedMeta) {
  const rows = [];

  if (parsedMeta.source) {
    rows.push(`
      <div class="meta-row source-card">
        <div class="meta-label">信息来源</div>
        <div class="meta-value">${escapeHtml(parsedMeta.source)}</div>
      </div>
    `);
  }

  if (parsedMeta.timing) {
    rows.push(`
      <div class="meta-row timing-card">
        <div class="meta-label">时效筛选</div>
        <div class="meta-value">${escapeHtml(parsedMeta.timing)}</div>
      </div>
    `);
  }

  if (parsedMeta.keywords) {
    const chips = splitKeywords(parsedMeta.keywords)
      .map((keyword) => `<span class="keyword-chip">${escapeHtml(keyword)}</span>`)
      .join("");

    rows.push(`
      <div class="meta-row keywords-row">
        <div class="meta-label">重点关键词</div>
        <div class="keywords-wrap">${chips}</div>
      </div>
    `);
  }

  for (const item of parsedMeta.extra) {
    rows.push(`
      <div class="meta-row">
        <div class="meta-label">${escapeHtml(item.label || "补充")}</div>
        <div class="meta-value">${escapeHtml(item.value)}</div>
      </div>
    `);
  }

  return rows.join("\n");
}

function renderHtml({ title, metaLines, body }) {
  const parsedMeta = parseMetaLines(metaLines);
  const displayDate = extractDisplayDate(title);
  const heroChips = splitKeywords(parsedMeta.keywords).slice(0, 4);
  const bodyHtml = md.render(body);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #eef3f6;
      --sheet: #fffdfa;
      --sheet-border: #e9e0d2;
      --ink: #1f2937;
      --muted: #667085;
      --brand: #0f3d5e;
      --brand-2: #21758f;
      --accent: #cc7a29;
      --soft: #f7f3eb;
      --soft-blue: #edf4fb;
      --soft-green: #eef8f2;
      --soft-line: #e7eaee;
      --shadow: 0 24px 64px rgba(15, 23, 42, 0.12);
      --radius-xl: 32px;
      --radius-lg: 22px;
      --radius-md: 18px;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      background:
        radial-gradient(circle at top left, rgba(33, 117, 143, 0.10), transparent 28%),
        radial-gradient(circle at top right, rgba(204, 122, 41, 0.12), transparent 22%),
        var(--bg);
      color: var(--ink);
      font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", sans-serif;
    }

    body {
      width: ${DEFAULT_WIDTH}px;
      margin: 0 auto;
      padding: 24px;
    }

    .sheet {
      background: var(--sheet);
      border: 1px solid var(--sheet-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .hero {
      position: relative;
      overflow: hidden;
      padding: 34px 30px 118px;
      background:
        linear-gradient(140deg, rgba(255,255,255,0.18), rgba(255,255,255,0.03)),
        linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 68%, var(--accent) 100%);
      color: #fff;
    }

    .hero::before,
    .hero::after {
      content: "";
      position: absolute;
      border-radius: 999px;
      pointer-events: none;
      opacity: 0.55;
    }

    .hero::before {
      width: 220px;
      height: 220px;
      right: -72px;
      top: -88px;
      background: radial-gradient(circle, rgba(255,255,255,0.28), rgba(255,255,255,0));
    }

    .hero::after {
      width: 180px;
      height: 180px;
      right: 28px;
      bottom: -96px;
      background: radial-gradient(circle, rgba(255,214,170,0.42), rgba(255,214,170,0));
    }

    .hero-kicker {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
    }

    .hero-eyebrow {
      display: inline-flex;
      align-items: center;
      min-height: 36px;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,0.14);
      border: 1px solid rgba(255,255,255,0.16);
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: rgba(255,255,255,0.92);
    }

    .hero-date {
      font-size: 16px;
      font-weight: 700;
      color: rgba(255,255,255,0.84);
      letter-spacing: 0.03em;
    }

    h1 {
      position: relative;
      z-index: 1;
      margin: 0;
      font-size: 44px;
      line-height: 1.18;
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .hero-subtitle {
      position: relative;
      z-index: 1;
      width: 86%;
      margin-top: 16px;
      font-size: 18px;
      line-height: 1.7;
      color: rgba(255,255,255,0.88);
    }

    .hero-chip-row {
      position: relative;
      z-index: 1;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 20px;
    }

    .hero-chip {
      display: inline-flex;
      align-items: center;
      min-height: 34px;
      padding: 7px 12px;
      border-radius: 999px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.14);
      font-size: 14px;
      font-weight: 700;
      color: rgba(255,255,255,0.9);
    }

    .meta-panel {
      position: relative;
      z-index: 3;
      margin: -54px 20px 0;
      padding: 0 0 4px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .meta-row {
      background: var(--soft);
      border: 1px solid var(--sheet-border);
      border-radius: var(--radius-lg);
      padding: 16px 18px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
    }

    .source-card,
    .keywords-row {
      grid-column: 1 / -1;
    }

    .meta-label {
      font-size: 15px;
      font-weight: 800;
      color: var(--brand);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .meta-value {
      margin-top: 8px;
      font-size: 18px;
      line-height: 1.75;
      color: var(--ink);
    }

    .keywords-wrap {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .keyword-chip {
      display: inline-flex;
      align-items: center;
      min-height: 38px;
      padding: 7px 14px;
      border-radius: 999px;
      background: var(--soft-blue);
      border: 1px solid #d7e7f5;
      color: #0d4c74;
      font-size: 16px;
      font-weight: 700;
    }

    .content {
      padding: 20px 24px 30px;
    }

    h2 {
      display: inline-flex;
      align-items: center;
      margin: 30px 0 16px;
      padding: 10px 16px;
      border-radius: 999px;
      background: linear-gradient(135deg, #113d61, #286f86);
      box-shadow: 0 10px 24px rgba(17, 61, 97, 0.16);
      font-size: 20px;
      line-height: 1.2;
      color: #fff;
      letter-spacing: 0.02em;
    }

    h3 {
      display: inline-flex;
      align-items: center;
      margin: 34px 0 14px;
      padding: 10px 14px;
      border-radius: 16px;
      background: linear-gradient(90deg, #fff2dd 0%, #fff8ef 100%);
      border: 1px solid #f0dcc1;
      font-size: 22px;
      line-height: 1.4;
      color: #70431b;
      box-shadow: 0 8px 18px rgba(112, 67, 27, 0.08);
    }

    p {
      margin: 14px 0;
      font-size: 20px;
      line-height: 1.82;
      color: #253046;
      text-align: justify;
      text-justify: inter-ideograph;
      word-break: break-word;
    }

    strong {
      color: #123e63;
      font-weight: 800;
    }

    .story-title {
      margin: 0;
      font-size: 23px;
      line-height: 1.58;
      color: #123e63;
      font-weight: 800;
    }

    .story-title strong {
      color: inherit;
    }

    .insight {
      padding: 14px 16px;
      border-radius: var(--radius-md);
      background: var(--soft-green);
      border: 1px solid #d6e9dc;
      color: #19553a;
    }

    .insight strong {
      color: #19553a;
    }

    .source-line {
      padding: 12px 14px;
      border-radius: var(--radius-md);
      background: #f6f8fb;
      border: 1px solid #e2e8f0;
      font-size: 15px;
      line-height: 1.8;
      color: #5b6778;
    }

    .source-line a {
      color: #2a6495;
      text-decoration: none;
    }

    .story-card {
      position: relative;
      margin: 18px 0 22px;
      padding: 18px 18px 16px;
      border-radius: 24px;
      border: 1px solid #e7ddd0;
      background: linear-gradient(180deg, rgba(255,255,255,0.98), #fbfaf7 100%);
      box-shadow: 0 16px 32px rgba(15, 23, 42, 0.06);
      overflow: hidden;
    }

    .story-card::before {
      content: "";
      position: absolute;
      left: 0;
      top: 18px;
      bottom: 18px;
      width: 5px;
      border-radius: 999px;
      background: linear-gradient(180deg, #ee8d35 0%, #2d7f9a 100%);
    }

    .story-card p:not(.story-title):not(.insight):not(.source-line) {
      margin-top: 12px;
      margin-bottom: 0;
    }

    .story-card .insight,
    .story-card .source-line {
      margin-top: 12px;
      margin-bottom: 0;
    }

    hr {
      margin: 30px 0;
      border: none;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--soft-line), transparent);
    }

    ul, ol {
      margin: 12px 0 18px;
      padding: 16px 18px 16px 34px;
      border-radius: 22px;
      border: 1px solid #e6e2da;
      background: linear-gradient(180deg, #fff, #faf8f4);
      box-shadow: 0 12px 26px rgba(15, 23, 42, 0.04);
    }

    li {
      margin: 10px 0;
      font-size: 18px;
      line-height: 1.76;
      color: #344054;
    }

    table {
      width: 100%;
      margin: 18px 0;
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
      border: 1px solid #e5ded2;
      border-radius: 18px;
      background: #fff;
      box-shadow: 0 14px 28px rgba(15, 23, 42, 0.05);
    }

    th, td {
      padding: 14px 14px;
      text-align: left;
      vertical-align: top;
      font-size: 16px;
      line-height: 1.6;
    }

    th {
      background: #163f63;
      color: #fff;
      font-weight: 700;
    }

    td {
      border-top: 1px solid #ece7df;
      color: #344054;
    }

    tr:nth-child(even) td {
      background: #faf8f4;
    }

    blockquote {
      margin: 16px 0;
      padding: 16px 18px;
      border-radius: 18px;
      background: #faf5e9;
      border-left: 5px solid var(--accent);
    }

    blockquote p {
      margin: 0;
      font-size: 18px;
      color: #6b4d26;
    }

    .footer {
      margin: 0 24px 0;
      padding: 18px 0 28px;
      border-top: 1px solid var(--soft-line);
      font-size: 14px;
      line-height: 1.7;
      color: var(--muted);
      text-align: center;
    }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="hero">
      <div class="hero-kicker">
        <div class="hero-eyebrow">每日科创升学情报</div>
        ${displayDate ? `<div class="hero-date">${escapeHtml(displayDate)}</div>` : ""}
      </div>
      <h1>${escapeHtml(title)}</h1>
      <div class="hero-subtitle">聚焦小学与初中家长真正需要动作的科创升学节点。</div>
      ${heroChips.length ? `<div class="hero-chip-row">${heroChips.map((chip) => `<span class="hero-chip">${escapeHtml(chip)}</span>`).join("")}</div>` : ""}
    </header>
    <section class="meta-panel">
      ${renderMeta(parsedMeta)}
    </section>
    <section class="content">${bodyHtml}</section>
    <footer class="footer">整理自权威公开信源，具体安排以官方通知为准。</footer>
  </main>
  <script>
    (() => {
      const paragraphs = Array.from(document.querySelectorAll('.content p'));
      for (const p of paragraphs) {
        const text = (p.textContent || '').trim();
        const html = (p.innerHTML || '').trim();
        const hasStrong = p.querySelector('strong');
        if (text.startsWith('💡')) {
          p.classList.add('insight');
          continue;
        }
        if (text.startsWith('来源：')) {
          p.classList.add('source-line');
          continue;
        }
        if (hasStrong && /^([\\p{Emoji_Presentation}\\p{Extended_Pictographic}]\\s*)?<strong>/u.test(html)) {
          p.classList.add('story-title');
        }
      }

      const storyTitles = Array.from(document.querySelectorAll('.content .story-title'));
      for (const title of storyTitles) {
        if (title.closest('.story-card')) {
          continue;
        }

        const card = document.createElement('article');
        card.className = 'story-card';
        title.parentNode.insertBefore(card, title);

        let node = title;
        while (node) {
          const next = node.nextElementSibling;
          card.appendChild(node);
          if (!next || next.matches('.story-title, h2, h3, hr, ul, ol, table, blockquote')) {
            break;
          }
          node = next;
        }
      }
    })();
  </script>
</body>
</html>`;
}

async function main() {
  const [, , inputArg, outputArg] = process.argv;
  if (!inputArg) {
    usage();
    process.exit(1);
  }

  const inputFile = path.resolve(process.cwd(), inputArg);
  const outputFile = path.resolve(
    process.cwd(),
    outputArg || `${path.basename(inputFile, path.extname(inputFile))}.png`
  );

  const raw = await fs.readFile(inputFile, "utf8");
  const html = renderHtml(parseMarkdownReport(raw));
  const executablePath = await detectBrowserExecutable();

  await fs.mkdir(path.dirname(outputFile), { recursive: true });

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--disable-gpu", "--font-render-hinting=none"]
  });

  const page = await browser.newPage({
    viewport: { width: DEFAULT_WIDTH, height: 1200 },
    deviceScaleFactor: DEFAULT_SCALE
  });

  await page.setContent(html, { waitUntil: "load" });
  await page.emulateMedia({ media: "screen" });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: outputFile,
    fullPage: true,
    type: "png"
  });

  await browser.close();

  console.log(`Rendered ${outputFile}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
