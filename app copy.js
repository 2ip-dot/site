let DATA = [];
let favorites = new Set(JSON.parse(localStorage.getItem('fav') || "[]"));

let state = {
    search: '',
    machine: '',
    volume: '',
    favOnly: false
};

const container = document.getElementById('resultsContainer');
const input = document.getElementById('searchInput');
const stats = document.getElementById('stats');
const machineSelect = document.getElementById('machineSelect');
const volumeSelect = document.getElementById('volumeSelect');
const themeBtn = document.getElementById('themeBtn');
const favBtn = document.getElementById('favBtn');
const logoutBtn = document.getElementById('logoutBtn');
const suggestions = document.getElementById('suggestions');

// Проверка авторизации и загрузка данных
async function checkAuthAndLoad() {
    try {
        stats.textContent = '📡 Проверка доступа...';
        
        const response = await fetch('get_data.php', {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (response.status === 401) {
            // Не авторизован - кидаем на логин
            window.location.href = 'login.html';
            return;
        }
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки');
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        DATA = data;
        
        if (DATA.length === 0) {
            throw new Error('Нет данных');
        }
        
        initFilters();
        buildSuggestions();
        render();
        stats.textContent = `📊 Загружено: ${DATA.length} позиций`;
        
    } catch (error) {
        console.error('Ошибка:', error);
        stats.textContent = '❌ Ошибка загрузки данных';
        container.innerHTML = '<div style="text-align:center;padding:40px;">⚠️ Не удалось загрузить данные</div>';
    }
}

// Выход
logoutBtn.onclick = () => {
    window.location.href = 'logout.php';
};

// 🌙 тема
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
}

themeBtn.onclick = () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
};

// ⭐ избранное
function toggleFav(index) {
    const id = String(index);
    if (favorites.has(id)) {
        favorites.delete(id);
    } else {
        favorites.add(id);
    }
    localStorage.setItem('fav', JSON.stringify([...favorites]));
    render();
}
window.toggleFav = toggleFav;

favBtn.onclick = () => {
    state.favOnly = !state.favOnly;
    favBtn.style.background = state.favOnly ? '#facc15' : '';
    favBtn.style.color = state.favOnly ? '#000' : '';
    render();
};

function buildSuggestions() {
    if (!DATA.length) return;
    const names = [...new Set(DATA.map(i => i[2]))];
    suggestions.innerHTML = names.map(n => `<option value="${escapeHtml(n)}">`).join('');
}

function initFilters() {
    if (!DATA.length) return;
    
    machineSelect.innerHTML = '<option value="">📌 Все машины</option>';
    volumeSelect.innerHTML = '<option value="">📏 Все объемы</option>';
    
    const machines = [...new Set(DATA.map(i => i[0]))];
    const volumes = [...new Set(DATA.map(i => i[1]))];
    
    machines.sort().forEach(m => {
        machineSelect.innerHTML += `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`;
    });
    
    volumes.sort().forEach(v => {
        if (v && v.trim()) {
            volumeSelect.innerHTML += `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`;
        }
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function card(item, index) {
    const [machine, volume, name, dorn, nozzle, knife, weight] = item;
    const isFav = favorites.has(String(index));
    
    return `
        <div class="card ${isFav ? 'fav-card' : ''}">
            <div class="favorite" onclick="window.toggleFav(${index})">
                <i class="fas fa-star" style="color: ${isFav ? '#facc15' : '#ccc'}"></i>
            </div>
            <div class="product">${escapeHtml(name)}</div>
            <div class="liters">💧 ${escapeHtml(volume) || '—'}</div>
            <div class="params">
                <div class="param">⚙️ Дорн: ${escapeHtml(dorn) || '—'}</div>
                <div class="param">🔩 Сопло: ${escapeHtml(nozzle) || '—'}</div>
                <div class="param">✂️ Нож: ${escapeHtml(knife) || '—'}</div>
                <div class="param weight">⚖️ Вес: ${escapeHtml(weight) || 'уточняется'}</div>
            </div>
            <div class="machine">🏭 ${escapeHtml(machine)}</div>
        </div>
    `;
}

function filter() {
    if (!DATA.length) return [];
    
    return DATA.filter((row, i) => {
        const matchSearch = state.search === '' || row.some(cell => 
            String(cell).toLowerCase().includes(state.search)
        );
        
        const matchMachine = !state.machine || row[0] === state.machine;
        const matchVolume = !state.volume || row[1] === state.volume;
        const matchFav = !state.favOnly || favorites.has(String(i));
        
        return matchSearch && matchMachine && matchVolume && matchFav;
    });
}

function render() {
    if (!DATA.length) return;
    
    const filtered = filter();
    container.innerHTML = filtered.map((item, idx) => card(item, idx)).join('');
    stats.textContent = `📊 Найдено: ${filtered.length} из ${DATA.length}`;
}

input.addEventListener('input', (e) => {
    state.search = e.target.value.toLowerCase();
    render();
});

machineSelect.onchange = (e) => {
    state.machine = e.target.value;
    render();
};

volumeSelect.onchange = (e) => {
    state.volume = e.target.value;
    render();
};

// ЗАПУСКАЕМ С ПРОВЕРКОЙ АВТОРИЗАЦИИ
checkAuthAndLoad();