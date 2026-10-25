// ==========================================================================
// FEYNMAN FINANCE TERMINAL — CLIENT APPLICATION LOGIC
// ==========================================================================

let currentCategory = 'all';
let searchQuery = '';
let currentLimit = 10;
let currentSort = 'latest';
let currentViewMode = localStorage.getItem('feynman_view_mode') || 'grid';
let currentArticles = [];
let currentActiveArticleId = null;
let currentModalText = '';
let isSpeaking = false;
let currentSpeakingBtn = null;

document.addEventListener('DOMContentLoaded', () => {
    // Apply saved eye-comfort paper warmth theme
    const savedEyeTheme = localStorage.getItem('feynman_eye_theme') || 'parchment';
    const activeComfortBtn = document.getElementById(`comfort${savedEyeTheme.charAt(0).toUpperCase() + savedEyeTheme.slice(1)}`);
    setEyeComfortTheme(savedEyeTheme, activeComfortBtn, false);

    // Apply saved view mode
    setViewMode(currentViewMode, false);

    // Initial data load
    loadStats();
    loadArticles();

    // Auto-refresh news every 15 minutes
    setInterval(() => {
        loadStats();
        loadArticles();
    }, 15 * 60 * 1000);

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.focus();
        } else if (e.key === 'Escape') {
            closeAllModals();
        }
    });
});

// ==========================================================================
// EYE-CARE PAPER WARMTH PICKER
// ==========================================================================
function setEyeComfortTheme(theme, btnElement, notify = true) {
    if (theme === 'parchment') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('feynman_eye_theme', theme);

    document.querySelectorAll('.comfort-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) {
        btnElement.classList.add('active');
    } else {
        const matching = document.getElementById(`comfort${theme.charAt(0).toUpperCase() + theme.slice(1)}`);
        if (matching) matching.classList.add('active');
    }

    if (notify) {
        const labels = {
            parchment: "📜 Warm Parchment (Zero Glare)",
            sepia: "🌰 Soft Sepia (Night Comfort)",
            almond: "🧴 Almond Cream"
        };
        showToast(`Paper tone: ${labels[theme] || theme}`, "info", 1800);
    }
}

// ==========================================================================
// TOAST NOTIFICATION SYSTEM
// ==========================================================================
function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg width="16" height="16" fill="none" stroke="#34d399" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
    } else if (type === 'warning') {
        iconSvg = `<svg width="16" height="16" fill="none" stroke="#fbbf24" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
    } else {
        iconSvg = `<svg width="16" height="16" fill="none" stroke="#60a5fa" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ==========================================================================
// LOAD STATS & BADGES
// ==========================================================================
async function loadStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data.status === 'success' && data.stats) {
            const s = data.stats;
            
            // Queue & Archive counts
            const totalArticlesElem = document.getElementById('statTotalArticles');
            if (totalArticlesElem) {
                totalArticlesElem.innerText = currentLimit === 10 ? "Top 10" : `${s.unread_articles} Unread`;
            }

            const archiveElem = document.getElementById('statArchiveCount');
            if (archiveElem) {
                archiveElem.innerText = `${s.total_articles} Stories`;
            }

            // Category counts
            const counts = s.category_counts || {};
            const setBadge = (id, count) => {
                const el = document.getElementById(id);
                if (el) el.innerText = count || 0;
            };

            setBadge('badgeStocks', counts['Stocks & Equity']);
            setBadge('badgeBanking', counts['Banking & RBI']);
            setBadge('badgeEconomy', counts['Economy & Policy']);
            setBadge('badgeSavings', counts['Savings & Personal Finance']);
            setBadge('badgeBookmarks', s.total_bookmarks || 0);

            // Sources count
            const sourceElem = document.getElementById('statSourceCount');
            if (sourceElem && s.source_stats) {
                sourceElem.innerText = `${s.source_stats.length} Sources`;
            }
        }
    } catch (err) {
        console.error("Error loading stats:", err);
    }
}

// ==========================================================================
// FETCH & RENDER ARTICLES
// ==========================================================================
async function loadArticles() {
    const grid = document.getElementById('articlesGrid');
    const spinner = document.getElementById('loadingSpinner');
    
    if (spinner) spinner.style.display = 'flex';
    if (grid && grid.children.length === 0) {
        grid.innerHTML = '';
    }

    try {
        let url = `/api/news?category=${encodeURIComponent(currentCategory)}&page=1&limit=${currentLimit}&sort_by=${encodeURIComponent(currentSort)}`;
        if (searchQuery) {
            url += `&query=${encodeURIComponent(searchQuery)}`;
        }
        if (currentCategory === 'bookmarked') {
            url = `/api/news?bookmarked_only=true&limit=${currentLimit}&sort_by=${encodeURIComponent(currentSort)}`;
            if (searchQuery) url += `&query=${encodeURIComponent(searchQuery)}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        if (spinner) spinner.style.display = 'none';

        if (data.status === 'success') {
            currentArticles = data.articles || [];
            renderArticles(currentArticles);
        }
    } catch (err) {
        if (spinner) spinner.style.display = 'none';
        if (grid) {
            grid.innerHTML = `
                <div class="empty-state-box">
                    <svg class="empty-icon-glyph" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    <div class="empty-title">Connection Interrupted</div>
                    <div class="empty-subtitle">Could not reach the local news server. Please check that the backend is active.</div>
                    <button class="btn btn-glass" onclick="loadArticles()">Retry Connection</button>
                </div>
            `;
        }
    }
}

// Helper to determine source dot color class
function getSourceDotClass(sourceName) {
    if (!sourceName) return '';
    const s = sourceName.toLowerCase();
    if (s.includes('mint')) return 'livemint';
    if (s.includes('economic times') || s.includes('et ')) return 'et';
    if (s.includes('moneycontrol')) return 'moneycontrol';
    if (s.includes('business standard')) return 'bs';
    if (s.includes('financial express')) return 'fe';
    return '';
}

// Format relative date with clean precision
function formatArticleDate(article) {
    const rawDate = article.published_at || article.pub_date || article.created_at || '';
    if (!rawDate) return { text: 'Recent', isFresh: false };

    try {
        let parseable = rawDate;
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(rawDate)) {
            parseable = rawDate.replace(' ', 'T') + 'Z';
        }

        const d = new Date(parseable);
        if (!isNaN(d.getTime())) {
            const now = new Date();
            const diffMs = now - d;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMins < 2) return { text: 'Just now', isFresh: true };
            if (diffMins < 60) return { text: `${diffMins}m ago`, isFresh: true };
            if (diffHours < 24) return { text: `${diffHours}h ago`, isFresh: true };
            if (diffDays === 1) return { text: 'Yesterday', isFresh: false };
            if (diffDays < 7) return { text: `${diffDays}d ago`, isFresh: false };
            return { text: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), isFresh: false };
        }
    } catch (e) {
        // Fallback
    }

    return { text: escapeHtml(article.pub_date || rawDate), isFresh: false };
}

// Render articles in current view mode (Grid vs List)
function renderArticles(articles) {
    const container = document.getElementById('articlesGrid');
    if (!container) return;
    container.innerHTML = '';

    if (!articles || articles.length === 0) {
        container.innerHTML = `
            <div class="empty-state-box">
                <svg class="empty-icon-glyph" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <div class="empty-title">All Caught Up!</div>
                <div class="empty-subtitle">You have reviewed all high-impact unread stories in this queue. Click "Sync Feed" to scan fresh headlines or "Terminal Log" for the full archive.</div>
                <button class="btn btn-primary" onclick="triggerManualScrape()">Sync News Now</button>
            </div>
        `;
        return;
    }

    if (currentViewMode === 'list') {
        renderListView(articles, container);
    } else {
        renderGridView(articles, container);
    }
}

// Grid View Renderer
function renderGridView(articles, container) {
    container.className = 'articles-grid';

    articles.forEach((article) => {
        const card = document.createElement('div');
        card.className = 'article-card';

        const isBookmarked = article.is_bookmarked === 1;
        const score = article.importance_score || 8;
        const isHighScore = score >= 9;
        const dotClass = getSourceDotClass(article.source_name);
        const dateObj = formatArticleDate(article);

        const summaryText = article.news_summary || article.raw_summary || article.content || article.title;

        card.innerHTML = `
            <div>
                <div class="card-header-row">
                    <div class="source-badge">
                        <span class="source-dot ${dotClass}"></span>
                        <span>${escapeHtml(article.source_name || 'Publisher')}</span>
                    </div>
                    <div class="score-badge ${isHighScore ? 'high-score' : ''}" title="Wealth Impact Score">
                        <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        <span>${score}/10</span>
                    </div>
                </div>

                <div class="card-time-row">
                    <span class="card-category-pill">${escapeHtml(article.category || 'Finance')}</span>
                    <span class="card-time ${dateObj.isFresh ? 'fresh' : ''}">
                        ${dateObj.isFresh ? '● ' : ''}${dateObj.text}
                    </span>
                </div>

                <h3 class="card-title" onclick="openFeynmanModal(${article.id})">${escapeHtml(article.title)}</h3>

                <div class="card-snippet" onclick="openFeynmanModal(${article.id})">
                    ${escapeHtml(summaryText)}
                </div>
            </div>

            <div>
                <div class="card-actions-row">
                    <button class="btn btn-investigate" onclick="openFeynmanModal(${article.id})" title="View First-Principles Breakdown & Institutional Catches">
                        <span>Investigate Story ➔</span>
                    </button>

                    <div class="card-icon-actions">
                        <button class="action-btn-sm" onclick="markAsRead(${article.id}, this.closest('.article-card'))" title="Mark as Read (pulls next story into Top 10)">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        </button>
                        <button class="action-btn-sm ${isBookmarked ? 'active-bookmark' : ''}" onclick="toggleBookmark(${article.id}, this)" title="Bookmark this article">
                            <svg fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                        </button>
                        <button class="action-btn-sm" onclick="toggleSpeech('${escapeHtml(article.title)}. ${escapeHtml(summaryText)}', this)" title="Listen Read-Aloud">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

// Compact List View Renderer
function renderListView(articles, container) {
    container.className = 'articles-list';

    articles.forEach((article) => {
        const row = document.createElement('div');
        row.className = 'article-row';

        const isBookmarked = article.is_bookmarked === 1;
        const score = article.importance_score || 8;
        const isHighScore = score >= 9;
        const dotClass = getSourceDotClass(article.source_name);
        const dateObj = formatArticleDate(article);

        row.innerHTML = `
            <div class="row-main-col" onclick="openFeynmanModal(${article.id})">
                <div class="row-meta-top">
                    <span class="source-dot ${dotClass}"></span>
                    <span style="font-weight: 700; color: var(--text-secondary);">${escapeHtml(article.source_name || 'Publisher')}</span>
                    <span style="color: var(--text-tertiary);">•</span>
                    <span class="card-category-pill" style="font-size: 9.5px;">${escapeHtml(article.category || 'Finance')}</span>
                    <span style="color: var(--text-tertiary);">•</span>
                    <span style="font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: ${dateObj.isFresh ? '#34d399' : 'var(--text-tertiary)'};">
                        ${dateObj.text}
                    </span>
                    <span class="score-badge ${isHighScore ? 'high-score' : ''}" style="margin-left: 6px;">
                        ${score}/10
                    </span>
                </div>
                <div class="row-title">${escapeHtml(article.title)}</div>
            </div>

            <div class="row-actions-col">
                <button class="btn btn-investigate" style="padding: 5px 12px; font-size: 11.5px;" onclick="openFeynmanModal(${article.id})">
                    <span>Investigate</span>
                </button>
                <button class="action-btn-sm" onclick="markAsRead(${article.id}, this.closest('.article-row'))" title="Mark as Read">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                </button>
                <button class="action-btn-sm ${isBookmarked ? 'active-bookmark' : ''}" onclick="toggleBookmark(${article.id}, this)" title="Bookmark">
                    <svg fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                </button>
            </div>
        `;

        container.appendChild(row);
    });
}

// Toggle View Mode (Grid vs List)
function setViewMode(mode, reload = true) {
    currentViewMode = mode;
    localStorage.setItem('feynman_view_mode', mode);

    const btnGrid = document.getElementById('viewBtnGrid');
    const btnList = document.getElementById('viewBtnList');

    if (btnGrid && btnList) {
        if (mode === 'grid') {
            btnGrid.classList.add('active');
            btnList.classList.remove('active');
        } else {
            btnList.classList.add('active');
            btnGrid.classList.remove('active');
        }
    }

    if (reload) {
        renderArticles(currentArticles);
    }
}

// ==========================================================================
// NAVIGATION & SORTING
// ==========================================================================
function switchCategory(cat, btnElement) {
    currentCategory = cat;
    
    document.querySelectorAll('.tab-pill').forEach(b => b.classList.remove('active'));
    if (btnElement) {
        btnElement.classList.add('active');
    } else {
        const first = document.querySelector('.tab-pill');
        if (first && cat === 'all') first.classList.add('active');
    }

    if (cat === 'jargon') {
        loadJargonDictionaryView();
    } else {
        loadArticles();
    }
}

function setMobileNavActive(btn) {
    document.querySelectorAll('.mobile-nav-item').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function switchSort(sort) {
    currentSort = sort;
    const btnLatest = document.getElementById('sortBtnLatest');
    const btnImpact = document.getElementById('sortBtnImpact');
    const bannerTitle = document.getElementById('sectionBannerTitle');
    const bannerSubtitle = document.getElementById('sectionBannerSubtitle');

    if (btnLatest && btnImpact) {
        if (sort === 'latest') {
            btnLatest.classList.add('active');
            btnImpact.classList.remove('active');
            if (bannerTitle) bannerTitle.innerHTML = `<svg width="16" height="16" fill="none" stroke="#60a5fa" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> <span>Top 10 Latest News Stories</span>`;
            if (bannerSubtitle) bannerSubtitle.innerText = 'Real-time financial news chronological stream across Indian publishers.';
        } else {
            btnImpact.classList.add('active');
            btnLatest.classList.remove('active');
            if (bannerTitle) bannerTitle.innerHTML = `<svg width="16" height="16" fill="none" stroke="#f59e0b" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/></svg> <span>Top 10 High-Impact Stories</span>`;
            if (bannerSubtitle) bannerSubtitle.innerText = 'Prioritized stories ranked by direct wealth and market impact score.';
        }
    }
    loadArticles();
}

function toggleLimitView() {
    const btn = document.getElementById('toggleLimitBtn');
    if (currentLimit === 10) {
        currentLimit = 50;
        if (btn) btn.innerHTML = `<span>Top 10 Only ↩</span>`;
        showToast("Showing extended feed (up to 50 stories)", "info");
    } else {
        currentLimit = 10;
        if (btn) btn.innerHTML = `<span>View All (50) ➔</span>`;
        showToast("Restored strict Top 10 priority queue", "info");
    }
    loadStats();
    loadArticles();
}

// Search Handler
let searchTimeout;
function handleSearch(e) {
    const input = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClearBtn');
    if (clearBtn) clearBtn.style.display = input.value.trim() ? 'block' : 'none';

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchQuery = input.value.trim();
        if (currentCategory === 'jargon') {
            loadJargonDictionaryView(searchQuery);
        } else {
            loadArticles();
        }
    }, 280);
}

function clearSearch() {
    const input = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClearBtn');
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    searchQuery = '';
    loadArticles();
}

// ==========================================================================
// ACTIONS: READ, BOOKMARK, SCRAPE
// ==========================================================================
async function markAsRead(articleId, cardElement) {
    if (cardElement) {
        cardElement.classList.add('read-fade');
    }
    
    try {
        const res = await fetch(`/api/read/${articleId}`, { method: 'POST' });
        const data = await res.json();
        if (data.status === 'success') {
            showToast("Marked as read • Next unread story promoted", "success");
            setTimeout(async () => {
                await loadStats();
                await loadArticles();
            }, 300);
        }
    } catch (err) {
        console.error("Error marking article as read:", err);
    }
}

async function toggleBookmark(articleId, btn) {
    try {
        const res = await fetch(`/api/bookmark/${articleId}`, { method: 'POST' });
        const data = await res.json();
        if (data.status === 'success') {
            if (data.is_bookmarked) {
                btn.classList.add('active-bookmark');
                showToast("Story saved to Bookmarks", "success");
            } else {
                btn.classList.remove('active-bookmark');
                showToast("Removed from Bookmarks", "info");
            }
            loadStats();
        }
    } catch (err) {
        console.error("Bookmark toggle failed:", err);
    }
}

async function triggerManualScrape() {
    const icon = document.getElementById('scrapeIcon');
    const btn = document.getElementById('scrapeBtn');
    const text = document.getElementById('scrapeText');
    
    if (icon) icon.style.animation = 'spin 0.8s linear infinite';
    if (btn) btn.disabled = true;
    if (text) text.innerText = 'Syncing...';

    showToast("Starting live scrape across 10 financial publishers...", "info");

    try {
        const res = await fetch('/api/scrape/now', { method: 'POST' });
        const data = await res.json();
        
        if (icon) icon.style.animation = 'none';
        if (btn) btn.disabled = false;
        if (text) text.innerText = 'Sync Feed';

        if (data.status === 'success') {
            const fetched = data.result ? data.result.total_fetched : 0;
            const saved = data.result ? data.result.total_new_saved : 0;
            showToast(`Scrape complete: ${fetched} fetched, ${saved} high-impact stories saved!`, "success", 4500);
            loadStats();
            loadArticles();
        }
    } catch (err) {
        if (icon) icon.style.animation = 'none';
        if (btn) btn.disabled = false;
        if (text) text.innerText = 'Sync Feed';
        showToast("Error initiating news scrape cycle.", "warning");
    }
}

// ==========================================================================
// FEYNMAN DETECTIVE DOSSIER MODAL
// ==========================================================================
function openFeynmanModal(articleId) {
    currentActiveArticleId = articleId;
    const article = currentArticles.find(a => a.id === articleId);
    if (!article) return;

    // Set top metadata
    document.getElementById('modalCategory').innerText = article.category || 'Finance';
    document.getElementById('modalImportance').innerText = `Score ${article.importance_score || 8}/10`;
    const dateObj = formatArticleDate(article);
    document.getElementById('modalSource').innerText = `${article.source_name || 'Publisher'} • ${dateObj.text}`;
    document.getElementById('modalTitle').innerText = article.title;

    // Fact Summary & Noise
    const newsSumElem = document.getElementById('modalNewsSummary');
    if (newsSumElem) {
        newsSumElem.innerText = article.news_summary || article.raw_summary || article.content || 'No news summary available.';
    }
    const psychElem = document.getElementById('modalPsychology');
    if (psychElem) {
        psychElem.innerText = article.signal_vs_noise || article.feynman_money_psychology || 'Signal is high. Evaluate corporate fundamentals before acting on emotional headlines.';
    }

    // Mechanics & Connections
    const eli5Elem = document.getElementById('modalEli5');
    if (eli5Elem) {
        eli5Elem.innerText = article.system_mechanics || article.feynman_eli5 || '📌 Click "✨ AI Deep Analysis" below to generate First-Principles System Architecture breakdown.';
    }
    const pastElem = document.getElementById('modalPast');
    if (pastElem) {
        pastElem.innerText = article.real_world_connections || article.feynman_future_impact || article.feynman_past_context || '📌 Click "✨ AI Deep Analysis" below for real-world macro connections.';
    }

    // Loopholes & Action Plan
    const detectiveElem = document.getElementById('modalDetective');
    if (detectiveElem) {
        detectiveElem.innerText = article.detective_loopholes || '📌 Click "✨ AI Deep Analysis" below for Institutional Fine Print and regulatory catches.';
    }
    const blueprintElem = document.getElementById('modalBlueprint');
    if (blueprintElem) {
        blueprintElem.innerText = article.actionable_blueprint || '📌 Click "✨ AI Deep Analysis" below for Rational Action Plan.';
    }

    // Jargon List
    const jargonContainer = document.getElementById('modalJargonList');
    if (jargonContainer) {
        jargonContainer.innerHTML = '';
        const jList = article.feynman_jargon || [];
        
        if (jList.length === 0) {
            jargonContainer.innerHTML = `<div style="font-size: 13px; color: var(--text-tertiary); padding: 16px 0;">No jargon decoded yet. Click "✨ AI Deep Analysis" to decode technical terms.</div>`;
        } else {
            jList.forEach(j => {
                const item = document.createElement('div');
                item.className = 'modal-jargon-card';
                item.innerHTML = `
                    <div class="modal-jargon-term">🧩 ${escapeHtml(j.term)}</div>
                    <div class="modal-jargon-def">${escapeHtml(j.eli5)}</div>
                    ${j.analogy ? `<div class="modal-jargon-analogy">⚙️ Mental Model: ${escapeHtml(j.analogy)}</div>` : ''}
                `;
                jargonContainer.appendChild(item);
            });
        }
    }

    // Original Link
    const linkBtn = document.getElementById('modalOriginalLink');
    if (linkBtn) {
        if (article.link) {
            linkBtn.href = article.link;
            linkBtn.style.display = 'inline-flex';
        } else {
            linkBtn.style.display = 'none';
        }
    }

    // Simplify Button state
    const simplifyBtn = document.getElementById('modalSimplifyBtn');
    if (simplifyBtn) {
        const hasExplanation = !!(article.detective_loopholes || article.system_mechanics);
        simplifyBtn.innerHTML = hasExplanation ? `<span>🔄 Re-Analyze with AI</span>` : `<span>✨ AI Deep Analysis</span>`;
        simplifyBtn.disabled = false;
    }

    // Reset to first tab
    switchDossierTab('tab-brief');

    currentModalText = `${article.title}. ${article.news_summary || article.raw_summary || ''}`;

    document.getElementById('feynmanModal').classList.add('active');
}

function switchDossierTab(tabId, btnElement) {
    document.querySelectorAll('.dossier-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.dossier-panel').forEach(p => p.classList.remove('active'));

    const panel = document.getElementById(tabId);
    if (panel) panel.classList.add('active');

    if (btnElement) {
        btnElement.classList.add('active');
    } else {
        const matchingBtn = document.querySelector(`.dossier-tab-btn[onclick*="${tabId}"]`);
        if (matchingBtn) matchingBtn.classList.add('active');
    }
}

async function triggerModalOnDemandSimplify() {
    if (!currentActiveArticleId) return;
    const btn = document.getElementById('modalSimplifyBtn');
    if (btn) {
        btn.innerHTML = `<span>⏳ Gemini AI Thinking...</span>`;
        btn.disabled = true;
    }
    
    showToast("Analyzing like a financial detective with Gemini AI...", "info");

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
            showToast("Analysis complete! Dossier updated.", "success");
        }
    } catch (err) {
        showToast("Gemini AI rate limit reached. Please try again shortly.", "warning");
    } finally {
        if (btn) {
            btn.innerHTML = `<span>✨ AI Deep Analysis</span>`;
            btn.disabled = false;
        }
    }
}

function closeFeynmanModal() {
    const modal = document.getElementById('feynmanModal');
    if (modal) modal.classList.remove('active');
    stopSpeech();
}

// ==========================================================================
// CUSTOM ARTICLE SIMPLIFIER MODAL
// ==========================================================================
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
        showToast("Please provide either an article URL or text paragraph.", "warning");
        return;
    }

    const submitBtn = document.getElementById('customSubmitBtn');
    if (submitBtn) {
        submitBtn.innerHTML = `<span>⏳ Analyzing with Gemini AI...</span>`;
        submitBtn.disabled = true;
    }

    showToast("Processing article with First-Principles engine...", "info");

    try {
        let endpoint = '/api/simplify-url';
        let payload = { url, category };

        if (!url && text) {
            endpoint = '/api/simplify-text';
            payload = { title: "Custom Financial Story", text, category };
        }

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (submitBtn) {
            submitBtn.innerHTML = `<span>🚀 Generate Detective Wealth Blueprint</span>`;
            submitBtn.disabled = false;
        }

        if (data.status === 'success') {
            closeCustomSimplifierModal();
            document.getElementById('customUrlInput').value = '';
            document.getElementById('customTextInput').value = '';
            
            showToast("✨ Story analyzed and added to priority feed!", "success");
            loadStats();
            await loadArticles();
        } else {
            showToast(data.detail || "Could not analyze article.", "warning");
        }
    } catch (err) {
        if (submitBtn) {
            submitBtn.innerHTML = `<span>🚀 Generate Detective Wealth Blueprint</span>`;
            submitBtn.disabled = false;
        }
        showToast("Server error during article analysis.", "warning");
    }
}

// ==========================================================================
// RAW FEED & SOURCES MODALS
// ==========================================================================
async function openRawFeedModal() {
    const modal = document.getElementById('rawFeedModal');
    const container = document.getElementById('rawFeedList');
    container.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div><div style="font-size: 12px;">Loading terminal feed...</div></div>`;
    modal.classList.add('active');

    try {
        const res = await fetch('/api/raw-feed?limit=50');
        const data = await res.json();

        if (data.status === 'success') {
            container.innerHTML = '';
            const feed = data.raw_feed || [];
            
            if (feed.length === 0) {
                container.innerHTML = `<div style="text-align: center; color: var(--text-tertiary); padding: 30px;">No scraped stories recorded yet. Click 'Sync Feed' to run scrapers!</div>`;
                return;
            }

            feed.forEach((item) => {
                const row = document.createElement('div');
                row.className = 'article-row';
                row.style.cursor = 'default';

                const isReadStr = item.is_read ? '✔ Read' : '● Unread';
                const dateObj = formatArticleDate(item);
                const dotClass = getSourceDotClass(item.source_name);

                row.innerHTML = `
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
                            <div style="display: flex; align-items: center; gap: 7px; font-size: 11px;">
                                <span class="source-dot ${dotClass}"></span>
                                <span style="font-weight: 700; color: var(--text-secondary);">${escapeHtml(item.source_name || 'Publisher')}</span>
                                <span style="color: var(--text-tertiary);">•</span>
                                <span style="color: var(--text-tertiary); font-family: 'JetBrains Mono', monospace;">${dateObj.text}</span>
                            </div>
                            <span style="font-size: 10.5px; font-family: 'JetBrains Mono', monospace; color: ${item.is_read ? 'var(--text-tertiary)' : 'var(--accent-pista)'}; font-weight: 700;">${isReadStr}</span>
                        </div>
                        <h4 style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${escapeHtml(item.title)}</h4>
                        <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 8px;">
                            ${escapeHtml(item.news_summary || item.raw_summary || item.title)}
                        </p>
                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 6px;">
                            <span class="score-badge" style="font-size: 10px;">Score: ${item.importance_score || 8}/10</span>
                            <a href="${escapeHtml(item.link)}" target="_blank" style="font-size: 11.5px; color: var(--accent-ochre); text-decoration: none; font-weight: 600;">
                                Source Article ↗
                            </a>
                        </div>
                    </div>
                `;
                container.appendChild(row);
            });
        }
    } catch (err) {
        container.innerHTML = `<div style="text-align: center; color: var(--accent-terracotta); padding: 20px;">Error loading terminal feed.</div>`;
    }
}

function closeRawFeedModal() {
    document.getElementById('rawFeedModal').classList.remove('active');
}

async function openSourcesReportModal() {
    const modal = document.getElementById('sourcesReportModal');
    const container = document.getElementById('sourcesReportTable');
    container.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div><div style="font-size: 12px;">Loading publisher statistics...</div></div>`;
    modal.classList.add('active');

    try {
        const res = await fetch('/api/sources');
        const data = await res.json();

        if (data.status === 'success') {
            container.innerHTML = '';
            const sources = data.sources || [];
            
            if (sources.length === 0) {
                container.innerHTML = `<div style="text-align: center; color: var(--text-tertiary); padding: 20px;">No source metrics recorded yet.</div>`;
                return;
            }

            sources.forEach(s => {
                const item = document.createElement('div');
                item.className = 'article-row';
                item.style.cursor = 'default';

                const dotClass = getSourceDotClass(s.source_name);

                item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="source-dot ${dotClass}" style="width: 8px; height: 8px;"></span>
                        <div>
                            <div style="font-weight: 700; color: var(--text-primary); font-size: 13.5px;">${escapeHtml(s.source_name)}</div>
                            <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 2px;">
                                ${escapeHtml(s.category)} • Synced: ${escapeHtml(s.last_scraped_at || 'Recently')}
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-family: 'JetBrains Mono', monospace; font-size: 13.5px; font-weight: 700; color: var(--accent-pista);">
                            ${s.important_saved} High-Impact
                        </div>
                        <div style="font-size: 10.5px; color: var(--text-tertiary); font-family: 'JetBrains Mono', monospace;">
                            ${s.total_fetched} Fetched
                        </div>
                    </div>
                `;
                container.appendChild(item);
            });
        }
    } catch (err) {
        container.innerHTML = `<div style="text-align: center; color: var(--accent-terracotta); padding: 20px;">Error loading sources breakdown.</div>`;
    }
}

function closeSourcesReportModal() {
    document.getElementById('sourcesReportModal').classList.remove('active');
}

// ==========================================================================
// JARGON DICTIONARY VIEW
// ==========================================================================
async function loadJargonDictionaryView(query = '') {
    const grid = document.getElementById('articlesGrid');
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'flex';

    try {
        let url = '/api/jargon';
        if (query) url += `?query=${encodeURIComponent(query)}`;
        
        const res = await fetch(url);
        const data = await res.json();
        if (spinner) spinner.style.display = 'none';

        if (data.status === 'success' && grid) {
            grid.className = 'articles-grid';
            grid.innerHTML = '';

            if (data.terms.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state-box">
                        <div class="empty-title">No Terms Found</div>
                        <div class="empty-subtitle">No financial jargon matching "${escapeHtml(query)}" in the library.</div>
                    </div>
                `;
                return;
            }

            data.terms.forEach(t => {
                const card = document.createElement('div');
                card.className = 'article-card';
                card.style.borderLeft = '3px solid var(--accent-ochre)';

                card.innerHTML = `
                    <div>
                        <div class="card-header-row">
                            <span class="card-category-pill" style="color: var(--accent-ochre); background: var(--accent-ochre-soft);">
                                ${escapeHtml(t.category)}
                            </span>
                        </div>

                        <h3 class="card-title" style="color: var(--text-primary); margin-bottom: 12px;">🧩 ${escapeHtml(t.term)}</h3>

                        <div class="dossier-box box-summary" style="margin-bottom: 12px; padding: 12px 14px;">
                            <div class="dossier-box-label" style="color: var(--accent-ochre);">Feynman Definition</div>
                            <div class="dossier-box-text" style="font-size: 13px;">${escapeHtml(t.eli5)}</div>
                        </div>

                        <div style="font-size: 12px; color: var(--text-secondary); font-style: italic; background: var(--bg-linen); padding: 10px 12px; border-radius: var(--radius-sm);">
                            💡 <strong>Mental Model:</strong> ${escapeHtml(t.analogy)}
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
        }
    } catch (err) {
        if (spinner) spinner.style.display = 'none';
    }
}

// ==========================================================================
// TEXT TO SPEECH (TTS)
// ==========================================================================
function toggleSpeech(text, btnElement) {
    if (!window.speechSynthesis) {
        showToast("Speech synthesis is not supported on your browser.", "warning");
        return;
    }

    if (isSpeaking && currentSpeakingBtn === btnElement) {
        stopSpeech();
        return;
    }

    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
        isSpeaking = true;
        currentSpeakingBtn = btnElement;
        if (btnElement) btnElement.classList.add('speaking');
        showToast("Reading aloud...", "info", 2000);
    };

    utterance.onend = () => {
        stopSpeech();
    };

    utterance.onerror = () => {
        stopSpeech();
    };

    window.speechSynthesis.speak(utterance);
}

function stopSpeech() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    if (currentSpeakingBtn) {
        currentSpeakingBtn.classList.remove('speaking');
        currentSpeakingBtn = null;
    }
    isSpeaking = false;
    const modalBtn = document.getElementById('modalTtsLabel');
    if (modalBtn) modalBtn.innerText = 'Listen Aloud';
}

function speakCurrentModalText() {
    if (!currentModalText) return;
    const btn = document.getElementById('modalTtsBtn');
    const label = document.getElementById('modalTtsLabel');

    if (isSpeaking) {
        stopSpeech();
        if (label) label.innerText = 'Listen Aloud';
    } else {
        toggleSpeech(currentModalText, btn);
        if (label) label.innerText = 'Stop Audio';
    }
}

// ==========================================================================
// MODAL HELPERS & UTILITIES
// ==========================================================================
function closeAllModals() {
    closeFeynmanModal();
    closeRawFeedModal();
    closeSourcesReportModal();
    closeCustomSimplifierModal();
}

function handleBackdropClick(event, modalId) {
    if (event.target.id === modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
        if (modalId === 'feynmanModal') stopSpeech();
    }
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
