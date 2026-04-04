// ── STATE ──────────────────────────────────────────────
let DATA = [];
let favorites = new Set(JSON.parse(localStorage.getItem('fav') || '[]'));
let allFiltered = [];
let page = 1;
let busy = false;
const PER_PAGE = 20;

const state = { search: '', machine: '', volume: '', favOnly: false };

// ── DOM REFS ────────────────────────────────────────────
const grid        = document.getElementById('grid');
const statsEl     = document.getElementById('stats');
const searchInput = document.getElementById('searchInput');
const machSel     = document.getElementById('machineSelect');
const volSel      = document.getElementById('volumeSelect');
const themeBtn    = document.getElementById('themeBtn');
const themeIcon   = document.getElementById('themeIcon');
const favBtn      = document.getElementById('favBtn');
const favCount    = document.getElementById('favCount');
const logoutBtn   = document.getElementById('logoutBtn');
const loader      = document.getElementById('loader');
const sentinel    = document.getElementById('sentinel');

// ── THEME ───────────────────────────────────────────────
function applyTheme(light) {
    document.body.classList.toggle('light', light);
    themeIcon.className = light ? 'fas fa-sun' : 'fas fa-moon';
}
const savedTheme = localStorage.getItem('theme');
applyTheme(savedTheme === 'light');

themeBtn.onclick = () => {
    const isLight = document.body.classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    themeIcon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
};

// ── LOGOUT ──────────────────────────────────────────────
logoutBtn.onclick = () => { window.location.href = 'logout.php'; };

// ── FAVOURITES ──────────────────────────────────────────
function saveFavs() { localStorage.setItem('fav', JSON.stringify([...favorites])); }

function updateFavBadge() {
    const n = favorites.size;
    favCount.textContent = n;
    favCount.classList.toggle('show', n > 0 && state.favOnly);
}

window.toggleFav = function(id) {
    if (favorites.has(id)) favorites.delete(id);
    else favorites.add(id);
    saveFavs();
    updateFavBadge();

    const btn = document.querySelector(`.fav-btn[data-id="${id}"]`);
    if (btn) btn.classList.toggle('active', favorites.has(id));

    if (state.favOnly) {
        allFiltered = DATA.filter(i => favorites.has(i._id));
        page = 1;
        renderCards(true);
        updateStats();
    }
};

favBtn.onclick = () => {
    state.favOnly = !state.favOnly;
    favBtn.classList.toggle('active', state.favOnly);
    updateFavBadge();
    load();
};

// ── ESCAPE ──────────────────────────────────────────────
function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, m =>
        ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);
}

// ── CARD TEMPLATE ───────────────────────────────────────
function cardHTML(item) {
    const isFav = favorites.has(item._id);
    return `
<div class="card">
    <button class="fav-btn ${isFav ? 'active' : ''}" data-id="${item._id}"
        onclick="toggleFav('${item._id}')" title="${isFav ? 'Убрать из избранного' : 'В избранное'}">
        <i class="fas fa-star"></i>
    </button>
    <div class="card-name">${esc(item[2])}</div>
    <div class="card-vol"><i class="fas fa-tint" style="font-size:9px"></i> ${esc(item[1]) || '—'}</div>
    <div class="params">
        <div class="param">
            <span class="param-label"><i class="fas fa-circle" style="font-size:7px;color:#3b7dd8"></i> Дорн</span>
            <span class="param-val">${esc(item[3]) || '—'}</span>
        </div>
        <div class="param">
            <span class="param-label"><i class="fas fa-dot-circle" style="font-size:9px;color:#3b7dd8"></i> Сопло</span>
            <span class="param-val">${esc(item[4]) || '—'}</span>
        </div>
        <div class="param">
            <span class="param-label"><i class="fas fa-cut" style="font-size:11px;color:#3b7dd8"></i> Нож</span>
            <span class="param-val">${esc(item[5]) || '—'}</span>
        </div>
        <div class="param weight-row">
            <span class="param-label"><i class="fas fa-weight-hanging" style="font-size:11px"></i> Вес</span>
            <span class="param-val">${esc(item[6]) || 'уточняется'}</span>
        </div>
    </div>
    <div class="card-machine">
        <i class="fas fa-industry" style="font-size:11px"></i>
        <span>${esc(item[0])}</span>
    </div>
</div>`;
}

// ── RENDER ──────────────────────────────────────────────
function renderCards(reset = false) {
    const items = allFiltered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    if (reset) {
        // Remove all card nodes but keep sentinel
        [...grid.children].forEach(el => {
            if (el !== sentinel) el.remove();
        });
    }

    if (items.length === 0 && reset) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.innerHTML = `<div class="empty-icon">🔩</div><p>Ничего не найдено</p>`;
        grid.insertBefore(empty, sentinel);
        return;
    }

    const frag = document.createDocumentFragment();
    items.forEach(item => {
        const div = document.createElement('div');
        div.innerHTML = cardHTML(item);
        frag.appendChild(div.firstElementChild);
    });
    grid.insertBefore(frag, sentinel);
    page++;
}

function updateStats() {
    const total = allFiltered.length;
    statsEl.innerHTML = `Найдено: <span>${total}</span> позиций${state.favOnly ? ' &nbsp;·&nbsp; <span style="color:var(--accent)">⭐ Избранное</span>' : ''}`;
}

// ── LOAD FROM SERVER ────────────────────────────────────
async function load() {
    try {
        statsEl.textContent = 'Загрузка...';
        const url = `get_data.php?search=${encodeURIComponent(state.search)}&machine=${encodeURIComponent(state.machine)}&volume=${encodeURIComponent(state.volume)}`;
        const res = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });

        if (res.status === 401) { window.location.href = 'login.html'; return; }
        if (!res.ok) throw new Error('HTTP ' + res.status);

        const raw = await res.json();
        if (raw.error) throw new Error(raw.error);

        // Attach unique id to each row
        DATA = raw.map((item, i) => Object.assign(item, { _id: String(i) }));

        allFiltered = state.favOnly
            ? DATA.filter(i => favorites.has(i._id))
            : DATA;

        page = 1;
        renderCards(true);
        updateStats();

        if (machSel.options.length <= 1) initFilters();
    } catch (err) {
        console.error(err);
        statsEl.textContent = '❌ Ошибка загрузки';
        [...grid.children].forEach(el => { if (el !== sentinel) el.remove(); });
        const div = document.createElement('div');
        div.className = 'empty';
        div.innerHTML = `<div class="empty-icon">⚠️</div><p>Не удалось загрузить данные</p>`;
        grid.insertBefore(div, sentinel);
    } finally {
        loader.classList.add('gone');
    }
}

// ── INIT FILTERS ────────────────────────────────────────
function initFilters() {
    const machines = [...new Set(DATA.map(i => i[0]))].filter(Boolean).sort();
    const volumes  = [...new Set(DATA.map(i => i[1]))].filter(Boolean).sort();

    machines.forEach(m => {
        const o = document.createElement('option');
        o.value = o.textContent = m;
        machSel.appendChild(o);
    });
    volumes.forEach(v => {
        const o = document.createElement('option');
        o.value = o.textContent = v;
        volSel.appendChild(o);
    });
}

// ── INFINITE SCROLL ──────────────────────────────────────
const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !busy) {
        if (page * PER_PAGE <= allFiltered.length + PER_PAGE) {
            busy = true;
            renderCards();
            busy = false;
        }
    }
}, { rootMargin: '200px' });
observer.observe(sentinel);

// ── EVENTS ───────────────────────────────────────────────
let debounce;
searchInput.addEventListener('input', e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.search = e.target.value; load(); }, 280);
});
machSel.onchange  = e => { state.machine = e.target.value; load(); };
volSel.onchange   = e => { state.volume  = e.target.value; load(); };

// ── INIT ─────────────────────────────────────────────────
updateFavBadge();
load();
