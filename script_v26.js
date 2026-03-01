document.addEventListener('DOMContentLoaded', () => {
    console.log("Finance Study Corner Ver 3.0 - Ultimate Edition Loaded.");

    const VERSION = '3.0';
    let currentData = { ...DASHBOARD_DATA };

    // State management
    let fundPage = 0;
    const FUND_PAGE_SIZE = 10;

    let newsPage = 0;
    let newsCategory = null;
    const NEWS_PAGE_SIZE = 10;

    // --- VIEW SWITCHING ---
    const contentDisplay = document.getElementById('content-display');

    const switchView = (viewName) => {
        const template = document.getElementById(`template-${viewName}`);
        if (!template) return;

        contentDisplay.innerHTML = '';
        const clone = template.cloneNode(true);
        // Rename ID of clone to avoid conflict, but keep children IDs (or use querySelector)
        clone.id = `active-${viewName}`;
        clone.classList.remove('hidden');
        clone.style.height = '100%';
        contentDisplay.appendChild(clone);

        render(viewName);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        contentDisplay.scrollTop = 0;
    };

    // Global navigation
    document.querySelectorAll('.book, .drawer, #nav-home').forEach(el => {
        el.addEventListener('click', () => {
            const target = el.getAttribute('data-target');
            if (target) switchView(target);
        });
    });

    // --- RENDERING MANAGER ---
    const render = (specificView = null) => {
        const d = currentData;
        if (!d) return;

        // 1. Wall Board Updates (Gauges & Main Stats)
        const wallVal = document.getElementById('ov-vn-val');
        if (wallVal) wallVal.innerText = d.market.vnindex.value;
        const wallChg = document.getElementById('ov-vn-chg');
        if (wallChg) {
            wallChg.innerText = `${d.market.vnindex.change} (${d.market.vnindex.percent})`;
            wallChg.className = d.market.vnindex.change.includes('+') ? 'vn-main-chg badge-up' : 'vn-main-chg badge-down';
        }
        const wallDate = document.getElementById('trading-date');
        if (wallDate) wallDate.innerText = `Dữ liệu: ${d.tradingDate}`;

        // 2. SVG Gauges (Ngắn hạn & Trung hạn)
        if (d.market.sentimentShort) {
            updateGaugeSVG('short', d.market.sentimentShort);
            updateGaugeSVG('mid', d.market.sentimentMid);
        }

        function updateGaugeSVG(type, data) {
            const needle = document.getElementById(`needle-${type}`);
            const valEl = document.getElementById(`val-${type}`);
            const statusEl = document.getElementById(`status-${type}`);
            if (!needle || !data) return;

            // Rotate needle: 0% -> -90deg, 100% -> 90deg
            const rotation = -90 + (data.current * 1.8);
            needle.style.transform = `rotate(${rotation}deg)`;

            if (valEl) valEl.textContent = data.current;
            if (statusEl) {
                statusEl.textContent = data.status;
                // Color based on status
                if (data.current > 60) statusEl.style.fill = "#69f0ae";
                else if (data.current > 40) statusEl.style.fill = "#ffd740";
                else statusEl.style.fill = "#ff5252";
            }

            // History dots
            const prefix = type === 'short' ? 'short' : 'mid';
            if (document.getElementById(`${prefix}-m`)) {
                document.getElementById(`${prefix}-m`).textContent = data.history[0];
                document.getElementById(`${prefix}-w`).textContent = data.history[1];
                document.getElementById(`${prefix}-d`).textContent = data.history[2];
            }
        }

        // 2b. Legacy logic for other elements if they exist
        if (document.getElementById('gauge-sent-needle')) {
            updateGauge('sent', d.market.euphoria, d.market.sentiment);
            const flowVal = parseFloat(d.market.liquidity.replace('%', '')) || 0;
            let flowPercent = 20 + (flowVal * 7);
            updateGauge('flow', Math.min(Math.max(flowPercent, 0), 100), `${flowVal >= 0 ? '+' : ''}${flowVal}%`, 'MẠNH');
        }

        // Mocks for historical badges (keeping for consistency in other areas if visible)
        if (document.getElementById('sent-m')) {
            const euphoria = d.market.euphoria || 50;
            document.getElementById('sent-m').innerText = Math.round(euphoria * 0.85);
            document.getElementById('sent-w').innerText = Math.round(euphoria * 1.1) > 100 ? 100 : Math.round(euphoria * 1.1);
            document.getElementById('sent-d').innerText = euphoria;
        }

        renderStickyNotes(d);

        if (specificView === 'overview') renderOverview(d);
        if (specificView === 'fundamental') renderFundamental(d);
        if (specificView === 'news') renderNews(d);
        if (specificView === 'technical') renderTechnical(d);
        if (specificView === 'statistics') renderStatistics(d);
        if (specificView === 'recommendation') renderRecommendation(d);
    };

    function updateGauge(id, percent, num, state = null) {
        const needle = document.getElementById(`gauge-${id}-needle`);
        const numEl = document.getElementById(`gauge-${id}-num`);
        const stateEl = document.getElementById(`gauge-${id}-state`);
        if (!needle) return;

        // Gauge 180 deg: percent 0 -> -90, 50 -> 0, 100 -> 90
        const rotation = -90 + (percent * 1.8);
        needle.style.transform = `rotate(${rotation}deg)`;
        if (numEl) numEl.innerText = num || Math.round(percent);
        if (stateEl) stateEl.innerText = state || (percent > 70 ? 'Hưng Phấn' : (percent > 30 ? 'Cân bằng' : 'Thận trọng'));
    }

    function renderStickyNotes(d) {
        const zone = document.getElementById('highlights-container');
        if (zone && d.highlights) {
            // Show up to 4 meaningful highlights in the 2x2 grid
            zone.innerHTML = d.highlights.slice(0, 4).map((h, i) => `
                <div class="sticky-note ${i % 2 != 0 ? 'alt-color' : ''}" style="transform: rotate(${(i % 2 == 0 ? -2 : 2) * (i % 3 == 0 ? 1.5 : 1)}deg);">
                    <div class="pin-red"></div>
                    <div style="font-size:0.55rem; margin-bottom:5px; text-transform:uppercase; color:#795548; font-weight:900; border-bottom:1px solid rgba(0,0,0,0.05);">${h.icon || '📌'} ${h.section}</div>
                    <div style="line-height:1.25; font-size:0.68rem; color:#444;">${h.content.substring(0, 120)}${h.content.length > 120 ? '...' : ''}</div>
                </div>
            `).join('');
        }
    }

    // 1. OVERVIEW (Folder tabs)
    function renderOverview(d) {
        const tabs = contentDisplay.querySelector('#ov-tabs');
        const content = contentDisplay.querySelector('#ov-content');
        if (!tabs || !content || !d.sections) return;

        // Render 9 standard tabs
        // Render 9 standard tabs with specific vivid icons
        const ovIcons = ["🏠", "🔍", "💸", "📊", "🏭", "📝", "🛒", "⚖️", "🎯"];
        tabs.innerHTML = d.sections.map((s, i) => `
            <div class="folder-tab ${i === 0 ? 'active' : ''}" data-idx="${i}">
                <span style="font-size:1.1rem; margin-right:8px;">${ovIcons[i] || '📄'}</span> ${s.title.split('.')[1] || s.title}
            </div>
        `).join('');

        const showSection = (idx) => {
            const s = d.sections[idx];
            let imagesHtml = '';
            // If images are available for this page/section (simplified mapping)
            if (d.overviewImages && d.overviewImages.length > 0) {
                // Here we can filter or just show relevant images. For now, show all at bottom if it's the first page or specific ones.
                if (idx === 0) {
                    imagesHtml = `<div class="doc-images" style="margin-top:30px; display:flex; flex-wrap:wrap; gap:15px;">
                        ${d.overviewImages.map(img => `<img src="${img}" style="max-width:100%; border-radius:8px; border:3px solid #eee; box-shadow:0 4px 10px rgba(0,0,0,0.1);">`).join('')}
                    </div>`;
                }
            }

            content.innerHTML = `
                <div class="paper-doc">
                    <h2 class="doc-title">${s.title}</h2>
                    <div style="padding:10px 0;">
                        ${s.details.map(p => `<p>🔷 ${p}</p>`).join('')}
                    </div>
                    ${imagesHtml}
                    <div style="height:60px;"></div> <!-- Safe spacing -->
                </div>
            `;
            content.scrollTop = 0;
        };

        tabs.querySelectorAll('.folder-tab').forEach(tab => {
            tab.onclick = () => {
                // High contrast active identification
                tabs.querySelectorAll('.folder-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                showSection(parseInt(tab.dataset.idx));
            };
        });
        showSection(0);
    }

    // 2. FUNDAMENTAL
    function renderFundamental(d) {
        const table = contentDisplay.querySelector('#ftable');
        const totalBadge = contentDisplay.querySelector('#total-tickers');
        if (!table || !d.fundamental) return;

        const total = d.fundamental.length;
        if (totalBadge) totalBadge.innerText = `TỔNG: ${total} MÃ`;

        const totalPages = Math.ceil(total / FUND_PAGE_SIZE);
        const start = fundPage * FUND_PAGE_SIZE;
        const pageData = d.fundamental.slice(start, start + FUND_PAGE_SIZE);

        table.innerHTML = pageData.map(f => `
            <tr>
                <td>${f.stt}</td>
                <td class="ticker-cell">${f.ticker}</td>
                <td>${f.index}</td>
                <td>${f.industry}</td>
                <td style="font-weight:600;">${f.eps}</td>
                <td>${f.pe}</td>
                <td>${f.pb}</td>
                <td class="badge-up" style="font-weight:600;">${f.roe}%</td>
                <td class="badge-up" style="font-weight:600;">${f.roa}%</td>
                <td>${f.beta}</td>
                <td><span class="badge-up" style="font-weight:900;">${f.rank}</span></td>
            </tr>
        `).join('');

        const info = contentDisplay.querySelector('#pg-info');
        if (info) info.innerText = `Trang ${fundPage + 1} / ${totalPages}`;

        const prevBtn = contentDisplay.querySelector('#pg-prev');
        const nextBtn = contentDisplay.querySelector('#pg-next');
        if (prevBtn) {
            prevBtn.disabled = fundPage === 0;
            prevBtn.onclick = () => { fundPage--; renderFundamental(d); const pc = contentDisplay.querySelector('.paper-content'); if (pc) pc.scrollTop = 0; };
        }
        if (nextBtn) {
            nextBtn.disabled = fundPage >= totalPages - 1;
            nextBtn.onclick = () => { fundPage++; renderFundamental(d); const pc = contentDisplay.querySelector('.paper-content'); if (pc) pc.scrollTop = 0; };
        }
    }

    // 3. NEWS (Folder Interface)
    function renderNews(d) {
        const tabs = contentDisplay.querySelector('#news-tabs');
        const content = contentDisplay.querySelector('#news-content');
        if (!tabs || !content || !d.news) return;

        const categories = Object.keys(d.news);
        if (!newsCategory) newsCategory = categories[0];

        tabs.innerHTML = categories.map(cat => {
            const count = d.news[cat].length;
            return `
                <div class="folder-tab ${cat === newsCategory ? 'active' : ''}" data-cat="${cat}">
                    <i class="far fa-newspaper" style="margin-right:8px;"></i>
                    ${cat} <span style="margin-left:5px; opacity:0.7; font-size:0.8rem;">(${count})</span>
                </div>
            `;
        }).join('');

        const showCategory = (cat) => {
            const list = d.news[cat] || [];
            const container = content.querySelector('#news-list-container');
            const totalPages = Math.ceil(list.length / NEWS_PAGE_SIZE);
            const start = newsPage * NEWS_PAGE_SIZE;
            const pageData = list.slice(start, start + NEWS_PAGE_SIZE);

            if (container) {
                container.innerHTML = `
                    <div class="news-list">
                        ${pageData.map(n => `
                            <div style="margin-bottom:20px; border-bottom:1px solid rgba(0,0,0,0.15); padding-bottom:12px;">
                                <div style="color:var(--text-paper); opacity:0.8; font-size:0.85rem; font-weight:600; margin-bottom:5px;">${n.time}</div>
                                <h4 style="color:var(--accent); cursor:pointer; font-size:1.1rem; line-height:1.4; font-weight:900;" onclick="window.open('${n.link}','_blank')">${n.title}</h4>
                            </div>
                        `).join('')}
                        ${list.length === 0 ? '<p style="text-align:center; padding:50px; opacity:0.5;">(Không có tin tức trong mục này)</p>' : ''}
                    </div>
                `;
            }

            const info = content.querySelector('#news-info');
            if (info) info.innerText = `Trang ${newsPage + 1} / ${totalPages || 1}`;

            const prevBtn = content.querySelector('#news-prev');
            const nextBtn = content.querySelector('#news-next');
            if (prevBtn) {
                prevBtn.disabled = newsPage === 0;
                prevBtn.onclick = () => { newsPage--; showCategory(cat); content.scrollTop = 0; };
            }
            if (nextBtn) {
                nextBtn.disabled = newsPage >= totalPages - 1;
                nextBtn.onclick = () => { newsPage++; showCategory(cat); content.scrollTop = 0; };
            }
        };

        tabs.querySelectorAll('.folder-tab').forEach(tab => {
            tab.onclick = () => {
                const nextCat = tab.dataset.cat;
                if (nextCat === newsCategory) return;
                tabs.querySelectorAll('.folder-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                newsCategory = nextCat;
                newsPage = 0;
                showCategory(newsCategory);
            };
        });
        showCategory(newsCategory);
    }

    function renderTechnical(d) {
        const tabs = contentDisplay.querySelector('#tech-tabs');
        const content = contentDisplay.querySelector('#tech-content');
        if (!tabs || !content) return;

        if (!d.techSections || d.techSections.length === 0) {
            content.innerHTML = `
                <div class="paper-doc" style="text-align:center; padding-top:100px; opacity:0.6;">
                    <i class="fas fa-file-signature" style="font-size:4rem; margin-bottom:20px;"></i>
                    <p>Hồ sơ Phân tích Kỹ thuật đang được số hóa...</p>
                </div>
            `;
            return;
        }

        // Render 3 standard tabs with icons
        const techIcons = ["📈", "🛡️", "💸"];
        tabs.innerHTML = d.techSections.map((s, i) => {
            return `<div class="folder-tab ${i === 0 ? 'active' : ''}" data-idx="${i}">
                <span style="margin-right:8px;">${techIcons[i] || '📄'}</span>${s.title}
            </div>`;
        }).join('');

        const showTechSection = (idx) => {
            const s = d.techSections[idx];
            if (!s) return;

            // Update UI State
            tabs.querySelectorAll('.folder-tab').forEach((t, i) => t.classList.toggle('active', i === idx));

            let imagesHtml = '';
            // Use images from inside the section
            if (s.images && s.images.length > 0) {
                imagesHtml = `<div class="tech-gallery" style="margin-top:40px; border-top:1px dashed #ccc; padding-top:20px;">
                    <h3 style="font-size:0.9rem; color:#888; margin-bottom:15px; text-transform:uppercase;">Đồ thị minh họa section: ${s.title}</h3>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
                    ${s.images.map(img => `
                        <div class="tech-img-wrapper" style="background:#fff; padding:8px; border:1px solid #ddd; box-shadow:0 8px 15px rgba(0,0,0,0.1); border-radius:4px;">
                            <img src="${img}" style="width:100%; border-radius:2px; cursor:zoom-in;" onclick="window.open('${img}', '_blank')">
                        </div>
                    `).join('')}
                    </div>
                </div>`;
            }

            content.innerHTML = `
                <div class="paper-doc" style="max-width:1400px; margin:0 auto; width:100%;">
                    <div class="doc-body" style="padding-top:10px;">
                        ${s.details.map(p => `
                            <div style="display:flex; gap:15px; margin-bottom:15px; align-items:flex-start;">
                                <div style="margin-top:5px; color:var(--brass); font-size:1.2rem;">🔹</div>
                                <p style="line-height:1.75; font-size:1.05rem; color:var(--text-paper); text-align:justify; margin:0;">${p}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            content.scrollTop = 0;
        };

        tabs.querySelectorAll('.folder-tab').forEach(tab => {
            tab.onclick = () => showTechSection(parseInt(tab.dataset.idx));
        });

        showTechSection(0);
    }

    // 4. STATISTICS (Folder Interface)
    let statsTablePage = 0;
    const ROWS_PER_PAGE = 10;

    function renderStatistics(d) {
        const tabs = contentDisplay.querySelector('#stats-tabs');
        const content = contentDisplay.querySelector('#stats-content');
        if (!tabs || !content) return;

        const sections = d.statsSections || [];
        if (sections.length === 0) {
            content.innerHTML = '<div style="padding:40px; text-align:center;">Dữ liệu thống kê đang được nạp...</div>';
            return;
        }

        const statsIcons = ["📊", "⚖️", "🏢", "🌊", "🔄", "🏆"];
        tabs.innerHTML = sections.map((s, i) => `
            <div class="folder-tab ${i === 0 ? 'active' : ''}" data-idx="${i}">
                <span style="margin-right:8px;">${statsIcons[i] || '📄'}</span>${s.title}
            </div>
        `).join('');

        const showSection = (idx) => {
            const s = sections[idx];
            statsTablePage = 0; // Reset pagination

            const renderTable = (page) => {
                if (!s.tableData || s.tableData.length === 0) return '';
                const start = page * ROWS_PER_PAGE;
                const paginated = s.tableData.slice(start, start + ROWS_PER_PAGE);
                const cols = Object.keys(s.tableData[0]);

                // Icon helper
                const getStatusIcon = (val) => {
                    if (val === 'v') return '<div style="background:#004184; color:#fff; width:16px; height:16px; display:flex; align-items:center; justify-content:center; border-radius:2px; font-size:10px;">✔</div>';
                    if (val === 'x') return '<div style="background:#991b1b; color:#fff; width:16px; height:16px; display:flex; align-items:center; justify-content:center; border-radius:2px; font-size:10px;">✖</div>';
                    return val;
                };

                const headerHtml = `<thead><tr style="background:var(--brass); color:#fff;">
                    ${cols.map(c => `<th style="padding:6px 2px; font-size:0.65rem; text-align:center; white-space:nowrap;">${c}</th>`).join('')}
                </tr></thead>`;

                const bodyHtml = `<tbody>${paginated.map(row => `
                    <tr style="border-bottom:1px solid #eee;">
                        ${cols.map(c => {
                    let val = row[c];
                    let style = "padding:4px 2px; text-align:center; font-size:0.72rem; font-weight:700;";

                    // Special UI logic
                    if (val === 'v' || val === 'x') val = getStatusIcon(val);
                    if (c === 'Mã CK') style += "color:#004184;";
                    if (c === 'Trạng thái') {
                        const isBuy = val.includes("MUA");
                        style += `color:${isBuy ? '#059669' : '#dc2626'}; text-shadow:none; font-size:0.75rem;`;
                    }
                    if (c.includes("%") || c.includes("Lỗ")) {
                        const num = parseFloat(val);
                        if (!isNaN(num)) style += `color:${num >= 0 ? '#059669' : '#dc2626'};`;
                    }

                    return `<td style="${style}">${val}</td>`;
                }).join('')}
                    </tr>
                `).join('')}</tbody>`;

                const paginationHtml = s.tableData.length > ROWS_PER_PAGE ? `
                    <div style="display:flex; justify-content:center; gap:20px; margin-top:15px;">
                        <button class="pg-btn" id="stats-prev" ${page === 0 ? 'disabled' : ''}>Quay Lại</button>
                        <span style="font-weight:900; color:var(--text-paper);">Trang ${page + 1} / ${Math.ceil(s.tableData.length / ROWS_PER_PAGE)}</span>
                        <button class="pg-btn" id="stats-next" ${start + ROWS_PER_PAGE >= s.tableData.length ? 'disabled' : ''}>Tiếp Theo</button>
                    </div>` : '';

                return `
                    <div class="table-scroll" style="width:100%; overscroll-behavior:contain; background:#fff; border-radius:8px; border:1px solid #ddd; padding:3px;">
                        <table class="classic-table" style="min-width:1000px;">${headerHtml}${bodyHtml}</table>
                    </div>
                    ${paginationHtml}`;
            };

            const imagesHtml = (s.images || []).map(img => `
                <div style="margin-bottom:30px; text-align:center;">
                    <img src="${img}" style="width:100%; max-width:1400px; border-radius:12px; border:2px solid rgba(0,0,0,0.1); box-shadow:0 10px 30px rgba(0,0,0,0.2);">
                </div>
            `).join('');

            const updateView = () => {
                content.innerHTML = `
                    <div class="paper-doc" style="max-width:1400px; margin:0 auto; width:100%;">
                        <div class="doc-body" style="padding-top:10px;">
                            ${s.details.map(p => `<p style="margin-bottom:15px; line-height:1.75; font-size:1.05rem; color:var(--text-paper); text-align:justify;">${p}</p>`).join('')}
                        </div>
                        <div id="stats-table-container">
                            ${renderTable(statsTablePage)}
                        </div>
                        <div class="doc-gallery" style="margin-top:20px;">
                            ${imagesHtml}
                        </div>
                        ${s.details.length === 0 && s.images.length === 0 && (!s.tableData || s.tableData.length === 0) ? '<p style="text-align:center; opacity:0.6;">(Trống - Vui lòng thêm dữ liệu vào folder Thống kê)</p>' : ''}
                    </div>
                `;
                content.scrollTop = 0;

                // Bind pagination buttons
                const nextBtn = content.querySelector('#stats-next');
                const prevBtn = content.querySelector('#stats-prev');
                if (nextBtn) nextBtn.onclick = () => { statsTablePage++; updateView(); };
                if (prevBtn) prevBtn.onclick = () => { statsTablePage--; updateView(); };
            };

            updateView();
        };

        tabs.querySelectorAll('.folder-tab').forEach(tab => {
            tab.onclick = () => {
                tabs.querySelectorAll('.folder-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                showSection(parseInt(tab.dataset.idx));
            };
        });

        showSection(0);
    }

    function renderRecommendation(d) {
        const tabs = contentDisplay.querySelector('#rec-tabs');
        const content = contentDisplay.querySelector('#rec-content');
        if (!tabs || !content || !d.recSections) return;

        const recIcons = ["💰", "🛡️", "💡", "🏭"];
        tabs.innerHTML = d.recSections.map((s, i) => `
            <div class="folder-tab ${i === 0 ? 'active' : ''}" data-idx="${i}">
                <span style="font-size:1.1rem; margin-right:8px;">${recIcons[i] || '📄'}</span> ${s.title}
            </div>
        `).join('');

        const showRecSection = (idx) => {
            const s = d.recSections[idx];
            if (!s) return;

            tabs.querySelectorAll('.folder-tab').forEach((t, i) => t.classList.toggle('active', i === idx));

            content.innerHTML = `
                <div class="paper-doc">
                    <h2 class="doc-title" style="margin-bottom:20px; border-bottom:2px solid var(--brass); padding-bottom:10px;">${s.title}</h2>
                    <div style="padding:10px 0;">
                        ${s.details.map(p => `
                            <div style="display:flex; gap:12px; margin-bottom:18px; align-items:flex-start;">
                                <div style="color:var(--accent); font-size:1.1rem; margin-top:2px;">🔖</div>
                                <p style="line-height:1.8; text-align:justify; margin:0; font-size:1.05rem;">${p}</p>
                            </div>
                        `).join('')}
                    </div>
                    ${s.details.length === 0 ? '<p style="text-align:center; opacity:0.6; padding-top:40px;">(Hồ sơ đang được cập nhật...)</p>' : ''}
                    <div style="height:80px;"></div>
                </div>
            `;
            content.scrollTop = 0;
        };

        tabs.querySelectorAll('.folder-tab').forEach(tab => {
            tab.onclick = () => showRecSection(parseInt(tab.dataset.idx));
        });

        showRecSection(0);
    }

    // --- LAMP TOGGLE ---
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.onclick = () => {
            const html = document.documentElement;
            const current = html.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', next);
            console.log("Lamp toggled:", next);
        };
    }

    switchView('overview');
});
