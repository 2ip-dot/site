/*! netip-patch.js v1 — три правки поверх существующей страницы, остальное не трогает:
 *  1) заменяет старую карточку «DNS-резолвер» рабочим тестом утечки DNS (запуск по кнопке);
 *  2) добавляет иконку Telegram рядом с логотипом NETIP.ICU;
 *  3) добавляет счётчик уникальных посетителей в подвал.
 *  Подключение: <script src="netip-patch.js" defer></script> перед </body>. */
(function () {
'use strict';
if (window.__netipPatchLoaded) return; window.__netipPatchLoaded = true;
var TG_URL = 'https://t.me/netipicu';
var status = { tg: false, dns: false, counter: false };
window.NetipPatch = { status: status, version: 1 };

var norm = function (s) { return String(s || '').replace(/\s+/g, ' ').trim(); };
function leafMatch(re, maxLen) {            // smallest elements whose whole text matches
  var out = [], all = document.body.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) {
    var el = all[i]; if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) continue;
    var t = norm(el.textContent); if (!t || t.length > (maxLen || 80) || !re.test(t)) continue;
    var deeper = false; for (var j = 0; j < el.children.length; j++) { if (re.test(norm(el.children[j].textContent))) { deeper = true; break; } }
    if (!deeper) out.push(el);
  }
  return out;
}
function injectStyle(id, css) { var s = document.getElementById(id); if (!s) { s = document.createElement('style'); s.id = id; document.head.appendChild(s); } s.textContent = css; }
function whenReady(fn, key, maxMs) {        // the page may build its DOM late: retry until it works
  var done = false, timer, mo;
  var stop = function () { clearInterval(timer); if (mo) mo.disconnect(); };
  var attempt = function () { if (done) return; try { if (fn()) { done = true; status[key] = true; stop(); } } catch (e) { console.warn('[netip-patch]', key, e); } };
  attempt(); if (done) return;
  timer = setInterval(attempt, 400);
  try { mo = new MutationObserver(attempt); mo.observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  setTimeout(function () { stop(); if (!done) console.warn('[netip-patch] не удалось применить:', key); }, maxMs || 15000);
}

/* ====================== 1. Telegram icon ====================== */
var TG_CSS = '.nx-tg{display:inline-flex;align-items:center;justify-content:center;flex:none;width:34px;height:34px;border-radius:50%;background:rgba(41,169,235,.12);border:1px solid rgba(41,169,235,.45);transition:transform .25s cubic-bezier(.22,.8,.3,1),background .25s,box-shadow .25s;text-decoration:none}' +
  '.nx-tg svg{width:17px;height:17px;fill:#29a9eb;transition:fill .25s}.nx-tg:hover{transform:translateY(-1px) scale(1.06);background:#29a9eb;box-shadow:0 6px 20px rgba(41,169,235,.4)}.nx-tg:hover svg{fill:#fff}' +
  '.nx-brandwrap{display:flex;align-items:center;gap:12px;min-width:0}';
var TG_PATH = 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z';
function addTelegram() {
  if (document.querySelector('a[href*="t.me/netipicu"]')) return true;
  var FULL = /^netip\s*\.?\s*icu$/i, inHeader = function (e) { var r = e.getBoundingClientRect(); return r.height > 0 && r.top < 240; };
  var leaf = leafMatch(FULL, 30).filter(inHeader)[0];
  if (!leaf) { leaf = leafMatch(/^netip$/i, 12).filter(inHeader)[0]; if (!leaf) return false; }
  var b = leaf;
  if (!FULL.test(norm(b.textContent))) { while (b.parentElement && !/^(HEADER|NAV|MAIN|BODY)$/.test(b.parentElement.tagName) && !FULL.test(norm(b.textContent))) b = b.parentElement; if (!FULL.test(norm(b.textContent))) return false; }
  var full = norm(b.textContent);
  while (b.parentElement && !/^(HEADER|NAV|MAIN|BODY)$/.test(b.parentElement.tagName) && norm(b.parentElement.textContent) === full) b = b.parentElement;
  injectStyle('nx-tg-css', TG_CSS);
  var a = document.createElement('a');
  a.className = 'nx-tg'; a.href = TG_URL; a.target = '_blank'; a.rel = 'noopener noreferrer';
  a.setAttribute('aria-label', 'Telegram-группа netip.icu'); a.title = 'Telegram-группа netip.icu';
  a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + TG_PATH + '"/></svg>';
  var wrap = document.createElement('div'); wrap.className = 'nx-brandwrap';   // keeps the header's own layout intact
  b.parentNode.insertBefore(wrap, b); wrap.appendChild(b); wrap.appendChild(a);
  return true;
}

/* ====================== 2. Unique visitors counter ====================== */
var VIS_CSS = '.nx-vis{display:flex;justify-content:center;margin:0 0 18px}.nx-pill{display:inline-flex;align-items:center;gap:9px;padding:7px 15px;border-radius:99px;border:1px solid rgba(130,160,200,.18);background:rgba(255,255,255,.025);font:11px/1.4 inherit;font-family:inherit;letter-spacing:.08em;color:#9aa7bb;white-space:nowrap}' +
  '.nx-pill i{width:6px;height:6px;border-radius:50%;background:#34e0ff;box-shadow:0 0 8px rgba(52,224,255,.8);animation:nxp 2.6s ease-in-out infinite}.nx-pill b{color:#e9eff9;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:.04em}@keyframes nxp{50%{opacity:.35}}';
async function getJson(url, ms) {
  var c = new AbortController(), t = setTimeout(function () { c.abort(); }, ms || 6000);
  try { var r = await fetch(url, { cache: 'no-store', signal: c.signal, credentials: 'omit', referrerPolicy: 'no-referrer' }); if (!r.ok) throw new Error('http ' + r.status); return JSON.parse(await r.text()); }
  finally { clearTimeout(t); }
}
async function loadCounter(out) {
  var NS = 'netip-icu', KEY = 'unique-visitors', FLAG = 'netip_visit_counted_v1', counted = false;
  try { counted = localStorage.getItem(FLAG) === '1'; } catch (e) {}
  var providers = [
    ['https://abacus.jasoncameron.dev/hit/' + NS + '/' + KEY, 'https://abacus.jasoncameron.dev/get/' + NS + '/' + KEY],
    ['https://countapi.mileshilliard.com/api/v1/hit/netip_icu_unique_visitors_v1', 'https://countapi.mileshilliard.com/api/v1/get/netip_icu_unique_visitors_v1']
  ];
  var draw = function (v) { out.textContent = Math.round(v).toLocaleString('ru-RU').replace(/\u00a0|\u202f/g, ' '); };
  for (var i = 0; i < providers.length; i++) {
    try {
      var d = await getJson(counted ? providers[i][1] : providers[i][0], 6000), v = parseInt(d && d.value, 10); if (isNaN(v)) throw 0;
      if (!counted) { try { localStorage.setItem(FLAG, '1'); } catch (e) {} }
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { draw(v); return; }
      var t0 = performance.now(); (function step(now) { var p = Math.min(1, (now - t0) / 1100); draw(v * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); else draw(v); })(t0);
      return;
    } catch (e) { /* next provider */ }
  }
  out.textContent = 'н/д';
}
function addCounter() {
  if (document.getElementById('nx-vis-n') || document.getElementById('vis-n')) return true;
  var c = leafMatch(/©\s*(19|20)\d\d\s*netip\.?\s*icu/i, 60)[0]; if (!c) return false;
  var home = leafMatch(/^на главную$/i, 30)[0], row = c.parentElement || c;
  if (home) { var a = c; while (a && !a.contains(home)) a = a.parentElement; if (a && a !== document.body && a !== document.documentElement) row = a; }
  injectStyle('nx-vis-css', VIS_CSS);
  var wrap = document.createElement('div'); wrap.className = 'nx-vis';
  wrap.innerHTML = '<span class="nx-pill" title="Уникальных посетителей за всё время (один браузер — один раз)"><i></i><b id="nx-vis-n" aria-live="polite">···</b> уникальных посетителей</span>';
  row.parentNode.insertBefore(wrap, row);
  loadCounter(wrap.querySelector('#nx-vis-n'));
  return true;
}

/* ====================== 3. DNS leak block ====================== */
var DNS_CSS = [
"#dnsx{--dx-cyan:var(--cyan,#34e0ff);--dx-green:var(--green,#3be8a6);--dx-amber:var(--amber,#f3b844);--dx-red:var(--red,#ff6b6b);--dx-dim:#9aa7bb;--dx-faint:#6f7e95;--dx-txt:#e9eff9;--dx-line:rgba(130,160,200,.16);--dx-line2:rgba(130,160,200,.26);",
"  display:block;background:rgba(13,20,33,.78);border:1px solid var(--dx-line);border-radius:22px;padding:20px 20px 18px;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 20px 50px -28px rgba(0,0,0,.7);color:var(--dx-txt);font-family:inherit;font-size:14px;line-height:1.55;text-align:left}",
"#dnsx *{box-sizing:border-box}",
"#dnsx .dx-h{display:flex;align-items:center;justify-content:space-between;gap:12px}",
"#dnsx .dx-ttl{display:flex;align-items:center;gap:11px;margin:0;font:500 12px/1.3 inherit;font-family:inherit;letter-spacing:.2em;text-transform:uppercase;color:var(--dx-dim)}",
"#dnsx .dx-sq{width:9px;height:9px;border-radius:2px;background:var(--dx-cyan);box-shadow:0 0 10px rgba(52,224,255,.7);flex:none}",
"#dnsx .dx-chip{display:inline-block;flex:none;padding:5px 12px;border-radius:99px;border:1px solid var(--dx-line2);color:var(--dx-dim);font-size:10.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}",
"#dnsx .dx-chip.ok{color:var(--dx-green);border-color:rgba(59,232,166,.38);background:rgba(59,232,166,.07)}",
"#dnsx .dx-chip.warn{color:var(--dx-amber);border-color:rgba(243,184,68,.45);background:rgba(243,184,68,.08)}",
"#dnsx .dx-chip.bad{color:var(--dx-red);border-color:rgba(255,107,107,.5);background:rgba(255,107,107,.09)}",
"#dnsx .dx-chip.busy{color:var(--dx-cyan);border-color:rgba(52,224,255,.4);background:rgba(52,224,255,.07);animation:dxp 1.4s ease-in-out infinite}",
"@keyframes dxp{50%{opacity:.4}}",
"#dnsx .dx-lead{margin:14px 0 0;color:var(--dx-dim);font-size:13px;line-height:1.7}",
"#dnsx .dx-run{display:block;width:100%;margin:16px 0 0;padding:15px 18px;border-radius:14px;border:1px solid rgba(52,224,255,.55);background:linear-gradient(180deg,rgba(52,224,255,.16),rgba(52,224,255,.06));color:var(--dx-cyan);font:700 13px/1 inherit;font-family:inherit;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:transform .25s cubic-bezier(.22,.8,.3,1),box-shadow .25s,background .25s}",
"#dnsx .dx-run:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 28px -12px rgba(52,224,255,.55);background:linear-gradient(180deg,rgba(52,224,255,.24),rgba(52,224,255,.1))}",
"#dnsx .dx-run:disabled{opacity:.6;cursor:default}",
"#dnsx .dx-steps{list-style:none;margin:16px 0 0;padding:0;display:grid;gap:10px}",
"#dnsx .dx-steps li{display:grid;grid-template-columns:20px 1fr;gap:2px 12px;align-items:center;margin:0;padding:0;font-size:13px;color:var(--dx-faint);transition:color .3s}",
"#dnsx .dx-steps i{width:18px;height:18px;border-radius:50%;border:1.5px solid var(--dx-line2);display:grid;place-items:center;font-style:normal;font-size:11px;font-weight:700;line-height:1}",
"#dnsx .dx-steps em{grid-column:2;font-style:normal;font-size:11.5px;color:var(--dx-faint);margin-top:-2px}",
"#dnsx .dx-steps li[data-st=run]{color:var(--dx-txt)}",
"#dnsx .dx-steps li[data-st=run] i{border-color:var(--dx-cyan);box-shadow:0 0 10px rgba(52,224,255,.5);animation:dxp 1s ease-in-out infinite}",
"#dnsx .dx-steps li[data-st=ok]{color:var(--dx-txt)}",
"#dnsx .dx-steps li[data-st=ok] i{border-color:var(--dx-green);color:var(--dx-green)}#dnsx .dx-steps li[data-st=ok] i::before{content:'\\2713'}",
"#dnsx .dx-steps li[data-st=fail] i{border-color:var(--dx-red);color:var(--dx-red)}#dnsx .dx-steps li[data-st=fail] i::before{content:'\\2715'}#dnsx .dx-steps li[data-st=fail] em{color:var(--dx-red)}",
"#dnsx .dx-bar{height:3px;border-radius:3px;background:rgba(130,160,200,.14);overflow:hidden;margin-top:14px}",
"#dnsx .dx-bar i{display:block;height:100%;width:0;border-radius:3px;background:linear-gradient(90deg,var(--dx-cyan),#7df0ff);transition:width .5s cubic-bezier(.22,.8,.3,1)}",
"#dnsx .dx-verdict{margin-top:16px;padding:14px 16px;border-radius:14px;border:1px solid var(--dx-line2);background:rgba(255,255,255,.025)}",
"#dnsx .dx-verdict strong{display:block;margin-bottom:4px;font:700 14px/1.35 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}",
"#dnsx .dx-verdict p{margin:0;font-size:13px;line-height:1.7;color:var(--dx-dim)}",
"#dnsx .dx-verdict.ok{border-color:rgba(59,232,166,.35);background:rgba(59,232,166,.05)}#dnsx .dx-verdict.ok strong{color:var(--dx-green)}",
"#dnsx .dx-verdict.warn{border-color:rgba(243,184,68,.4);background:rgba(243,184,68,.05)}#dnsx .dx-verdict.warn strong{color:var(--dx-amber)}",
"#dnsx .dx-verdict.bad{border-color:rgba(255,107,107,.45);background:rgba(255,107,107,.06)}#dnsx .dx-verdict.bad strong{color:var(--dx-red)}",
"#dnsx .dx-res{list-style:none;margin:12px 0 0;padding:0}",
"#dnsx .dx-res li{display:grid;grid-template-columns:1fr auto;gap:3px 12px;align-items:center;margin:0;padding:12px 0;border-top:1px solid var(--dx-line)}",
"#dnsx .dx-ip{font-weight:600;font-size:14px;overflow-wrap:anywhere}",
"#dnsx .dx-meta{grid-column:1;font-size:12px;color:var(--dx-dim);overflow-wrap:anywhere}",
"#dnsx .dx-res .dx-chip{grid-row:1/span 2;grid-column:2;padding:4px 10px;font-size:10px}",
"#dnsx .dx-flag{width:20px;height:15px;border-radius:2px;vertical-align:-2px;margin-right:7px;box-shadow:0 0 0 1px rgba(255,255,255,.12)}",
"#dnsx details{margin-top:14px;border-top:1px solid var(--dx-line);padding-top:12px}",
"#dnsx summary{cursor:pointer;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--dx-faint)}",
"#dnsx pre{margin:10px 0 0;padding:12px;border-radius:10px;background:rgba(0,0,0,.28);font:11.5px/1.7 inherit;font-family:inherit;color:var(--dx-dim);white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto}",
"#dnsx .dx-foot{margin:12px 0 0;font-size:11.5px;color:var(--dx-faint);line-height:1.65}",
"#dnsx [hidden]{display:none!important}",
"@media (max-width:520px){#dnsx{padding:18px 16px 16px;border-radius:20px}#dnsx .dx-h{align-items:flex-start}#dnsx .dx-res li{grid-template-columns:1fr}#dnsx .dx-res .dx-chip{grid-column:1;grid-row:auto;justify-self:start;margin-top:4px}}",
"@media (prefers-reduced-motion:reduce){#dnsx *{animation:none!important;transition:none!important}}"
].join('\n');
var DNS_HTML =
'<section id="dnsx" aria-labelledby="dx-title">' +
'<header class="dx-h"><h2 class="dx-ttl" id="dx-title"><i class="dx-sq"></i>DNS-резолвер</h2><span class="dx-chip" id="dx-chip">готов к тесту</span></header>' +
'<p class="dx-lead">Тест показывает, какие DNS-серверы на самом деле обрабатывают запросы вашего устройства. Если пользуетесь VPN — включите его перед запуском: резолвер вашего домашнего провайдера в результате будет означать утечку.</p>' +
'<button class="dx-run" id="dx-run" type="button">Запустить тест утечки DNS</button>' +
'<div class="dx-bar" id="dx-bar" hidden><i id="dx-prog"></i></div>' +
'<ol class="dx-steps" id="dx-steps" hidden aria-live="polite"><li data-st="wait"><i></i><span>Регистрация теста</span><em></em></li><li data-st="wait"><i></i><span>Отправка уникальных DNS-запросов</span><em></em></li><li data-st="wait"><i></i><span>Получение списка резолверов</span><em></em></li></ol>' +
'<div class="dx-verdict" id="dx-verdict" role="status" hidden><strong id="dx-vt"></strong><p id="dx-vp"></p></div>' +
'<ol class="dx-res" id="dx-list"></ol>' +
'<details id="dx-details" hidden><summary>Подробности теста</summary><pre id="dx-log"></pre></details>' +
'<p class="dx-foot" id="dx-foot" hidden></p></section>';

function initDnsBlock(root) {
  var $ = function (s) { return root.querySelector(s); };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var isV4 = function (s) { return /^\d{1,3}(\.\d{1,3}){3}$/.test(s || ''); };
  var isV6 = function (s) { return typeof s === 'string' && s.indexOf(':') >= 0 && /^[0-9a-f:.]+$/i.test(s); };
  var isIp = function (s) { return isV4(s) || isV6(s); };
  var el = { run: $('#dx-run'), chip: $('#dx-chip'), bar: $('#dx-bar'), prog: $('#dx-prog'), steps: $('#dx-steps'), verdict: $('#dx-verdict'), vt: $('#dx-vt'), vp: $('#dx-vp'), list: $('#dx-list'), details: $('#dx-details'), log: $('#dx-log'), foot: $('#dx-foot') };
  var stepEls = Array.prototype.slice.call(el.steps.querySelectorAll('li'));
  var regionRu = function (cc) { try { return new Intl.DisplayNames(['ru'], { type: 'region' }).of(String(cc).toUpperCase()); } catch (e) { return null; } };
  var flagEl = function (cc) { return /^[a-z]{2}$/i.test(cc || '') ? '<img class="dx-flag" alt="" width="20" height="15" decoding="async" data-cc="' + esc(String(cc).toUpperCase()) + '" src="https://cdnjs.cloudflare.com/ajax/libs/flag-icons/7.2.3/flags/4x3/' + String(cc).toLowerCase() + '.svg">' : ''; };
  root.addEventListener('error', function (e) { var i = e.target; if (i && i.tagName === 'IMG' && i.classList.contains('dx-flag')) i.replaceWith(document.createTextNode('[' + (i.dataset.cc || '??') + '] ')); }, true);
  var setChip = function (kind, text) { el.chip.className = 'dx-chip ' + kind; el.chip.textContent = text; };
  var progress = function (p) { el.prog.style.width = p + '%'; };
  var setStep = function (i, st, note) { stepEls[i].dataset.st = st; stepEls[i].querySelector('em').textContent = note || ''; };
  var T0 = 0, lines = [];
  function log(ok, msg) { lines.push('[' + ((performance.now() - T0) / 1000).toFixed(1) + 'с] ' + (ok === true ? '✓ ' : ok === false ? '✗ ' : '· ') + msg); el.log.textContent = lines.join('\n'); }

  async function req(url, o) {
    o = o || {}; var c = new AbortController(), t = setTimeout(function () { c.abort(); }, o.ms || 8000);
    try {
      var r = await fetch(url, { method: o.method || 'GET', body: o.body, headers: o.headers, mode: o.mode, signal: c.signal, credentials: 'omit' });
      if (o.mode === 'no-cors') return '';
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.text();
    } finally { clearTimeout(t); }
  }
  var bust = function (u) { return u + (u.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now(); };
  var reason = function (e) { return e && e.name === 'AbortError' ? 'таймаут' : (e && e.message) || 'ошибка сети'; };
  async function diagnose(host) {
    try { await req('https://' + host + '/', { ms: 6000, mode: 'no-cors' }); return host + ': сервер доступен, но не разрешает чтение ответа (CORS)'; }
    catch (e) { return host + ': недоступен из вашей сети (блокировка, фильтр, расширение или нет связи)'; }
  }
  function lookups(urls, maxMs, onStep) {
    return new Promise(function (resolve) {
      var left = urls.length, done = false;
      var fin = function () { if (!done) { done = true; resolve(urls.length - left); } };
      urls.forEach(function (u) { var i = new Image(); var s = function () { left--; if (onStep) onStep(urls.length - left, urls.length); if (left <= 0) fin(); }; i.onload = s; i.onerror = s; i.referrerPolicy = 'no-referrer'; i.src = u; });
      setTimeout(fin, maxMs);
    });
  }
  var randId = function (n) { var s = ''; for (var i = 0; i < n; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]; return s; };

  /* --- provider 1: bash.ws --- */
  async function bashWs() {
    setStep(0, 'run', 'bash.ws'); log(null, 'Сервис 1: bash.ws');
    var id;
    try { id = (await req(bust('https://bash.ws/id'), { ms: 4500 })).trim(); log(true, 'bash.ws/id → ' + id); }
    catch (e) { log(false, 'bash.ws/id: ' + reason(e)); log(false, await diagnose('bash.ws')); throw e; }
    if (!/^[A-Za-z0-9-]{3,64}$/.test(id)) { log(false, 'неожиданный id'); throw new Error('bad id'); }
    await Promise.allSettled(['ipv4', 'ipv6'].map(function (f) { return req(bust('https://' + f + '.bash.ws/myip/test/' + id), { ms: 5000 }).then(function () { log(true, f + ' зарегистрирован'); }, function (e) { log(null, f + ': ' + reason(e) + ' (не критично)'); }); }));
    setStep(0, 'ok', 'id ' + id); setStep(1, 'run', '0 / 30'); progress(20);
    var urls = []; for (var k = 1; k <= 30; k++) urls.push('https://' + k + '.' + id + '.bash.ws/img.png');
    var n = await lookups(urls, 9000, function (a, t) { setStep(1, 'run', a + ' / ' + t); progress(20 + Math.round(a / t * 55)); });
    log(n >= 25, 'DNS-запросов выполнено: ' + n + ' из 30');
    if (n < 5) throw new Error('lookups failed');
    setStep(1, 'ok', n + ' запросов'); setStep(2, 'run', ''); progress(82);
    var recs = null, last = -1;
    for (var i = 0; i < 4; i++) {
      var txt;
      try { txt = await req(bust('https://bash.ws/dnsleak/test/' + id + '?json=2'), { ms: 10000 }); }
      catch (e) { log(null, 'json=2: ' + reason(e) + ', пробуем ?json'); txt = await req(bust('https://bash.ws/dnsleak/test/' + id + '?json'), { ms: 10000 }); }
      var r = JSON.parse(txt);
      if (!Array.isArray(r)) throw new Error('bad result');
      if (r.some(function (x) { return x && x.type === 'error'; })) throw new Error('service error');
      recs = r; var cnt = r.filter(function (x) { return x && x.type === 'dns'; }).length; log(true, 'результаты, попытка ' + (i + 1) + ': резолверов ' + cnt);
      if (cnt > 0 && cnt === last) break; last = cnt; await sleep(1600);
    }
    var clients = recs.filter(function (r) { return r && r.type === 'ip' && isIp(r.ip); });
    var seen = {}, resolvers = [];
    recs.forEach(function (r) { if (r && r.type === 'dns' && isIp(r.ip) && !seen[r.ip]) { seen[r.ip] = 1; resolvers.push({ ip: r.ip, country: r.country, country_name: r.country_name, asn: r.asn }); } });
    var c = recs.find(function (r) { return r && r.type === 'conclusion'; });
    return { provider: 'bash.ws', clients: clients, resolvers: resolvers, conclusion: c ? String(c.ip || c.text || '') : '' };
  }

  /* --- provider 2: ipleak.net  (protocol of the open-source clients: https://<40 random chars>.ipleak.net/dnsdetect/ -> body = resolver IP) --- */
  async function enrich(ip) {
    try { var d = JSON.parse(await req('https://ipwho.is/' + encodeURIComponent(ip), { ms: 6000 })); if (d && d.success !== false && d.ip) return { ip: ip, country: d.country_code || '', country_name: d.country || '', asn: [d.connection && d.connection.asn ? 'AS' + d.connection.asn : '', d.connection && (d.connection.isp || d.connection.org) || ''].filter(Boolean).join(' ') }; } catch (e) {}
    try { var j = JSON.parse(await req('https://ipleak.net/?mode=json&ip=' + encodeURIComponent(ip), { ms: 6000 })); return { ip: ip, country: j.country_code || '', country_name: j.country_name || '', asn: [j.as_number ? 'AS' + j.as_number : '', j.isp_name || j.isp || ''].filter(Boolean).join(' ') }; } catch (e) {}
    return { ip: ip, country: '', country_name: '', asn: '' };
  }
  function pickIp(txt) {
    txt = String(txt || '').trim();
    if (isIp(txt)) return txt;
    try { var j = JSON.parse(txt); if (typeof j === 'string' && isIp(j)) return j; if (j && typeof j.ip === 'string' && isIp(j.ip)) return j.ip; } catch (e) {}
    var m = txt.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/); return m && isIp(m[0]) ? m[0] : null;
  }
  async function ipleak() {
    setStep(0, 'run', 'ipleak.net'); log(null, 'Сервис 2: ipleak.net');
    var N = 16, ips = {}, okc = 0, done = 0, samples = [];
    setStep(0, 'ok', N + ' уникальных имён'); setStep(1, 'run', '0 / ' + N); progress(30);
    await Promise.all(Array.from({ length: N }, async function () {
      try {
        var txt = await req('https://' + randId(40) + '.ipleak.net/dnsdetect/', { ms: 9000 }); okc++;
        if (samples.length < 3) samples.push(String(txt).trim().slice(0, 60));
        var ip = pickIp(txt); if (ip) ips[ip] = (ips[ip] || 0) + 1;
      } catch (e) { /* counted below */ }
      done++; setStep(1, 'run', done + ' / ' + N); progress(30 + Math.round(done / N * 45));
    }));
    log(okc > 0, 'ipleak.net ответил на ' + okc + ' из ' + N + ' запросов' + (samples.length ? '; образцы ответа: ' + samples.join(' | ') : ''));
    if (!okc) { log(false, await diagnose('ipleak.net')); throw new Error('нет ответа'); }
    var list = Object.keys(ips);
    if (!list.length) throw new Error('в ответах нет IP-адресов');
    setStep(1, 'ok', okc + ' запросов'); setStep(2, 'run', 'геолокация резолверов'); progress(82);
    var resolvers = await Promise.all(list.map(enrich));
    log(true, 'найдено резолверов: ' + resolvers.length + ' (' + list.join(', ') + ')');
    return { provider: 'ipleak.net', clients: [], resolvers: resolvers, conclusion: '' };
  }

  /* --- provider 3: dnsleaktest.com --- */
  async function dnsleaktest() {
    setStep(0, 'run', 'dnsleaktest.com'); log(null, 'Сервис 3: dnsleaktest.com');
    var uuid = function () { return (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); })); };
    var ids = Array.from({ length: 12 }, uuid);
    try { await req('https://www.dnsleaktest.com/api/v1/identifiers', { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ identifiers: ids }), ms: 6000 }); log(true, 'идентификаторы отправлены'); }
    catch (e) { log(false, 'identifiers: ' + reason(e)); log(false, await diagnose('www.dnsleaktest.com')); throw e; }
    setStep(0, 'ok', '12 идентификаторов'); setStep(1, 'run', '0 / 12'); progress(30);
    var n = await lookups(ids.map(function (id) { return 'https://' + id + '.test.dnsleaktest.com/'; }), 9000, function (a, t) { setStep(1, 'run', a + ' / ' + t); progress(30 + Math.round(a / t * 45)); });
    log(n > 0, 'DNS-запросов выполнено: ' + n + ' из 12');
    setStep(1, 'ok', n + ' запросов'); setStep(2, 'run', ''); progress(82);
    var arr;
    try { arr = JSON.parse(await req('https://www.dnsleaktest.com/api/v1/servers-for-result', { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ queries: ids }), ms: 10000 })); }
    catch (e) { log(false, 'servers-for-result: ' + reason(e)); log(false, await diagnose('www.dnsleaktest.com')); throw e; }
    if (!Array.isArray(arr)) throw new Error('bad result');
    var resolvers = arr.filter(function (x) { return x && isIp(x.ip_address); }).map(function (x) { return { ip: x.ip_address, country: /^[A-Za-z]{2}$/.test(x.country || '') ? x.country : '', country_name: x.country || '', asn: x.isp || '' }; });
    log(true, 'найдено резолверов: ' + resolvers.length);
    return { provider: 'dnsleaktest.com', clients: [], resolvers: resolvers, conclusion: '' };
  }

  /* --- analysis --- */
  var parseAsn = function (a) { var m = /(?:AS)?\s*(\d{1,10})\s*(.*)$/i.exec(String(a || '').trim()); return m ? { num: m[1], org: m[2].trim() } : { num: '', org: String(a || '').trim() }; };
  var PUBLIC_DNS = /google|cloudflare|quad9|opendns|cisco|yandex|adguard|nextdns|mullvad|cleanbrowsing|dns\.sb|comodo|neustar|verisign|level ?3|control ?d|alidns|alibaba/i;
  var PUBLIC_ASN = { '15169': 1, '13335': 1, '19281': 1, '36692': 1, '13238': 1, '212772': 1, '39351': 1 };
  var GENERIC = /^(ltd|llc|inc|corp|gmbh|company|telecom|telecommunications|communications|network|networks|internet|services|group|pjsc|ojsc|jsc|cjsc|ooo|llp|limited|the|and|data|center|centre|hosting|cloud|online|broadband|mobile)$/i;
  var tokens = function (s) { var o = {}; String(s || '').toLowerCase().split(/[^a-zа-я0-9]+/i).forEach(function (w) { if (w.length >= 4 && !GENERIC.test(w)) o[w] = 1; }); return o; };
  var shareToken = function (a, b) { var A = tokens(a), B = tokens(b); for (var t in B) if (A[t]) return true; return false; };
  var ownCache = null;
  async function ownCtx() {
    if (ownCache) return ownCache;
    var s = window.__netipIp;
    if (s && (s.asn || s.isp)) { var a = parseAsn(s.asn); return (ownCache = { cc: s.cc || '', countryName: s.country || '', asnNum: a.num, org: s.isp || a.org, ip: s.v4 || s.ip || '' }); }
    try { var d = JSON.parse(await req('https://ipwho.is/', { ms: 6000 })); if (d && d.ip) return (ownCache = { cc: d.country_code || '', countryName: d.country || '', asnNum: d.connection && d.connection.asn ? String(d.connection.asn) : '', org: d.connection && (d.connection.isp || d.connection.org) || '', ip: d.ip }); } catch (e) {}
    return { cc: '', countryName: '', asnNum: '', org: '', ip: '' };
  }
  function clientCtx(clients) {
    var rec = clients.find(function (r) { return isV4(r.ip); }) || clients[0];
    if (rec) { var a = parseAsn(rec.asn); return { cc: /^[A-Za-z]{2}$/.test(rec.country || '') ? rec.country : '', countryName: rec.country_name || '', asnNum: a.num, org: a.org, ip: rec.ip }; }
    return ownCache || { cc: '', countryName: '', asnNum: '', org: '', ip: '' };
  }
  function classify(res, c) {
    var a = parseAsn(res.asn), cc = (/^[A-Za-z]{2}$/.test(res.country || '') ? res.country : '').toUpperCase(), ccC = (c.cc || '').toUpperCase();
    if (PUBLIC_ASN[a.num] || PUBLIC_DNS.test(a.org)) return { kind: 'public', label: 'публичный DNS', cls: '' };
    if (c.asnNum && a.num && c.asnNum === a.num) return { kind: 'own', label: 'ваша сеть', cls: 'ok' };
    if (shareToken(a.org, c.org) && (!cc || !ccC || cc === ccC)) return { kind: 'own', label: 'ваша сеть', cls: 'ok' };
    var same = (cc && ccC) ? cc === ccC : (res.country_name && c.countryName ? res.country_name === c.countryName : null);
    if (same === false) return { kind: 'foreign', label: 'другая страна', cls: 'bad' };
    return { kind: 'third', label: 'другая сеть', cls: 'warn' };
  }
  function render(t) {
    progress(100); setStep(2, 'ok', 'резолверов: ' + t.resolvers.length);
    var ctx = clientCtx(t.clients);
    var rows = t.resolvers.map(function (r) { return { r: r, c: classify(r, ctx) }; });
    el.list.innerHTML = rows.map(function (x) { var r = x.r, c = x.c, a = parseAsn(r.asn), cc = /^[A-Za-z]{2}$/.test(r.country || '') ? r.country : '', nm = (cc && regionRu(cc)) || r.country_name || '';
      return '<li><div class="dx-ip">' + esc(r.ip) + '</div><div class="dx-meta">' + flagEl(cc) + esc([nm, a.org, a.num ? 'AS' + a.num : ''].filter(Boolean).join(' · ')) + '</div><span class="dx-chip ' + c.cls + '">' + esc(c.label) + '</span></li>'; }).join('');
    var by = function (k) { return rows.filter(function (x) { return x.c.kind === k; }); };
    var foreign = by('foreign'), third = by('third'), pub = by('public');
    var where = function (arr) { return arr.map(function (x) { return x.r.ip + ' (' + [((/^[A-Za-z]{2}$/.test(x.r.country || '') && regionRu(x.r.country)) || x.r.country_name), parseAsn(x.r.asn).org].filter(Boolean).join(', ') + ')'; }).join('; '); };
    var yours = ctx.ip ? ' Ваш IP для сайтов: ' + ctx.ip + (ctx.org ? ' (' + ctx.org + ')' : '') + '.' : '';
    var kind, chip, title, text;
    if (!rows.length) { kind = 'warn'; chip = 'резолверы не найдены'; title = 'Резолверы не определены'; text = 'Сервис не получил наших запросов от ваших DNS-серверов: ответы могли кэшироваться или запросы блокирует сеть/расширение. Нажмите «Запустить тест заново». Отсутствие результата не означает, что утечки нет.'; }
    else if (foreign.length) { kind = 'bad'; chip = 'возможна утечка dns'; title = 'Возможна утечка DNS'; text = 'Имена сайтов разрешают DNS-серверы из другой страны, чем ваш IP: ' + where(foreign) + '.' + yours + ' Если включён VPN — DNS идёт мимо туннеля. Включите «DNS leak protection» / kill-switch в VPN-клиенте или укажите DNS вашего VPN (либо публичный DoH, например 1.1.1.1).'; }
    else if (third.length) { kind = 'warn'; chip = 'dns другой сети'; title = 'DNS обрабатывает другая сеть'; text = 'Резолвер(ы) принадлежат не той сети, что ваш IP: ' + where(third) + '.' + yours + ' Для VPN это нормально, если это DNS вашего VPN-провайдера; если это резолвер домашнего провайдера — это утечка.'; }
    else { kind = 'ok'; chip = 'утечки не обнаружено'; title = 'Утечки DNS не обнаружено'; text = (rows.length - pub.length ? 'Запросы обрабатываются резолверами вашей сети' + (ctx.org ? ' (' + ctx.org + ')' : '') + '. ' : '') + (pub.length ? 'Часть запросов идёт через публичный DNS (' + pub.map(function (x) { return x.r.ip; }).join(', ') + '). ' : '') + 'Сторонних резолверов, не связанных с вашим IP, не видно.' + yours; }
    setChip(kind, chip); el.verdict.className = 'dx-verdict ' + kind; el.verdict.hidden = false; el.vt.textContent = title; el.vp.textContent = text;
    el.foot.hidden = false;
    el.foot.textContent = 'Источник результата: ' + t.provider + '. Тест запрашивает уникальные имена и смотрит, какие резолверы их искали; сервис при этом узнаёт ваш IP. Если в браузере включён «Безопасный DNS» (DoH), будет виден резолвер DoH-провайдера, а не системный.' + (t.conclusion ? ' Заключение bash.ws: «' + t.conclusion + '».' : '');
  }

  var running = false;
  async function run() {
    if (running) return; running = true;
    T0 = performance.now(); lines.length = 0; el.log.textContent = '';
    el.run.disabled = true; el.run.textContent = 'Идёт тест…';
    el.verdict.hidden = true; el.foot.hidden = true; el.list.innerHTML = ''; el.details.hidden = false; el.details.open = false;
    el.steps.hidden = false; el.bar.hidden = false; progress(4);
    stepEls.forEach(function (s, i) { setStep(i, 'wait', ''); });
    setChip('busy', 'идёт тест');
    var result = null, failed = [], list = [['bash.ws', bashWs], ['ipleak.net', ipleak], ['dnsleaktest.com', dnsleaktest]];
    for (var i = 0; i < list.length; i++) {
      try { result = await list[i][1](); if (result) break; }
      catch (e) {
        failed.push(list[i][0]); log(false, list[i][0] + ' не сработал (' + reason(e) + ')');
        stepEls.forEach(function (s, k) { if (s.dataset.st === 'run') setStep(k, 'fail', list[i][0] + ': ' + reason(e)); });
        await sleep(600); stepEls.forEach(function (s, k) { setStep(k, 'wait', ''); }); progress(8);
      }
    }
    if (result) { if (!result.clients.length) await ownCtx(); render(result); }
    else {
      progress(100); setChip('warn', 'тест не выполнен'); stepEls.forEach(function (s, k) { setStep(k, 'fail', ''); });
      el.verdict.className = 'dx-verdict warn'; el.verdict.hidden = false; el.vt.textContent = 'Проверка не выполнена';
      el.vp.textContent = 'Ни один из сервисов DNS-теста (' + failed.join(', ') + ') не ответил из вашей сети: их может блокировать провайдер, VPN/файрвол или расширение-блокировщик. Причина по каждому сервису — в «Подробностях теста» ниже. Это не значит, что утечки нет.';
      el.details.open = true;
    }
    el.run.disabled = false; el.run.textContent = 'Запустить тест заново'; running = false;
  }
  el.run.addEventListener('click', run);
}

function replaceDns() {
  var card = document.getElementById('dnsx');         // an earlier version of this block: upgrade it in place
  if (card && card.getAttribute('data-nx') === '1') return true;
  if (!card) {
    var h = leafMatch(/^dns\s*[-–—]?\s*резолвер$/i, 40)[0]; if (!h) return false;
    for (var a = h; a && a !== document.body; a = a.parentElement) {
      var p = a.parentElement; if (!p) break;
      var sibs = Array.prototype.slice.call(p.children);
      if (sibs.length >= 3 && sibs.some(function (s) { return s !== a && /^(webrtc|браузер|ip[\s-]*адрес)/i.test(norm(s.textContent).slice(0, 30)); })) { card = a; break; }
    }
    if (!card) {
      for (var b = h.parentElement; b && b !== document.body; b = b.parentElement) {
        var br = parseFloat(getComputedStyle(b).borderTopLeftRadius) || 0;
        if (br >= 12 && b.getBoundingClientRect().height > 120) { card = b; break; }
      }
    }
  }
  if (!card) return false;
  injectStyle('nx-dns-css', DNS_CSS);
  var tmp = document.createElement('div'); tmp.innerHTML = DNS_HTML;
  var sec = tmp.firstElementChild; sec.setAttribute('data-nx', '1');
  card.replaceWith(sec);
  initDnsBlock(sec);
  return true;
}

function start() { whenReady(addTelegram, 'tg'); whenReady(replaceDns, 'dns'); whenReady(addCounter, 'counter'); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
