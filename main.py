import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from db.database import init_db, get_articles, toggle_bookmark, get_stats, save_article, get_source_stats
from scraper.news_scraper import run_all_scrapers
from scraper.bypass_utils import fetch_page_content, extract_clean_article_text
from engine.feynman import generate_feynman_breakdown
from engine.jargon_dictionary import FINANCIAL_JARGON_DB
from scheduler.cron_job import start_hourly_scheduler

async def delayed_initial_scrape():
    """Runs initial news scraping pass 3 seconds AFTER server port is bound, preventing Render port check delay."""
    await asyncio.sleep(3.0)
    print("[Server] Executing initial background news scraping cycle...")
    try:
        await run_all_scrapers()
    except Exception as e:
        print(f"[Server] Note on initial scrape: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Server] Initializing SQLite database...")
    init_db()
    
    print("[Server] Starting background 15-minute news scraper scheduler...")
    start_hourly_scheduler()
    
    # Schedule initial scrape asynchronously after uvicorn binds port 0.0.0.0:$PORT
    asyncio.create_task(delayed_initial_scrape())
    
    yield
    print("[Server] Shutdown complete.")

app = FastAPI(
    title="Feynman Finance India — Top 5 Wealth Detective Engine",
    description="Automated Indian Financial News Aggregator focusing on Top 5 High-Impact Stories with Feynman First Principles & Financial Detective Wealth Blueprint",
    version="2.2.0",
    lifespan=lifespan
)

static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def read_root():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Feynman Finance India API Operational"}

@app.get("/health")
def health_check():
    """Render / Cloud platform health check endpoint."""
    return {"status": "ok", "service": "feynman-finance-india"}

@app.get("/api/news")
def fetch_news(
    category: str = Query("all", description="Category filter"),
    query: str = Query(None, description="Search keyword"),
    page: int = Query(1, ge=1),
    limit: int = Query(5, ge=1, le=100),
    bookmarked_only: bool = Query(False)
):
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
    result = await run_all_scrapers()
    return {"status": "success", "message": "Scraping completed", "result": result}

class SimplifyUrlRequest(BaseModel):
    url: str
    category: str = "Finance"

@app.post("/api/simplify-url")
async def simplify_custom_url(req: SimplifyUrlRequest):
    if not req.url or not req.url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL provided")
        
    html_content = await fetch_page_content(req.url)
    if not html_content:
        raise HTTPException(status_code=400, detail="Unable to fetch article from provided URL")
        
    article_text = extract_clean_article_text(html_content)
    if not article_text:
        raise HTTPException(status_code=400, detail="Could not extract readable article text")
        
    lines = [l.strip() for l in article_text.split("\n") if l.strip()]
    title = lines[0] if lines else "Custom Article Analysis"
    if len(title) > 120:
        title = title[:117] + "..."
        
    feynman_breakdown = generate_feynman_breakdown(title, article_text, req.category)
    
    article_record = {
        "title": title,
        "link": req.url,
        "source_name": "Custom Web Link",
        "category": req.category,
        "pub_date": "Just Now",
        "raw_summary": article_text[:400],
        "content": article_text[:2500],
        "feynman_eli5": feynman_breakdown.get("feynman_eli5", ""),
        "feynman_jargon": feynman_breakdown.get("feynman_jargon", []),
        "feynman_past_context": feynman_breakdown.get("feynman_past_context", ""),
        "feynman_future_impact": feynman_breakdown.get("feynman_future_impact", ""),
        "feynman_connected_news": feynman_breakdown.get("feynman_connected_news", ""),
        "feynman_money_psychology": feynman_breakdown.get("feynman_money_psychology", ""),
        "detective_loopholes": feynman_breakdown.get("detective_loopholes", ""),
        "actionable_blueprint": feynman_breakdown.get("actionable_blueprint", ""),
        "importance_score": feynman_breakdown.get("importance_score", 9)
    }
    
    save_article(article_record)
    return {"status": "success", "data": article_record}

class SimplifyTextRequest(BaseModel):
    title: str
    text: str
    category: str = "Finance"

@app.post("/api/simplify-text")
def simplify_custom_text(req: SimplifyTextRequest):
    if not req.text:
        raise HTTPException(status_code=400, detail="Text body is required")
        
    feynman_breakdown = generate_feynman_breakdown(req.title or "Financial Article", req.text, req.category)
    return {"status": "success", "data": feynman_breakdown}

@app.post("/api/bookmark/{article_id}")
def bookmark_article(article_id: int):
    new_state = toggle_bookmark(article_id)
    return {"status": "success", "article_id": article_id, "is_bookmarked": new_state}

@app.get("/api/jargon")
def search_jargon(query: str = None):
    terms = list(FINANCIAL_JARGON_DB.values())
    if query:
        q = query.lower()
        terms = [t for t in terms if q in t["term"].lower() or q in t["eli5"].lower() or q in t["category"].lower()]
    return {"status": "success", "count": len(terms), "terms": terms}

@app.get("/api/sources")
def fetch_sources_report():
    stats = get_source_stats()
    return {"status": "success", "sources": stats}

@app.get("/api/stats")
def fetch_stats():
    return {"status": "success", "stats": get_stats()}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
