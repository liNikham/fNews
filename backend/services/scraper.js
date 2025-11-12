// backend/services/scraper.js

const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const axios = require("axios");
const path = require("path");
const os = require("os");

// 🧭 Debugging information (helpful for both local & Render)
try {
  const pkg = require("puppeteer/package.json");
  console.log("🧭 Puppeteer version:", pkg.version);
} catch (e) {
  console.log("⚠️ Puppeteer package info not found:", e.message);
}

// 🧩 Detect and resolve Chrome binary path based on OS
function getChromePath() {
  const basePath = path.join(__dirname, "../node_modules/.puppeteer_cache/chrome");
  const platform = os.platform(); // 'win32' | 'linux' | 'darwin'

  let chromePath;

  if (platform === "win32") {
    // 🪟 Windows (local dev)
    chromePath = path.join(
      basePath,
      "win64-133.0.6943.141/chrome-win64/chrome.exe"
    );
  } else if (platform === "linux") {
    // 🐧 Render (Linux)
    chromePath = path.join(
      basePath,
      "linux-142.0.7444.61/chrome-linux64/chrome"
    );
  } else if (platform === "darwin") {
    // 🍎 macOS (for Mac developers)
    chromePath = path.join(
      basePath,
      "mac-arm64-133.0.6943.141/chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium"
    );
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return chromePath;
}

// 🚀 Launch Puppeteer (works both locally & on Render)
async function launchBrowser() {
  const executablePath = getChromePath();
  console.log("🔍 Using Chrome binary path:", executablePath);

  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
    console.log("✅ Puppeteer launched successfully");
    return browser;
  } catch (err) {
    console.error("❌ Puppeteer launch failed:", err.message);
    console.error(
      "💡 Tip: If running locally, delete node_modules/.puppeteer_cache and reinstall Chrome using:\n   npx puppeteer browsers install chrome --path ./node_modules/.puppeteer_cache"
    );
    throw err;
  }
}

// 🧠 Financial & Trading Keywords
const FINANCIAL_KEYWORDS = [
  "markets",
  "stocks",
  "ipo",
  "mutual-funds",
  "economy",
  "companies",
  "banks-finance",
  "personal-finance",
  "business",
];

// ✅ Helper: check if URL belongs to financial/trading category
function isFinancialUrl(url) {
  return FINANCIAL_KEYWORDS.some((word) => url.includes(`/news/${word}/`));
}

// 🧹 Clean URL (remove UTM params)
function cleanUrl(url) {
  try {
    const u = new URL(url);
    u.search = "";
    return u.toString();
  } catch {
    return url;
  }
}

// 🕸️ Scrape article details using Puppeteer (browser-rendered)
async function scrapeArticle(url, browser) {
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
    );
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 0 });

    const html = await page.content();
    const $ = cheerio.load(html);

    const title = $("h1.article_title").text().trim();
    const description = $("h2.article_desc").text().trim();

    const paragraphs = [];
    $("#contentdata p").each((_, el) => {
      const text = $(el).text().trim();
      if (text) paragraphs.push(text);
    });

    const content = paragraphs.join("\n\n");
    await page.close();

    if (!title || !content) return null;

    return {
      title,
      description,
      content,
      url: cleanUrl(url),
      date: new Date().toISOString(),
    };
  } catch (e) {
    console.error("❌ Scrape error:", e.message);
    return null;
  }
}

// 📡 Fetch financial news links from Moneycontrol using Puppeteer
async function fetchRecentFinancialLinks(browser) {
  try {
    const categoryUrls = [
      "https://www.moneycontrol.com/news/business/",
      "https://www.moneycontrol.com/news/business/markets/",
    ];

    const links = new Set();

    for (const feedUrl of categoryUrls) {
      console.log(`🌐 Fetching category: ${feedUrl}`);
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
      );

      await page.goto(feedUrl, { waitUntil: "domcontentloaded", timeout: 0 });
      const html = await page.content();
      await page.close();

      const $ = cheerio.load(html);

      $("#cagetory li.clearfix").each((_, el) => {
        const href = $(el).find("a").attr("href");
        if (!href) return;

        const absoluteUrl = href.startsWith("http")
          ? href
          : `https://www.moneycontrol.com${href}`;

        // ❌ Skip /news/business/earnings/
        if (absoluteUrl.includes("/news/business/earnings/")) return;

        // ✅ Include only financial/trading links
        if (
          absoluteUrl.includes("https://www.moneycontrol.com/news/") &&
          isFinancialUrl(absoluteUrl)
        ) {
          links.add(cleanUrl(absoluteUrl));
        }
      });

      console.log(`✅ Found ${links.size} links so far...`);
      await new Promise((r) => setTimeout(r, 1000)); // slight delay
    }

    console.log(`✅ Total ${links.size} financial/trading links collected.`);
    return Array.from(links);
  } catch (error) {
    console.error("❌ Error fetching links:", error.message);
    return [];
  }
}

// 🚀 Main scraping function
async function runScraper(backendApiUrl) {
  const startTime = new Date();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`🕐 [${startTime.toISOString()}] Starting scraper...`);
  console.log(`${"=".repeat(60)}`);

  const Article = require("../models/Article");
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const oldArticles = await Article.deleteMany({ createdAt: { $lt: todayStart } });
  if (oldArticles.deletedCount > 0)
    console.log(`🧹 Cleaned ${oldArticles.deletedCount} old articles`);

  const browser = await launchBrowser();

  const links = await fetchRecentFinancialLinks(browser);
  console.log(`🔗 Total filtered links: ${links.length}`);

  if (links.length === 0) {
    console.log("ℹ️ No new articles found.");
    await browser.close();
    return { success: true, count: 0 };
  }

  let savedCount = 0,
    existingCount = 0,
    skippedCount = 0;

  for (const link of links) {
    const article = await scrapeArticle(link, browser);
    if (!article) {
      console.log(`⚠️ Skipped: ${link}`);
      skippedCount++;
      continue;
    }

    try {
      const response = await axios.post(backendApiUrl, article, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });

      const isNew = response.data.isNew || response.data.wasCreated;
      if (isNew) {
        console.log(`✅ NEW: ${article.title.substring(0, 60)}...`);
        savedCount++;
      } else {
        console.log(
          `ℹ️ EXISTS: ${article.title.substring(0, 60)}... (in database)`
        );
        existingCount++;
      }
    } catch (err) {
      console.error(`❌ POST error: ${err.message}`);
      skippedCount++;
    }

    await new Promise((r) => setTimeout(r, 1500)); // small delay
  }

  await browser.close();

  const endTime = new Date();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 SUMMARY`);
  console.log(`   ✅ New: ${savedCount}`);
  console.log(`   ℹ️ Existing: ${existingCount}`);
  console.log(`   ⚠️ Skipped: ${skippedCount}`);
  console.log(`   ⏱️ Duration: ${duration}s`);
  console.log(`${"=".repeat(60)}\n`);

  return {
    success: true,
    new: savedCount,
    existing: existingCount,
    skipped: skippedCount,
    total: links.length,
  };
}

module.exports = { runScraper };



