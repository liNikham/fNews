# 🚀 Free Deployment Guide & Anti-Bot Protection Guarantee

This guide provides step-by-step instructions to deploy **Feynman Finance India** for 100% free on the cloud, ensuring it runs 24/7 and never gets blocked by news websites.

---

## 🛡️ How Anti-Bot Protection & 24/7 Scraping Works

To guarantee that your deployed app **never gets blocked** by news publishers (Moneycontrol, Economic Times, LiveMint, RBI, etc.):

1. **Syndicated RSS Feed Ingestion**:
   - The app primary target uses official RSS feeds (`/rssfeeds/`, Google News IN RSS, XML endpoints).
   - Publishers explicitly open RSS feeds for public news readers. **RSS feeds do not trigger anti-bot JS challenges or IP bans**.
2. **Stealth Header & User-Agent Rotation**:
   - When fetching full article bodies, the app uses `httpx` with randomized desktop browser User-Agents (`Chrome 128`, `Firefox 129`, `Edge 128`), `Accept-Language: en-IN`, and `Sec-Ch-Ua` headers.
3. **Exponential Backoff & Request Jitter**:
   - Requests are throttled with randomized 0.5s–1.5s delays, preventing rate-limiting on cloud hosting IP addresses.

---

## 🌐 Option 1: Deploy for Free on Render.com (Recommended)

Render offers a 100% Free Web Service tier for Python applications.

### Steps:
1. **Create a GitHub Repository**:
   - Go to [GitHub.com](https://github.com) and create a new repository (e.g. `feynman-finance-india`).
   - Push your project code to GitHub:
     ```bash
     git init
     git add .
     git commit -m "Deploy Feynman Finance India"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/feynman-finance-india.git
     git push -u origin main
     ```

2. **Deploy on Render**:
   - Sign up at [Render.com](https://render.com) (Free account).
   - Click **New +** -> **Web Service**.
   - Connect your GitHub repository `feynman-finance-india`.
   - Render will automatically detect settings from `render.yaml` or set:
     - **Runtime**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt && python -c 'from db.database import init_db; init_db()'`
     - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Click **Create Web Service**.

3. **Keep-Alive (Prevent Free Service Sleep)**:
   - Render free services sleep after 15 minutes of inactivity.
   - Go to [Cron-Job.org](https://cron-job.org) or [UptimeRobot.com](https://uptimerobot.com) (both 100% free).
   - Create a free HTTP ping to your Render web app URL (e.g. `https://feynman-finance-india.onrender.com/api/stats`) every 10 minutes.
   - **Result**: Your app stays awake 24/7 for free and runs hourly scraping continuously!

---

## ⚡ Option 2: Deploy for Free on Koyeb

Koyeb offers 24/7 free native micro instances that do not sleep.

### Steps:
1. Sign up at [Koyeb.com](https://www.koyeb.com) (Free).
2. Click **Create App** -> Select **GitHub**.
3. Select your repository `feynman-finance-india`.
4. Koyeb will detect your `Dockerfile` or `Procfile` automatically.
5. Click **Deploy**. Your app will be live on a custom `.koyeb.app` domain!

---

## 🔑 Optional: Live Gemini AI Key

By default, the app uses a built-in **Rule-Based Feynman Engine** that works 100% offline without any API key.

If you want live Gemini AI generated responses:
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/).
2. On Render / Koyeb environment settings, add an environment variable:
   - Key: `GEMINI_API_KEY`
   - Value: `your_gemini_api_key_here`
