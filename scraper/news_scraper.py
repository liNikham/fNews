import feedparser
import asyncio
import datetime
import html
import re
from config import NEWS_SOURCES, MAX_ARTICLES_PER_FEED
from scraper.bypass_utils import fetch_page_content, extract_clean_article_text
from engine.feynman import generate_feynman_breakdown
from db.database import article_exists, save_article

def clean_html_tags(raw_html: str) -> str:
    """Removes HTML markup from RSS summary strings."""
    if not raw_html:
        return ""
    clean = re.sub(r'<[^>]+>', '', raw_html)
    return html.unescape(clean).strip()

async def scrape_single_source(source: dict) -> int:
    """Scrapes a single news source, extracts new articles, generates Feynman analysis, and saves to DB."""
    source_name = source["name"]
    category = source["category"]
    url = source["url"]
    
    print(f"[News Scraper] Scraping {source_name} ({category})...")
    saved_count = 0
    
    try:
        # Fetch feed XML with stealth headers
        raw_xml = await fetch_page_content(url)
        if not raw_xml:
            # Fallback to direct feedparser URL parse
            feed = feedparser.parse(url)
        else:
            feed = feedparser.parse(raw_xml)
            
        entries = feed.entries[:MAX_ARTICLES_PER_FEED]
        
        for entry in entries:
            title = clean_html_tags(getattr(entry, 'title', ''))
            link = getattr(entry, 'link', '')
            
            if not title or not link:
                continue
                
            # Check DB deduplication
            if article_exists(link):
                continue
                
            summary = clean_html_tags(getattr(entry, 'summary', getattr(entry, 'description', '')))
            pub_date = getattr(entry, 'published', getattr(entry, 'updated', str(datetime.datetime.now())))
            
            # Fetch full body content if summary is short
            content = summary
            if len(summary) < 150:
                html_body = await fetch_page_content(link)
                extracted_body = extract_clean_article_text(html_body)
                if extracted_body:
                    content = extracted_body
                    
            # Process via Feynman Simplification Engine
            feynman_data = generate_feynman_breakdown(title, content, category)
            
            article_record = {
                "title": title,
                "link": link,
                "source_name": source_name,
                "category": category,
                "pub_date": pub_date,
                "raw_summary": summary[:400],
                "content": content[:2000],
                "feynman_eli5": feynman_data["feynman_eli5"],
                "feynman_jargon": feynman_data["feynman_jargon"],
                "feynman_past_context": feynman_data["feynman_past_context"],
                "feynman_future_impact": feynman_data["feynman_future_impact"],
                "feynman_connected_news": feynman_data["feynman_connected_news"],
                "feynman_money_psychology": feynman_data["feynman_money_psychology"]
            }
            
            res_id = save_article(article_record)
            if res_id > 0:
                saved_count += 1
                
    except Exception as e:
        print(f"[News Scraper] Error scraping {source_name}: {e}")
        
    print(f"[News Scraper] Finished {source_name}: {saved_count} new articles saved.")
    return saved_count

async def run_all_scrapers() -> dict:
    """Runs scrapers for all configured Indian financial news sources concurrently."""
    print("[News Scraper] Starting full scraping cycle across all sources...")
    tasks = [scrape_single_source(src) for src in NEWS_SOURCES]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    total_new = sum(r for r in results if isinstance(r, int))
    print(f"[News Scraper] Scraping cycle complete. Total new simplified articles added: {total_new}")
    return {"total_new": total_new, "timestamp": str(datetime.datetime.now())}
