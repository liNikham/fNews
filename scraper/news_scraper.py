import feedparser
import asyncio
import datetime
import html
import re
from config import NEWS_SOURCES, MAX_ARTICLES_PER_FEED, MIN_IMPORTANCE_SCORE
from scraper.bypass_utils import fetch_page_content, extract_clean_article_text
from engine.feynman import generate_feynman_breakdown
from db.database import article_exists, save_article, record_source_stat, ensure_string

def clean_html_tags(raw_html: str) -> str:
    """Removes HTML markup from RSS summary strings."""
    if not raw_html:
        return ""
    clean = re.sub(r'<[^>]+>', '', raw_html)
    return html.unescape(clean).strip()

async def scrape_single_source(source: dict) -> dict:
    """Scrapes a single news source, filters for high-impact stories, generates Detective Feynman breakdown, and records metrics."""
    source_name = source["name"]
    category = source["category"]
    url = source["url"]
    
    print(f"[News Scraper] Checking {source_name} ({category})...")
    saved_count = 0
    total_fetched = 0
    
    try:
        raw_xml = await fetch_page_content(url)
        if not raw_xml:
            feed = feedparser.parse(url)
        else:
            feed = feedparser.parse(raw_xml)
            
        entries = feed.entries[:MAX_ARTICLES_PER_FEED]
        total_fetched = len(entries)
        
        for entry in entries:
            title = clean_html_tags(getattr(entry, 'title', ''))
            link = getattr(entry, 'link', '')
            
            if not title or not link:
                continue
                
            if article_exists(link):
                continue
                
            summary = clean_html_tags(getattr(entry, 'summary', getattr(entry, 'description', '')))
            pub_date = getattr(entry, 'published', getattr(entry, 'updated', str(datetime.datetime.now())))
            
            content = summary
            if len(summary) < 150:
                html_body = await fetch_page_content(link)
                extracted_body = extract_clean_article_text(html_body)
                if extracted_body:
                    content = extracted_body
                    
            # Process via Financial Detective Feynman Engine
            feynman_data = generate_feynman_breakdown(title, content, category)
            importance_score = feynman_data.get("importance_score", 7)
            
            # Filter low-importance noise
            if importance_score < MIN_IMPORTANCE_SCORE:
                print(f"[News Scraper] Filtered out low-impact story (Score {importance_score}): {title[:50]}...")
                continue
                
            article_record = {
                "title": title,
                "link": link,
                "source_name": source_name,
                "category": category,
                "pub_date": pub_date,
                "raw_summary": summary[:400],
                "content": content[:2500],
                "feynman_eli5": ensure_string(feynman_data.get("feynman_eli5", "")),
                "feynman_jargon": feynman_data.get("feynman_jargon", []),
                "feynman_past_context": ensure_string(feynman_data.get("feynman_past_context", "")),
                "feynman_future_impact": ensure_string(feynman_data.get("feynman_future_impact", "")),
                "feynman_connected_news": ensure_string(feynman_data.get("feynman_connected_news", "")),
                "feynman_money_psychology": ensure_string(feynman_data.get("feynman_money_psychology", "")),
                "detective_loopholes": ensure_string(feynman_data.get("detective_loopholes", "")),
                "actionable_blueprint": ensure_string(feynman_data.get("actionable_blueprint", "")),
                "importance_score": importance_score
            }
            
            res_id = save_article(article_record)
            if res_id > 0:
                saved_count += 1
                
    except Exception as e:
        print(f"[News Scraper] Error checking {source_name}: {e}")
        
    record_source_stat(source_name, category, total_fetched, saved_count)
    
    print(f"[News Scraper] {source_name}: {total_fetched} fetched, {saved_count} high-impact stories saved.")
    
    return {
        "source_name": source_name,
        "category": category,
        "total_fetched": total_fetched,
        "important_saved": saved_count
    }

async def run_all_scrapers() -> dict:
    """Runs scrapers across all Indian financial news sources concurrently and generates a detailed report."""
    print("[News Scraper] Starting full scraping cycle across all sources...")
    tasks = [scrape_single_source(src) for src in NEWS_SOURCES]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    detailed_reports = []
    total_new = 0
    total_fetched = 0
    
    for r in results:
        if isinstance(r, dict):
            detailed_reports.append(r)
            total_new += r.get("important_saved", 0)
            total_fetched += r.get("total_fetched", 0)
            
    print(f"[News Scraper] Scraping cycle complete. Total fetched: {total_fetched}, High-Impact saved: {total_new}")
    return {
        "total_fetched": total_fetched,
        "total_new_saved": total_new,
        "source_breakdown": detailed_reports,
        "timestamp": str(datetime.datetime.now())
    }
