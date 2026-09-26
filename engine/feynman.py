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

import time
import random

_last_gemini_call_timestamp = 0.0

def _generate_with_gemini(title: str, raw_text: str, category: str) -> dict:
    """
    Uses Gemini API strictly with model gemini-3.1-flash-lite.
    Includes rate-limiting throttling and exponential backoff retry for 429 quota handling.
    """
    global _last_gemini_call_timestamp
    
    system_prompt = f"""
You are an elite Financial System Architect and Behavioral Macro Strategist combining Richard Feynman's First Principles analytical clarity with Ray Dalio & Warren Buffett's wealth-building mental models.
Your audience is a smart Software Engineer in India (1 year of tech experience) who is highly logical and analytical, but lacks a formal finance background.

CRITICAL TONE & PERSPECTIVE RULES:
- DO NOT use childish analogies (e.g. NO "tea stalls", "piggy banks", "candy shops", "for 5-year-olds"). Treat the user as an intelligent adult software engineer.
- Use system-architecture mental models: explain financial mechanisms as inputs, pipelines, liquidity flows, incentive structures, and risk-reward dynamics.
- FINANCIAL MARKETS ARE EMOTIONAL & GAMBLING-LIKE SYSTEMS: Explain how market emotions (fear, FOMO, greed, panic) drive headlines, how different market participants with different risk appetites (retail vs institutions vs traders) react, and evaluate whether this news is genuine FUNDAMENTAL SIGNAL or EMOTIONAL NOISE/HYPE.
- CONNECT IDEAS TO REAL LIFE & SOCIETY: Explicitly explain how this affects:
  1. The user personally as a Software Engineer in India (tech hiring/salaries, home loan EMIs, taxes, wealth accumulation).
  2. Other people & society (retail investors, middle class, institutional players with different risk profiles).
  3. The broader global & Indian macro economy.

ARTICLE TITLE: {title}
CATEGORY: {category}
ARTICLE TEXT: {raw_text[:2500]}

Analyze this news thoroughly and return STRICT JSON with these exact 9 keys:
1. "news_summary": 📰 Factual 2-3 sentence core summary of what actually happened (Who, What, Key Numbers, Dates, Official Decisions).
2. "importance_score": (Integer 1 to 10). Rate how significantly this news impacts personal finances, wealth, or markets in India (7-10 for high impact, < 6 for filler/routine news).
3. "system_mechanics": ⚙️ First-Principles System Architecture: 3-4 sentences explaining the underlying financial physics and mechanics of how money/credit flows through the system. Avoid childish analogies; use clean technical/analytical logic.
4. "signal_vs_noise": 🎲 Signal vs. Emotional Noise (Should You Believe It?): 2-3 sentences evaluating if this news is genuine fundamental signal or emotional hype/media noise. Explain how market emotion (fear/greed/speculative gambling) and different risk appetites drive reactions.
5. "detective_loopholes": 🕵️‍♂️ Institutional Fine Print & Hidden Catches: 3 bullet points uncovering fine print, tax implications, institutional tricks, or arbitrage opportunities that retail investors miss.
6. "actionable_blueprint": 🎯 Rational Action Plan: 3 concrete, disciplined steps the user should execute (e.g. loan prepayments, asset allocation, tax optimization, avoiding emotional hype).
7. "feynman_jargon": Array of [{{"term": "Term Name", "eli5": "Clear technical definition for an engineer", "analogy": "Clean real-world system comparison"}}] for 2-4 key financial terms.
8. "real_world_connections": 🌐 Real-World Connections: 3 bullet points detailing direct impact on (1) Software Engineer's personal life/job/loans, (2) Society & retail vs institutional behavior, (3) Global & Indian macro economy.
9. "feynman_past_context": 2 sentences explaining the historical root cause or macro setup behind this event.
"""
    model = "gemini-3.1-flash-lite"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": [{"parts": [{"text": system_prompt}]}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.2
        }
    }
    
    max_retries = 3
    base_delay = 2.0
    
    for attempt in range(max_retries):
        # Throttle: ensure at least 1.5s between consecutive API calls to prevent RPM bursts
        elapsed = time.time() - _last_gemini_call_timestamp
        if elapsed < 1.5:
            time.sleep(1.5 - elapsed)
            
        try:
            _last_gemini_call_timestamp = time.time()
            res = httpx.post(url, json=payload, timeout=25.0)
            
            if res.status_code == 200:
                data = res.json()
                text_content = data['candidates'][0]['content']['parts'][0]['text']
                parsed = json.loads(text_content)
                parsed['importance_score'] = int(parsed.get('importance_score', 8))
                if not parsed.get('news_summary'):
                    parsed['news_summary'] = raw_text[:350]
                # Ensure backwards-compatibility mapping for existing DB schema
                if 'system_mechanics' in parsed and not parsed.get('feynman_eli5'):
                    parsed['feynman_eli5'] = parsed['system_mechanics']
                elif 'feynman_eli5' in parsed and not parsed.get('system_mechanics'):
                    parsed['system_mechanics'] = parsed['feynman_eli5']
                    
                if 'signal_vs_noise' in parsed and not parsed.get('feynman_money_psychology'):
                    parsed['feynman_money_psychology'] = parsed['signal_vs_noise']
                elif 'feynman_money_psychology' in parsed and not parsed.get('signal_vs_noise'):
                    parsed['signal_vs_noise'] = parsed['feynman_money_psychology']
                    
                if 'real_world_connections' in parsed and not parsed.get('feynman_future_impact'):
                    parsed['feynman_future_impact'] = parsed['real_world_connections']
                elif 'feynman_future_impact' in parsed and not parsed.get('real_world_connections'):
                    parsed['real_world_connections'] = parsed['feynman_future_impact']
                    
                return parsed
                
            elif res.status_code == 429:
                wait_time = base_delay * (2 ** attempt) + random.uniform(0.5, 1.5)
                print(f"[Feynman Engine] Gemini 429 Rate Limit (Attempt {attempt+1}/{max_retries}). Backing off for {wait_time:.1f}s...")
                time.sleep(wait_time)
            else:
                print(f"[Feynman Engine] Gemini API Status {res.status_code}: {res.text[:100]}")
                break
        except Exception as e:
            print(f"[Feynman Engine] Exception on Gemini API request (Attempt {attempt+1}): {e}")
            time.sleep(base_delay * (attempt + 1))
            
    print("[Feynman Engine] Gemini API limit reached after backoff retries. Using local synthesizer fallback.")
    return _generate_local_feynman(title, raw_text, category)

def _generate_local_feynman(title: str, raw_text: str, category: str) -> dict:
    """
    Local System Architect Synthesizer (Fallback when API key is unavailable or offline).
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
    
    system_mechanics = (
        f"Underlying System Flow: In '{title[:70]}...', financial capital moves through a multi-tier liquidity pipeline. "
        f"Central policy levers alter money supply costs, which propagate through institutional balance sheets, corporate borrowing rates, and consumer credit availability."
    )
    
    signal_vs_noise = (
        "🎲 **Signal vs. Emotional Noise**: Market headlines amplify short-term noise. High-frequency traders and emotional retail investors gamble on immediate price swings, "
        "while institutional capital focuses on fundamental cash flow yields. Treat sudden market moves as sentiment fluctuations rather than immediate structural collapse."
    )
    
    detective_loopholes = (
        "• **Institutional Arbitrage**: Large domestic & foreign funds adjust sector allocations prior to retail headline digestion.\n"
        "• **System Transmission Lag**: Policy & interest rate shifts take 1-2 billing cycles to reflect in commercial banking loan statements.\n"
        "• **Tax & Capital Efficiency**: Assess tax implications (short-term vs long-term capital gains) before executing asset reallocation."
    )
    
    actionable_blueprint = (
        "• **1. System Audit**: Evaluate net real yield (nominal interest minus CPI inflation) across savings and fixed-income assets.\n"
        "• **2. Debt Optimization**: If interest rates trend upward, make targeted principal prepayments on floating-rate loans.\n"
        "• **3. Disciplined Asset Allocation**: Automate monthly SIPs in broad-market index funds (e.g. Nifty 50) to remove emotional timing biases."
    )
    
    importance_score = 8
    
    past_context = "Historical Macro Setup: Shift in global central bank interest rate cycles and domestic liquidity management over recent quarters."
    real_world_connections = (
        "• **Your Life (Tech Engineer)**: Direct impact on home loan EMIs, tax deductions under Indian tax slabs, and tech sector investment capital.\n"
        "• **Society & Retail vs Institutional**: Risk-averse retail savers seek high FD rates while risk-seeking speculators leverage derivatives.\n"
        "• **Global Macro**: Ripple effects across Indian capital markets, rupee exchange rate, and broader economic output."
    )

    return {
        "news_summary": news_summary,
        "importance_score": importance_score,
        "system_mechanics": system_mechanics,
        "feynman_eli5": system_mechanics,
        "signal_vs_noise": signal_vs_noise,
        "feynman_money_psychology": signal_vs_noise,
        "detective_loopholes": detective_loopholes,
        "actionable_blueprint": actionable_blueprint,
        "feynman_jargon": jargon_list,
        "feynman_past_context": past_context,
        "real_world_connections": real_world_connections,
        "feynman_future_impact": real_world_connections,
        "feynman_connected_news": "Connected to RBI monetary policy stance, retail SIP inflows, and broader Indian macroeconomic indicators."
    }
