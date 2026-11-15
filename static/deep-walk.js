/* ==========================================================================
   THE DEEP WALK — continuous reader renderer
   One walk: fact -> inside the machine -> the math -> who benefits ->
   the emotion -> your money -> the frame that stays.
   ========================================================================== */
(function () {
    'use strict';

    const CHAPTERS = [
        { key: 'what', num: '01', label: 'The fact', nav: 'Fact' },
        { key: 'machine', num: '02', label: 'Inside the machine', nav: 'Inside' },
        { key: 'math', num: '03', label: 'The math', nav: 'Math' },
        { key: 'claim', num: '04', label: 'The catch', nav: 'The catch' },
        { key: 'human', num: '05', label: 'The emotion', nav: 'Emotion' },
        { key: 'money', num: '06', label: 'Your money', nav: 'Your money' },
        { key: 'picture', num: '07', label: 'The frame', nav: 'The frame' }
    ];

    const cache = new Map();
    let active = null;
    let scrollHandler = null;
    let rafId = null;

    // ----------------------------------------------------------------------
    // Safe text rendering
    // ----------------------------------------------------------------------

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function plainText(value) {
        return String(value || '')
            .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$1')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/[ \t]+/g, ' ')
            .trim();
    }

    function formatInline(text, terms) {
        let html = text
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');

        html = html.replace(/\u0000TERM(\d+)\u0000/g, function (match, index) {
            const term = terms[Number(index)];
            if (!term) return '';
            const definition = escapeHtml(term.def);
            return `<span class="glossary-term" tabindex="0" role="note" data-def="${definition}">${escapeHtml(term.term)}<span class="glossary-tip">${definition}</span></span>`;
        });
        return html;
    }

    // Supports paragraphs, **bold**, *italic*, - bullets, numbered lists and
    // [[term|definition]] inline glossary chips. Everything is escaped first;
    // only the markup created here is ever injected.
    function renderRichText(raw) {
        if (!raw) return '';
        const terms = [];
        const marked = String(raw).replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, function (match, term, definition) {
            const index = terms.length;
            terms.push({ term: term.trim(), def: definition.trim() });
            return `\u0000TERM${index}\u0000`;
        });

        const escaped = escapeHtml(marked);
        const blocks = escaped.split(/\n{2,}/);
        let html = '';

        blocks.forEach(function (block) {
            const lines = block.split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
            if (!lines.length) return;

            let paragraph = [];
            let listType = null;
            let listItems = [];

            function flushParagraph() {
                if (paragraph.length) {
                    html += `<p>${formatInline(paragraph.join(' '), terms)}</p>`;
                    paragraph = [];
                }
            }

            function flushList() {
                if (listType && listItems.length) {
                    html += `<${listType}>${listItems.map(function (item) {
                        return `<li>${formatInline(item, terms)}</li>`;
                    }).join('')}</${listType}>`;
                }
                listType = null;
                listItems = [];
            }

            lines.forEach(function (line) {
                const bullet = line.match(/^[-•]\s+(.+)$/);
                const numbered = line.match(/^\d+[.)]\s+(.+)$/);
                if (bullet) {
                    flushParagraph();
                    if (listType !== 'ul') flushList();
                    listType = 'ul';
                    listItems.push(bullet[1]);
                } else if (numbered) {
                    flushParagraph();
                    if (listType !== 'ol') flushList();
                    listType = 'ol';
                    listItems.push(numbered[1]);
                } else {
                    flushList();
                    paragraph.push(line);
                }
            });

            flushParagraph();
            flushList();
        });

        return html;
    }

    function safeHttpUrl(url) {
        const raw = String(url || '').trim();
        if (!raw) return '';
        try {
            const parsed = new URL(raw, window.location.origin);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
        } catch (error) {
            // Ignore malformed URLs.
        }
        return '';
    }

    // ----------------------------------------------------------------------
    // Chapter renderers
    // ----------------------------------------------------------------------

    function chapterHeader(meta, data) {
        return `
            <div class="chapter-eyebrow">
                <span class="chapter-num">${meta.num}</span>
                <span class="chapter-label">${escapeHtml(meta.label)}</span>
            </div>
            <h3 class="chapter-title">${escapeHtml(data.title || meta.label)}</h3>
            ${data.kicker ? `<p class="chapter-kicker">${escapeHtml(data.kicker)}</p>` : ''}
            ${data.bridge ? `<div class="chapter-bridge">${renderRichText(data.bridge)}</div>` : ''}
        `;
    }

    function prose(body) {
        return `<div class="chapter-prose">${renderRichText(body)}</div>`;
    }

    function renderWhat(data) {
        return `${chapterHeader(CHAPTERS[0], data)}${prose(data.body)}`;
    }

    function renderMachine(data) {
        return `${chapterHeader(CHAPTERS[1], data)}${prose(data.body)}`;
    }

    function renderMath(data, walk) {
        const hasFormula = data.formula_status === 'derived' && data.formula;
        let html = chapterHeader(CHAPTERS[2], data);

        if (data.intro) html += prose(data.intro);

        if (hasFormula) {
            html += `
                <div class="blackboard">
                    <div class="blackboard-label">The governing equation</div>
                    ${data.formula_name ? `<div class="blackboard-name">${escapeHtml(data.formula_name)}</div>` : ''}
                    <div class="blackboard-formula">${escapeHtml(data.formula)}</div>
                </div>
            `;
        } else {
            html += `
                <div class="math-noneeded">
                    <div class="math-block-label">No formula forced here</div>
                    <div class="chapter-prose">${renderRichText(data.when_it_breaks || data.intro || 'This story is better explained without forcing an equation onto it.')}</div>
                </div>
            `;
        }

        if (data.symbols && data.symbols.length) {
            html += `
                <div class="symbol-wrap">
                    <div class="math-block-label">What each symbol is in the real story</div>
                    <table class="symbol-table">
                        ${data.symbols.map(function (symbol) {
                            return `<tr><td>${escapeHtml(symbol.symbol)}</td><td>${escapeHtml(symbol.meaning)}</td></tr>`;
                        }).join('')}
                    </table>
                </div>
            `;
        }

        const sections = [
            ['Where the equation comes from', data.where_it_comes_from],
            ['Worked with real numbers', data.worked_example],
            ['Turn the knob', data.turn_the_knob],
            ['When the equation breaks', data.when_it_breaks]
        ];

        sections.forEach(function (entry) {
            if (!entry[1]) return;
            html += `
                <div class="math-section">
                    <div class="math-block-label">${entry[0]}</div>
                    <div class="chapter-prose math-prose">${renderRichText(entry[1])}</div>
                </div>
            `;
        });

        const arithmetic = walk.verified_arithmetic || [];
        if (arithmetic.length) {
            html += `
                <div class="checked-math">
                    <div class="checked-math-head">
                        <span>Checked arithmetic</span>
                        <span>computed on the server, not by the model</span>
                    </div>
                    ${arithmetic.map(function (row) {
                        return `
                            <div class="checked-math-row">
                                <div class="checked-math-label">${escapeHtml(row.label)}</div>
                                <div class="checked-math-value">${escapeHtml(row.value)}</div>
                                ${row.note ? `<div class="checked-math-note">${escapeHtml(row.note)}</div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        return html;
    }

    function claimCard(label, text) {
        if (!text) return '';
        return `
            <div class="claim-card">
                <div class="claim-card-label">${escapeHtml(label)}</div>
                <div class="claim-card-text">${renderRichText(text)}</div>
            </div>
        `;
    }

    function renderClaim(data) {
        const signal = (data.signal_call || 'mixed').toLowerCase();
        const signalLabel = signal === 'signal' ? 'Real signal' : signal === 'noise' ? 'Mostly noise' : 'Mixed';
        let html = chapterHeader(CHAPTERS[3], data);

        html += `
            <div class="signal-row">
                <span class="signal-badge signal-${escapeHtml(signal)}">${escapeHtml(signalLabel)}</span>
                ${data.signal_reason ? `<div class="signal-reason">${renderRichText(data.signal_reason)}</div>` : ''}
            </div>
        `;

        if (data.intro) html += prose(data.intro);

        html += '<div class="claim-grid">';
        html += claimCard('The claim, precisely', data.claim);
        html += claimCard('Who profits if you believe it', data.who_benefits);
        html += claimCard('What the headline leaves out', data.left_out);
        html += claimCard('How to falsify the claim', data.falsify);
        html += '</div>';

        if (data.fine_print && data.fine_print.length) {
            html += `
                <div class="fine-print">
                    <div class="math-block-label">The fine print that costs you money</div>
                    <ul class="fine-print-list">
                        ${data.fine_print.map(function (item) { return `<li>${renderRichText(item)}</li>`; }).join('')}
                    </ul>
                </div>
            `;
        }

        return html;
    }

    function renderHuman(data) {
        let html = chapterHeader(CHAPTERS[4], data);
        html += prose(data.body);
        if (data.rule) {
            html += `
                <div class="rule-card">
                    <div class="rule-label">The rule to keep</div>
                    <div class="rule-text">${renderRichText(data.rule)}</div>
                </div>
            `;
        }
        return html;
    }

    function renderMoney(data) {
        let html = chapterHeader(CHAPTERS[5], data);
        if (data.intro) html += prose(data.intro);

        if (data.capital_check) {
            html += `
                <div class="capital-check">
                    <div class="capital-check-label">Your ₹2,00,000 check</div>
                    <div class="capital-check-text">${renderRichText(data.capital_check)}</div>
                </div>
            `;
        }

        if (data.moves && data.moves.length) {
            html += `
                <div class="ledger">
                    <div class="ledger-head">
                        <span>Move</span><span>Amount</span><span>Why</span>
                    </div>
                    ${data.moves.map(function (move) {
                        return `
                            <div class="ledger-row">
                                <div class="ledger-move">${renderRichText(move.move)}</div>
                                <div class="ledger-amount">${escapeHtml(move.amount || '—')}</div>
                                <div class="ledger-why">${renderRichText(move.why || '')}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        if (data.dont_do && data.dont_do.length) {
            html += `
                <div class="dont-do">
                    <div class="math-block-label">What not to do with this news</div>
                    <ul>
                        ${data.dont_do.map(function (item) { return `<li>${renderRichText(item)}</li>`; }).join('')}
                    </ul>
                </div>
            `;
        }

        return html;
    }

    function renderPicture(data) {
        let html = chapterHeader(CHAPTERS[6], data);

        html += `
            <div class="keepsake">
                ${data.scene ? `<div class="keepsake-scene">${renderRichText(data.scene)}</div>` : ''}

                ${data.three_lines && data.three_lines.length ? `
                    <div class="keepsake-section">
                        <div class="keepsake-label">The whole walk in three lines</div>
                        <ol class="keepsake-three">
                            ${data.three_lines.map(function (line) { return `<li>${renderRichText(line)}</li>`; }).join('')}
                        </ol>
                    </div>
                ` : ''}

                ${data.questions && data.questions.length ? `
                    <div class="keepsake-section">
                        <div class="keepsake-label">Questions to carry to the next headline</div>
                        <ul class="keepsake-questions">
                            ${data.questions.map(function (item) { return `<li>${renderRichText(item)}</li>`; }).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${data.watch_next && data.watch_next.length ? `
                    <div class="keepsake-section">
                        <div class="keepsake-label">What to watch next</div>
                        <div class="watch-chips">
                            ${data.watch_next.map(function (item) { return `<span class="watch-chip">${escapeHtml(plainText(item))}</span>`; }).join('')}
                        </div>
                    </div>
                ` : ''}

                ${data.words_you_own && data.words_you_own.length ? `
                    <div class="keepsake-section">
                        <div class="keepsake-label">Words you now own</div>
                        <div class="word-list">
                            ${data.words_you_own.map(function (word) {
                                return `<div class="word-pill"><strong>${escapeHtml(word.term)}</strong><span>${escapeHtml(word.meaning)}</span></div>`;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        return html;
    }

    function renderInvite() {
        const steps = [
            ['01', 'Go inside the institution', 'Follow the money through the real rooms, ledgers, screens and settlement windows where it actually moves.'],
            ['02', 'Derive the formula', 'One governing equation, built from a rupee, with your numbers and a parameter you can turn.'],
            ['03', 'Interrogate the claim', 'Who profits if you believe the headline, what it leaves out, and the test that would falsify it.'],
            ['04', 'Map the emotion', 'Who is afraid, who is greedy, what you will feel, and the rule that protects you from the urge.'],
            ['05', 'Check your money', 'A plan for ₹50,000 a month and ₹2,00,000 in savings, starting with the emergency floor.'],
            ['06', 'Leave a frame', 'One real image, three sentences, and the questions to carry to the next headline.']
        ];
        return `
            <section class="walk-invite">
                <div class="walk-invite-kicker">The full walk covers</div>
                <h3 class="walk-invite-title">Seven rooms, one continuous read.</h3>
                <div class="walk-invite-grid">
                    ${steps.map(function (step) {
                        return `<div class="walk-invite-step"><span class="walk-invite-num">${step[0]}</span><div><strong>${step[1]}</strong><p>${step[2]}</p></div></div>`;
                    }).join('')}
                </div>
                <button type="button" class="btn btn-primary" onclick="triggerModalOnDemandSimplify()">Build the full walk</button>
            </section>
        `;
    }

    function renderChapter(meta, walk) {
        const data = walk[meta.key];
        if (!data) return '';
        let inner = '';
        switch (meta.key) {
            case 'what': inner = renderWhat(data); break;
            case 'machine': inner = renderMachine(data); break;
            case 'math': inner = renderMath(data, walk); break;
            case 'claim': inner = renderClaim(data); break;
            case 'human': inner = renderHuman(data); break;
            case 'money': inner = renderMoney(data); break;
            case 'picture': inner = renderPicture(data); break;
            default: inner = '';
        }
        return `<section class="walk-chapter walk-chapter-${meta.key}" id="chapter-${meta.key}">${inner}</section>`;
    }

    // ----------------------------------------------------------------------
    // Header, banners, nav, scroll spy
    // ----------------------------------------------------------------------

    function availableChapters(walk) {
        return CHAPTERS.filter(function (meta) { return walk && walk[meta.key]; });
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function sourceLabel(source, meta) {
        if (meta && meta.generator === 'local') return 'Offline walk';
        if (source === 'unexplained') return 'Not walked yet';
        if (source === 'legacy') return 'Rebuilt from older analysis';
        return 'Deep walk';
    }

    function bannerHtml(source, walk) {
        const meta = walk.meta || {};
        if (meta.generator === 'local') {
            return `<div class="walk-banner banner-offline"><strong>Offline walk.</strong> The live AI could not be reached${meta.fallback_reason ? ` (${escapeHtml(meta.fallback_reason)})` : ''}. The real-system camera walk and the checked arithmetic are here; the story-specific reporting is not. Re-run when the AI is available.</div>`;
        }
        if (source === 'unexplained') {
            return `<div class="walk-banner banner-unexplained"><strong>This story has not been walked yet.</strong> Start the Deep Walk to get the camera tour, the formula, the incentive map, the emotional trap, and the plan for your ₹50,000 and ₹2,00,000.</div>`;
        }
        if (source === 'legacy') {
            return `<div class="walk-banner banner-legacy"><strong>Older analysis.</strong> This walk was rebuilt from the previous tabbed engine. It has the outline, but not the math room, the incentive interrogation, or the checked arithmetic. Build the full walk to upgrade it.</div>`;
        }
        return '';
    }

    function setHeader(article, walk, source) {
        const meta = (walk && walk.meta) || {};
        setText('modalCategory', article.category || 'Finance');
        setText('modalImportance', `Score ${article.importance_score || 8}/10`);
        setText('modalSource', `${article.source_name || 'Publisher'} • ${sourceLabel(source, meta)}`);

        const minutes = (walk && walk.reading_minutes) || 0;
        if (source === 'unexplained') {
            setText('modalReadTime', 'Summary only');
        } else {
            setText('modalReadTime', minutes ? `${minutes} min deep read` : 'Deep walk');
        }

        const title = document.getElementById('modalTitle');
        if (title) title.textContent = article.title || 'Financial story';

        const banner = document.getElementById('walkBanner');
        if (banner) banner.innerHTML = bannerHtml(source, walk || {});

        const link = document.getElementById('modalOriginalLink');
        const safeUrl = safeHttpUrl(article.link);
        if (link) {
            if (safeUrl) {
                link.href = safeUrl;
                link.style.display = '';
            } else {
                link.style.display = 'none';
            }
        }

        const simplifyBtn = document.getElementById('modalSimplifyBtn');
        if (simplifyBtn) {
            const label = simplifyBtn.querySelector('span');
            if (label) {
                label.textContent = (source === 'legacy' || source === 'unexplained')
                    ? 'Build the full walk'
                    : 'Re-walk with AI';
            }
            simplifyBtn.disabled = false;
        }
    }

    function resetProgress() {
        const fill = document.getElementById('walkProgress');
        if (fill) fill.style.width = '0%';
        const root = document.getElementById('walkScrollRoot');
        if (root) root.scrollTop = 0;
    }

    function updateSpy() {
        const root = document.getElementById('walkScrollRoot');
        const nav = document.getElementById('walkNav');
        if (!root || !nav) return;

        const chapters = Array.prototype.slice.call(root.querySelectorAll('.walk-chapter'));
        if (!chapters.length) return;

        const rootTop = root.getBoundingClientRect().top;
        let activeId = chapters[0].id;
        chapters.forEach(function (chapter) {
            const offset = chapter.getBoundingClientRect().top - rootTop;
            if (offset <= 120) activeId = chapter.id;
        });

        nav.querySelectorAll('.walk-nav-btn').forEach(function (button) {
            button.classList.toggle('active', button.dataset.target === activeId);
        });

        const activeButton = nav.querySelector('.walk-nav-btn.active');
        if (activeButton) {
            const navLeft = activeButton.offsetLeft;
            const navRight = navLeft + activeButton.offsetWidth;
            if (navLeft < nav.scrollLeft || navRight > nav.scrollLeft + nav.clientWidth) {
                nav.scrollTo({ left: navLeft - nav.clientWidth / 2 + activeButton.offsetWidth / 2, behavior: 'smooth' });
            }
        }

        const maxScroll = root.scrollHeight - root.clientHeight;
        const progress = maxScroll > 0 ? (root.scrollTop / maxScroll) * 100 : 0;
        const fill = document.getElementById('walkProgress');
        if (fill) fill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }

    function bindReaderEvents() {
        const root = document.getElementById('walkScrollRoot');
        const nav = document.getElementById('walkNav');
        if (!root) return;

        if (scrollHandler) root.removeEventListener('scroll', scrollHandler);
        scrollHandler = function () {
            if (rafId) return;
            rafId = window.requestAnimationFrame(function () {
                rafId = null;
                updateSpy();
            });
        };
        root.addEventListener('scroll', scrollHandler, { passive: true });

        if (nav && !nav.dataset.bound) {
            nav.dataset.bound = '1';
            nav.addEventListener('click', function (event) {
                const button = event.target.closest('.walk-nav-btn');
                if (!button) return;
                const target = document.getElementById(button.dataset.target);
                if (!target) return;
                const rootRect = root.getBoundingClientRect();
                const targetRect = target.getBoundingClientRect();
                root.scrollTo({
                    top: root.scrollTop + (targetRect.top - rootRect.top) - 10,
                    behavior: 'smooth'
                });
            });
        }

        if (!root.dataset.glossaryBound) {
            root.dataset.glossaryBound = '1';
            root.addEventListener('click', function (event) {
                const chip = event.target.closest('.glossary-term');
                if (!chip) return;
                const wasOpen = chip.classList.contains('open');
                root.querySelectorAll('.glossary-term.open').forEach(function (element) {
                    element.classList.remove('open');
                });
                if (!wasOpen) chip.classList.add('open');
            });
            root.addEventListener('keydown', function (event) {
                if (event.key === 'Escape') {
                    root.querySelectorAll('.glossary-term.open').forEach(function (element) {
                        element.classList.remove('open');
                    });
                }
            });
        }
    }

    function teardownReader() {
        const root = document.getElementById('walkScrollRoot');
        if (root && scrollHandler) root.removeEventListener('scroll', scrollHandler);
        if (rafId) window.cancelAnimationFrame(rafId);
        scrollHandler = null;
        rafId = null;
    }

    // ----------------------------------------------------------------------
    // Public rendering API
    // ----------------------------------------------------------------------

    function showSkeleton(article) {
        active = null;
        setText('modalCategory', (article && article.category) || 'Finance');
        setText('modalImportance', `Score ${(article && article.importance_score) || 8}/10`);
        setText('modalSource', `${(article && article.source_name) || 'Publisher'} • Opening`);
        setText('modalReadTime', 'Deep walk');
        const title = document.getElementById('modalTitle');
        if (title) title.textContent = (article && article.title) || 'Financial story';

        const banner = document.getElementById('walkBanner');
        if (banner) banner.innerHTML = '';
        const nav = document.getElementById('walkNav');
        if (nav) nav.innerHTML = '';
        const body = document.getElementById('walkBody');
        if (body) {
            body.innerHTML = `
                <div class="walk-loading">
                    <div class="spinner"></div>
                    <div class="walk-loading-title">Opening the Deep Walk…</div>
                    <div class="walk-loading-sub">Fetching the fact layer, the system tour, the math, and the incentives.</div>
                </div>
            `;
        }
        const simplifyBtn = document.getElementById('modalSimplifyBtn');
        if (simplifyBtn) simplifyBtn.disabled = true;
        resetProgress();

        const link = document.getElementById('modalOriginalLink');
        if (link) link.style.display = 'none';
    }

    function render(article, walk, source) {
        active = { article: article || {}, walk: walk || {}, source: source || 'deep' };
        setHeader(active.article, walk, active.source);

        const nav = document.getElementById('walkNav');
        const body = document.getElementById('walkBody');
        const chapters = availableChapters(walk);

        if (nav) {
            nav.innerHTML = chapters.map(function (meta) {
                return `<button type="button" class="walk-nav-btn" data-target="chapter-${meta.key}"><span class="walk-nav-num">${meta.num}</span><span>${escapeHtml(meta.nav)}</span></button>`;
            }).join('');
        }

        if (body) {
            body.innerHTML = chapters.map(function (meta) {
                return renderChapter(meta, walk);
            }).join('') + (active.source === 'unexplained' ? renderInvite() : '');
        }

        bindReaderEvents();
        resetProgress();
        window.setTimeout(updateSpy, 40);
    }

    function renderError(article, message, retry) {
        setText('modalSource', `${(article && article.source_name) || 'Publisher'} • Unavailable`);
        const nav = document.getElementById('walkNav');
        if (nav) nav.innerHTML = '';
        const body = document.getElementById('walkBody');
        if (body) {
            body.innerHTML = `
                <div class="walk-error">
                    <div class="walk-error-title">The walk could not open</div>
                    <div class="walk-error-text">${escapeHtml(message || 'The server did not return this story.')}</div>
                    <button type="button" class="btn btn-primary" id="walkRetryBtn">Retry</button>
                </div>
            `;
            const retryBtn = document.getElementById('walkRetryBtn');
            if (retryBtn && typeof retry === 'function') retryBtn.addEventListener('click', retry);
        }
        const simplifyBtn = document.getElementById('modalSimplifyBtn');
        if (simplifyBtn) simplifyBtn.disabled = false;
    }

    function close() {
        teardownReader();
        active = null;
    }

    function getReadableText() {
        if (!active || !active.walk) return '';
        const walk = active.walk;
        const parts = [active.article && active.article.title ? active.article.title : ''];

        CHAPTERS.forEach(function (meta) {
            const chapter = walk[meta.key];
            if (!chapter) return;
            parts.push(chapter.title || meta.label);
            if (chapter.bridge) parts.push(plainText(chapter.bridge));

            if (meta.key === 'math') {
                ['intro', 'where_it_comes_from', 'worked_example', 'turn_the_knob', 'when_it_breaks'].forEach(function (key) {
                    if (chapter[key]) parts.push(plainText(chapter[key]));
                });
                (chapter.symbols || []).forEach(function (symbol) {
                    parts.push(`${symbol.symbol}: ${symbol.meaning}`);
                });
                (walk.verified_arithmetic || []).forEach(function (row) {
                    parts.push(`${row.label}: ${row.value}`);
                });
            } else if (meta.key === 'claim') {
                ['intro', 'claim', 'who_benefits', 'left_out', 'falsify', 'signal_reason'].forEach(function (key) {
                    if (chapter[key]) parts.push(plainText(chapter[key]));
                });
                (chapter.fine_print || []).forEach(function (item) { parts.push(plainText(item)); });
            } else if (meta.key === 'money') {
                if (chapter.intro) parts.push(plainText(chapter.intro));
                if (chapter.capital_check) parts.push(plainText(chapter.capital_check));
                (chapter.moves || []).forEach(function (move) {
                    parts.push(`${move.move} ${move.amount || ''} ${move.why || ''}`);
                });
                (chapter.dont_do || []).forEach(function (item) { parts.push(plainText(item)); });
            } else if (meta.key === 'picture') {
                if (chapter.scene) parts.push(plainText(chapter.scene));
                (chapter.three_lines || []).forEach(function (line) { parts.push(plainText(line)); });
                (chapter.watch_next || []).forEach(function (line) { parts.push(plainText(line)); });
            } else if (chapter.body) {
                parts.push(plainText(chapter.body));
            }
        });

        return parts.filter(Boolean).join('. ');
    }

    async function fetchArticle(articleId) {
        if (cache.has(articleId)) return cache.get(articleId);
        const response = await fetch(`/api/article/${articleId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (payload.status !== 'success' || !payload.walk) throw new Error('Malformed article payload');
        const value = {
            article: payload.article,
            walk: payload.walk,
            source: payload.walk_source || 'deep'
        };
        cache.set(articleId, value);
        return value;
    }

    function put(articleId, payload) {
        if (articleId && payload) cache.set(articleId, payload);
    }

    function invalidate(articleId) {
        cache.delete(articleId);
    }

    window.DeepWalk = {
        fetch: fetchArticle,
        put: put,
        invalidate: invalidate,
        showSkeleton: showSkeleton,
        render: render,
        renderError: renderError,
        close: close,
        getReadableText: getReadableText
    };
})();
