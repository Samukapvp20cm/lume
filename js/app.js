/* ==========================================================================
   Lume · Cardápio digital — comportamento
   Sem bibliotecas. Tudo que se move usa transform/opacity, molas com
   velocidade herdada nos gestos e respeita "reduzir movimento".
   ========================================================================== */
(() => {
  'use strict';

  const L = window.LOJA;
  const CATS = window.CATEGORIAS;
  const TAGS = window.TAGS;

  /* ------------------------------------------------------------ utilidades */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const mqMobile = matchMedia('(max-width: 767px)');
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const isMobile = () => mqMobile.matches;
  const reduce = () => mqReduce.matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mod = (n, m) => ((n % m) + m) % m;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
  const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const money = v => BRL.format(v);
  const num = v => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ','));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento: segue sem salvar */ } }
  };

  function rng(seed) { // mulberry32 — embaralhamento sempre igual
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function shuffled(arr, seed = 7) { const r = rng(seed); const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  const isUnsplash = src => src && !/^(https?:|\/|\.|data:)/.test(src) && !/\.(jpe?g|png|webp|avif|gif)$/i.test(src);
  function imgUrl(src, w, ratio) {
    if (!isUnsplash(src)) return src;
    let u = `https://images.unsplash.com/photo-${src}?auto=format&fit=crop&w=${w}&q=70`;
    if (ratio) u += `&h=${Math.round(w * ratio)}`;
    return u;
  }
  function srcset(src, widths, ratio) {
    if (!isUnsplash(src)) return '';
    return widths.map(w => `${imgUrl(src, w, ratio)} ${w}w`).join(', ');
  }
  function imgTag(src, { w = 600, widths, ratio, sizes, alt = '', cls = '', eager = false, lazy = true, extra = '' } = {}) {
    const ss = widths ? srcset(src, widths, ratio) : '';
    return `<img class="lazy ${cls}" src="${imgUrl(src, w, ratio)}"${ss ? ` srcset="${ss}" sizes="${sizes || '100vw'}"` : ''} alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : lazy ? 'loading="lazy"' : ''} decoding="async" draggable="false" ${extra}>`;
  }
  // imagens entram suavemente quando terminam de carregar
  document.addEventListener('load', e => { const t = e.target; if (t.tagName === 'IMG' && t.classList.contains('lazy')) t.classList.add('is-loaded'); }, true);
  document.addEventListener('error', e => { const t = e.target; if (t.tagName === 'IMG') t.classList.add('is-loaded'); }, true);
  function markLoaded(root = document) { $$('img.lazy', root).forEach(img => { if (img.complete && img.naturalWidth) img.classList.add('is-loaded'); }); }

  /** Mola no estilo Apple: "response" (s) e "damping" (1 = sem quicar). Começa do valor atual e herda velocidade. */
  function spring({ from, to, velocity = 0, response = 0.4, damping = 1, onUpdate, onComplete }) {
    const k = Math.pow((2 * Math.PI) / response, 2);
    const c = (4 * Math.PI * damping) / response;
    let x = from, v = velocity, last = performance.now(), raf = 0, done = false;
    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const steps = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / steps;
      for (let i = 0; i < steps; i++) { const a = -k * (x - to) - c * v; v += a * h; x += v * h; }
      if (Math.abs(v) < 4 && Math.abs(x - to) < 0.4) { x = to; v = 0; onUpdate(x); done = true; onComplete && onComplete(); return; }
      onUpdate(x);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return { stop() { cancelAnimationFrame(raf); }, get value() { return x; }, get velocity() { return v; }, get done() { return done; } };
  }
  const rubber = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over));
  // projeção de impulso (mesma função usada pela Apple)
  const project = (v, d = 0.998) => ((v / 1000) * d) / (1 - d);

  function velocityFrom(samples, axis) {
    if (samples.length < 2) return 0;
    const last = samples[samples.length - 1];
    let first = samples[0];
    for (let i = samples.length - 1; i >= 0; i--) { if (last.t - samples[i].t > 90) break; first = samples[i]; }
    const dt = (last.t - first.t) / 1000;
    return dt > 0 ? (last[axis] - first[axis]) / dt : 0;
  }

  /* ------------------------------------------------------------- dados */
  const ITEMS = new Map();
  CATS.forEach(cat => cat.itens.forEach(it => { it.cat = cat; ITEMS.set(it.id, it); }));
  const ALL = [...ITEMS.values()];
  const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const PLUS = '<svg class="i-plus" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const CHECK = '<svg class="i-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const MINUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>';
  const FLAME = '<svg class="flame" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3c1.9 4.3 7.5 7.4 7.5 13.6a7.5 7.5 0 0 1-15 0c0-3 1.5-5 3.2-6.7.4 2.2 1.4 3.8 3 4.2-.8-4.2.3-8 1.3-11.1z"/></svg>';
  const WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2a9.7 9.7 0 0 0-8.3 14.8L2.4 21.6l4.7-1.2A9.7 9.7 0 1 0 12 2.2zm0 17.7c-1.5 0-2.9-.4-4.2-1.1l-.3-.2-2.8.7.8-2.7-.2-.3A8 8 0 1 1 12 19.9zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.5 2.5 0 0 0 1.7-1.2 2 2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z"/></svg>';

  /* --------------------------------------------- textos da loja e horário */
  $$('[data-loja]').forEach(el => { const v = L[el.dataset.loja]; if (v != null) el.textContent = v; });
  $$('img[data-foto]').forEach(img => {
    const src = L.fotos[img.dataset.foto]; const w = +img.dataset.w || 1000;
    img.classList.add('lazy');
    img.src = imgUrl(src, w, 1.25);
    if (isUnsplash(src)) { img.srcset = srcset(src, [600, 900, 1200], 1.25); img.sizes = '(max-width: 1023px) 92vw, 40vw'; }
  });
  const waLink = text => `https://wa.me/${L.whatsapp}?text=${encodeURIComponent(text)}`;
  $('#reservaLink').href = waLink(`Olá! Gostaria de reservar uma mesa no ${L.nome}.`);
  $('#instaLink').href = `https://instagram.com/${L.instagram}`;
  $('.hero__meta li:nth-child(3) strong').textContent = ALL.length;

  const toMin = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const fmtHora = h => { const [a, b] = h.split(':'); return `${+a}h${b !== '00' ? b : ''}`; };
  const fmtAte = h => (h === '00:00' ? 'meia-noite' : fmtHora(h));
  function statusAgora(now = new Date()) {
    const d = now.getDay(), m = now.getHours() * 60 + now.getMinutes();
    const hoje = L.horarios[d] || [];
    for (const [a, b] of hoje) { const A = toMin(a); let B = toMin(b); if (B <= A) B += 1440; if (m >= A && m < B) return { aberto: true, txt: `Aberto · até ${fmtAte(b)}` }; }
    for (const [a, b] of (L.horarios[(d + 6) % 7] || [])) { const A = toMin(a), B = toMin(b); if (B <= A && m < B) return { aberto: true, txt: `Aberto · até ${fmtAte(b)}` }; }
    for (const [a] of hoje) if (toMin(a) > m) return { aberto: false, txt: `Fechado · abre às ${fmtHora(a)}` };
    for (let i = 1; i <= 7; i++) { const dd = (d + i) % 7, r = L.horarios[dd]; if (r && r.length) return { aberto: false, txt: `Fechado · abre ${i === 1 ? 'amanhã' : DIAS[dd].toLowerCase()} ${fmtHora(r[0][0])}` }; }
    return { aberto: false, txt: 'Fechado' };
  }
  function pintaHorario() {
    const st = statusAgora(), el = $('#statusAberto');
    el.classList.toggle('is-open', st.aberto);
    el.querySelector('span').textContent = st.txt;
    const d = new Date().getDay(), hoje = L.horarios[d] || [];
    $('#heroHoje').textContent = hoje.length ? hoje.map(([a, b]) => `${fmtHora(a)}–${fmtHora(b)}`).join(' · ') : 'Fechado';
    $('#hoursList').innerHTML = [1, 2, 3, 4, 5, 6, 0].map(i => {
      const r = L.horarios[i] || [];
      return `<li class="${i === d ? 'is-today' : ''}"><span>${DIAS[i]}${i === d ? ' · hoje' : ''}</span><span>${r.length ? r.map(([a, b]) => `${fmtHora(a)} – ${fmtHora(b)}`).join(', ') : 'Fechado'}</span></li>`;
    }).join('');
  }
  pintaHorario();
  setInterval(pintaHorario, 60000);

  /* ---------------------------------------------------------- tema */
  const root = document.documentElement;
  const savedTheme = store.get('lume-tema', null);
  if (savedTheme) root.dataset.theme = savedTheme;
  const effectiveTheme = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  function setThemeColor() { $$('meta[name="theme-color"]').forEach(m => { m.content = effectiveTheme() === 'dark' ? '#0F0C0A' : '#F4EEE5'; m.removeAttribute('media'); }); }
  if (savedTheme) setThemeColor();
  $('#themeBtn').addEventListener('click', e => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    const apply = () => { root.dataset.theme = next; store.set('lume-tema', next); setThemeColor(); };
    if (!document.startViewTransition || reduce()) { apply(); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const t = document.startViewTransition(apply);
    t.ready.then(() => {
      root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 650, easing: EASE_IN_OUT, pseudoElement: '::view-transition-new(root)' });
    }).catch(() => {});
  });

  /* --------------------------------------------------- trava de rolagem */
  let lockCount = 0;
  function lockScroll() {
    if (lockCount++ === 0) {
      const sw = innerWidth - root.clientWidth;
      document.body.style.paddingRight = sw ? `${sw}px` : '';
      document.body.classList.add('is-locked');
    }
  }
  function unlockScroll() {
    if (--lockCount <= 0) { lockCount = 0; document.body.classList.remove('is-locked'); document.body.style.paddingRight = ''; }
  }

  /* ------------------------------------- camadas (Esc, voltar, foco preso) */
  const layers = [];
  function pushLayer(entry) {
    entry.returnFocus = document.activeElement;
    layers.push(entry);
    try { history.pushState({ lume: layers.length }, ''); } catch { /* iframe restrito */ }
  }
  function requestClose() {
    if (!layers.length) return;
    if (history.state && history.state.lume === layers.length) history.back();
    else { const l = layers.pop(); l.close(l); }
  }
  addEventListener('popstate', e => {
    const depth = (e.state && e.state.lume) || 0;
    while (layers.length > depth) { const l = layers.pop(); l.close(l); }
  });
  function restoreFocus(entry) { const f = entry && entry.returnFocus; if (f && f.isConnected && f.focus) f.focus({ preventScroll: true }); }
  document.addEventListener('keydown', e => {
    if (!layers.length) return;
    if (e.key === 'Escape') { e.preventDefault(); requestClose(); return; }
    if (e.key === 'Tab') {
      const box = layers[layers.length - 1].el;
      const f = $$('button:not([disabled]), [href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])', box).filter(x => x.offsetParent !== null || x === box);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === box)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ------------------------------------------------------- toast */
  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-visible'), 2400);
  }

  /* ================================================================ SACOLA */
  const cart = store.get('lume-sacola', { linhas: [], modo: 'mesa', nome: '', mesa: '', endereco: '' });
  cart.linhas = (cart.linhas || []).filter(l => ITEMS.has(l.id));
  const lineKey = l => [l.id, l.opcao || '', (l.adicionais || []).slice().sort().join('+'), l.obs || ''].join('|');
  const unitPrice = l => { const it = ITEMS.get(l.id); return it.preco + (l.adicionais || []).reduce((s, n) => s + ((it.adicionais || []).find(a => a.nome === n) || { preco: 0 }).preco, 0); };
  const cartCount = () => cart.linhas.reduce((s, l) => s + l.qtd, 0);
  const cartSubtotal = () => cart.linhas.reduce((s, l) => s + unitPrice(l) * l.qtd, 0);
  const saveCart = () => store.set('lume-sacola', cart);

  function addToCart(id, { qtd = 1, opcao = '', adicionais = [], obs = '' } = {}) {
    const nova = { id, qtd, opcao, adicionais, obs: obs.trim() };
    const k = lineKey(nova);
    const ex = cart.linhas.find(l => lineKey(l) === k);
    if (ex) ex.qtd += qtd; else cart.linhas.push(nova);
    saveCart(); paintCartBadges(true);
    if (cartLayer.isOpen) renderCart();
  }

  function paintCartBadges(bump = false) {
    const n = cartCount(), total = cartSubtotal();
    $('#bagCount').textContent = n;
    $('#cartbarCount').textContent = n;
    $('#cartbarTotal').textContent = money(total);
    $('#cartbar').classList.toggle('is-visible', n > 0);
    $('#bagBtn').setAttribute('aria-label', `Abrir sacola de pedido, ${n} ${n === 1 ? 'item' : 'itens'}`);
    if (bump && !reduce()) {
      [$('#bagCount'), $('#cartbarCount')].forEach(el => el.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.32)' }, { transform: 'scale(1)' }],
        { duration: 380, easing: EASE_OUT }));
    }
  }

  function flyToBag(fromEl) {
    if (reduce() || !fromEl) return;
    const target = $('#bagBtn').getBoundingClientRect();
    const r = fromEl.getBoundingClientRect();
    if (!r.width) return;
    const src = fromEl.currentSrc || fromEl.src;
    const outer = document.createElement('div');
    outer.style.cssText = 'position:fixed;left:0;top:0;z-index:250;pointer-events:none;';
    const img = document.createElement('img');
    img.className = 'flyer'; img.src = src; img.alt = '';
    img.style.position = 'static';
    outer.appendChild(img);
    document.body.appendChild(outer);
    const x0 = r.left + r.width / 2 - 28, y0 = r.top + r.height / 2 - 28;
    const x1 = target.left + target.width - 34, y1 = target.top + target.height / 2 - 28;
    // eixo X desliza, eixo Y acelera: a soma desenha um arco
    outer.animate([{ transform: `translateX(${x0}px)` }, { transform: `translateX(${x1}px)` }], { duration: 640, easing: 'cubic-bezier(0.3, 0, 0.2, 1)', fill: 'forwards' });
    const a = img.animate([
      { transform: `translateY(${y0}px) scale(1.25)`, opacity: 0 },
      { transform: `translateY(${y0 - 30}px) scale(1.1)`, opacity: 1, offset: 0.15 },
      { transform: `translateY(${y1}px) scale(.35)`, opacity: .9 }
    ], { duration: 640, easing: 'cubic-bezier(0.55, 0, 0.75, 0.2)', fill: 'forwards' });
    a.onfinish = () => outer.remove();
  }

  function markAdded(btn) {
    if (!btn) return;
    btn.classList.add('is-added');
    clearTimeout(btn._t);
    btn._t = setTimeout(() => btn.classList.remove('is-added'), 1300);
  }

  function quickAdd(id, btn, imgEl) {
    const it = ITEMS.get(id);
    if (it.opcoes || it.adicionais) { openDetail(id, imgEl); return; }
    addToCart(id);
    markAdded(btn);
    flyToBag(imgEl);
    toast(`${it.nome} na sacola`);
  }

  /* ============================================================ HERO */
  function buildWall() {
    const wall = $('#heroWall');
    const list = shuffled(ALL, 11);
    const cols = [[], [], []];
    list.forEach((it, i) => cols[i % 3].push(it));
    const ars = ['4 / 5', '1 / 1', '3 / 4', '4 / 5', '5 / 6'];
    const durs = [64, 78, 70];
    wall.innerHTML = cols.map((col, c) => {
      const tiles = col.map((it, i) => {
        const ar = ars[(i + c) % ars.length];
        const [aw, ah] = ar.split(' / ').map(Number);
        return `<button type="button" class="wall-tile" tabindex="-1" data-id="${it.id}" style="--ar:${ar}">${imgTag(it.img, { w: 420, ratio: ah / aw, alt: '', eager: i < 3, lazy: false })}<span>${esc(it.nome)}</span></button>`;
      }).join('');
      return `<div class="wall-col" style="--dur:${durs[c]}s">${tiles}${tiles}</div>`;
    }).join('');
    markLoaded(wall);
    wall.addEventListener('click', e => {
      const t = e.target.closest('.wall-tile'); if (!t) return;
      openDetail(t.dataset.id, t.querySelector('img'));
    });
  }

  function playIntro() {
    if (reduce()) return;
    $$('.hero__title .line > span').forEach((el, i) => el.animate(
      [{ transform: 'translateY(108%)' }, { transform: 'translateY(0)' }],
      { duration: 1000, delay: 80 + i * 110, easing: EASE_OUT, fill: 'backwards' }));
    [$('.eyebrow'), $('.hero__lead'), $('.hero__cta'), $('.hero__meta')].forEach((el, i) => el.animate(
      [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
      { duration: 800, delay: 260 + i * 80, easing: EASE_OUT, fill: 'backwards' }));
    $('#heroWall').animate(
      [{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }],
      { duration: 1100, delay: 150, easing: EASE_OUT, fill: 'backwards' });
  }

  function runLoader() {
    const loader = $('#loader');
    let seen = false;
    try { seen = sessionStorage.getItem('lume-abertura') === '1'; } catch { /* sem sessão */ }
    if (reduce() || seen) { loader.classList.add('is-gone'); playIntro(); return; }
    const t0 = performance.now();
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([fonts, wait(1400)]).then(() => {
      setTimeout(() => {
        loader.classList.add('is-done');
        playIntro();
        setTimeout(() => loader.classList.add('is-gone'), 800);
        try { sessionStorage.setItem('lume-abertura', '1'); } catch { /* sem sessão */ }
      }, Math.max(0, 1000 - (performance.now() - t0)));
    });
  }

  /* ---------------------------------------- faixa infinita (reage ao scroll) */
  function buildRibbon() {
    const words = ['Brasa', 'Lenha de eucalipto', 'Sal grosso', 'Fumaça', 'Tempo', 'Panela de barro', 'Feito aqui'];
    const group = `<div class="ribbon__group">${words.map(w => `<span class="ribbon__item">${w}${FLAME}</span>`).join('')}</div>`;
    const track = $('#ribbonTrack');
    track.innerHTML = group + group + group;
    if (reduce()) return;
    let x = 0, groupW = track.firstElementChild.offsetWidth, last = performance.now(), lastY = scrollY, vel = 0, dir = 1, visible = true;
    new ResizeObserver(() => { groupW = track.firstElementChild.offsetWidth; }).observe(track.firstElementChild);
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(track);
    const frame = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const dy = scrollY - lastY; lastY = scrollY;
      if (dy) dir = dy > 0 ? 1 : -1;
      vel += (Math.min(Math.abs(dy) / Math.max(dt, 0.001), 3000) - vel) * Math.min(1, dt * 6);
      if (visible) {
        x -= dir * (46 + vel * 0.22) * dt;
        x = mod(x, groupW);
        track.style.transform = `translate3d(${-x}px,0,0)`;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* =================================================== FAVORITOS (carrossel) */
  function buildFavs() {
    const favs = ALL.filter(i => i.tags.includes('chef') || i.tags.includes('maisPedido'));
    const card = (it, hidden, i) => `
      <article class="fav${i % 3 === 1 ? ' fav--low' : ''}" role="listitem" data-id="${it.id}" ${hidden ? 'aria-hidden="true"' : ''}>
        ${imgTag(it.img, { w: 520, widths: [360, 520, 720], ratio: 4 / 3, sizes: '(max-width: 767px) 72vw, 26vw', alt: it.nome, cls: 'fav__img' })}
        <button type="button" class="fav__open" ${hidden ? 'tabindex="-1"' : ''} aria-label="Ver ${esc(it.nome)}"></button>
        <span class="fav__badge">${it.tags.includes('chef') ? 'Escolha do chef' : 'Mais pedido'}</span>
        <div class="fav__body">
          <h3 class="fav__name">${esc(it.nome)}</h3>
          <div class="fav__row">
            <span class="fav__price">${money(it.preco)}</span>
            <button type="button" class="add-btn add-btn--light fav__add" ${hidden ? 'tabindex="-1"' : ''} aria-label="Adicionar ${esc(it.nome)} à sacola">${PLUS}${CHECK}</button>
          </div>
        </div>
      </article>`;
    const track = $('#favTrack'), vp = $('#favViewport');
    track.innerHTML = favs.map((it, i) => card(it, true, i)).join('') + favs.map((it, i) => card(it, false, i)).join('') + favs.map((it, i) => card(it, true, i)).join('');
    markLoaded(track);

    const n = favs.length;
    let setW = 0, step = 0, x = 0, anim = null, drag = null, hovering = false, visible = false, dragged = false, resumeAt = 0, last = performance.now();
    const measure = () => {
      const cards = track.children;
      setW = cards[n].offsetLeft - cards[0].offsetLeft;
      step = cards[1].offsetLeft - cards[0].offsetLeft;
    };
    measure();
    new ResizeObserver(measure).observe(vp);
    const render = () => { track.style.transform = `translate3d(${mod(x, setW) - setW}px,0,0)`; };
    render();

    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(vp);
    vp.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hovering = true; });
    vp.addEventListener('pointerleave', () => { hovering = false; });

    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (visible && !drag && (!anim || anim.done) && !hovering && !reduce() && now > resumeAt) { x -= 26 * dt; render(); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    const goTo = (target, velocity = 0) => {
      const from = anim && !anim.done ? anim.value : x;
      const v = anim && !anim.done ? anim.velocity : velocity;
      anim && anim.stop();
      if (reduce()) { x = target; render(); return; }
      anim = spring({ from, to: target, velocity: velocity || v, response: 0.5, damping: 1, onUpdate: val => { x = val; render(); } });
      resumeAt = performance.now() + 3500;
    };
    const snap = v => Math.round(v / step) * step;
    $('#favPrev').addEventListener('click', () => goTo(snap((anim && !anim.done ? anim.value : x)) + step));
    $('#favNext').addEventListener('click', () => goTo(snap((anim && !anim.done ? anim.value : x)) - step));

    vp.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      if (anim) { anim.stop(); anim = null; }
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x0: x, active: false, samples: [{ t: e.timeStamp, x: e.clientX }] };
      dragged = false;
    });
    vp.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.active) {
        if (Math.abs(dx) < 8) { if (Math.abs(dy) > 10) drag = null; return; }
        drag.active = true; dragged = true;
        drag.sx = e.clientX; drag.x0 = x;
        vp.setPointerCapture(e.pointerId);
        vp.classList.add('is-dragging');
      }
      x = drag.x0 + (e.clientX - drag.sx);
      render();
      drag.samples.push({ t: e.timeStamp, x: e.clientX });
      if (drag.samples.length > 8) drag.samples.shift();
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.active) {
        const v = clamp(velocityFrom(drag.samples, 'x'), -4000, 4000);
        goTo(snap(x + project(v)), v);
      }
      drag = null;
      vp.classList.remove('is-dragging');
    };
    vp.addEventListener('pointerup', end);
    vp.addEventListener('pointercancel', end);
    // arraste não vira clique
    vp.addEventListener('click', e => { if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false; } }, true);
    vp.addEventListener('click', e => {
      const f = e.target.closest('.fav'); if (!f) return;
      const img = f.querySelector('.fav__img');
      if (e.target.closest('.fav__add')) quickAdd(f.dataset.id, e.target.closest('.fav__add'), img);
      else if (e.target.closest('.fav__open')) openDetail(f.dataset.id, img);
    });
    // teclado: o card focado sempre aparece inteiro
    track.addEventListener('focusin', e => {
      const f = e.target.closest('.fav'); if (!f) return;
      const left = f.offsetLeft + (mod(x, setW) - setW);
      const vw = vp.clientWidth;
      if (left < 16) goTo(x + (16 - left));
      else if (left + f.offsetWidth > vw - 16) goTo(x - (left + f.offsetWidth - vw + 16));
    });
  }

  /* ================================================================ MENU */
  const FILTROS = [
    { k: 'maisPedido', label: 'Mais pedidos', c: 'var(--accent)' },
    { k: 'chef', label: 'Escolha do chef', c: 'var(--gold)' },
    { k: 'veg', label: 'Vegetariano', c: 'var(--veg)' },
    { k: 'gf', label: 'Sem glúten', c: '#8C7A64' },
    { k: 'picante', label: 'Picante', c: '#D23C1E' }
  ];
  const state = { filtros: new Set(), busca: '' };

  function tagsHTML(it) {
    const out = [];
    if (it.tags.includes('vegano')) out.push('<span class="tag tag--veg">Vegano</span>');
    else if (it.tags.includes('veg')) out.push('<span class="tag tag--veg">Vegetariano</span>');
    if (it.tags.includes('gf')) out.push('<span class="tag">Sem glúten</span>');
    if (it.tags.includes('picante')) out.push('<span class="tag tag--hot">Picante</span>');
    if (it.tags.includes('serve2')) out.push('<span class="tag">Serve 2</span>');
    return out.join('');
  }
  function badgesHTML(it, skipFirst = false) {
    const b = [];
    if (it.tags.includes('chef')) b.push('<span class="badge badge--accent">Escolha do chef</span>');
    if (it.tags.includes('maisPedido')) b.push('<span class="badge">Mais pedido</span>');
    if (it.tags.includes('novo')) b.push('<span class="badge">Novidade</span>');
    return (skipFirst ? b.slice(1) : b).join('');
  }

  function cardHTML(it, feature, i) {
    const flag = it.tags.includes('chef') ? 'Escolha do chef' : it.tags.includes('maisPedido') ? 'Mais pedido' : it.tags.includes('novo') ? 'Novidade' : '';
    return `
      <article class="card${feature ? ' card--feature' : ''} reveal" data-id="${it.id}" style="--d:${feature ? 0 : (i % 2) * 70}ms">
        <button type="button" class="card__open" aria-label="Ver detalhes: ${esc(it.nome)}, ${money(it.preco)}"></button>
        <div class="card__media">
          ${feature
            ? imgTag(it.img, { w: 900, widths: [480, 720, 960, 1200], ratio: 0.8, sizes: '(max-width: 767px) 92vw, (max-width: 1023px) 90vw, 520px', alt: it.nome })
            : imgTag(it.img, { w: 600, widths: [240, 400, 600, 800], ratio: 0.75, sizes: '(max-width: 767px) 112px, (max-width: 1023px) 46vw, 400px', alt: it.nome })}
          <div class="card__badges">${badgesHTML(it, feature)}</div>
        </div>
        <div class="card__body">
          ${feature && flag ? `<span class="feature-label">${flag}</span>` : ''}
          <div class="card__top">
            <h4 class="card__name">${esc(it.nome)}</h4>
            <span class="price"><small>R$</small> ${num(it.preco)}</span>
          </div>
          <p class="card__desc">${esc(it.desc)}</p>
          <div class="card__foot">
            <div class="tags"><span class="price price-m">${money(it.preco)}</span>${tagsHTML(it)}</div>
            <button type="button" class="add-btn" aria-label="Adicionar ${esc(it.nome)} à sacola">${PLUS}${CHECK}</button>
          </div>
        </div>
      </article>`;
  }

  function buildMenu() {
    $('#filters').innerHTML = FILTROS.map(f => `<button type="button" class="chip" aria-pressed="false" data-f="${f.k}" style="--c:${f.c}"><i></i>${f.label}</button>`).join('');
    $('#menuSections').innerHTML = CATS.map((cat, ci) => {
      const feat = cat.itens.find(i => i.tags.includes('chef')) || cat.itens[0];
      const ordered = [feat, ...cat.itens.filter(i => i !== feat)];
      return `
        <section class="cat" id="cat-${cat.id}" data-cat="${cat.id}" aria-labelledby="t-${cat.id}">
          <header class="cat__head reveal">
            <span class="cat__num" aria-hidden="true">${String(ci + 1).padStart(2, '0')}</span>
            <h3 class="cat__title" id="t-${cat.id}">${esc(cat.nome)}</h3>
            <p class="cat__desc">${esc(cat.desc)}</p>
            <span class="cat__count" data-count>${cat.itens.length} pratos</span>
          </header>
          <div class="cat__grid">${ordered.map((it, i) => cardHTML(it, i === 0, i)).join('')}</div>
        </section>`;
    }).join('');
    const tabs = CATS.map(cat => `<li><button type="button" class="tab" data-cat="${cat.id}">${esc(cat.curto)} <sup>${cat.itens.length}</sup></button></li>`).join('');
    $('#tabsList').innerHTML = tabs;
    $('#tabsActive').innerHTML = tabs;
    markLoaded($('#menuSections'));

    // revelação uma única vez
    const io = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(el => io.observe(el));

    $('#menuSections').addEventListener('click', e => {
      const card = e.target.closest('.card'); if (!card) return;
      const img = card.querySelector('.card__media img');
      const add = e.target.closest('.add-btn');
      if (add) quickAdd(card.dataset.id, add, img);
      else if (e.target.closest('.card__open')) openDetail(card.dataset.id, img);
    });

    $('#filters').addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      const k = b.dataset.f;
      if (state.filtros.has(k)) state.filtros.delete(k); else state.filtros.add(k);
      b.setAttribute('aria-pressed', state.filtros.has(k));
      applyFilters();
    });

    const search = $('#search'), label = search.closest('.search');
    let deb = 0;
    search.addEventListener('input', () => {
      label.classList.toggle('has-value', !!search.value);
      clearTimeout(deb);
      deb = setTimeout(() => { state.busca = search.value; applyFilters(); }, 120);
    });
    search.addEventListener('focus', () => label.classList.add('is-open'));
    search.addEventListener('blur', () => { if (!search.value) label.classList.remove('is-open'); });
    $('#searchClear').addEventListener('click', () => { search.value = ''; label.classList.remove('has-value'); state.busca = ''; applyFilters(); search.focus(); });
    $('#emptyReset').addEventListener('click', () => {
      search.value = ''; label.classList.remove('has-value', 'is-open'); state.busca = '';
      state.filtros.clear(); $$('.chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
      applyFilters();
    });
  }

  function applyFilters() {
    const q = norm(state.busca.trim());
    let total = 0;
    CATS.forEach(cat => {
      let count = 0;
      cat.itens.forEach(it => {
        const okF = [...state.filtros].every(f => f === 'veg' ? (it.tags.includes('veg') || it.tags.includes('vegano')) : it.tags.includes(f));
        const okQ = !q || norm(`${it.nome} ${it.desc} ${cat.nome}`).includes(q);
        const show = okF && okQ;
        const el = $(`.card[data-id="${it.id}"]`);
        el.hidden = !show;
        if (show) { count++; el.classList.add('is-in'); }
      });
      const sec = $(`#cat-${cat.id}`);
      sec.hidden = count === 0;
      sec.querySelector('[data-count]').textContent = `${count} ${count === 1 ? 'prato' : 'pratos'}`;
      $$(`.tab[data-cat="${cat.id}"] sup`).forEach(s => { s.textContent = count; });
      $$(`.tab[data-cat="${cat.id}"]`).forEach(t => { t.style.opacity = count ? '' : '.4'; });
      total += count;
    });
    $('#empty').hidden = total > 0;
    // se a lista encolheu e o leitor está lá embaixo, volta pro começo do cardápio
    const top = $('#menuSections').getBoundingClientRect().top + scrollY - offsetTop();
    if (scrollY > top) window.scrollTo({ top, behavior: 'instant' });
    spy();
  }

  /* -------------------------------------- abas com indicador por clip-path */
  const offsetTop = () => $('#topbar').offsetHeight + $('#menubar').offsetHeight;
  let activeCat = null, spyLockUntil = 0;
  function setActiveTab(id, scrollTabs = true) {
    if (id === activeCat) return;
    activeCat = id;
    const list = $('#tabsList');
    const btn = list.querySelector(`.tab[data-cat="${id}"]`);
    if (!btn) return;
    const W = list.offsetWidth, H = list.offsetHeight;
    const top = (H - btn.offsetHeight) / 2;
    const left = btn.offsetLeft, right = W - (btn.offsetLeft + btn.offsetWidth);
    $('#tabsActive').style.clipPath = `inset(${top}px ${right}px ${top}px ${left}px round 999px)`;
    $$('.tab', list).forEach(t => t.setAttribute('aria-current', t === btn ? 'true' : 'false'));
    if (scrollTabs) {
      const sc = $('#tabsScroller');
      const target = btn.offsetLeft - sc.clientWidth / 2 + btn.offsetWidth / 2;
      sc.scrollTo({ left: Math.max(0, target), behavior: reduce() ? 'auto' : 'smooth' });
    }
  }
  function spy() {
    if (performance.now() < spyLockUntil) return;
    const line = offsetTop() + 80;
    let cur = null;
    $$('.cat:not([hidden])').forEach(sec => { if (sec.getBoundingClientRect().top <= line) cur = sec.dataset.cat; });
    if (!cur) { const first = $('.cat:not([hidden])'); cur = first && first.dataset.cat; }
    if (cur) setActiveTab(cur);
  }
  function bindTabs() {
    $('#tabsList').addEventListener('click', e => {
      const b = e.target.closest('.tab'); if (!b) return;
      const sec = $(`#cat-${b.dataset.cat}`);
      if (!sec || sec.hidden) return;
      setActiveTab(b.dataset.cat);
      spyLockUntil = performance.now() + 1000;
      const top = sec.getBoundingClientRect().top + scrollY - offsetTop() + 1;
      window.scrollTo({ top, behavior: reduce() ? 'auto' : 'smooth' });
    });
    addEventListener('resize', () => { const a = activeCat; activeCat = null; setActiveTab(a || CATS[0].id, false); });
    if (document.fonts) document.fonts.ready.then(() => { const a = activeCat; activeCat = null; setActiveTab(a || CATS[0].id, false); });
  }

  /* --------------------------------------------- rolagem: topo, spy, parallax */
  function bindScroll() {
    const topbar = $('#topbar');
    const house = $('.house__photo'), houseImg = house.querySelector('img');
    let ticking = false;
    const onScroll = () => {
      ticking = false;
      topbar.classList.toggle('is-scrolled', scrollY > 8);
      spy();
      if (!reduce()) {
        const r = house.getBoundingClientRect();
        if (r.bottom > 0 && r.top < innerHeight) {
          const p = clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1);
          houseImg.style.transform = `translate3d(0, ${-p * 13}%, 0)`;
        }
      }
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
  }

  /* ========================================= folha (sheet) arrastável — celular */
  function createSheet(panel, layer, { scroller }) {
    const scrim = layer.querySelector('.scrim');
    let y = 0, h = 1, anim = null, drag = null;
    const set = v => { y = v; panel.style.transform = `translateY(${v}px)`; scrim.style.opacity = String(clamp(1 - v / h, 0, 1)); };
    const api = {
      open() {
        h = panel.offsetHeight || innerHeight;
        scrim.style.transition = 'none';
        anim && anim.stop();
        if (reduce()) { set(0); panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease' }); return; }
        set(h);
        anim = spring({ from: h, to: 0, response: 0.45, damping: 1, onUpdate: set });
      },
      close(done, velocity = 0) {
        h = panel.offsetHeight || innerHeight;
        anim && anim.stop();
        if (reduce()) { panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease' }).onfinish = done; return; }
        anim = spring({ from: y, to: h + 20, velocity, response: 0.34, damping: 1, onUpdate: set, onComplete: done });
      },
      reset() { anim && anim.stop(); panel.style.transform = ''; scrim.style.opacity = ''; scrim.style.transition = ''; y = 0; }
    };

    const start = (cy, cx, t, id, inScroller) => {
      drag = { id, sy: cy, sx: cx, y0: y, active: false, inScroller, samples: [{ t, y: cy }] };
    };
    const move = (cy, cx, t) => {
      if (!drag) return false;
      const dy = cy - drag.sy, dx = cx - drag.sx;
      if (!drag.active) {
        if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return false;
        if (Math.abs(dx) > Math.abs(dy) || (drag.inScroller && dy < 0)) { drag = null; return false; }
        drag.active = true; anim && anim.stop(); drag.y0 = y; drag.sy = cy; h = panel.offsetHeight;
      }
      let ny = drag.y0 + (cy - drag.sy);
      if (ny < 0) ny = -rubber(-ny, h);
      set(ny);
      drag.samples.push({ t, y: cy });
      if (drag.samples.length > 8) drag.samples.shift();
      return true;
    };
    const end = () => {
      if (!drag) return;
      if (drag.active) {
        const v = velocityFrom(drag.samples, 'y');
        if (y > h * 0.3 || v > 650) { layer._velocity = Math.max(v, 0); requestClose(); }
        else { anim = spring({ from: y, to: 0, velocity: v, response: 0.38, damping: 0.86, onUpdate: set }); }
      }
      drag = null;
    };

    panel.addEventListener('pointerdown', e => {
      if (!isMobile() || e.pointerType === 'touch' && scroller && scroller.contains(e.target)) return; // toque na área rolável vai pelos eventos de toque
      if (e.button !== 0 || e.target.closest('button, input, textarea, label, a, select')) return;
      start(e.clientY, e.clientX, e.timeStamp, e.pointerId, scroller && scroller.contains(e.target) && scroller.scrollTop > 0);
      if (drag && drag.inScroller) drag = null;
    });
    panel.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId) return;
      const wasActive = drag.active;
      if (move(e.clientY, e.clientX, e.timeStamp) && !wasActive) { try { panel.setPointerCapture(e.pointerId); } catch { /* ok */ } }
    });
    panel.addEventListener('pointerup', e => { if (drag && drag.id === e.pointerId) end(); });
    panel.addEventListener('pointercancel', e => { if (drag && drag.id === e.pointerId) end(); });

    // dentro da área rolável: no topo, puxar para baixo arrasta a folha em vez de rolar
    if (scroller) {
      scroller.addEventListener('touchstart', e => {
        if (!isMobile() || e.touches.length > 1 || e.target.closest('input, textarea, button, label, select')) return;
        const t = e.touches[0];
        if (scroller.scrollTop <= 0) start(t.clientY, t.clientX, e.timeStamp, 'touch', true);
      }, { passive: true });
      scroller.addEventListener('touchmove', e => {
        if (!drag || drag.id !== 'touch') return;
        const t = e.touches[0];
        // puxando para baixo no topo: a folha desce, a página não rola
        if ((t.clientY - drag.sy > 0 || drag.active) && scroller.scrollTop <= 0 && e.cancelable) e.preventDefault();
        move(t.clientY, t.clientX, e.timeStamp);
      }, { passive: false });
      scroller.addEventListener('touchend', () => { if (drag && drag.id === 'touch') end(); });
      scroller.addEventListener('touchcancel', () => { if (drag && drag.id === 'touch') end(); });
    }
    return api;
  }

  /* ================================================== DETALHE DO PRATO */
  const detailLayer = $('#detailLayer'), detail = $('#detail'), detailImg = $('#detailImg'), detailBody = $('#detailBody');
  const detailSheet = createSheet(detail, detailLayer, { scroller: detailBody });
  let detailState = null;

  function detailHTML(it) {
    const o = it.opcoes;
    return `
      <div class="detail__content">
        <span class="detail__cat">${esc(it.cat.nome)}</span>
        <h2 class="detail__name" id="detailName">${esc(it.nome)}</h2>
        ${tagsHTML(it) || badgesHTML(it) ? `<div class="tags">${it.tags.includes('chef') ? '<span class="tag tag--hot">Escolha do chef</span>' : ''}${it.tags.includes('maisPedido') ? '<span class="tag">Mais pedido</span>' : ''}${tagsHTML(it)}</div>` : ''}
        <p class="detail__desc">${esc(it.desc)}</p>
        <p class="detail__price">${money(it.preco)}</p>
        ${o ? `<fieldset class="opt"><legend>${esc(o.titulo)}</legend><div class="opt__list">${o.escolhas.map((c, i) => `<label class="radio"><input type="radio" name="opcao" value="${esc(c)}" ${i === (o.padrao || 0) ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}</div></fieldset>` : ''}
        ${it.adicionais ? `<fieldset class="opt"><legend>Adicionais</legend>${it.adicionais.map(a => `<label class="check"><input type="checkbox" name="adic" value="${esc(a.nome)}"><span class="check__name">${esc(a.nome)}</span><span class="check__price">+ ${money(a.preco)}</span></label>`).join('')}</fieldset>` : ''}
        ${pairHTML(it)}
        <label class="note"><span>Alguma observação?</span><textarea name="obs" rows="2" maxlength="140" placeholder="Ex.: sem cebola, molho à parte"></textarea></label>
      </div>
      <div class="detail__foot">
        <div class="stepper" role="group" aria-label="Quantidade">
          <button type="button" data-step="-1" aria-label="Diminuir quantidade" disabled>${MINUS}</button>
          <output aria-live="polite">1</output>
          <button type="button" data-step="1" aria-label="Aumentar quantidade">${PLUS.replace('class="i-plus" ', '')}</button>
        </div>
        <button type="button" class="btn btn--accent" data-add><span>Adicionar</span><span data-total>${money(it.preco)}</span></button>
      </div>`;
  }

  const PAR = { entradas: ['brasa', 'bar', 'panelas'], brasa: ['bar', 'doces', 'entradas'], panelas: ['bar', 'doces', 'entradas'], doces: ['bar', 'doces', 'bar'], bar: ['entradas', 'doces', 'brasa'] };
  function sugestoes(it) {
    const h = [...it.id].reduce((a, c) => a + c.charCodeAt(0), 0);
    const out = [];
    (PAR[it.cat.id] || ['bar', 'doces', 'entradas']).forEach((cid, k) => {
      const cat = CATS.find(c => c.id === cid);
      const pool = cat.itens.filter(i => i !== it && !out.includes(i));
      if (pool.length) out.push(pool[(h + k * 7) % pool.length]);
    });
    return out;
  }
  function pairHTML(it) {
    return `<div class="pair"><span class="pair__title">Combina com</span><div class="pair__list">${sugestoes(it).map(s => `
      <button type="button" class="pair__item" data-swap="${s.id}" aria-label="Ver ${esc(s.nome)}, ${money(s.preco)}">
        <img src="${imgUrl(s.img, 160, 1)}" alt="" loading="lazy" decoding="async">
        <span><b>${esc(s.nome)}</b><small>${money(s.preco)}</small></span>
      </button>`).join('')}</div></div>`;
  }
  function swapDetail(id) {
    const it = ITEMS.get(id);
    if (!it || !detailState) return;
    const run = () => {
      detailState = { id, qtd: 1, origin: null, at: 0 };
      detailBody.innerHTML = detailHTML(it);
      detailBody.scrollTop = 0;
      detailImg.alt = it.nome;
      detailImg.src = imgUrl(it.img, isMobile() ? 900 : 1200, isMobile() ? 0.75 : 1.2);
    };
    if (reduce()) { run(); return; }
    const out = { opacity: [1, 0], filter: ['blur(0px)', 'blur(4px)'] };
    Promise.all([detailBody.animate(out, { duration: 140, easing: 'ease', fill: 'forwards' }).finished, detailImg.animate(out, { duration: 140, easing: 'ease', fill: 'forwards' }).finished]).then(() => {
      run();
      const inn = { opacity: [0, 1], filter: ['blur(4px)', 'blur(0px)'] };
      detailBody.getAnimations().forEach(a => a.cancel());
      detailImg.getAnimations().forEach(a => a.cancel());
      detailBody.animate(inn, { duration: 260, easing: 'ease' });
      detailImg.animate({ ...inn, transform: ['scale(1.04)', 'scale(1)'] }, { duration: 420, easing: EASE_OUT });
    });
  }

  function readDetail() {
    const it = ITEMS.get(detailState.id);
    const opcao = (detailBody.querySelector('input[name="opcao"]:checked') || {}).value || '';
    const adicionais = $$('input[name="adic"]:checked', detailBody).map(i => i.value);
    const obs = (detailBody.querySelector('textarea') || {}).value || '';
    const linha = { id: it.id, opcao, adicionais };
    return { ...linha, obs, qtd: detailState.qtd, total: unitPrice(linha) * detailState.qtd };
  }
  function paintDetailTotal() {
    const d = readDetail();
    detailBody.querySelector('[data-total]').textContent = money(d.total);
    detailBody.querySelector('output').textContent = d.qtd;
    detailBody.querySelector('[data-step="-1"]').disabled = d.qtd <= 1;
  }

  function openDetail(id, originImg) {
    const it = ITEMS.get(id);
    if (!it || detailState) return;
    detailState = { id, qtd: 1, origin: originImg, at: performance.now() };
    detailBody.innerHTML = detailHTML(it);
    detailBody.scrollTop = 0;
    detailImg.alt = it.nome;
    // começa com a imagem que já está em cache e troca pela de alta resolução quando chegar
    const quick = originImg && (originImg.currentSrc || originImg.src);
    const hi = imgUrl(it.img, isMobile() ? 900 : 1200, isMobile() ? 0.75 : 1.2);
    detailImg.src = quick || hi;
    if (quick !== hi) { const pre = new Image(); pre.onload = () => { if (detailState && detailState.id === id) detailImg.src = hi; }; pre.src = hi; }

    detailLayer.hidden = false;
    lockScroll();
    pushLayer({ el: detail, close: closeDetailNow });

    if (isMobile()) {
      detailLayer.classList.add('is-open');
      detailSheet.open();
    } else if (originImg && !reduce() && originImg.getBoundingClientRect().width > 0) {
      flipOpen(originImg);
    } else {
      detail.offsetWidth; // aplica o estado inicial antes da transição
      detailLayer.classList.add('is-open');
    }
    requestAnimationFrame(() => detail.focus({ preventScroll: true }));
  }

  function makeClone(fromRect, src, radius) {
    const c = document.createElement('div');
    c.style.cssText = `position:fixed;z-index:150;overflow:hidden;pointer-events:none;left:${fromRect.left}px;top:${fromRect.top}px;width:${fromRect.width}px;height:${fromRect.height}px;border-radius:${radius};background:var(--img-bg)`;
    const im = document.createElement('img');
    im.src = src; im.alt = '';
    im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
    c.appendChild(im);
    document.body.appendChild(c);
    return c;
  }
  function radiusOf(el) {
    for (let n = el, i = 0; n && i < 4; n = n.parentElement, i++) { const cs = getComputedStyle(n); if (cs.borderTopLeftRadius !== '0px' || cs.borderBottomRightRadius !== '0px') return cs.borderRadius; }
    return '18px';
  }
  const rectKF = (r, rad) => ({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: rad });

  function flipOpen(originImg) {
    detailLayer.classList.add('is-flip', 'is-open');
    const media = detail.querySelector('.detail__media');
    const to = media.getBoundingClientRect();
    const from = originImg.getBoundingClientRect();
    const fromRad = radiusOf(originImg);
    const clone = makeClone(from, originImg.currentSrc || originImg.src, fromRad);
    detailImg.style.opacity = '0';
    originImg.style.visibility = 'hidden';
    const dur = 520;
    clone.animate([rectKF(from, fromRad), rectKF(to, '26px 0 0 26px')], { duration: dur, easing: EASE_DRAWER, fill: 'forwards' })
      .onfinish = () => { detailImg.style.opacity = ''; clone.remove(); originImg.style.visibility = ''; };
    detail.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease' });
    detailBody.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: 120, easing: EASE_OUT, fill: 'backwards' });
  }

  function closeDetailNow(entry) {
    if (!detailState) return;
    const st = detailState;
    detailState = null;
    const finish = () => {
      detailLayer.hidden = true;
      detailLayer.classList.remove('is-open', 'is-flip');
      detailSheet.reset();
      detailImg.style.opacity = '';
      unlockScroll();
    };
    restoreFocus(entry);
    if (isMobile()) {
      detailLayer.classList.remove('is-open');
      const v = detailLayer._velocity || 0; detailLayer._velocity = 0;
      detailSheet.close(finish, v);
      return;
    }
    const o = st.origin;
    const r = o && o.isConnected ? o.getBoundingClientRect() : null;
    const onScreen = r && r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    if (onScreen && !reduce()) {
      const media = detail.querySelector('.detail__media');
      const from = media.getBoundingClientRect();
      const toRad = radiusOf(o);
      const clone = makeClone(from, detailImg.currentSrc || detailImg.src, '26px 0 0 26px');
      detailImg.style.opacity = '0';
      o.style.visibility = 'hidden';
      detailLayer.classList.remove('is-open');
      detail.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease', fill: 'forwards' });
      clone.animate([rectKF(from, '26px 0 0 26px'), rectKF(r, toRad)], { duration: 420, easing: EASE_DRAWER, fill: 'forwards' })
        .onfinish = () => { o.style.visibility = ''; clone.remove(); detail.getAnimations().forEach(a => a.cancel()); finish(); };
    } else {
      detailLayer.classList.remove('is-flip');
      detailLayer.classList.remove('is-open');
      setTimeout(finish, 260);
    }
  }

  detailLayer.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) { requestClose(); return; }
    const sw = e.target.closest('[data-swap]');
    if (sw && detailState) { swapDetail(sw.dataset.swap); return; }
    const step = e.target.closest('[data-step]');
    if (step && detailState) { detailState.qtd = clamp(detailState.qtd + Number(step.dataset.step), 1, 20); paintDetailTotal(); return; }
    if (e.target.closest('[data-add]') && detailState && performance.now() - detailState.at > 400) {
      const d = readDetail();
      const it = ITEMS.get(d.id);
      addToCart(d.id, d);
      const imgForFly = detailImg;
      flyToBag(imgForFly);
      toast(`${d.qtd > 1 ? d.qtd + '× ' : ''}${it.nome} na sacola`);
      requestClose();
    }
  });
  detailLayer.addEventListener('change', () => { if (detailState) paintDetailTotal(); });

  /* ========================================================= SACOLA (UI) */
  const cartLayer = $('#cartLayer'), cartEl = $('#cart'), cartBody = $('#cartBody'), cartFoot = $('#cartFoot');
  const cartSheet = createSheet(cartEl, cartLayer, { scroller: cartBody });
  cartLayer.isOpen = false;

  function renderCart() {
    const n = cartCount();
    if (!n) {
      cartBody.innerHTML = `
        <div class="cart-empty">
          <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 22h36l-3 32a3 3 0 0 1-3 2.7H20a3 3 0 0 1-3-2.7z"/><path d="M24 22v-3a8 8 0 0 1 16 0v3"/></svg>
          <strong>Sua sacola está vazia</strong>
          <p>Toque no + de qualquer prato para começar o pedido.</p>
        </div>`;
      cartFoot.innerHTML = '<button type="button" class="btn btn--primary btn--block" data-close>Ver cardápio</button>';
      return;
    }
    cartBody.innerHTML = cart.linhas.map((l, i) => {
      const it = ITEMS.get(l.id);
      const extra = [l.opcao, ...(l.adicionais || []).map(a => `+ ${a}`), l.obs ? `“${l.obs}”` : ''].filter(Boolean).map(esc).join(' · ');
      return `
        <div class="cart-line" data-i="${i}">
          <img class="cart-line__img" src="${imgUrl(it.img, 160, 1)}" alt="" loading="lazy">
          <div>
            <div class="cart-line__top"><span class="cart-line__name">${esc(it.nome)}</span><span class="price">${money(unitPrice(l) * l.qtd)}</span></div>
            ${extra ? `<p class="cart-line__extra">${extra}</p>` : ''}
            <div class="cart-line__row">
              <div class="stepper stepper--sm" role="group" aria-label="Quantidade de ${esc(it.nome)}">
                <button type="button" data-q="-1" aria-label="Diminuir">${MINUS}</button>
                <output>${l.qtd}</output>
                <button type="button" data-q="1" aria-label="Aumentar">${PLUS.replace('class="i-plus" ', '')}</button>
              </div>
              <button type="button" class="cart-line__remove" data-remove>Remover</button>
            </div>
          </div>
        </div>`;
    }).join('');
    const sub = cartSubtotal();
    const serv = cart.modo === 'mesa' ? sub * 0.1 : 0;
    const campo = cart.modo === 'mesa'
      ? `<label class="field"><span>Mesa</span><input name="mesa" inputmode="numeric" maxlength="4" value="${esc(cart.mesa)}" placeholder="Ex.: 12"></label>`
      : cart.modo === 'entrega'
        ? `<label class="field"><span>Endereço de entrega</span><input name="endereco" value="${esc(cart.endereco)}" placeholder="Rua, número e bairro"></label>`
        : '';
    cartFoot.innerHTML = `
      <div class="seg" role="radiogroup" aria-label="Como você vai receber">
        ${[['mesa', 'Na mesa'], ['retirar', 'Retirar'], ['entrega', 'Entrega']].map(([v, t]) => `<label><input type="radio" name="modo" value="${v}" ${cart.modo === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}
      </div>
      <div class="cart__fields${cart.modo === 'mesa' ? ' cart__fields--duo' : ''}">
        <label class="field"><span>Seu nome</span><input name="nome" value="${esc(cart.nome)}" placeholder="Como te chamamos?" autocomplete="given-name"></label>
        ${campo}
      </div>
      <div class="totals">
        <div><span>Subtotal</span><span>${money(sub)}</span></div>
        ${cart.modo === 'mesa' ? `<div><span>Serviço (10%)</span><span>${money(serv)}</span></div>` : ''}
        ${cart.modo === 'entrega' ? '<div><span>Entrega</span><span>a combinar</span></div>' : ''}
        <div><span>Total</span><span>${money(sub + serv)}</span></div>
      </div>
      <a class="btn btn--wa btn--block" data-send href="${esc(waLink(mensagemPedido()))}" target="_blank" rel="noopener">${WA} Enviar pedido no WhatsApp</a>`;
  }

  function openCart() {
    if (cartLayer.isOpen) return;
    $('#toast').classList.remove('is-visible');
    renderCart();
    cartLayer.isOpen = true;
    cartLayer.openedAt = performance.now();
    cartLayer.hidden = false;
    lockScroll();
    pushLayer({ el: cartEl, close: closeCartNow });
    if (isMobile()) { cartLayer.classList.add('is-open'); cartSheet.open(); }
    else { cartEl.offsetWidth; cartLayer.classList.add('is-open'); }
    requestAnimationFrame(() => cartEl.focus({ preventScroll: true }));
  }
  function closeCartNow(entry) {
    if (!cartLayer.isOpen) return;
    cartLayer.isOpen = false;
    const finish = () => { cartLayer.hidden = true; cartSheet.reset(); unlockScroll(); };
    cartLayer.classList.remove('is-open');
    if (isMobile()) { const v = cartLayer._velocity || 0; cartLayer._velocity = 0; cartSheet.close(finish, v); }
    else setTimeout(finish, reduce() ? 200 : 460);
    restoreFocus(entry);
  }

  function mensagemPedido() {
    const linhas = cart.linhas.map(l => {
      const it = ITEMS.get(l.id);
      const det = [l.opcao, ...(l.adicionais || []).map(a => `+ ${a}`), l.obs ? `Obs: ${l.obs}` : ''].filter(Boolean);
      return `${l.qtd}x ${it.nome} — ${money(unitPrice(l) * l.qtd)}${det.length ? '\n   ' + det.join('\n   ') : ''}`;
    });
    const sub = cartSubtotal(), serv = cart.modo === 'mesa' ? sub * 0.1 : 0;
    const quem = cart.nome ? `Nome: ${cart.nome}` : '';
    const onde = cart.modo === 'mesa' ? `Na mesa${cart.mesa ? ' ' + cart.mesa : ''}` : cart.modo === 'retirar' ? 'Vou retirar no balcão' : `Entrega: ${cart.endereco || '(endereço a informar)'}`;
    return [
      `*Pedido · ${L.nome}*`, '',
      ...linhas, '',
      `Subtotal: ${money(sub)}`,
      serv ? `Serviço (10%): ${money(serv)}` : '',
      `*Total: ${money(sub + serv)}*`, '',
      onde, quem
    ].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n').trim();
  }

  cartLayer.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) { requestClose(); return; }
    const line = e.target.closest('.cart-line');
    if (line) {
      const i = +line.dataset.i;
      const q = e.target.closest('[data-q]');
      if (q) {
        cart.linhas[i].qtd += Number(q.dataset.q);
        if (cart.linhas[i].qtd <= 0) cart.linhas.splice(i, 1);
        saveCart(); paintCartBadges(); renderCart(); return;
      }
      if (e.target.closest('[data-remove]')) { cart.linhas.splice(i, 1); saveCart(); paintCartBadges(); renderCart(); return; }
    }
    const send = e.target.closest('[data-send]');
    if (send) {
      if (performance.now() - cartLayer.openedAt < 500) { e.preventDefault(); return; } // ignora toque fantasma logo após abrir
      if (cart.modo === 'entrega' && !cart.endereco.trim()) { e.preventDefault(); const inp = cartFoot.querySelector('input[name="endereco"]'); inp && inp.focus(); toast('Informe o endereço de entrega'); return; }
      send.href = waLink(mensagemPedido());
    }
  });
  cartLayer.addEventListener('input', e => {
    const n = e.target.name;
    if (['nome', 'mesa', 'endereco'].includes(n)) {
      cart[n] = e.target.value; saveCart();
      const a = cartFoot.querySelector('[data-send]'); if (a) a.href = waLink(mensagemPedido());
    }
  });
  cartLayer.addEventListener('change', e => {
    if (e.target.name === 'modo') { cart.modo = e.target.value; saveCart(); renderCart(); const r = cartFoot.querySelector(`input[name="modo"][value="${cart.modo}"]`); r && r.focus(); }
  });
  $('#bagBtn').addEventListener('click', openCart);
  $('#cartbar').addEventListener('click', openCart);

  /* ===================================================== GALERIA INFINITA */
  const ex = {
    el: $('#explore'), world: $('#exploreWorld'), cursor: $('#exploreCursor'),
    tiles: [], key: '', raf: 0, last: 0, open: false,
    camX: 0, camY: 0, vx: 0, vy: 0, drag: null, lastInteract: 0,
    colW: 0, gap: 0, totalW: 0, maxH: 0, focus: null,
    px: -200, py: -200, cx: -200, cy: -200
  };

  function exBuild() {
    const vw = innerWidth, vh = innerHeight;
    const mobile = vw < 768;
    const colW = Math.round(mobile ? clamp(vw * 0.42, 140, 190) : clamp(vw / 5.4, 220, 310));
    const gap = mobile ? 12 : 22;
    const cols = Math.ceil(vw / (colW + gap)) + 2;
    const ratios = [1.25, 1, 1.42, 1.12, 0.9, 1.32];
    const base = shuffled(ALL, 23);
    const perCol = Math.ceil((vh + colW * 1.42 * 2) / (colW * 1.17 + gap)) + 1;
    let list = [];
    while (list.length < cols * perCol) list = list.concat(base);
    const seen = new Set();
    const colsY = new Array(cols).fill(0).map((_, c) => (c % 2 ? colW * 0.5 : 0));
    const tiles = [];
    let html = '';
    list.forEach((it, i) => {
      const c = i % cols, row = Math.floor(i / cols);
      const ratio = ratios[(row * 2 + c) % ratios.length];
      const h = Math.round(colW * ratio);
      const first = !seen.has(it.id); seen.add(it.id);
      tiles.push({ id: it.id, c, x0: c * (colW + gap), y0: colsY[c], h, par: 1 + ((c % 3) - 1) * 0.07 });
      colsY[c] += h + gap;
      html += `<button type="button" class="ex-tile" data-id="${it.id}" style="width:${colW}px;height:${h}px" ${first ? `aria-label="${esc(it.nome)}, ${money(it.preco)}"` : 'tabindex="-1" aria-hidden="true"'}>${imgTag(it.img, { w: mobile ? 360 : 520, ratio, alt: '' })}<figcaption><b>${esc(it.nome)}</b><span>${money(it.preco)}</span></figcaption></button>`;
    });
    ex.world.innerHTML = html;
    const els = ex.world.children;
    tiles.forEach((t, i) => { t.el = els[i]; t.colH = colsY[t.c]; });
    Object.assign(ex, { tiles, colW, gap, totalW: cols * (colW + gap), maxH: Math.round(colW * 1.42), key: `${vw}x${vh}` });
    markLoaded(ex.world);
  }

  function exRender() {
    const vw = innerWidth, vh = innerHeight, step = ex.colW + ex.gap;
    for (const t of ex.tiles) {
      const x = mod(t.x0 + ex.camX, ex.totalW) - step;
      const y = mod(t.y0 + ex.camY * t.par, t.colH) - ex.maxH - ex.gap;
      t.sx = x; t.sy = y;
      const dx = (x + ex.colW / 2 - vw / 2) / vw, dy = (y + t.h / 2 - vh / 2) / vh;
      const s = reduce() ? 1 : 1 - Math.min(1, Math.hypot(dx, dy) * 1.1) * 0.16;
      t.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${s.toFixed(3)})`;
    }
  }

  function exFrame(now) {
    const dt = Math.min(0.05, (now - ex.last) / 1000); ex.last = now;
    if (detailState) { ex.raf = requestAnimationFrame(exFrame); return; } // parado enquanto o prato está aberto
    if (!ex.drag) {
      if (ex.focus) {
        ex.camX += (ex.focus.x - ex.camX) * Math.min(1, dt * 7);
        ex.camY += (ex.focus.y - ex.camY) * Math.min(1, dt * 7);
        if (Math.abs(ex.focus.x - ex.camX) < 0.5 && Math.abs(ex.focus.y - ex.camY) < 0.5) ex.focus = null;
      } else if (!reduce()) {
        if (now - ex.lastInteract > 1800) { // à deriva, bem devagar, quando ninguém mexe
          ex.vx += (-20 - ex.vx) * Math.min(1, dt * 0.9);
          ex.vy += (-13 - ex.vy) * Math.min(1, dt * 0.9);
        } else { const f = Math.exp(-dt * 3.4); ex.vx *= f; ex.vy *= f; }
        ex.camX += ex.vx * dt; ex.camY += ex.vy * dt;
      }
    }
    exRender();
    ex.cx += (ex.px - ex.cx) * Math.min(1, dt * 20);
    ex.cy += (ex.py - ex.cy) * Math.min(1, dt * 20);
    ex.cursor.style.transform = `translate3d(${ex.cx}px,${ex.cy}px,0)`;
    ex.raf = requestAnimationFrame(exFrame);
  }

  function exOpen() {
    if (ex.open) return;
    if (ex.key !== `${innerWidth}x${innerHeight}`) exBuild();
    ex.open = true;
    ex.el.hidden = false;
    lockScroll();
    pushLayer({ el: ex.el, close: exCloseNow });
    ex.lastInteract = performance.now();
    ex.last = performance.now();
    exRender();
    ex.el.offsetWidth;
    ex.el.classList.add('is-open');
    if (!reduce()) {
      const vw = innerWidth, vh = innerHeight;
      ex.tiles.forEach(t => {
        if (t.sx > vw || t.sx + ex.colW < 0 || t.sy > vh || t.sy + t.h < 0) return;
        const d = Math.hypot(t.sx + ex.colW / 2 - vw / 2, t.sy + t.h / 2 - vh / 2) / Math.hypot(vw / 2, vh / 2);
        t.el.firstElementChild.animate([{ opacity: 0, transform: 'scale(1.18)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 900, delay: 80 + d * 380, easing: EASE_OUT, fill: 'backwards' });
      });
    }
    ex.raf = requestAnimationFrame(exFrame);
    requestAnimationFrame(() => $('#exploreClose').focus({ preventScroll: true }));
  }
  function exCloseNow(entry) {
    if (!ex.open) return;
    restoreFocus(entry);
    ex.open = false;
    ex.el.classList.remove('is-open');
    ex.cursor.classList.remove('is-visible');
    setTimeout(() => { ex.el.hidden = true; cancelAnimationFrame(ex.raf); unlockScroll(); }, 300);
  }

  function exBind() {
    $$('[data-open-explore]').forEach(b => b.addEventListener('click', exOpen));
    $('#exploreClose').addEventListener('click', requestClose);
    const el = ex.el;
    el.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('.explore__ui')) return;
      ex.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, samples: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }] };
      ex.vx = ex.vy = 0; ex.focus = null;
      ex.lastInteract = performance.now();
      try { el.setPointerCapture(e.pointerId); } catch { /* ok */ }
      ex.cursor.classList.add('is-down');
    });
    el.addEventListener('pointermove', e => {
      ex.px = e.clientX; ex.py = e.clientY;
      if (e.pointerType === 'mouse') {
        ex.cursor.classList.toggle('is-visible', !e.target.closest('.explore__ui'));
        if (!ex.drag) ex.cursor.textContent = e.target.closest('.ex-tile') ? 'Ver prato' : 'Arraste';
      }
      const d = ex.drag;
      if (!d || d.id !== e.pointerId) return;
      ex.camX += e.clientX - d.x; ex.camY += e.clientY - d.y;
      d.x = e.clientX; d.y = e.clientY;
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) { d.moved = true; ex.cursor.textContent = 'Arraste'; }
      d.samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
      if (d.samples.length > 8) d.samples.shift();
      ex.lastInteract = performance.now();
    });
    const up = e => {
      const d = ex.drag;
      if (!d || d.id !== e.pointerId) return;
      ex.drag = null;
      ex.cursor.classList.remove('is-down');
      ex.lastInteract = performance.now();
      if (!d.moved && e.type === 'pointerup') {
        const hit = document.elementsFromPoint(e.clientX, e.clientY).find(n => n.classList && n.classList.contains('ex-tile'));
        if (hit) openDetail(hit.dataset.id, hit.querySelector('img'));
        return;
      }
      if (!reduce()) { ex.vx = clamp(velocityFrom(d.samples, 'x'), -3200, 3200); ex.vy = clamp(velocityFrom(d.samples, 'y'), -3200, 3200); }
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') ex.cursor.classList.remove('is-visible'); });
    el.addEventListener('wheel', e => {
      e.preventDefault();
      const k = e.deltaMode === 1 ? 16 : 1;
      const dx = e.shiftKey ? e.deltaY : e.deltaX, dy = e.shiftKey ? 0 : e.deltaY;
      ex.camX -= dx * k; ex.camY -= dy * k;
      ex.vx = ex.vy = 0; ex.focus = null;
      ex.lastInteract = performance.now();
    }, { passive: false });
    el.addEventListener('keydown', e => {
      const m = { ArrowLeft: [700, 0], ArrowRight: [-700, 0], ArrowUp: [0, 700], ArrowDown: [0, -700] }[e.key];
      if (m && !e.target.closest('.ex-tile:focus-visible')) { e.preventDefault(); ex.vx += m[0]; ex.vy += m[1]; ex.lastInteract = performance.now(); }
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('ex-tile')) { e.preventDefault(); openDetail(e.target.dataset.id, e.target.querySelector('img')); }
    });
    // foco por teclado: leva o prato até o centro da tela
    el.addEventListener('focusin', e => {
      const tEl = e.target.closest('.ex-tile'); if (!tEl) return;
      const t = ex.tiles.find(x => x.el === tEl); if (!t) return;
      const dx = innerWidth / 2 - (t.sx + ex.colW / 2), dy = innerHeight / 2 - (t.sy + t.h / 2);
      ex.focus = { x: ex.camX + dx, y: ex.camY + dy / t.par };
      ex.vx = ex.vy = 0; ex.lastInteract = performance.now();
    });
    addEventListener('resize', () => { if (ex.open && ex.key !== `${innerWidth}x${innerHeight}`) { exBuild(); exRender(); } else if (!ex.open) ex.key = ''; });
  }

  /* ================================================================ início */
  buildWall();
  buildRibbon();
  buildFavs();
  buildMenu();
  bindTabs();
  bindScroll();
  exBind();
  paintCartBadges();
  setActiveTab(CATS[0].id, false);
  runLoader();

  // atalho: /#galeria abre direto a galeria infinita
  if (location.hash === '#galeria') setTimeout(exOpen, 600);
})();
