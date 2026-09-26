import os
import json
import re
import httpx
from config import GEMINI_API_KEY, GEMINI_MODEL
from engine.jargon_dictionary import find_jargon_in_text, FINANCIAL_JARGON_DB

def generate_feynman_breakdown(title: str, raw_text: str, category: str = "Finance") -> dict:
    """
    Transforms financial news into Richard Feynman First Principles & Financial Detective Wealth Blueprint.
    Uses Gemini API (gemini-3.1-flash-lite) when API key is present; falls back to local engine.
    """
    if GEMINI_API_KEY:
        try:
            return _generate_with_gemini(title, raw_text, category)
        except Exception as e:
            print(f"[Feynman Engine] Gemini API note ({e}), running local Detective Feynman engine fallback...")
            return _generate_local_feynman(title, raw_text, category)
    else:
        return _generate_local_feynman(title, raw_text, category)

def _generate_with_gemini(title: str, raw_text: str, category: str) -> dict:
    """
    Uses Gemini API with model gemini-3.1-flash-lite.
    """
    system_prompt = f"""
You are an elite Financial Detective and Wealth Strategist combining Richard Feynman's First Principles teaching method with Warren Buffett & Ray Dalio's practical wealth-building mindset.
Your audience is a smart Software Engineer in India who has no formal finance background but wants to understand news in DEEP detail, spot HIDDEN LOOPHOLES/FINE PRINT, and take concrete action to BUILD WEALTH and manage money.

ARTICLE TITLE: {title}
CATEGORY: {category}
ARTICLE TEXT: {raw_text[:2500]}

Analyze this news like a financial detective investigating a case.

Return STRICT JSON with these exact 9 keys:
1. "news_summary": 📰 Clear 3-sentence factual summary of the core news event (Who, What, Key Numbers, Dates, and Official Decisions). Focus strictly on actual news facts without jargon.
2. "importance_score": (Integer 1 to 10). Rate how significantly this news affects a person's wallet, savings, investments, loan EMIs, or taxes in India. (Assign < 6 for filler/clickbait news, 7-10 for high-impact news).
3. "feynman_eli5": Deep 3-sentence First Principles explanation using vivid real-world analogies (e.g. tea stalls, local shops, piggy banks). Explain the core physics of how the money moves.
4. "detective_loopholes": 🕵️‍♂️ Detective Breakdown & Hidden Loopholes: 3-4 bullet points uncovering fine print, institutional tricks, tax implications, hidden catches, or arbitrage opportunities that 99% of retail readers miss.
5. "actionable_blueprint": 🎯 Actionable Wealth Blueprint ("What Should I Do With This Info to Become Rich?"): 3-4 concrete, practical steps the user can execute today (e.g., "Pre-pay home loan before month end", "Switch FD duration to 399 days", "Accumulate Banking ETFs during dip", "Optimize tax under Section 80C/10(14)").
6. "feynman_jargon": Array of [{{"term": "Term Name", "eli5": "Simple definition", "analogy": "Analogy"}}] for 2-4 financial terms in the article.
7. "feynman_past_context": 2-3 sentences uncovering the hidden root cause and historical backdrop behind this news.
8. "feynman_future_impact": 3 bullet points showing domino effects on personal wallet, loan rates, stock market sectors, and Indian economy.
9. "feynman_money_psychology": 1 powerful behavioral finance / investor psychology takeaway to avoid traps (FOMO, panic selling, institutional manipulation).
"""
    clean_model = GEMINI_MODEL.strip().replace("models/", "").replace("'", "").replace('"', '') if GEMINI_MODEL else "gemini-3.1-flash-lite"
    
    # Active 2026 production models: gemini-3.1-flash-lite first, then gemini-2.5-flash-lite, gemini-2.5-flash
    candidate_models = [
        clean_model,
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash"
    ]
    
    payload = {
        "contents": [{"parts": [{"text": system_prompt}]}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.2
        }
    }
    
    last_err = None
    for model in candidate_models:
        if not model:
            continue
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        try:
            res = httpx.post(url, json=payload, timeout=25.0)
            if res.status_code == 200:
                data = res.json()
                text_content = data['candidates'][0]['content']['parts'][0]['text']
                parsed = json.loads(text_content)
                parsed['importance_score'] = int(parsed.get('importance_score', 8))
                if not parsed.get('news_summary'):
                    parsed['news_summary'] = raw_text[:350]
                return parsed
            else:
                last_err = f"Status {res.status_code} for model {model}: {res.text[:80]}"
        except Exception as e:
            last_err = str(e)
            
    raise Exception(f"Gemini API endpoint error: {last_err}")

def _generate_local_feynman(title: str, raw_text: str, category: str) -> dict:
    """
    Local Detective Feynman Synthesizer (Fallback when API key is unavailable or offline).
    """
    full_text = f"{title}. {raw_text}"
    jargon_matched = find_jargon_in_text(full_text)
    
    if not jargon_matched:
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

    news_summary = f"Summary: {title}. {raw_text[:300]}..." if len(raw_text) > 300 else f"Summary: {title}. {raw_text}"
    eli5_summary = f"Imagine a big village marketplace where water flow is controlled by a central tap. In this news: '{title[:70]}...', major institutional players adjusted how cash flows through Indian businesses and consumer pockets."
    
    detective_loopholes = (
        "• **Hidden Institutional Angle**: Big foreign and domestic funds often use news events to rebalance portfolios before retail investors react.\n"
        "• **Fine Print Catch**: Interest rate or regulatory changes usually take 1-2 billing cycles to reflect in your actual bank statements.\n"
        "• **Tax & Liquidity Arbitrage**: Check whether gains/yields from this move qualify for short-term vs long-term capital gains tax."
    )
    
    actionable_blueprint = (
        "• **1. Audit Your Money Flow**: Review fixed deposit returns vs inflation rate to prevent purchasing power erosion.\n"
        "• **2. Tactical Debt Action**: If loan interest rates are rising, make lump-sum principal prepayments; if falling, hold cash in liquid funds.\n"
        "• **3. Strategic Equity Accumulation**: Focus on high-cash-flow companies and low-expense index funds via monthly SIPs rather than chasing news hype."
    )
    
    importance_score = 8
    
    past_context = f"Over past quarters, Indian financial regulators and market participants have navigated global interest rate cycles and domestic inflation. This event stems from structural shifts in consumer liquidity and corporate earnings."
    future_impact = "• **Your Wallet**: Direct impact on net savings yield and loan borrowing costs over the next quarter.\n• **Stock Portfolio**: Sector-specific valuation shifts for equity holdings.\n• **Macro Economy**: Strengthens domestic capital formation and market resilience."
    connected_news = "Connected to RBI monetary policy stance, retail SIP inflows, and broader Indian macroeconomic indicators."
    money_psychology = "💡 **Detective Wealth Wisdom**: News creates noise; fundamentals build wealth. Never buy or sell investments out of emotional panic. Use market headlines as data points to execute your disciplined long-term asset allocation plan."

    return {
        "news_summary": news_summary,
        "importance_score": importance_score,
        "feynman_eli5": eli5_summary,
        "detective_loopholes": detective_loopholes,
        "actionable_blueprint": actionable_blueprint,
        "feynman_jargon": jargon_list,
        "feynman_past_context": past_context,
        "feynman_future_impact": future_impact,
        "feynman_connected_news": connected_news,
        "feynman_money_psychology": money_psychology
    }
