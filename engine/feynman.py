import os
import json
import re
from engine.jargon_dictionary import find_jargon_in_text, FINANCIAL_JARGON_DB

# Optional Gemini Integration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

def generate_feynman_breakdown(title: str, raw_text: str, category: str = "Finance") -> dict:
    """
    Transforms financial news into Richard Feynman First Principles simplification.
    Uses Gemini API if key is present; otherwise runs built-in Rule-Based Feynman Synthesizer.
    """
    if GEMINI_API_KEY:
        try:
            return _generate_with_gemini(title, raw_text, category)
        except Exception as e:
            print(f"[Feynman Engine] Gemini API error, using local synthesizer fallback: {e}")
            return _generate_local_feynman(title, raw_text, category)
    else:
        return _generate_local_feynman(title, raw_text, category)

def _generate_local_feynman(title: str, raw_text: str, category: str) -> dict:
    """
    Local Feynman First-Principles Synthesizer.
    Breaks down text using financial dictionary matches, NLP heuristics, and rule-based insights.
    """
    full_text = f"{title}. {raw_text}"
    jargon_matched = find_jargon_in_text(full_text)
    
    # Extract key jargon items or fallback to general terms
    if not jargon_matched:
        # Default helpful terms based on category
        if "Stock" in category or "Market" in title:
            jargon_matched = [FINANCIAL_JARGON_DB["Nifty 50"], FINANCIAL_JARGON_DB["P/E Ratio (Price to Earnings)"]]
        elif "Banking" in category or "RBI" in title:
            jargon_matched = [FINANCIAL_JARGON_DB["Repo Rate"], FINANCIAL_JARGON_DB["NPA (Non-Performing Asset)"]]
        else:
            jargon_matched = [FINANCIAL_JARGON_DB["Inflation (CPI)"], FINANCIAL_JARGON_DB["Fiscal Deficit"]]
            
    jargon_list = [
        {
            "term": item["term"],
            "eli5": item["eli5"],
            "analogy": item["analogy"]
        } for item in jargon_matched[:4]
    ]

    # Generate ELI5
    cleaned_title = re.sub(r'[^\w\s]', '', title)
    eli5_summary = f"Imagine a big marketplace where prices go up and down based on demand. In this news: {title}. In simple terms, key financial players (banks, companies, or government) made a move that affects how money flows in India."
    
    if "rbi" in full_text.lower() or "repo rate" in full_text.lower():
        eli5_summary = f"The Reserve Bank of India (RBI) is acting like a central tap controller for money. When they tweak interest rates or bank rules, it directly controls how cheap or expensive it is for everyday people to borrow money for houses, cars, and businesses."
    elif "nifty" in full_text.lower() or "sensex" in full_text.lower() or "market" in full_text.lower() or "stock" in full_text.lower():
        eli5_summary = f"The stock market is like a giant score board for India's biggest businesses. The recent news around '{title}' shows how investors are feeling optimistic or cautious about future business profits."
    elif "profit" in full_text.lower() or "quarter" in full_text.lower() or "results" in full_text.lower():
        eli5_summary = f"A major company released its quarterly report card. Just like a student showing their exam marks, companies show how much revenue they made, how much they spent, and how much profit is left for shareholders."
    elif "tax" in full_text.lower() or "gst" in full_text.lower() or "budget" in full_text.lower():
        eli5_summary = f"The government revised tax rules or spending plans. Think of it like a household budget: when tax rules change, it alters how much money stays in your pocket versus going to national infrastructure."

    # Past Context
    past_context = f"Over the past few months, Indian markets and financial regulators have been responding to changing global interest rates, inflation trends, and corporate earnings. This development ('{title[:60]}...') is part of an ongoing chain reaction."
    if "rbi" in full_text.lower():
        past_context = "In previous quarters, RBI focused heavily on keeping inflation under control by raising or holding interest rates steady. This latest move stems from recent economic data regarding consumer prices and bank liquidity."
    elif "stock" in full_text.lower() or "nifty" in full_text.lower():
        past_context = "Indian equity markets have seen strong participation from retail investors via monthly SIPs alongside shifting foreign institutional investment (FII) flows in response to global market volatility."

    # Future Impact on Wallet & Economy
    future_impact = f"• **Your Wallet/Savings**: May influence bank deposit returns, mutual fund performance, or loan interest rates.\n• **Stock Market**: Sectors related to this news could see short-term price movements.\n• **Broader Economy**: Helps build market confidence and economic stability in India."
    if "repo rate" in full_text.lower() or "bank" in full_text.lower():
        future_impact = "• **Your Home/Car Loan**: Loan EMIs may change over the coming billing cycles.\n• **Fixed Deposits**: FD interest rates offered by banks could be revised.\n• **Real Estate & Auto**: Higher/lower rates alter customer demand for houses and cars."
    elif "stock" in full_text.lower() or "share" in full_text.lower():
        future_impact = "• **Mutual Fund Portfolio**: Equity funds holding these sector stocks will reflect NAV changes.\n• **Investment Strategy**: Focus on long-term fundamental strength rather than daily price noise."

    # Connected News
    connected_news = "Connected to broader Indian economic trends, quarterly corporate earnings season, global central bank policies (US Federal Reserve), and retail SIP inflows."

    # Money Psychology Takeaway
    money_psychology = "💡 **Feynman Money Wisdom**: Don't let daily headlines trigger emotional panic or impulse buying. Successful wealth creation in Indian markets comes from understanding the underlying business fundamentals and staying disciplined with long-term investments."

    return {
        "feynman_eli5": eli5_summary,
        "feynman_jargon": jargon_list,
        "feynman_past_context": past_context,
        "feynman_future_impact": future_impact,
        "feynman_connected_news": connected_news,
        "feynman_money_psychology": money_psychology
    }

def _generate_with_gemini(title: str, raw_text: str, category: str) -> dict:
    """Uses Gemini API to generate structured Feynman First-Principles breakdown."""
    import httpx
    
    prompt = f"""
You are Richard Feynman teaching a software engineer who has zero background in finance.
Explain the following Indian financial news story using FIRST PRINCIPLES and SIMPLEST ENGLISH.
Use everyday real-world analogies (e.g. tea shops, village markets, piggy banks).

ARTICLE TITLE: {title}
CATEGORY: {category}
ARTICLE CONTENT: {raw_text[:1500]}

Respond STRICTLY in valid JSON with these exact 6 keys:
1. "feynman_eli5": 2-3 sentence simple overview explaining like to a 10 year old with a vivid real-world analogy.
2. "feynman_jargon": Array of objects [{{"term": "Term Name", "eli5": "Simple 1-line definition", "analogy": "Analogy"}}] for 2-4 technical financial terms in the article.
3. "feynman_past_context": 2-3 sentences explaining the historical context (Why is this happening now? What led to this?).
4. "feynman_future_impact": Bullet points explaining exact impact on personal wallet/loans, stock portfolio, and Indian economy.
5. "feynman_connected_news": 2 sentences explaining how this links to other big financial events in India.
6. "feynman_money_psychology": 1 key behavioral finance tip / psychology of money takeaway for investors.
"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json"}
    }
    
    res = httpx.post(url, json=payload, timeout=25.0)
    if res.status_code == 200:
        data = res.json()
        text_content = data['candidates'][0]['content']['parts'][0]['text']
        return json.loads(text_content)
    else:
        raise Exception(f"Gemini API returned status code {res.status_code}")
