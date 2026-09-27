/* Noki download page. The scroll journey follows the standard in the 10k-websites skill:
   streamed Blob with a ring, dt-normalised lerp that rests, gated seeks, delta-gated writes,
   bands paced in scroll distance, five live gates, complete without the video. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const lang = document.documentElement.lang || 'ja';
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const smooth = t => t * t * (3 - 2 * t);
  const smoothstep = (p, e0, e1) => smooth(clamp((p - e0) / (e1 - e0), 0, 1));

  /* ---------- hidden tabs pause every loop ---------- */
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));

  /* ---------- the notch menu ---------- */
  const notch = $('.notch');
  const face = $('.notch-face');
  let closeTimer = null;
  const setOpen = open => {
    if (notch.classList.contains('open') === open) return;
    notch.classList.toggle('open', open);
    face.setAttribute('aria-expanded', String(open));
  };
  face.addEventListener('click', () => setOpen(!notch.classList.contains('open')));
  if (matchMedia('(hover: hover)').matches) {
    notch.addEventListener('pointerenter', () => { clearTimeout(closeTimer); setOpen(true); });
    notch.addEventListener('pointerleave', () => { closeTimer = setTimeout(() => setOpen(false), 300); });
  }
  notch.addEventListener('focusin', () => setOpen(true));
  notch.addEventListener('focusout', e => { if (!notch.contains(e.relatedTarget)) setOpen(false); });
  $$('.notch-menu a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

  /* ---------- section entrances ---------- */
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        // the whisper-level loops start once the entrance has had time to finish
        setTimeout(() => e.target.classList.add('live'), 1600);
      }
    }
  }, { threshold: 0.18 });
  $$('.reveal').forEach(el => io.observe(el));
  // loops pause when their section is off screen
  const liveIO = new IntersectionObserver(entries => {
    for (const e of entries) if (e.target.classList.contains('in')) e.target.classList.toggle('live', e.isIntersecting);
  });
  $$('.reveal').forEach(el => liveIO.observe(el));

  /* ---------- the interactive desktop ---------- */
  const desk = $('.desk');
  const toggle = $('.desk-toggle');
  const status = $('.try-status');
  if (toggle) toggle.addEventListener('click', () => {
    const clear = !desk.classList.contains('clear');
    desk.classList.toggle('clear', clear);
    desk.classList.add('pressed');
    toggle.setAttribute('aria-pressed', String(clear));
    toggle.setAttribute('aria-label', clear ? toggle.dataset.show : toggle.dataset.hide);
    status.textContent = clear ? status.dataset.done : status.dataset.back;
  });

  /* ---------- the scroll journey ---------- */
  const hero = $('.hero');
  const stage = $('.stage');
  const screen = $('.screen');
  const video = $('#hero-video');
  const posterLayer = $('.poster');
  const ring = $('.ring-fill');
  const cue = $('.cue');
  if (!hero || !video) return;

  const BASE = new URL('.', $('script[src$="app.js"]').src).href;   // .../assets/
  const VIDEO_URL = BASE + 'hero-scrub.mp4';
  const POSTER_URL = BASE + 'hero-poster.jpg';
  const VIDEO_BYTES = 8790054;

  // Scroll progress to video time. More scroll for the card itself, less for the quiet ends.
  const TMAP = [[0, 0], [0.18, 3.0], [0.30, 4.6], [0.56, 10.8], [0.76, 13.8], [1, 19.0]];
  // Scroll progress to zoom. Starts as a screen, fills the window, pushes into the notch, pulls back
  // in time for the desktop icons to leave.
  const ZMAP = [[0, 0.82], [0.12, 1], [0.19, 1], [0.28, 1.9], [0.53, 1.9], [0.59, 1], [1, 1]];
  const lerpMap = (map, p, ease) => {
    for (let i = 1; i < map.length; i++) {
      if (p <= map[i][0]) {
        const [p0, v0] = map[i - 1], [p1, v1] = map[i];
        const t = (p - p0) / ((p1 - p0) || 1);
        return v0 + (v1 - v0) * (ease ? smooth(clamp(t, 0, 1)) : t);
      }
    }
    return map[map.length - 1][1];
  };

  /* bands: split text once, seeded so the offsets are the same on every load */
  const rng = seed => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  function split(el, seed, snap) {
    const text = el.textContent.trim();
    // Japanese headlines break only after 、 or 。, the way they are set by hand; other languages at spaces.
    const words = /^(ja|zh)/.test(lang) ? text.split(/(?<=[、。！？])/) : text.split(/(\s+)/);
    const r = rng(seed);
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    const vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    const chars = [...text.replace(/\s/g, '')].length;
    const spread = parseFloat(el.closest('.band').dataset.spread || '0.45');
    let ci = 0, wi = 0;
    const realWords = words.filter(w => w.trim()).length;
    for (const w of words) {
      if (!w.trim()) { vis.append(document.createTextNode(w)); continue; }
      const ws = document.createElement('span');
      ws.className = 'w';
      ws.style.setProperty('--th', (wi / Math.max(1, realWords) * 0.5).toFixed(3));
      for (const ch of w) {
        const cs = document.createElement('span');
        cs.className = 'c';
        cs.textContent = ch;
        if (snap) {
          cs.style.setProperty('--th', (ci / chars * spread + r() * 0.06).toFixed(3));
          cs.style.setProperty('--jx', (-(18 + r() * 26)).toFixed(1) + 'px');
        }
        ws.append(cs);
        ci++;
      }
      vis.append(ws);
      wi++;
    }
    el.textContent = '';
    el.append(sr, vis);
  }
  // headlines that are not split still break only after 、 in Japanese
  if (/^(ja|zh)/.test(lang)) $$('.blurpair span').forEach(sp => {
    const parts = sp.textContent.split(/(?<=[、。！？])/);
    sp.textContent = '';
    parts.forEach(t => { const w = document.createElement('span'); w.className = 'w'; w.textContent = t; sp.append(w); });
  });
  const bands = $$('.band').map((el, i) => {
    $$('.split', el).forEach((s, j) => split(s, 7 + i * 31 + j, el.classList.contains('e-snap')));
    return {
      el, a: parseFloat(el.dataset.a), b: parseFloat(el.dataset.b),
      ramp: el.dataset.ramp ? parseFloat(el.dataset.ramp) : null,
      first: el.hasAttribute('data-first'), last: el.hasAttribute('data-last'),
      op: -1, k: -1, live: null
    };
  });

  const scrollRange = () => hero.offsetHeight - innerHeight;
  const heroProgress = () => clamp(-hero.getBoundingClientRect().top / Math.max(1, scrollRange()), 0, 1);

  // band one assembles on its own when the page appears, then hands over to scroll
  let loadK = 0;
  const loadStart = performance.now();
  function loadRamp(now) {
    loadK = smooth(clamp((now - loadStart - 350) / 1300, 0, 1));
    updateBands(shown);
    if (loadK < 1) requestAnimationFrame(loadRamp);
  }

  function updateBands(p) {
    for (const band of bands) {
      const { a, b } = band;
      const f = Math.min(0.02, (b - a) / 3);
      const inE = band.first ? 1 : smoothstep(p, a, a + f);
      const outE = band.last ? 1 : 1 - smoothstep(p, b - f, b);
      const op = +(p < a - 0.001 && !band.first ? 0 : inE * outE).toFixed(3);
      let k = clamp((p - a) / (band.ramp || Math.min(0.025, (b - a) * 0.35)), 0, 1);
      if (band.first) k = Math.max(k, loadK);
      if (Math.abs(op - band.op) > 0.004) {
        band.el.style.opacity = op;
        band.op = op;
        if (band.first) stage.style.setProperty('--b1', op);
      }
      if (Math.abs(k - band.k) > 0.008 || (k === 1 && band.k !== 1) || (k === 0 && band.k !== 0)) {
        band.el.style.setProperty('--k', k.toFixed(3)); band.k = k;
      }
      const live = op > 0.6;
      if (live !== band.live) { band.el.classList.toggle('live', live); band.live = live; }
    }
  }

  /* zoom and the menu, delta-gated */
  let lastZoom = '';
  let lastAway = null;
  let lastCue = '';
  function updateScene(p) {
    const s = lerpMap(ZMAP, p, true);
    const ty = s < 1 ? (1 - s) * 50 : 0;
    const z = `translateY(${ty.toFixed(2)}vh) scale(${s.toFixed(4)})`;
    if (z !== lastZoom) {
      screen.style.transform = z;
      lastZoom = z;
      stage.style.setProperty('--zs', clamp((s - 1) / 0.9, 0, 1).toFixed(3));
    }
    // the page's notch steps aside for the recording's own notch until the journey has scrolled away
    const away = heroOnScreen && p > 0.06;
    if (away !== lastAway) { notch.classList.toggle('away', away); lastAway = away; if (away) notch.classList.remove('open'); }
    const c = (1 - smoothstep(p, 0.02, 0.06)).toFixed(2);
    if (c !== lastCue) { cue.style.setProperty('--cue', c); lastCue = c; }
  }

  /* gated seeks */
  let seekBusy = false, pendingTime = null;
  function requestSeek(t) {
    if (!video.duration) return;
    t = clamp(t, 0, video.duration - 0.04);
    if (seekBusy) { pendingTime = t; return; }
    seekBusy = true;
    video.currentTime = t;
  }
  video.addEventListener('seeked', () => {
    seekBusy = false;
    if (pendingTime !== null) { const t = pendingTime; pendingTime = null; requestSeek(t); }
  });
  video.addEventListener('error', () => { seekBusy = false; pendingTime = null; failVideo(); });

  /* the lerp loop, which rests */
  let target = 0, shown = 0, rafId = null, lastTick = 0, heroOnScreen = true;
  function tick(now) {
    const dt = Math.min(100, now - (lastTick || now));
    lastTick = now;
    shown += (target - shown) * (1 - Math.pow(1 - 0.16, dt / 16.667));
    if (Math.abs(target - shown) < 0.0005) { shown = target; rafId = null; lastTick = 0; }
    else rafId = requestAnimationFrame(tick);
    requestSeek(lerpMap(TMAP, shown, false));
    updateBands(shown);
    updateScene(shown);
  }
  function onScroll() {
    target = heroProgress();
    if (rafId === null && heroOnScreen) rafId = requestAnimationFrame(tick);
    if (!heroOnScreen) updateScene(target);
  }
  new IntersectionObserver(([e]) => {
    heroOnScreen = e.isIntersecting;
    if (!heroOnScreen) { lastAway = null; updateScene(heroProgress()); }
    else onScroll();
  }).observe(hero);

  /* the video: poster first, then the streamed Blob behind the ring */
  let heroStarted = false;
  function initHeroOnce() {
    if (heroStarted) return;
    heroStarted = true;
    posterLayer.style.backgroundImage = `url('${POSTER_URL}')`;
    let started = false;
    const startBlob = () => { if (started) return; started = true; loadHeroBlob().catch(failVideo); };
    const img = new Image();
    img.onload = startBlob;
    img.onerror = startBlob;
    img.src = POSTER_URL;
    setTimeout(startBlob, 4000);
  }
  async function loadHeroBlob() {
    const ctrl = new AbortController();
    let watchdog = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(VIDEO_URL, { priority: 'low', signal: ctrl.signal });
    if (!res.ok || !res.body) throw new Error('video ' + res.status);
    const total = Number(res.headers.get('Content-Length')) || VIDEO_BYTES;
    const reader = res.body.getReader();
    const chunks = [];
    let got = 0, lastRing = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      clearTimeout(watchdog);
      watchdog = setTimeout(() => ctrl.abort(), 20000);
      chunks.push(value);
      got += value.length;
      const frac = Math.min(1, got / total);
      const now = performance.now();
      if (now - lastRing > 100 || frac === 1) { lastRing = now; ring.style.setProperty('--ld', Math.round(126 * (1 - frac))); }
    }
    clearTimeout(watchdog);
    ring.style.setProperty('--ld', 0);
    video.src = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
    video.load();
    video.addEventListener('canplay', () => {
      requestSeek(lerpMap(TMAP, heroProgress(), false));
      stage.classList.add('video-ready');
    }, { once: true });
  }
  function failVideo() { stage.classList.add('video-failed'); }

  /* the five gates, identical to style.css, decided live */
  const GATES = [
    '(max-width: 720px)',
    '(orientation: portrait) and (max-width: 1024px)',
    '(orientation: portrait) and (pointer: coarse)',
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
    '(prefers-reduced-motion: reduce)'
  ];
  let scrubOn = false;
  function enableScrub() {
    if (scrubOn) return;
    scrubOn = true;
    initHeroOnce();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    bands.forEach(b => { b.op = -1; b.k = -1; b.live = null; });
    lastZoom = ''; lastAway = null; lastCue = '';
    target = shown = heroProgress();
    updateBands(shown);
    updateScene(shown);
    if (loadK < 1) requestAnimationFrame(loadRamp);
    onScroll();
  }
  function disableScrub() {
    if (!scrubOn) return;
    scrubOn = false;
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', onScroll);
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    notch.classList.remove('away');
    lastAway = null;
  }
  function applyHeroMode() {
    if (GATES.some(q => matchMedia(q).matches)) disableScrub(); else enableScrub();
  }
  const MQLS = GATES.map(q => matchMedia(q));
  MQLS.forEach(m => m.addEventListener('change', applyHeroMode));
  applyHeroMode();
})();
