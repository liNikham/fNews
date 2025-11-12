if (typeof File === "undefined") global.File = class File {};

const axios = require("axios");
const cheerio = require("cheerio");

// 🌐 Your backend API endpoint
const BACKEND_API =
  process.env.BACKEND_API || "http://localhost:4000/api/articles";

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

// ✅ Check if URL is financial/trading related
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

// 📅 Check if <time> tag is today or yesterday
function isRecent(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();

  // Difference in days (UTC-based)
  const diffMs = now - date;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays <= 1.5; // last ~36 hours covers today + yesterday
}

// 🕸️ Scrape full article from Moneycontrol
async function scrapeArticle(url) {
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(html);
    const title = $("h1.article_title").text().trim();
    const description = $("h2.article_desc").text().trim();

    const paragraphs = [];
    $("#contentdata")
      .find("p")
      .each((_, el) => {
        const text = $(el).text().trim();
        if (text) paragraphs.push(text);
      });

    const content = paragraphs.join("\n\n");

    return {
      title,
      description,
      content,
      url: cleanUrl(url),
      date: new Date().toISOString(),
    };
  } catch (e) {
    console.error("❌ scrape error:", e.message);
    return null;
  }
}

// 📡 Fetch today’s + yesterday’s financial links from Telegram
async function fetchRecentFinancialLinks() {
  const feedUrl = "https://t.me/s/moneycontrolcom";
  const { data } = await axios.get(feedUrl);
  const $ = cheerio.load(data);
  const links = new Set();

  $(".tgme_widget_message_wrap").each((_, msg) => {
    const timeTag = $(msg).find("time").attr("datetime");
    if (isRecent(timeTag)) {
      $(msg)
        .find("a")
        .each((_, el) => {
          const href = $(el).attr("href");
          if (
            href &&
            href.includes("https://www.moneycontrol.com/news/") &&
            isFinancialUrl(href)
          ) {
            const clean = cleanUrl(href);
            links.add(clean);
          }
        });
    }
  });

  console.log(
    `✅ Found ${links.size} financial/trading links from today & yesterday.`
  );
  return Array.from(links);
}

// 🚀 Run everything
(async () => {
  const links = await fetchRecentFinancialLinks();
  console.log(`🔗 Total filtered links: ${links.length}`);

  for (const link of links) {
    console.log(`📰 Scraping: ${link}`);

    const article = await scrapeArticle(link);
    if (!article || !article.content) {
      console.log(`⚠️ Skipped (no content): ${link}`);
      continue;
    }

    try {
      await axios.post(BACKEND_API, article, {
        headers: { "Content-Type": "application/json" },
      });
      console.log(`✅ Saved to backend: ${article.title}`);
    } catch (err) {
      console.error(`❌ POST error: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, 1500)); // polite delay
  }

  console.log(
    "📁 Done — all financial/trading articles (today + yesterday) synced with backend."
  );
})();

