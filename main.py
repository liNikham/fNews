import os
import json
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from db.database import (
    init_db, get_articles, toggle_bookmark, mark_as_read,
    get_stats, save_article, get_source_stats, get_raw_scraped_feed,
    get_article_by_id, update_article_deep
)
from scraper.news_scraper import run_all_scrapers
from scraper.bypass_utils import fetch_page_content, extract_clean_article_text
from engine.feynman import generate_deep_walk, derive_legacy_columns, build_legacy_walk
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
    await asyncio.to_thread(init_db)
    
    print("[Server] Starting background 15-minute news scraper scheduler...")
    start_hourly_scheduler()
    
    # Schedule initial scrape asynchronously after uvicorn binds port 0.0.0.0:$PORT
    asyncio.create_task(delayed_initial_scrape())
    
    yield
    print("[Server] Shutdown complete.")

app = FastAPI(
    title="The Deep Walk — First-Principles Indian Finance",
    description="Indian financial news explained as one continuous walk: the fact, the real institutions, the governing mathematics, the incentives, the emotions, and your own money.",
    version="3.0.0",
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


def public_article(article: dict) -> dict:
    """Article row without the heavy Deep Walk JSON (sent separately)."""
    if not article:
        return article
    clean = dict(article)
    clean.pop("deep_explanation", None)
    return clean


@app.get("/api/article/{article_id}")
def fetch_article_detail(article_id: int):
    """One story plus its Deep Walk. Old stories are adapted server-side into
    the same continuous format so the frontend never needs two layouts."""
    article = get_article_by_id(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    walk = article.get("deep_explanation")
    walk_source = "deep"
    if not walk:
        walk = build_legacy_walk(article)
        walk_source = "unexplained" if (walk.get("meta") or {}).get("unexplained") else "legacy"

    return {
        "status": "success",
        "article": public_article(article),
        "walk": walk,
        "walk_source": walk_source
    }

@app.get("/api/news")
def fetch_news(
    category: str = Query("all", description="Category filter"),
    query: str = Query(None, description="Search keyword"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),  # Defaults to Top 10 Stories!
    bookmarked_only: bool = Query(False),
    include_read: bool = Query(False),
    sort_by: str = Query("latest", description="Sort order: 'latest' or 'impact'")
):
    offset = (page - 1) * limit
    articles = get_articles(
        category=category,
        query=query,
        limit=limit,
        offset=offset,
        bookmarked_only=bookmarked_only,
        include_read=include_read,
        sort_by=sort_by
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
        
    walk = generate_deep_walk(title, article_text, req.category)
    derived = derive_legacy_columns(walk)
    try:
        jargon_list = json.loads(derived.get("feynman_jargon") or "[]")
    except Exception:
        jargon_list = []

    article_record = {
        "title": title,
        "link": req.url,
        "source_name": "Custom Web Link",
        "category": req.category,
        "pub_date": "Just Now",
        "raw_summary": article_text[:400],
        "content": article_text[:2500],
        "news_summary": walk.get("news_summary", article_text[:400]),
        "feynman_eli5": derived.get("feynman_eli5", ""),
        "feynman_jargon": jargon_list,
        "feynman_past_context": derived.get("feynman_past_context", ""),
        "feynman_future_impact": derived.get("feynman_future_impact", ""),
        "feynman_connected_news": derived.get("feynman_connected_news", ""),
        "feynman_money_psychology": derived.get("feynman_money_psychology", ""),
        "detective_loopholes": derived.get("detective_loopholes", ""),
        "actionable_blueprint": derived.get("actionable_blueprint", ""),
        "importance_score": derived.get("importance_score", 8),
        "deep_explanation": walk
    }

    article_id = save_article(article_record)
    article_record["id"] = article_id
    return {
        "status": "success",
        "data": article_record,
        "walk": walk,
        "walk_source": (walk.get("meta") or {}).get("generator", "local")
    }

class SimplifyTextRequest(BaseModel):
    title: str
    text: str
    category: str = "Finance"

@app.post("/api/simplify-text")
def simplify_custom_text(req: SimplifyTextRequest):
    if not req.text:
        raise HTTPException(status_code=400, detail="Text body is required")

    walk = generate_deep_walk(req.title or "Financial Article", req.text, req.category)
    return {
        "status": "success",
        "data": walk,
        "walk": walk,
        "walk_source": (walk.get("meta") or {}).get("generator", "local")
    }

@app.post("/api/simplify/{article_id}")
async def simplify_existing_article(article_id: int):
    """Generates the Deep Walk on demand for a single article."""
    article = get_article_by_id(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    title = article['title']
    content = article.get('content') or article.get('raw_summary') or title
    category = article.get('category', 'Finance')
    existing_walk = article.get('deep_explanation')

    walk = await asyncio.to_thread(generate_deep_walk, title, content, category)
    generator = (walk.get('meta') or {}).get('generator', 'local')
    derived = derive_legacy_columns(walk)

    # A live AI walk overwrites the legacy columns. An offline walk may be
    # stored for an article that has nothing better, but it never replaces
    # existing good analysis.
    should_persist = generator == 'gemini' or not existing_walk
    if should_persist:
        update_article_deep(article_id, walk, derived, overwrite_legacy=(generator == 'gemini'))
        updated_article = get_article_by_id(article_id)
    else:
        updated_article = article

    return {
        "status": "success",
        "data": public_article(updated_article),
        "walk": walk,
        "walk_source": generator
    }

@app.post("/api/bookmark/{article_id}")
def bookmark_article(article_id: int):
    new_state = toggle_bookmark(article_id)
    return {"status": "success", "article_id": article_id, "is_bookmarked": new_state}

@app.post("/api/read/{article_id}")
def mark_article_read(article_id: int):
    """Mark article as read so next fresh unread story slides up into Top 10."""
    new_state = mark_as_read(article_id)
    return {"status": "success", "article_id": article_id, "is_read": new_state}

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

@app.get("/api/raw-feed")
def fetch_raw_scraped_feed(limit: int = Query(50, ge=1, le=200)):
    """Transparent raw log of all scraped articles across all sources."""
    feed = get_raw_scraped_feed(limit=limit)
    return {"status": "success", "count": len(feed), "raw_feed": feed}

@app.get("/api/stats")
def fetch_stats():
    return {"status": "success", "stats": get_stats()}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
