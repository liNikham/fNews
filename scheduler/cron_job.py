import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from scraper.news_scraper import run_all_scrapers
from config import SCRAPE_INTERVAL_HOURS

scheduler = AsyncIOScheduler()

def start_hourly_scheduler():
    """Starts the background scheduler for automated news scraping every 1 hour."""
    scheduler.add_job(
        func=scheduled_scraping_task,
        trigger="interval",
        hours=SCRAPE_INTERVAL_HOURS,
        id="hourly_news_scraper",
        replace_existing=True
    )
    scheduler.start()
    print(f"[Scheduler] Background hourly scraper started. Runs every {SCRAPE_INTERVAL_HOURS} hour(s).")

async def scheduled_scraping_task():
    """Asynchronous wrapper for scheduled scraper job."""
    print("[Scheduler] Triggering scheduled hourly scraping task...")
    try:
        await run_all_scrapers()
    except Exception as e:
        print(f"[Scheduler] Error during scheduled scraping: {e}")
