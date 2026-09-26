// Feynman Finance Dashboard Client Application

let currentCategory = 'all';
let searchQuery = '';
let currentLimit = 10; // Strict default limit: Top 10 unread critical stories!
let currentArticles = [];
let currentModalText = '';

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadArticles();
    
    // Automatically refresh Top 10 High-Impact news every 15 minutes!
    setInterval(() => {
        console.log("[Feynman UI] Running 15-minute automatic news refresh...");
        loadStats();
        loadArticles();
    }, 15 * 60 * 1000);
});

// Load Aggregate Stats
async function loadStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data.status === 'success') {
            document.getElementById('statTotalArticles').innerText = "Top 10";
        }
    } catch (err) {
        console.error("Error loading stats:", err);
    }
}

// Fetch Articles with Filters
async function loadArticles() {
    const grid = document.getElementById('articlesGrid');
    const spinner = document.getElementById('loadingSpinner');
    
    spinner.style.display = 'block';
    if (grid.children.length === 0) {
        grid.innerHTML = '';
    }

    try {
        let url = `/api/news?category=${encodeURIComponent(currentCategory)}&page=1&limit=${currentLimit}`;
        if (searchQuery) {
            url += `&query=${encodeURIComponent(searchQuery)}`;
        }
        if (currentCategory === 'bookmarked') {
            url = `/api/news?bookmarked_only=true&limit=${currentLimit}`;
            if (searchQuery) url += `&query=${encodeURIComponent(searchQuery)}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        spinner.style.display = 'none';

        if (data.status === 'success') {
            currentArticles = data.articles;
            renderArticlesGrid(currentArticles);
        }
    } catch (err) {
        spinner.style.display = 'none';
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);"><div style="font-size: 48px; margin-bottom: 12px;">⚠️</div><p>Unable to connect to Feynman Finance server.</p></div>`;
    }
}

// Toggle between Top 10 view and All Stories view
function toggleLimitView() {
    const btn = document.getElementById('toggleLimitBtn');
    if (currentLimit === 10) {
        currentLimit = 50;
        btn.innerText = "Show Top 10 Only ↩";
    } else {
        currentLimit = 10;
        btn.innerText = "View All Stories ➔";
    }
    loadArticles();
}

// Mark Article as Read -> Auto-pulls next unread story into Top 10!
async function markAsRead(articleId, cardElement) {
    if (cardElement) {
        cardElement.classList.add('read-fade');
    }
    
    try {
        const res = await fetch(`/api/read/${articleId}`, { method: 'POST' });
        const data = await res.json();
        if (data.status === 'success') {
            setTimeout(async () => {
                await loadStats();
                await loadArticles();
            }, 300);
        }
    } catch (err) {
        console.error("Error marking article as read:", err);
    }
}

// Render Articles Grid
function renderArticlesGrid(articles) {
    const grid = document.getElementById('articlesGrid');
    grid.innerHTML = '';

    if (!articles || articles.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
                <h3 style="font-size: 20px; color: var(--text-primary);">You're all caught up!</h3>
                <p style="margin-top: 8px;">All Top 10 stories have been read. Click "Sync News" or "Scraped Log" to check all news!</p>
            </div>
        `;
        return;
    }

    articles.forEach((article, index) => {
        const card = document.createElement('div');
        card.className = 'news-card';

        const jargonList = article.feynman_jargon || [];
        const jargonPillsHtml = jargonList.map(j => `<span class="jargon-tag" onclick="event.stopPropagation(); openJargonModal('${escapeHtml(j.term)}')">💡 ${escapeHtml(j.term)}</span>`).join('');

        const isBookmarked = article.is_bookmarked === 1;
        const importance = article.importance_score || 8;

        card.innerHTML = `
            <div>
                <div class="card-top-meta">
                    <span class="badge-cat">${escapeHtml(article.category || 'Finance')}</span>
                    <span style="font-size: 11px; color: var(--text-dim); font-weight: 500;">${escapeHtml(article.source_name || 'Publisher')} • ${escapeHtml(article.pub_date || '')}</span>
                    <span class="importance-pill">🔥 Score ${importance}/10</span>
                </div>
                
                <h3 class="card-headline">${escapeHtml(article.title)}</h3>

                <!-- NEWS SUMMARY FACT SNIPPET -->
                <div style="font-size: 13.5px; color: #cbd5e1; line-height: 1.5; margin-bottom: 16px; background: rgba(15, 23, 42, 0.6); padding: 12px 14px; border-radius: var(--radius-md); border-left: 3px solid var(--cyan);">
                    ${escapeHtml(article.news_summary || article.raw_summary || article.content || article.title)}
                </div>

                <div style="margin-bottom: 16px;">
                    <button class="btn btn-gradient" style="width: 100%; padding: 10px 16px; font-size: 13px; font-weight: 700;" onclick="openFeynmanModal(${article.id}, true)">
                        ✨ Explain / System Breakdown ➔
                    </button>
                </div>
            </div>

            <div class="card-bottom-actions">
                <button class="btn btn-read" style="font-size: 12px; padding: 7px 14px;" onclick="markAsRead(${article.id}, this.closest('.news-card'))" title="Mark as Read so next unread story moves up into Top 10">
                    ✔ Mark as Read
                </button>

                <div class="action-icon-group">
                    <button class="icon-action-btn ${isBookmarked ? 'active' : ''}" onclick="toggleBookmark(${article.id}, this)" title="Bookmark">
                        🔖
                    </button>
                    <button class="icon-action-btn" onclick="speakText('${escapeHtml(article.title)}. ${escapeHtml(article.news_summary || article.raw_summary)}')" title="Listen Read-Aloud">
                        🔊
                    </button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

// Category Switcher
function switchCategory(cat, btnElement) {
    currentCategory = cat;
    
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    if (cat === 'jargon') {
        loadJargonDictionaryView();
    } else {
        loadArticles();
    }
}

// Mobile Nav Active State
function setMobileNavActive(btn) {
    document.querySelectorAll('.nav-item-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

// Search Handler
let searchTimeout;
function handleSearch(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchQuery = document.getElementById('searchInput').value.trim();
        if (currentCategory === 'jargon') {
            loadJargonDictionaryView(searchQuery);
        } else {
            loadArticles();
        }
    }, 300);
}

// Manual News Scrape Trigger
async function triggerManualScrape() {
    const icon = document.getElementById('scrapeIcon');
    const btn = document.getElementById('scrapeBtn');
    
    icon.style.display = 'inline-block';
    icon.style.animation = 'spin 1s linear infinite';
    btn.disabled = true;

    try {
        const res = await fetch('/api/scrape/now', { method: 'POST' });
        const data = await res.json();
        
        icon.style.animation = 'none';
        btn.disabled = false;

        if (data.status === 'success') {
            alert(`🎉 Success! Scraped ${data.result.total_fetched} stories across 10 sources and saved ${data.result.total_new_saved} high-impact wealth insights!`);
            loadStats();
            loadArticles();
        }
    } catch (err) {
        icon.style.animation = 'none';
        btn.disabled = false;
        alert("Error initiating news scrape.");
    }
}

// Toggle Bookmark
async function toggleBookmark(articleId, btn) {
    try {
        const res = await fetch(`/api/bookmark/${articleId}`, { method: 'POST' });
        const data = await res.json();
        if (data.status === 'success') {
            if (data.is_bookmarked) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
            loadStats();
        }
    } catch (err) {
        console.error("Bookmark toggle failed:", err);
    }
}

// Open Raw Scraped Feed Modal (Transparent Timeline of All Scraped News)
async function openRawFeedModal() {
    const modal = document.getElementById('rawFeedModal');
    const container = document.getElementById('rawFeedList');
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">Loading raw scraped feed history...</div>`;
    modal.classList.add('active');

    try {
        const res = await fetch('/api/raw-feed?limit=50');
        const data = await res.json();

        if (data.status === 'success') {
            container.innerHTML = '';
            const feed = data.raw_feed || [];
            
            if (feed.length === 0) {
                container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No scraped news recorded yet. Click 'Sync News' to pull fresh articles!</div>`;
                return;
            }

            feed.forEach((item, i) => {
                const row = document.createElement('div');
                row.style.background = 'rgba(15, 23, 42, 0.7)';
                row.style.border = '1px solid var(--border-subtle)';
                row.style.borderRadius = 'var(--radius-md)';
                row.style.padding = '14px 18px';

                const isReadStr = item.is_read ? '✔ Read' : '🔥 Unread';

                row.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span class="badge-cat" style="font-size: 10px;">${escapeHtml(item.source_name || 'Publisher')}</span>
                        <span style="font-size: 11px; color: var(--text-dim);">${escapeHtml(item.pub_date || item.created_at || 'Recently')} • ${isReadStr}</span>
                    </div>
                    
                    <h4 style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">${escapeHtml(item.title)}</h4>
                    
                    <p style="font-size: 12.5px; color: var(--text-muted); line-height: 1.4; margin-bottom: 10px;">
                        ${escapeHtml(item.news_summary || item.raw_summary || item.title)}
                    </p>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
                        <span style="font-size: 11px; color: var(--amber); font-weight: 600;">🌟 Score: ${item.importance_score || 8}/10</span>
                        <a href="${escapeHtml(item.link)}" target="_blank" style="font-size: 11.5px; color: var(--primary); text-decoration: none; font-weight: 600;">
                            🔗 View Source Article ↗
                        </a>
                    </div>
                `;
                container.appendChild(row);
            });
        }
    } catch (err) {
        container.innerHTML = `<div style="text-align: center; color: var(--rose);">Error loading raw scraped feed log.</div>`;
    }
}

function closeRawFeedModal() {
    document.getElementById('rawFeedModal').classList.remove('active');
}

// Open Sources Scraping Report Modal
async function openSourcesReportModal() {
    const modal = document.getElementById('sourcesReportModal');
    const container = document.getElementById('sourcesReportTable');
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">Loading source breakdown...</div>`;
    modal.classList.add('active');

    try {
        const res = await fetch('/api/sources');
        const data = await res.json();

        if (data.status === 'success') {
            container.innerHTML = '';
            const sources = data.sources || [];
            
            if (sources.length === 0) {
                container.innerHTML = `<div style="text-align: center; color: var(--text-muted);">No scraping metrics recorded yet. Click 'Sync News' to run!</div>`;
                return;
            }

            sources.forEach(s => {
                const item = document.createElement('div');
                item.style.background = 'rgba(15, 23, 42, 0.7)';
                item.style.border = '1px solid var(--border-subtle)';
                item.style.borderRadius = 'var(--radius-md)';
                item.style.padding = '14px 18px';
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';

                item.innerHTML = `
                    <div>
                        <div style="font-weight: 700; color: #ffffff; font-size: 14px;">${escapeHtml(s.source_name)}</div>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Category: ${escapeHtml(s.category)} • Last synced: ${escapeHtml(s.last_scraped_at || 'Recently')}</div>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: var(--emerald);">
                            ${s.important_saved} High-Impact Saved
                        </span>
                        <div style="font-size: 11px; color: var(--text-dim);">(${s.total_fetched} Total Fetched)</div>
                    </div>
                `;
                container.appendChild(item);
            });
        }
    } catch (err) {
        container.innerHTML = `<div style="text-align: center; color: var(--rose);">Error loading sources breakdown.</div>`;
    }
}

function closeSourcesReportModal() {
    document.getElementById('sourcesReportModal').classList.remove('active');
}

let currentActiveArticleId = null;

// Open Article Detail Modal
function openFeynmanModal(articleId, autoExplain = false) {
    currentActiveArticleId = articleId;
    const article = currentArticles.find(a => a.id === articleId);
    if (!article) return;

    document.getElementById('modalCategory').innerText = article.category || 'Finance';
    document.getElementById('modalImportance').innerText = `🔥 Importance: ${article.importance_score || 8}/10`;
    document.getElementById('modalSource').innerText = article.source_name || 'Indian News';
    document.getElementById('modalTitle').innerText = article.title;
    const newsSumElem = document.getElementById('modalNewsSummary');
    if (newsSumElem) {
        newsSumElem.innerText = article.news_summary || article.raw_summary || article.content || 'No summary available';
    }
    document.getElementById('modalEli5').innerText = article.system_mechanics || article.feynman_eli5 || 'Click "✨ Gemini AI Breakdown" below to generate First-Principles analysis.';
    document.getElementById('modalDetective').innerText = article.detective_loopholes || 'Click "✨ Gemini AI Breakdown" below for Fine Print catches.';
    document.getElementById('modalBlueprint').innerText = article.actionable_blueprint || 'Click "✨ Gemini AI Breakdown" below for Action Plan.';

    // Jargon list
    const jargonContainer = document.getElementById('modalJargonList');
    jargonContainer.innerHTML = '';
    const jList = article.feynman_jargon || [];
    
    if (jList.length === 0) {
        jargonContainer.innerHTML = `<div style="font-size: 13px; color: var(--text-muted);">No complex jargon found in this story!</div>`;
    } else {
        jList.forEach(j => {
            const item = document.createElement('div');
            item.style.background = 'rgba(15, 23, 42, 0.7)';
            item.style.border = '1px solid rgba(168, 85, 247, 0.25)';
            item.style.borderRadius = 'var(--radius-md)';
            item.style.padding = '14px';
            item.style.marginBottom = '10px';

            item.innerHTML = `
                <div style="font-weight: 700; color: #c084fc; font-size: 14px; margin-bottom: 4px;">🧩 ${escapeHtml(j.term)}</div>
                <div style="font-size: 13.5px; color: #e2e8f0; line-height: 1.5;">${escapeHtml(j.eli5)}</div>
                ${j.analogy ? `<div style="font-size: 12px; color: #cbd5e1; font-style: italic; margin-top: 6px; background: rgba(168, 85, 247, 0.12); padding: 6px 10px; border-radius: 6px;">⚙️ System Model: ${escapeHtml(j.analogy)}</div>` : ''}
            `;
            jargonContainer.appendChild(item);
        });
    }

    document.getElementById('modalPast').innerText = article.real_world_connections || article.feynman_future_impact || article.feynman_past_context || 'N/A';
    document.getElementById('modalPsychology').innerText = article.signal_vs_noise || article.feynman_money_psychology || 'N/A';
    
    const linkBtn = document.getElementById('modalOriginalLink');
    if (article.link) {
        linkBtn.href = article.link;
        linkBtn.style.display = 'inline-flex';
    } else {
        linkBtn.style.display = 'none';
    }

    const simplifyBtn = document.getElementById('modalSimplifyBtn');
    if (simplifyBtn) {
        simplifyBtn.innerText = "✨ Gemini AI Breakdown";
        simplifyBtn.disabled = false;
    }

    currentModalText = `${article.title}. ${article.news_summary || article.raw_summary}`;

    document.getElementById('feynmanModal').classList.add('active');

    if (autoExplain && (!article.detective_loopholes || article.detective_loopholes.includes("Institutional Arbitrage"))) {
        triggerModalOnDemandSimplify();
    }
}

async function triggerModalOnDemandSimplify() {
    if (!currentActiveArticleId) return;
    const btn = document.getElementById('modalSimplifyBtn');
    if (btn) {
        btn.innerText = "⏳ Gemini AI Thinking...";
        btn.disabled = true;
    }
    
    try {
        const res = await fetch(`/api/simplify/${currentActiveArticleId}`, { method: 'POST' });
        const data = await res.json();
        if (data.status === 'success') {
            await loadArticles();
            const updated = data.data;
            if (updated) {
                const idx = currentArticles.findIndex(a => a.id === currentActiveArticleId);
                if (idx !== -1) currentArticles[idx] = updated;
            }
            openFeynmanModal(currentActiveArticleId);
        }
    } catch (err) {
        console.error("Error running on-demand simplification:", err);
        alert("Rate limit reached. Please try again in a few seconds.");
    } finally {
        if (btn) {
            btn.innerText = "✨ Gemini AI Breakdown";
            btn.disabled = false;
        }
    }
}

function closeFeynmanModal() {
    document.getElementById('feynmanModal').classList.remove('active');
    if (window.speechSynthesis) window.speechSynthesis.cancel();
}

// Custom Simplifier Modal
function openCustomSimplifierModal() {
    document.getElementById('customSimplifierModal').classList.add('active');
}

function closeCustomSimplifierModal() {
    document.getElementById('customSimplifierModal').classList.remove('active');
}

async function processCustomSimplification() {
    const url = document.getElementById('customUrlInput').value.trim();
    const text = document.getElementById('customTextInput').value.trim();
    const category = document.getElementById('customCategorySelect').value;

    if (!url && !text) {
        alert("Please paste either an article URL or news text body.");
        return;
    }

    const modal = document.getElementById('customSimplifierModal');
    const submitBtn = modal.querySelector('button.btn-gradient');
    submitBtn.innerText = "⏳ Analyzing like a Detective with Gemini AI...";
    submitBtn.disabled = true;

    try {
        let endpoint = '/api/simplify-url';
        let payload = { url, category };

        if (!url && text) {
            endpoint = '/api/simplify-text';
            payload = { title: "Custom Financial Article", text, category };
        }

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        submitBtn.innerText = "🚀 Generate Detective Wealth Blueprint";
        submitBtn.disabled = false;

        if (data.status === 'success') {
            closeCustomSimplifierModal();
            document.getElementById('customUrlInput').value = '';
            document.getElementById('customTextInput').value = '';
            
            loadStats();
            await loadArticles();
            alert("✨ Article analyzed and added to your wealth feed!");
        } else {
            alert(data.detail || "Could not simplify article.");
        }
    } catch (err) {
        submitBtn.innerText = "🚀 Generate Detective Wealth Blueprint";
        submitBtn.disabled = false;
        alert("Server error simplifying article.");
    }
}

// Jargon Dictionary Tab View
async function loadJargonDictionaryView(query = '') {
    const grid = document.getElementById('articlesGrid');
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';

    try {
        let url = '/api/jargon';
        if (query) url += `?query=${encodeURIComponent(query)}`;
        
        const res = await fetch(url);
        const data = await res.json();
        spinner.style.display = 'none';

        if (data.status === 'success') {
            grid.innerHTML = '';
            if (data.terms.length === 0) {
                grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);"><p>No jargon terms matched your search.</p></div>`;
                return;
            }

            data.terms.forEach(t => {
                const card = document.createElement('div');
                card.className = 'news-card';
                card.style.borderLeft = '4px solid var(--purple)';

                card.innerHTML = `
                    <div class="card-top-meta">
                        <span class="badge-cat" style="background: rgba(168, 85, 247, 0.15); color: var(--purple); border-color: rgba(168, 85, 247, 0.3);">
                            ${escapeHtml(t.category)}
                        </span>
                    </div>

                    <h3 class="card-headline" style="color: #c084fc;">🧩 ${escapeHtml(t.term)}</h3>

                    <div class="feynman-eli5-card-box" style="border-left-color: var(--purple);">
                        <div class="box-label-header" style="color: var(--purple);">👶 Feynman Definition</div>
                        <div class="box-body-text">${escapeHtml(t.eli5)}</div>
                    </div>

                    <div style="font-size: 12.5px; color: #cbd5e1; font-style: italic; background: rgba(168, 85, 247, 0.1); padding: 10px 14px; border-radius: var(--radius-md);">
                        💡 <strong>Analogy:</strong> ${escapeHtml(t.analogy)}
                    </div>
                `;
                grid.appendChild(card);
            });
        }
    } catch (err) {
        spinner.style.display = 'none';
    }
}

// Text to Speech
function speakText(text) {
    if (!window.speechSynthesis) {
        alert("Text-to-Speech is not supported in your browser.");
        return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
}

function speakCurrentModalText() {
    if (currentModalText) speakText(currentModalText);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
