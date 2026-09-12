import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from db.database import init_db, get_articles, toggle_bookmark, get_stats, save_article
from scraper.news_scraper import run_all_scrapers
from scraper.bypass_utils import fetch_page_content, extract_clean_article_text
from engine.feynman import generate_feynman_breakdown
from engine.jargon_dictionary import FINANCIAL_JARGON_DB
from scheduler.cron_job import start_hourly_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    print("[Server] Initializing SQLite database...")
    init_db()
    
    print("[Server] Starting background hourly news scraper...")
    start_hourly_scheduler()
    
    # Run initial scrape in background task so server starts immediately
    asyncio.create_task(run_all_scrapers())
    
    yield
    print("[Server] Shutdown complete.")

app = FastAPI(
    title="Feynman Indian Financial News Engine",
    description="Automated Indian Financial News Aggregator with Richard Feynman First Principles Breakdown",
    version="1.0.0",
    lifespan=lifespan
)

# Mount static assets
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def read_root():
    """Serves the main Feynman News Dashboard."""
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Feynman Indian Financial News Engine API operational"}

@app.get("/api/news")
def fetch_news(
    category: str = Query("all", description="Category filter"),
    query: str = Query(None, description="Search keyword"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    bookmarked_only: bool = Query(False)
):
    """Retrieve simplified news articles from DB."""
    offset = (page - 1) * limit
    articles = get_articles(
        category=category,
        query=query,
        limit=limit,
        offset=offset,
        bookmarked_only=bookmarked_only
    )
    return {"status": "success", "page": page, "count": len(articles), "articles": articles}

@app.post("/api/scrape/now")
async def trigger_manual_scrape():
    """Manually trigger immediate news scraping across all sources."""
    result = await run_all_scrapers()
    return {"status": "success", "message": "Scraping completed", "result": result}

class SimplifyUrlRequest(BaseModel):
    url: str
    category: str = "Finance"

@app.post("/api/simplify-url")
async def simplify_custom_url(req: SimplifyUrlRequest):
    """
    Scrapes ANY financial news URL provided by the user (bypassing anti-bot blocks),
    extracts content, and generates Feynman first-principles breakdown.
    """
    if not req.url or not req.url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL provided")
        
    html_content = await fetch_page_content(req.url)
    if not html_content:
        raise HTTPException(status_code=400, detail="Unable to fetch article from provided URL")
        
    article_text = extract_clean_article_text(html_content)
    if not article_text:
        raise HTTPException(status_code=400, detail="Could not extract readable article text")
        
    # Extract title from text or URL
    lines = [l.strip() for l in article_text.split("\n") if l.strip()]
    title = lines[0] if lines else "Custom Article Analysis"
    if len(title) > 120:
        title = title[:117] + "..."
        
    feynman_breakdown = generate_feynman_breakdown(title, article_text, req.category)
    
    article_record = {
        "title": title,
        "link": req.url,
        "source_name": "Custom Web URL",
        "category": req.category,
        "pub_date": "Just Now",
        "raw_summary": article_text[:400],
        "content": article_text[:2000],
        "feynman_eli5": feynman_breakdown["feynman_eli5"],
        "feynman_jargon": feynman_breakdown["feynman_jargon"],
        "feynman_past_context": feynman_breakdown["feynman_past_context"],
        "feynman_future_impact": feynman_breakdown["feynman_future_impact"],
        "feynman_connected_news": feynman_breakdown["feynman_connected_news"],
        "feynman_money_psychology": feynman_breakdown["feynman_money_psychology"]
    }
    
    save_article(article_record)
    return {"status": "success", "data": article_record}

class SimplifyTextRequest(BaseModel):
    title: str
    text: str
    category: str = "Finance"

@app.post("/api/simplify-text")
def simplify_custom_text(req: SimplifyTextRequest):
    """Generates Feynman simplification for custom raw text."""
    if not req.text:
        raise HTTPException(status_code=400, detail="Text body is required")
        
    feynman_breakdown = generate_feynman_breakdown(req.title or "Financial News", req.text, req.category)
    return {"status": "success", "data": feynman_breakdown}

@app.post("/api/bookmark/{article_id}")
def bookmark_article(article_id: int):
    """Toggle article bookmark status."""
    new_state = toggle_bookmark(article_id)
    return {"status": "success", "article_id": article_id, "is_bookmarked": new_state}

@app.get("/api/jargon")
def search_jargon(query: str = None):
    """Search or list terms in the Feynman Jargon Dictionary."""
    terms = list(FINANCIAL_JARGON_DB.values())
    if query:
        q = query.lower()
        terms = [t for t in terms if q in t["term"].lower() or q in t["eli5"].lower() or q in t["category"].lower()]
    return {"status": "success", "count": len(terms), "terms": terms}

@app.get("/api/stats")
def fetch_stats():
    """Get dashboard stats."""
    return {"status": "success", "stats": get_stats()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
