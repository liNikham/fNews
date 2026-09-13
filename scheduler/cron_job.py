import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from scraper.news_scraper import run_all_scrapers
from config import SCRAPE_INTERVAL_MINUTES

scheduler = AsyncIOScheduler()

def start_hourly_scheduler():
    """Starts the background scheduler for automated news scraping every 15 minutes."""
    scheduler.add_job(
        func=scheduled_scraping_task,
        trigger="interval",
        minutes=SCRAPE_INTERVAL_MINUTES,
        id="15min_news_scraper",
        replace_existing=True
    )
    scheduler.start()
    print(f"[Scheduler] Background news scraper started. Runs every {SCRAPE_INTERVAL_MINUTES} minutes.")

async def scheduled_scraping_task():
    """Asynchronous wrapper for scheduled scraper job."""
    print("[Scheduler] Triggering 15-minute scheduled scraping task...")
    try:
        await run_all_scrapers()
    except Exception as e:
        print(f"[Scheduler] Error during scheduled scraping: {e}")
