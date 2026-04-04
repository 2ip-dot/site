let DATA = [];
let favorites = new Set(JSON.parse(localStorage.getItem('fav') || "[]"));

let state = {
    search: '',
    machine: '',
    volume: '',
    favOnly: false
};

let allFilteredData = [];
let currentPage = 1;
let isLoading = false;
const ITEMS_PER_PAGE = 20;

const container = document.getElementById('resultsContainer');
const input = document.getElementById('searchInput');
const stats = document.getElementById('stats');
const machineSelect = document.getElementById('machineSelect');
const volumeSelect = document.getElementById('volumeSelect');
const themeBtn = document.getElementById('themeBtn');
const favBtn = document.getElementById('favBtn');
const logoutBtn = document.getElementById('logoutBtn');
const suggestions = document.getElementById('suggestions');

// Загрузка данных с сервера с фильтрацией
async function loadDataFromServer() {
    try {
        stats.textContent = '📡 Загрузка...';
        
        let url = `get_data.php?search=${encodeURIComponent(state.search)}&machine=${encodeURIComponent(state.machine)}&volume=${encodeURIComponent(state.volume)}`;
        
        const response = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        
        if (response.status === 401) {
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
        
        // Применяем фильтр избранного на клиенте
        if (state.favOnly) {
            allFilteredData = DATA.filter((_, i) => favorites.has(String(i)));
        } else {
            allFilteredData = DATA;
        }
        
        currentPage = 1;
        container.innerHTML = '';
        loadMore();
        
        stats.textContent = `📊 Найдено: ${allFilteredData.length} позиций`;
        
        // Обновляем фильтры (только при первой загрузке)
        if (machineSelect.options.length <= 1) {
            initFiltersFromData();
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        stats.textContent = '❌ Ошибка загрузки данных';
        container.innerHTML = '<div style="text-align:center;padding:40px;">⚠️ Не удалось загрузить данные</div>';
    }
}

// Заполняем выпадающие списки из загруженных данных
function initFiltersFromData() {
    if (!DATA.length) return;
    
    const machines = [...new Set(DATA.map(i => i[0]))];
    const volumes = [...new Set(DATA.map(i => i[1]))];
    
    machines.sort().forEach(m => {
        if (![...machineSelect.options].some(opt => opt.value === m)) {
            machineSelect.innerHTML += `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`;
        }
    });
    
    volumes.sort().forEach(v => {
        if (v && v.trim() && ![...volumeSelect.options].some(opt => opt.value === v)) {
            volumeSelect.innerHTML += `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`;
        }
    });
}

// Выход
logoutBtn.onclick = () => {
    window.location.href = 'logout.php';
};

// Тема
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
}

themeBtn.onclick = () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
};

// Избранное
function toggleFav(index) {
    const originalIndex = DATA.findIndex(d => d === allFilteredData[index]);
    const id = String(originalIndex);
    if (favorites.has(id)) {
        favorites.delete(id);
    } else {
        favorites.add(id);
    }
    localStorage.setItem('fav', JSON.stringify([...favorites]));
    
    if (state.favOnly) {
        loadDataFromServer();
    } else {
        allFilteredData = DATA;
        currentPage = 1;
        container.innerHTML = '';
        loadMore();
        stats.textContent = `📊 Найдено: ${allFilteredData.length} позиций`;
    }
}
window.toggleFav = toggleFav;

favBtn.onclick = () => {
    state.favOnly = !state.favOnly;
    favBtn.style.background = state.favOnly ? '#facc15' : '';
    favBtn.style.color = state.favOnly ? '#000' : '';
    loadDataFromServer();
};

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
    const originalIndex = DATA.findIndex(d => d === item);
    const isFav = favorites.has(String(originalIndex));
    
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

function loadMore() {
    if (isLoading) return;
    
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const itemsToLoad = allFilteredData.slice(start, end);
    
    if (itemsToLoad.length === 0) return;
    
    isLoading = true;
    
    const newCards = itemsToLoad.map((item, idx) => {
        const globalIndex = start + idx;
        return card(item, globalIndex);
    }).join('');
    
    container.innerHTML += newCards;
    currentPage++;
    isLoading = false;
}

function handleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    if (scrollTop + windowHeight >= documentHeight - 200) {
        if (currentPage * ITEMS_PER_PAGE < allFilteredData.length) {
            loadMore();
        }
    }
}

// События фильтрации
let debounceTimer;
input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        state.search = e.target.value.toLowerCase();
        loadDataFromServer();
    }, 300);
});

machineSelect.onchange = (e) => {
    state.machine = e.target.value;
    loadDataFromServer();
};

volumeSelect.onchange = (e) => {
    state.volume = e.target.value;
    loadDataFromServer();
};

window.addEventListener('scroll', handleScroll);

// Запуск
loadDataFromServer();