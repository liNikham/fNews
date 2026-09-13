import sqlite3
import json
import hashlib
import datetime
from config import DB_PATH

def init_db():
    """Initialize SQLite database schema and migrate missing columns."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Primary articles table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            link TEXT UNIQUE NOT NULL,
            link_hash TEXT UNIQUE NOT NULL,
            source_name TEXT,
            category TEXT,
            pub_date TEXT,
            raw_summary TEXT,
            content TEXT,
            feynman_eli5 TEXT,
            feynman_jargon TEXT,
            feynman_past_context TEXT,
            feynman_future_impact TEXT,
            feynman_connected_news TEXT,
            feynman_money_psychology TEXT,
            detective_loopholes TEXT,
            actionable_blueprint TEXT,
            importance_score INTEGER DEFAULT 7,
            is_bookmarked INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Source-wise hourly scraping stats table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS source_scrape_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_name TEXT UNIQUE NOT NULL,
            category TEXT,
            total_fetched INTEGER DEFAULT 0,
            important_saved INTEGER DEFAULT 0,
            last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Auto-migration for existing databases
    cursor.execute("PRAGMA table_info(articles)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if "detective_loopholes" not in columns:
        cursor.execute("ALTER TABLE articles ADD COLUMN detective_loopholes TEXT")
    if "actionable_blueprint" not in columns:
        cursor.execute("ALTER TABLE articles ADD COLUMN actionable_blueprint TEXT")
    if "importance_score" not in columns:
        cursor.execute("ALTER TABLE articles ADD COLUMN importance_score INTEGER DEFAULT 7")

    cursor.execute('CREATE INDEX IF NOT EXISTS idx_category ON articles(category)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_created_at ON articles(created_at)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_importance ON articles(importance_score)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_hash ON articles(link_hash)')
    
    conn.commit()
    conn.close()

def compute_hash(link_or_title: str) -> str:
    """Compute MD5 hash for link deduplication."""
    return hashlib.md5(link_or_title.strip().encode('utf-8')).hexdigest()

def article_exists(link: str) -> bool:
    """Check if article already exists in DB."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    link_hash = compute_hash(link)
    cursor.execute('SELECT 1 FROM articles WHERE link_hash = ?', (link_hash,))
    exists = cursor.fetchone() is not None
    conn.close()
    return exists

def record_source_stat(source_name: str, category: str, total_fetched: int, important_saved: int):
    """Upsert source-wise scraping metrics."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute('''
        INSERT INTO source_scrape_stats (source_name, category, total_fetched, important_saved, last_scraped_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(source_name) DO UPDATE SET
            total_fetched = excluded.total_fetched,
            important_saved = excluded.important_saved,
            last_scraped_at = excluded.last_scraped_at
    ''', (source_name, category, total_fetched, important_saved, now_str))
    
    conn.commit()
    conn.close()

def get_source_stats():
    """Retrieve latest source-wise scraping breakdown."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM source_scrape_stats ORDER BY total_fetched DESC')
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def save_article(article_data: dict) -> int:
    """Save parsed & simplified article into DB."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    link_hash = compute_hash(article_data['link'])
    jargon_json = json.dumps(article_data.get('feynman_jargon', []))
    
    try:
        cursor.execute('''
            INSERT INTO articles (
                title, link, link_hash, source_name, category, pub_date,
                raw_summary, content, feynman_eli5, feynman_jargon,
                feynman_past_context, feynman_future_impact,
                feynman_connected_news, feynman_money_psychology,
                detective_loopholes, actionable_blueprint, importance_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            article_data['title'],
            article_data['link'],
            link_hash,
            article_data.get('source_name', 'Indian News'),
            article_data.get('category', 'Finance'),
            article_data.get('pub_date', ''),
            article_data.get('raw_summary', ''),
            article_data.get('content', ''),
            article_data.get('feynman_eli5', ''),
            jargon_json,
            article_data.get('feynman_past_context', ''),
            article_data.get('feynman_future_impact', ''),
            article_data.get('feynman_connected_news', ''),
            article_data.get('feynman_money_psychology', ''),
            article_data.get('detective_loopholes', ''),
            article_data.get('actionable_blueprint', ''),
            article_data.get('importance_score', 7)
        ))
        conn.commit()
        article_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        article_id = -1
    finally:
        conn.close()
        
    return article_id

def get_articles(category=None, query=None, limit=5, offset=0, bookmarked_only=False):
    """Retrieve top articles ordered by highest importance_score and recency."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    sql = "SELECT * FROM articles WHERE 1=1"
    params = []
    
    if category and category.lower() != 'all':
        sql += " AND category = ?"
        params.append(category)
        
    if bookmarked_only:
        sql += " AND is_bookmarked = 1"
        
    if query:
        sql += " AND (title LIKE ? OR feynman_eli5 LIKE ? OR raw_summary LIKE ? OR feynman_jargon LIKE ? OR detective_loopholes LIKE ? OR actionable_blueprint LIKE ?)"
        q = f"%{query}%"
        params.extend([q, q, q, q, q, q])
        
    # Strictly order by highest importance score first, then newest ID
    sql += " ORDER BY importance_score DESC, id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    
    articles = []
    for r in rows:
        item = dict(r)
        try:
            item['feynman_jargon'] = json.loads(item['feynman_jargon'])
        except Exception:
            item['feynman_jargon'] = []
        articles.append(item)
        
    conn.close()
    return articles

def toggle_bookmark(article_id: int):
    """Toggle bookmark status of an article."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('UPDATE articles SET is_bookmarked = 1 - is_bookmarked WHERE id = ?', (article_id,))
    conn.commit()
    cursor.execute('SELECT is_bookmarked FROM articles WHERE id = ?', (article_id,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else 0

def get_stats():
    """Get aggregate statistics for dashboard."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM articles')
    total_articles = cursor.fetchone()[0]
    
    cursor.execute('SELECT category, COUNT(*) FROM articles GROUP BY category')
    category_counts = dict(cursor.fetchall())
    
    cursor.execute('SELECT COUNT(*) FROM articles WHERE is_bookmarked = 1')
    total_bookmarks = cursor.fetchone()[0]
    
    conn.close()
    
    source_stats = get_source_stats()
    
    return {
        "total_articles": total_articles,
        "category_counts": category_counts,
        "total_bookmarks": total_bookmarks,
        "source_stats": source_stats
    }
