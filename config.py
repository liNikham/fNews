import os

# Base Directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "db", "news_feynman.db")

# Scraping settings
SCRAPE_INTERVAL_HOURS = 1
MAX_ARTICLES_PER_FEED = 10

# Indian Financial News Sources (RSS feeds & Direct Stealth Targets)
NEWS_SOURCES = [
    {
        "name": "Google News - India Finance & Economy",
        "category": "Economy & Policy",
        "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-IN&gl=IN&ceid=IN:en",
        "type": "rss"
    },
    {
        "name": "Google News - Indian Stock Markets",
        "category": "Stocks & Equity",
        "url": "https://news.google.com/rss/search?q=Nifty+Sensex+Indian+Stock+Market&hl=en-IN&gl=IN&ceid=IN:en",
        "type": "rss"
    },
    {
        "name": "Google News - Banking & RBI",
        "category": "Banking & RBI",
        "url": "https://news.google.com/rss/search?q=RBI+Repo+Rate+Indian+Banks&hl=en-IN&gl=IN&ceid=IN:en",
        "type": "rss"
    },
    {
        "name": "Economic Times - Markets",
        "category": "Stocks & Equity",
        "url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
        "type": "rss"
    },
    {
        "name": "Economic Times - Finance",
        "category": "Economy & Policy",
        "url": "https://economictimes.indiatimes.com/news/economy/finance/rssfeeds/1286551815.cms",
        "type": "rss"
    },
    {
        "name": "Moneycontrol - Market News",
        "category": "Stocks & Equity",
        "url": "https://www.moneycontrol.com/rss/marketreports.xml",
        "type": "rss"
    },
    {
        "name": "LiveMint - Markets",
        "category": "Stocks & Equity",
        "url": "https://www.livemint.com/rss/markets",
        "type": "rss"
    },
    {
        "name": "LiveMint - Money & Savings",
        "category": "Savings & Personal Finance",
        "url": "https://www.livemint.com/rss/money",
        "type": "rss"
    },
    {
        "name": "Financial Express - Market",
        "category": "Stocks & Equity",
        "url": "https://www.financialexpress.com/market/feed/",
        "type": "rss"
    },
    {
        "name": "Business Standard - Finance",
        "category": "Economy & Policy",
        "url": "https://www.business-standard.com/rss/finance-103.rss",
        "type": "rss"
    }
]

# Realistic User Agents Pool for Anti-Bot Bypass
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
]

DEFAULT_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
    "Cache-Control": "max-age=0",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-User": "?1"
}
