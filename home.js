// SSCG — portada: el dock de la portada, y la animación de cada tarjeta (corre solo mientras se ve).
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const t = (es, en) => SSCG.t(es, en);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const set = (el, v) => { if (el && el.textContent !== String(v)) el.textContent = v; };
  const C = { work: '#c8ff00', rest: '#00e5ff', yellow: '#ffea00', orange: '#ff8a00', red: '#ff3b3b' };

  function whileVisible(el, on, off) {
    if (!el) return;
    new IntersectionObserver(([e]) => (e.isIntersecting ? on() : off && off()), { threshold: 0.2 }).observe(el);
  }
  function ticker(fn, ms = 1000) {
    let id = null;
    return { start() { if (!id) { fn(); id = setInterval(fn, ms); } }, stop() { clearInterval(id); id = null; } };
  }
  // Marca la tarjeta con .is-play mientras está en pantalla y corre su reloj, si tiene.
  function play(el, ms, fn) {
    const tk = fn ? ticker(fn, ms) : null;
    whileVisible(el, () => { el.classList.add('is-play'); if (tk && !reduced) tk.start(); }, () => { el.classList.remove('is-play'); if (tk) tk.stop(); });
    if (fn) fn();
  }

  // ═══════════ Portada: los íconos flotan y se ordenan en un dock ═══════════
  const hero = $('.hero'), stage = $('.hero__stage');
  if (window.Stage && Stage.live) {
    window.Scenes.hero = (root, opts) => Stage.scene(root, {
      hold: opts.hold ?? 1,
      build(tl) { const o = { p: 0 }; tl.to(o, { p: 1, duration: 1, ease: 'power1.inOut', onUpdate: () => root.style.setProperty('--hp', o.p.toFixed(4)) }, 0); },
    });
  }
  if (!reduced && matchMedia('(pointer: fine)').matches) {
    let raf = 0, mx = 0, my = 0;
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2; my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(() => { stage.style.setProperty('--mx', (mx * 1.6).toFixed(3)); stage.style.setProperty('--my', (my * 1.6).toFixed(3)); raf = 0; });
    });
    stage.addEventListener('pointerleave', () => { stage.style.setProperty('--mx', 0); stage.style.setProperty('--my', 0); });
  }

  // ═══════════ Lapso: el mismo número en el iPhone y en el reloj ═══════════
  function frame(svg, n, { radius = 0, thick = 0.03, gap = 0.3 } = {}) {
    const box = svg.getBoundingClientRect(); const w = box.width || 100, h = box.height || 100;
    const th = Math.max(3, w * thick), d = th / 2 + Math.max(1, w * 0.012);
    const x0 = d, y0 = d, x1 = w - d, y1 = h - d, r = Math.max(0, w * radius - d);
    const top = x1 - x0 - 2 * r, side = y1 - y0 - 2 * r, arc = Math.PI * r / 2, L = 2 * top + 2 * side + 4 * arc, cx = (x0 + x1) / 2;
    const A = (cxx, cyy, a0) => (u) => { const a = a0 + u / r; return [cxx + r * Math.cos(a), cyy + r * Math.sin(a), a * 180 / Math.PI + 90]; };
    const segs = [[top / 2, (u) => [cx + u, y0, 0]], [arc, A(x1 - r, y0 + r, -Math.PI / 2)], [side, (u) => [x1, y0 + r + u, 90]], [arc, A(x1 - r, y1 - r, 0)],
      [top, (u) => [x1 - r - u, y1, 180]], [arc, A(x0 + r, y1 - r, Math.PI / 2)], [side, (u) => [x0, y1 - r - u, 270]], [arc, A(x0 + r, y0 + r, Math.PI)], [top / 2, (u) => [x0 + r + u, y0, 0]]];
    const at = (s) => { for (const [len, f] of segs) { if (s <= len) return f(s); s -= len; } return segs[8][1](top / 2); };
    const step = L / n, len = step * (1 - gap);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.innerHTML = '';
    return Array.from({ length: n }, (_, i) => {
      const [x, y, ang] = at(step * (i + 0.5));
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      el.setAttribute('x', -len / 2); el.setAttribute('y', -th / 2); el.setAttribute('width', len); el.setAttribute('height', th);
      el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
      svg.appendChild(el); return el;
    });
  }
  (() => {
    const vis = $('.v-lapso'), phone = $('.v-lapso .ip'), watch = $('.lp-watch');
    $('.ip__map', phone).innerHTML = [6, 6, 4, 4, 4, 3, 3, 4].map((g) => `<b>${'<i></i>'.repeat(g)}</b>`).join('');
    const sq = $$('.ip__sq i', phone), map = $$('.ip__map b:first-child i', phone);
    let pr = [], wr = [];
    const draw = (n) => { pr = frame($('.ip__frame', phone), n, { radius: 0.13, thick: 0.013, gap: 0.2 }); wr = frame($('.aw__frame', watch), n, { radius: 0.23, thick: 0.016, gap: 0.2 }); };
    // Serie 2 de 6 (20 s) y su descanso (los saltos de a 2 s para que se vea en poco tiempo)
    const plan = [{ work: true, len: 20 }, { work: false, len: 50 }];
    let b = 0, left = 20, n = 0;
    const tick = () => {
      const p = plan[b], c = p.work ? C.work : C.rest;
      if (n !== p.len) { draw(p.len); n = p.len; }
      phone.style.setProperty('--c', c); phone.style.setProperty('--sh', p.work ? C.rest : C.work); watch.style.setProperty('--c', c); watch.style.setProperty('--sh', p.work ? C.rest : C.work);
      set($('.ip__num', phone), left); set($('.aw__num', watch), left);
      set($('.aw__name', watch), p.work ? t('PRESS DE BANCA', 'BENCH PRESS') : t('DESCANSO 2/6', 'REST 2/6'));
      set($('.aw__bar', watch), p.work ? t('DESCANSO · 0:50', 'REST · 0:50') : t('PRESS DE BANCA · 3/6', 'BENCH PRESS · 3/6'));
      $('.aw__bar', watch).style.setProperty('--c2', p.work ? C.rest : C.work);
      set($('.ip__name', phone), p.work ? t('PRESS DE BANCA', 'BENCH PRESS') : t('DESCANSO 2/6', 'REST 2/6'));
      set($('.ip__ser', phone), p.work ? t('SERIE 2 DE 6', 'SET 2 OF 6') : t('SIGUE SERIE 3 DE 6', 'NEXT SET 3 OF 6'));
      set($('.ip__nextTxt', phone), p.work ? t('DESCANSO · 0:50', 'REST · 0:50') : t('PRESS DE BANCA · 3/6', 'BENCH PRESS · 3/6'));
      const bar = $('.ip__bar', phone); bar.style.setProperty('--c2', p.work ? C.rest : C.work); bar.classList.toggle('is-striped', !p.work);
      set($('.ip__afterTxt', phone), t('DESPUÉS · APERTURAS CON MANCUERNAS', 'AFTER · DUMBBELL FLYES'));
      sq.forEach((q, i) => { q.className = i < (p.work ? 1 : 2) ? 'done' : (p.work && i === 1 ? 'cur' : ''); q.style.setProperty('--fill', Math.round((p.len - left) / p.len * 100) + '%'); });
      map.forEach((m, i) => { m.className = i < (p.work ? 1 : 2) ? 'done' : (p.work && i === 1 ? 'cur' : ''); });
      pr.forEach((r, i) => r.classList.toggle('on', i < p.len - left));
      wr.forEach((r, i) => r.classList.toggle('on', i < p.len - left));
      left -= p.work ? 1 : 2;
      if (left < 0) { b = (b + 1) % plan.length; left = plan[b].len; }
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { draw(20); n = 20; tick(); });
    addEventListener('resize', () => { n = 0; });
    play(vis, 1000, () => pr.length && tick());
  })();

  // ═══════════ ROPE LAB: la cuenta sube con cada vuelta de la soga ═══════════
  (() => {
    const vis = $('.v-rope'), n = $('.rp-n'), bars = $('.rp-bars');
    bars.innerHTML = Array.from({ length: 14 }, () => '<i></i>').join('');
    const bs = $$('i', bars);
    let count = 128, hs = bs.map(() => 30 + Math.random() * 70);
    const draw = () => { set(n, count); bs.forEach((b, i) => b.style.setProperty('--h', hs[i] + '%')); };
    draw();
    play(vis, 420, () => { count = count >= 212 ? 128 : count + 1; hs.shift(); hs.push(30 + Math.random() * 70); draw(); });
  })();

  // ═══════════ Marea Delta: la marea del día y la hora de ahora que avanza ═══════════
  (() => {
    const vis = $('.v-marea'), line = $('.mr-line'), water = $('.mr-water'), now = $('.mr-now'), dot = $('.mr-dot'), h = $('.mr-h');
    const y = (x) => 92 - 50 * Math.sin((x / 400) * Math.PI * 1.7 - 1.1);
    let d = 'M0 ' + y(0).toFixed(1);
    for (let x = 8; x <= 400; x += 8) d += ` L${x} ${y(x).toFixed(1)}`;
    line.setAttribute('d', d);
    water.setAttribute('d', d + ' L400 160 L0 160 Z');
    let x = 40;
    const draw = () => {
      now.setAttribute('x1', x); now.setAttribute('x2', x);
      dot.setAttribute('cx', x); dot.setAttribute('cy', y(x).toFixed(1));
      const m = (2.6 - y(x) / 160 * 2.2).toFixed(2).replace('.', ',');
      set(h, m + ' m');
    };
    draw();
    play(vis, 250, () => { x = x >= 300 ? 40 : x + 4; draw(); });
  })();

  // Capa con el mismo sistema de coordenadas que un SVG en "slice" (para lo que viaja por un camino)
  function layer(vis, el, w = 400, hh = 260) {
    const fit = () => { const r = vis.getBoundingClientRect(); const s = Math.max(r.width / w, r.height / hh); el.style.transform = `translate(${(r.width - w * s) / 2}px, ${(r.height - hh * s) / 2}px) scale(${s})`; };
    fit(); addEventListener('resize', fit);
  }

  // ═══════════ Delta Maps ═══════════
  (() => {
    const vis = $('.v-maps'); layer(vis, $('.v-maps .layer'));
    const k = $('.mp-kmh'); let v = 18;
    play(vis, 1000, () => { v = Math.max(14, Math.min(23, v + Math.round(Math.random() * 4 - 2))); set(k, v); });
  })();

  // ═══════════ Snow Buddy ═══════════
  (() => { const vis = $('.v-snow'); layer(vis, $('.v-snow .layer')); play(vis); })();

  // ═══════════ Colonia: el total de gastos se suma ═══════════
  (() => {
    const vis = $('.v-colonia'), tot = $('.cl-total');
    let v = 136500;
    const fmt = (n) => '$ ' + n.toLocaleString('es-AR');
    play(vis, 2500, () => { v = v >= 232500 ? 136500 : v + 48000; set(tot, fmt(v)); });
  })();

  // ═══════════ Tu Suplemento: se tildan las tomas del día ═══════════
  (() => {
    const vis = $('.v-supl'), items = $$('.sp-list li'), ring = $('.sp-ring'), n = $('.sp-n');
    let done = 0;
    const draw = () => { items.forEach((li, i) => li.classList.toggle('ok', i < done)); ring.style.setProperty('--done', done); set(n, done + '/4'); };
    draw();
    play(vis, 1300, () => { done = done >= 5 ? 0 : done + 1; if (done <= 4) draw(); });
  })();

  // ═══════════ Express Gestures: un gesto distinto cada tanto ═══════════
  (() => {
    const vis = $('.v-eg'), g = $('.eg-g'), a = $('.eg-a');
    const G = [['tap3', ['3 DEDOS · TOQUE', '3 FINGERS · TAP'], ['Click del medio', 'Middle click']], ['up3', ['3 DEDOS · HACIA ARRIBA', '3 FINGERS · UP'], ['Mission Control', 'Mission Control']], ['side4', ['4 DEDOS · AL COSTADO', '4 FINGERS · SIDEWAYS'], ['Canción siguiente', 'Next song']]];
    let i = 0;
    const draw = () => { const [k, gg, aa] = G[i]; vis.dataset.g = k; set(g, t(...gg)); set(a, t(...aa)); };
    draw();
    play(vis, 2400, () => { i = (i + 1) % G.length; draw(); });
    SSCG.onLang(draw);
  })();

  // ═══════════ Cómo las hacemos ═══════════
  (() => {
    const num = $('.how__num'); let v = 45;
    play(num, 1000, () => { set(num, v); v = v === 0 ? 45 : v - 1; });
    $$('.how__sw, .how__buzz').forEach((el) => play(el));
  })();

  if (window.Stage) Stage.init();
})();
