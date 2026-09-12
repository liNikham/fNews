// Feynman Finance Dashboard Client Application

let currentCategory = 'all';
let searchQuery = '';
let currentArticles = [];
let currentModalText = '';

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadArticles();
});

// Load Aggregate Stats
async function loadStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data.status === 'success') {
            document.getElementById('statTotalArticles').innerText = data.stats.total_articles || 0;
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
        let url = `/api/news?category=${encodeURIComponent(currentCategory)}&page=1&limit=30`;
        if (searchQuery) {
            url += `&query=${encodeURIComponent(searchQuery)}`;
        }
        if (currentCategory === 'bookmarked') {
            url = `/api/news?bookmarked_only=true&limit=30`;
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

// Render Articles Grid
function renderArticlesGrid(articles) {
    const grid = document.getElementById('articlesGrid');
    grid.innerHTML = '';

    if (!articles || articles.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <div style="font-size: 48px; margin-bottom: 12px;">🔍</div>
                <h3 style="font-size: 20px; color: var(--text-primary);">No news stories found</h3>
                <p style="margin-top: 8px;">Try clicking "Sync News" or simplifying a custom news link!</p>
            </div>
        `;
        return;
    }

    articles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'news-card';

        // Render jargon pills
        const jargonList = article.feynman_jargon || [];
        const jargonPillsHtml = jargonList.map(j => `<span class="jargon-tag" onclick="event.stopPropagation(); openJargonModal('${escapeHtml(j.term)}')">💡 ${escapeHtml(j.term)}</span>`).join('');

        const isBookmarked = article.is_bookmarked === 1;

        card.innerHTML = `
            <div>
                <div class="card-top-meta">
                    <span class="badge-cat">${escapeHtml(article.category || 'Finance')}</span>
                    <span class="source-badge">⚡ ${escapeHtml(article.source_name || 'Indian News')}</span>
                </div>
                
                <h3 class="card-headline">${escapeHtml(article.title)}</h3>

                <div class="feynman-eli5-card-box">
                    <div class="eli5-label-header">👶 Feynman ELI5</div>
                    <div class="eli5-body-text">${escapeHtml(article.feynman_eli5 || article.raw_summary)}</div>
                </div>

                <div class="jargon-tags-container">
                    ${jargonPillsHtml}
                </div>
            </div>

            <div class="card-bottom-actions">
                <button class="btn btn-glass" style="font-size: 12.5px; padding: 8px 16px;" onclick="openFeynmanModal(${article.id})">
                    🧠 Feynman Breakdown
                </button>

                <div class="action-icon-group">
                    <button class="icon-action-btn ${isBookmarked ? 'active' : ''}" onclick="toggleBookmark(${article.id}, this)" title="Bookmark">
                        🔖
                    </button>
                    <button class="icon-action-btn" onclick="speakText('${escapeHtml(article.title)}. ${escapeHtml(article.feynman_eli5)}')" title="Listen (Read Aloud)">
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
    
    // Update tab styling
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

// Handle Live Search
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
            alert(`🎉 Success! Scraped and simplified ${data.result.total_new} new financial stories!`);
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

// Open Article Detail Modal
function openFeynmanModal(articleId) {
    const article = currentArticles.find(a => a.id === articleId);
    if (!article) return;

    document.getElementById('modalCategory').innerText = article.category || 'Finance';
    document.getElementById('modalSource').innerText = article.source_name || 'Indian News';
    document.getElementById('modalTitle').innerText = article.title;
    document.getElementById('modalEli5').innerText = article.feynman_eli5 || 'No summary available';

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
                ${j.analogy ? `<div style="font-size: 12px; color: #cbd5e1; font-style: italic; margin-top: 6px; background: rgba(168, 85, 247, 0.12); padding: 6px 10px; border-radius: 6px;">💡 Analogy: ${escapeHtml(j.analogy)}</div>` : ''}
            `;
            jargonContainer.appendChild(item);
        });
    }

    document.getElementById('modalPast').innerText = article.feynman_past_context || 'N/A';
    document.getElementById('modalFuture').innerText = article.feynman_future_impact || 'N/A';
    document.getElementById('modalPsychology').innerText = article.feynman_money_psychology || 'N/A';
    
    const linkBtn = document.getElementById('modalOriginalLink');
    if (article.link) {
        linkBtn.href = article.link;
        linkBtn.style.display = 'inline-flex';
    } else {
        linkBtn.style.display = 'none';
    }

    currentModalText = `${article.title}. ${article.feynman_eli5}`;

    document.getElementById('feynmanModal').classList.add('active');
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
    submitBtn.innerText = "⏳ Scraping & Simplifying with Feynman...";
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
        submitBtn.innerText = "🚀 Simplify with Feynman First-Principles";
        submitBtn.disabled = false;

        if (data.status === 'success') {
            closeCustomSimplifierModal();
            document.getElementById('customUrlInput').value = '';
            document.getElementById('customTextInput').value = '';
            
            loadStats();
            await loadArticles();
            alert("✨ Article simplified and added to your feed!");
        } else {
            alert(data.detail || "Could not simplify article.");
        }
    } catch (err) {
        submitBtn.innerText = "🚀 Simplify with Feynman First-Principles";
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
                        <div class="eli5-label-header" style="color: var(--purple);">👶 Feynman Definition</div>
                        <div class="eli5-body-text">${escapeHtml(t.eli5)}</div>
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
