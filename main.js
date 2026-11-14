/* ==========================================================================
   NETIP.ICU — network diagnostics
   Every metric is measured live in the visitor's own browser.
   If a probe fails or an API is unavailable, the UI says so explicitly
   instead of showing a fabricated number. The loader below is a purely
   decorative UI transition (fixed ~1s), not a data measurement.
   ========================================================================== */

const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);

/* ---------------------------------------------------------------- loader */
(function loader() {
  const el = $('loader');
  const fill = $('loader-fill');
  const pct = $('loader-pct');
  if (!el) return;
  const duration = 1000;
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const p = Math.floor(t * 100);
    if (fill) fill.style.width = p + '%';
    if (pct) pct.textContent = p + '%';
    if (t < 1) requestAnimationFrame(tick);
    else {
      const finish = () => el.classList.add('hide');
      if (document.readyState === 'complete') finish();
      else window.addEventListener('load', finish, { once: true });
      setTimeout(finish, 600); // safety cap so it never hangs
    }
  }
  requestAnimationFrame(tick);
})();

/* ------------------------------------------------------------- webp test */
(function webpSupport() {
  const img = new Image();
  img.onload = () => $('bg-photo') && $('bg-photo').classList.add('webp-ok');
  img.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
})();

/* ---------------------------------------------------------------- clock */
function tickClock() {
  const el = $('clock');
  if (!el) return;
  const n = new Date();
  const p = v => String(v).padStart(2, '0');
  el.textContent = `${p(n.getUTCHours())}:${p(n.getUTCMinutes())}:${p(n.getUTCSeconds())} UTC`;
}
tickClock();
setInterval(tickClock, 1000);
$('year') && ($('year').textContent = new Date().getFullYear());

/* ------------------------------------------------------- ambient canvas */
(function ambientBg() {
  const canvas = $('bg-canvas');
  if (!canvas || reduceMotion) return;
  const ctx = canvas.getContext('2d');
  let w, h;
  function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  const N = Math.min(50, Math.floor((window.innerWidth * window.innerHeight) / 28000));
  const nodes = Array.from({ length: N }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
    r: Math.random() * 1.2 + 0.4
  }));

  function frame() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      a.x += a.vx; a.y += a.vy;
      if (a.x < 0 || a.x > w) a.vx *= -1;
      if (a.y < 0 || a.y > h) a.vy *= -1;
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120) {
          ctx.strokeStyle = `rgba(57,230,255,${0.05 * (1 - d / 120)})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(138,107,255,0.32)';
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  frame();
})();

/* ---------------------------------------------------------------- utils */
function setState(id, text, kind) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.className = 'badge-state' + (kind ? ' ' + kind : '');
}
function flagFromCode(cc) {
  if (!cc || cc.length !== 2) return '🌐';
  const codePoints = cc.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/* ============================================================ 1. IP/GEO */
async function runGeo() {
  setState('ip-state', 'проверка', 'load');
  const sources = [
    {
      url: 'https://ipapi.co/json/',
      map: d => ({ ip: d.ip, city: d.city, region: d.region, country: d.country_name, isp: d.org, tz: d.timezone, cc: d.country_code, src: 'ipapi.co' })
    },
    {
      url: 'https://ipwho.is/',
      map: d => ({ ip: d.ip, city: d.city, region: d.region, country: d.country, isp: (d.connection && d.connection.isp) || '—', tz: (d.timezone && d.timezone.id) || '—', cc: d.country_code, src: 'ipwho.is' })
    }
  ];

  for (const s of sources) {
    try {
      const res = await fetch(s.url, { cache: 'no-store' });
      if (!res.ok) throw new Error('bad status');
      const raw = await res.json();
      if (raw && raw.success === false) throw new Error('api reported failure');
      const g = s.map(raw);
      if (!g.ip) throw new Error('no ip in response');

      $('ip-addr').textContent = g.ip;
      $('ip-flag').textContent = flagFromCode(g.cc);
      $('ip-city').textContent = g.city || '—';
      $('ip-region').textContent = g.region || '—';
      $('ip-country').textContent = g.country || '—';
      $('ip-isp').textContent = g.isp || '—';
      $('ip-tz').textContent = g.tz || '—';
      $('ip-src').textContent = g.src;
      setState('ip-state', 'получено', 'live');
      return g;
    } catch (err) { continue; }
  }

  setState('ip-state', 'нет данных', 'bad');
  $('ip-addr').textContent = 'недоступно';
  return null;
}

/* ============================================================ 2. PING */
function drawSpark(containerId, samples) {
  const el = $(containerId);
  if (!el || samples.length === 0) return;
  const w = 240, h = 28, pad = 3;
  const min = Math.min(...samples), max = Math.max(...samples);
  const range = Math.max(max - min, 1);
  const pts = samples.map((v, i) => {
    const x = pad + (i / (samples.length - 1 || 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${pts}" fill="none" stroke="#39e6ff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
  </svg>`;
}

async function probeOnce(url) {
  const t0 = performance.now();
  try {
    await fetch(url, { mode: 'no-cors', cache: 'no-store' });
    return performance.now() - t0;
  } catch (e) { return null; }
}

async function runPing() {
  setState('ping-state', 'измерение', 'load');
  const samples = [];
  for (let i = 0; i < 5; i++) {
    const url = `https://speed.cloudflare.com/__down?bytes=0&_=${Date.now()}${i}`;
    const t = await probeOnce(url);
    if (t !== null) samples.push(Math.round(t));
    await new Promise(r => setTimeout(r, 100));
  }
  if (samples.length === 0) {
    setState('ping-state', 'нет ответа', 'bad');
    $('ping-val').textContent = '—';
    return null;
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  $('ping-val').textContent = median;
  drawSpark('ping-spark', samples);
  const kind = median < 60 ? 'live' : median < 150 ? 'warn' : 'bad';
  setState('ping-state', median < 60 ? 'отлично' : median < 150 ? 'нормально' : 'высокая', kind);
  return median;
}

/* ============================================================ 3. SPEED */
async function runSpeed() {
  setState('speed-state', 'тест', 'load');
  const bytes = 4_000_000;
  const url = `https://speed.cloudflare.com/__down?bytes=${bytes}&_=${Date.now()}`;
  try {
    const t0 = performance.now();
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('bad status');
    const buf = await res.arrayBuffer();
    const seconds = (performance.now() - t0) / 1000;
    const mbps = (buf.byteLength * 8) / seconds / 1_000_000;
    $('speed-val').textContent = mbps < 10 ? mbps.toFixed(2) : mbps.toFixed(1);
    $('speed-fill').style.width = Math.min(100, (mbps / 100) * 100) + '%';
    const kind = mbps > 20 ? 'live' : mbps > 5 ? 'warn' : 'bad';
    setState('speed-state', mbps > 20 ? 'быстро' : mbps > 5 ? 'средне' : 'медленно', kind);
    return mbps;
  } catch (err) {
    setState('speed-state', 'недоступно', 'bad');
    $('speed-val').textContent = '—';
    return null;
  }
}

/* ============================================================ 4. IPv6 */
async function runIPv6() {
  setState('ipv6-state', 'проверка', 'load');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    await fetch(`https://ipv6.icanhazip.com/?_=${Date.now()}`, { mode: 'no-cors', cache: 'no-store', signal: controller.signal });
    clearTimeout(timer);
    $('ipv6-val').textContent = 'маршрут доступен';
    $('ipv6-note').textContent = 'Устройство может выходить в сеть напрямую по IPv6. Если ваш VPN туннелирует только IPv4, этот путь может раскрывать реальный адрес.';
    setState('ipv6-state', 'доступен', 'warn');
    return true;
  } catch (err) {
    clearTimeout(timer);
    $('ipv6-val').textContent = 'недоступен';
    $('ipv6-note').textContent = 'Прямого IPv6-маршрута с этого устройства не обнаружено — потенциальный вектор утечки мимо VPN отсутствует.';
    setState('ipv6-state', 'отключён', 'live');
    return false;
  }
}

/* ============================================================ 5. WEBRTC */
function collectIceCandidates(timeoutMs = 3000) {
  return new Promise(resolve => {
    const found = [];
    let pc;
    try {
      pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    } catch (e) { resolve(found); return; }
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      try { pc.close(); } catch (e) {}
      resolve(found);
    }
    try { pc.createDataChannel('probe'); } catch (e) {}
    pc.onicecandidate = e => {
      if (!e.candidate) { finish(); return; }
      const fields = e.candidate.candidate.split(' ');
      const addr = fields[4];
      const typIdx = fields.indexOf('typ');
      const typ = typIdx >= 0 ? fields[typIdx + 1] : 'unknown';
      if (addr && !found.some(f => f.addr === addr && f.typ === typ)) found.push({ addr, typ });
    };
    pc.createOffer().then(o => pc.setLocalDescription(o)).catch(finish);
    setTimeout(finish, timeoutMs);
  });
}
function isRawIPv4(addr) { return /^(\d{1,3}\.){3}\d{1,3}$/.test(addr) && !addr.endsWith('.local'); }
function isPrivateIPv4(addr) { return /^(10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/.test(addr); }

async function runWebRTC(publicIp) {
  setState('webrtc-state', 'сбор кандидатов', 'load');
  const candidates = await collectIceCandidates();
  const list = $('webrtc-list');
  list.innerHTML = '';

  if (candidates.length === 0) {
    list.innerHTML = `<div class="leak-item safe"><span class="lt">ICE-кандидаты не получены</span><span class="lv">WebRTC заблокирован или недоступен</span></div>`;
    setState('webrtc-state', 'нет кандидатов', 'live');
    $('shield-l2').textContent = 'WebRTC-маскирование: WebRTC недоступен (эффективно безопасно)';
    return { leak: false };
  }

  let rawLocalLeak = false;
  candidates.forEach(c => {
    const isMdns = c.addr.endsWith('.local');
    const isRaw = isRawIPv4(c.addr) && isPrivateIPv4(c.addr);
    if (c.typ === 'host' && isRaw) rawLocalLeak = true;
    const flagCls = (c.typ === 'host' && isRaw) ? 'flag' : 'safe';
    const label = c.typ === 'host' ? (isMdns ? 'локальный адрес (mDNS, скрыт)' : 'локальный адрес сети') : c.typ === 'srflx' ? 'публичный адрес (через STUN)' : `кандидат: ${c.typ}`;
    list.insertAdjacentHTML('beforeend', `<div class="leak-item ${flagCls}"><span class="lt">${label}</span><span class="lv">${c.addr}</span></div>`);
  });

  if (publicIp) {
    const srflx = candidates.find(c => c.typ === 'srflx');
    if (srflx) {
      const matches = srflx.addr === publicIp;
      list.insertAdjacentHTML('beforeend', `<div class="leak-item ${matches ? 'safe' : 'flag'}"><span class="lt">Совпадает с IP из карточки геолокации</span><span class="lv">${matches ? 'да' : 'нет'}</span></div>`);
    }
  }

  if (rawLocalLeak) {
    setState('webrtc-state', 'найдена утечка', 'bad');
    $('webrtc-note').textContent = 'Браузер раскрыл реальный локальный IP в открытом виде через ICE-кандидат. Это возможно даже при активном VPN, если он не блокирует UDP WebRTC.';
    $('shield-l2').textContent = 'WebRTC-маскирование: не обнаружено';
  } else {
    setState('webrtc-state', 'адрес скрыт', 'live');
    $('webrtc-note').textContent = 'Локальные адреса не раскрываются в открытом виде — браузер использует mDNS-обфускацию либо WebRTC ограничен.';
    $('shield-l2').textContent = 'WebRTC-маскирование: активно';
  }
  return { leak: rawLocalLeak };
}

/* ============================================================ 6. FINGERPRINT (local only) */
function runFingerprint() {
  $('fp-ua').textContent = navigator.userAgent || '—';
  $('fp-platform').textContent = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '—';
  $('fp-screen').textContent = `${screen.width}×${screen.height} @${window.devicePixelRatio || 1}x`;
  $('fp-tz').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || '—';
  $('fp-lang').textContent = (navigator.languages && navigator.languages.join(', ')) || navigator.language || '—';
  $('fp-cores').textContent = navigator.hardwareConcurrency ? String(navigator.hardwareConcurrency) : 'н/д';

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  $('fp-net').textContent = conn ? `${conn.effectiveType || '—'}, ~${conn.downlink ?? '—'} Мбит/с` : 'API недоступен';

  const dnt = navigator.doNotTrack;
  $('fp-dnt').textContent = dnt === '1' || dnt === 'yes' ? 'включён' : dnt === '0' ? 'выключен' : 'не передаётся';

  const chipCookies = $('chip-cookies'), chipHttps = $('chip-https'), chipOnline = $('chip-online');
  chipCookies.textContent = navigator.cookieEnabled ? 'cookies: on' : 'cookies: off';
  chipCookies.className = 'chip ' + (navigator.cookieEnabled ? 'on' : 'off');
  const isHttps = location.protocol === 'https:';
  chipHttps.textContent = isHttps ? 'https: on' : 'https: off';
  chipHttps.className = 'chip ' + (isHttps ? 'on' : 'off');
  chipOnline.textContent = navigator.onLine ? 'online' : 'offline';
  chipOnline.className = 'chip ' + (navigator.onLine ? 'on' : 'off');

  return { isHttps };
}

/* ============================================================ 7. SHIELD GAUGE */
function updateShield(isHttps, webrtcLeak) {
  const score = (isHttps ? 1 : 0) + (webrtcLeak === false ? 1 : 0);
  $('gauge-num').textContent = `${score}/2`;
  $('shield-l1').textContent = `TLS: ${isHttps ? 'активно (HTTPS)' : 'отсутствует (HTTP)'}`;
  const circumference = 2 * Math.PI * 42;
  const fill = $('gauge-fill');
  fill.style.strokeDasharray = String(circumference);
  fill.style.strokeDashoffset = String(circumference * (1 - score / 2));
  fill.style.stroke = score === 2 ? 'var(--ok)' : score === 1 ? 'var(--amber)' : 'var(--danger)';
  setState('shield-state', score === 2 ? 'в норме' : score === 1 ? 'частично' : 'риск', score === 2 ? 'live' : score === 1 ? 'warn' : 'bad');
}

/* ============================================================ orchestrator */
let running = false;
async function runAllChecks() {
  if (running) return;
  running = true;
  const btn = $('rescan-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Проверка идёт…'; }

  const fp = runFingerprint();
  const geo = await runGeo();
  const [, , webrtcResult] = await Promise.all([
    runPing(),
    runSpeed(),
    runWebRTC(geo ? geo.ip : null),
    runIPv6()
  ]);
  updateShield(fp.isHttps, webrtcResult ? webrtcResult.leak : null);

  $('last-run').textContent = new Date().toLocaleTimeString('ru-RU');
  if (btn) { btn.disabled = false; btn.textContent = 'Повторить проверку'; }
  running = false;
}

window.addEventListener('DOMContentLoaded', () => {
  runAllChecks();
  const btn = $('rescan-btn');
  if (btn) btn.addEventListener('click', runAllChecks);
});
