import os

# Base Directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "db", "news_feynman.db")

# Load environment variables from .env file if it exists
env_file = os.path.join(BASE_DIR, ".env")
if os.path.exists(env_file):
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip().strip('"').strip("'")

# Gemini API Settings - Configured strictly for gemini-3.1-flash-lite
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-3.1-flash-lite"

# --------------------------------------------------------------------------
# THE READER'S REAL NUMBERS
# Every Deep Walk is calibrated to this profile. Edit these values when your
# income, savings or living costs change; new explanations pick them up.
# Explanations are generated on demand, so they always use the values present
# at generation time.
# --------------------------------------------------------------------------
USER_PROFILE = {
    "occupation": "software engineer in India",
    "monthly_income_inr": 50000,
    "savings_inr": 200000,
    "savings_place": "savings bank account",
    "assumed_monthly_expenses_inr": 30000,  # explicit assumption for emergency-fund math
    "emergency_months_target": 6,
}

# Explicit assumptions used for the server-checked arithmetic strip.
ASSUMED_SAVINGS_RATE_PCT = 3.0
ASSUMED_INFLATION_PCT = 5.0
ASSUMED_SIP_RETURN_PCT = 12.0
ASSUMED_SIP_MONTHLY_INR = 10000
ASSUMED_SIP_YEARS = 10
ASSUMED_HOME_LOAN_INR = 3000000
ASSUMED_HOME_LOAN_RATE_PCT = 8.5
ASSUMED_HOME_LOAN_YEARS = 20

# The Deep Walk engine
DEEP_WALK_VERSION = 1
DEEP_MAX_OUTPUT_TOKENS = 8192
DEEP_MAX_ARTICLE_CHARS = 2200

# Scraping settings - Configured for 15-Minute Auto-Refresh!
SCRAPE_INTERVAL_MINUTES = 15
MAX_ARTICLES_PER_FEED = 12
MIN_IMPORTANCE_SCORE = 6  # Only keep high-impact news that affects daily life & wealth!

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
        "url": "https://news.google.com/rss/search?q=Nifty+Sensex+Indian+Stock+Market+when:7d&hl=en-IN&gl=IN&ceid=IN:en",
        "type": "rss"
    },
    {
        "name": "Google News - Banking & RBI",
        "category": "Banking & RBI",
        "url": "https://news.google.com/rss/search?q=RBI+Repo+Rate+Indian+Banks+when:7d&hl=en-IN&gl=IN&ceid=IN:en",
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
