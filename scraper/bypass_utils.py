import random
import asyncio
import httpx
from bs4 import BeautifulSoup
import trafilatura
from config import USER_AGENTS, DEFAULT_HEADERS

def get_stealth_headers():
    """Returns randomized realistic browser headers to bypass basic anti-bot filters."""
    headers = DEFAULT_HEADERS.copy()
    headers["User-Agent"] = random.choice(USER_AGENTS)
    headers["Sec-Ch-Ua"] = '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"'
    headers["Sec-Ch-Ua-Mobile"] = "?0"
    headers["Sec-Ch-Ua-Platform"] = '"Windows"'
    return headers

async def fetch_page_content(url: str, retries: int = 3) -> str:
    """
    Fetches content from target URL using stealth HTTP headers, exponential backoff, and retry handling.
    Inherently avoids rate-limits and anti-bot blocks on cloud servers.
    """
    for attempt in range(retries):
        headers = get_stealth_headers()
        async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=12.0) as client:
            try:
                # Add random jitter delay between requests to mimic human browsing behavior
                await asyncio.sleep(random.uniform(0.5, 1.5))
                
                response = await client.get(url)
                if response.status_code == 200 and len(response.text) > 200:
                    return response.text
                elif response.status_code in [403, 429, 503]:
                    print(f"[Stealth Bypass] Code {response.status_code} for {url[:50]}... Retry {attempt + 1}/{retries}")
                    await asyncio.sleep(2 ** attempt)
            except Exception as e:
                print(f"[Stealth Bypass] Connection attempt {attempt + 1} failed for {url[:50]}... Error: {e}")
                await asyncio.sleep(1.0)
                
    return ""

def extract_clean_article_text(html_content: str) -> str:
    """
    Extracts main article text, stripping navigation bars, ads, and footers.
    """
    if not html_content:
        return ""
        
    # Attempt extraction via trafilatura
    try:
        extracted = trafilatura.extract(html_content, include_comments=False, include_tables=False)
        if extracted and len(extracted.strip()) > 80:
            return extracted.strip()
    except Exception:
        pass
        
    # Fallback to BeautifulSoup clean text extraction
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        for element in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
            element.extract()
            
        paragraphs = [p.get_text().strip() for p in soup.find_all('p') if len(p.get_text().strip()) > 30]
        clean_text = "\n\n".join(paragraphs)
        return clean_text.strip()
    except Exception:
        return ""
