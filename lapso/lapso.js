// Lapso — todo lo que se mueve en la página.
// El tiempo avanza de golpe, de a un segundo (manual de marca): los contadores saltan, no se deslizan.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const t = (es, en) => SSCG.t(es, en);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const C = { work: '#c8ff00', rest: '#00e5ff', yellow: '#ffea00', orange: '#ff8a00', red: '#ff3b3b', ink: '#f2f2f2', magenta: '#ff3dcb', grey: '#7c7c7c' };
  const mmss = (s) => { s = Math.max(0, Math.round(s)); return s >= 60 ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') : String(s); };
  const clock = (s) => Math.floor(s / 60) + ':' + String(Math.round(s) % 60).padStart(2, '0');
  const set = (el, v) => { if (el && el.textContent !== String(v)) el.textContent = v; };

  // Corre fn mientras el elemento está en pantalla.
  function whileVisible(el, on, off) {
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? on() : off && off()), { threshold: 0.15 });
    io.observe(el);
  }
  function ticker(fn, ms = 1000) {
    let id = null;
    return { start() { if (!id) { fn(); id = setInterval(fn, ms); } }, stop() { clearInterval(id); id = null; } };
  }

  // ——— Marco: un rectángulo por segundo alrededor de una forma redondeada ———
  // n rectángulos repartidos por el perímetro, arrancando arriba al medio y en el sentido del reloj.
  function frame(svg, n, { radius = 0, thick = 0.035, gap = 0.28 } = {}) {
    const box = svg.getBoundingClientRect();
    const w = box.width || 100, h = box.height || 100;
    const th = Math.max(3, w * thick);
    const d = th / 2 + Math.max(1, w * 0.012);
    const x0 = d, y0 = d, x1 = w - d, y1 = h - d;
    const r = Math.max(0, w * radius - d);
    const top = x1 - x0 - 2 * r, side = y1 - y0 - 2 * r, arc = Math.PI * r / 2;
    const L = 2 * top + 2 * side + 4 * arc;
    const cx = (x0 + x1) / 2;
    const segs = [
      [top / 2, (u) => [cx + u, y0, 0]],
      [arc, (u) => { const a = -Math.PI / 2 + u / r; return [x1 - r + r * Math.cos(a), y0 + r + r * Math.sin(a), a * 180 / Math.PI + 90]; }],
      [side, (u) => [x1, y0 + r + u, 90]],
      [arc, (u) => { const a = u / r; return [x1 - r + r * Math.cos(a), y1 - r + r * Math.sin(a), a * 180 / Math.PI + 90]; }],
      [top, (u) => [x1 - r - u, y1, 180]],
      [arc, (u) => { const a = Math.PI / 2 + u / r; return [x0 + r + r * Math.cos(a), y1 - r + r * Math.sin(a), a * 180 / Math.PI + 90]; }],
      [side, (u) => [x0, y1 - r - u, 270]],
      [arc, (u) => { const a = Math.PI + u / r; return [x0 + r + r * Math.cos(a), y0 + r + r * Math.sin(a), a * 180 / Math.PI + 90]; }],
      [top / 2, (u) => [x0 + r + u, y0, 0]],
    ];
    const at = (s) => { for (const [len, f] of segs) { if (s <= len) return f(s); s -= len; } return segs[8][1](top / 2); };
    const step = L / n, len = step * (1 - gap);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.innerHTML = '';
    const rects = [];
    for (let i = 0; i < n; i++) {
      const [x, y, ang] = at(step * (i + 0.5));
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      el.setAttribute('x', -len / 2); el.setAttribute('y', -th / 2);
      el.setAttribute('width', len); el.setAttribute('height', th);
      el.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${ang.toFixed(2)})`);
      svg.appendChild(el); rects.push(el);
    }
    return rects;
  }
  function Frame(svg, opts) {
    let n = 0, rects = [], on = -1;
    const api = {
      draw(count, filled) {
        if (count !== n) { n = count; rects = frame(svg, n, opts); on = -1; }
        if (filled !== on) { on = filled; rects.forEach((r, i) => r.classList.toggle('on', i < filled)); }
      },
      redraw() { const f = on; n = 0; api.draw(rects.length || 1, f); },
    };
    addEventListener('resize', () => { if (n) { const c = n, f = on; n = 0; api.draw(c, f); } });
    return api;
  }

  // ═══════════ Portada: la O es un timer ═══════════
  (() => {
    const hero = $('.hero'), glyph = $('.glyph');
    const num = $('.glyph__num'), fr = Frame($('.glyph__frame'), { radius: 0, thick: 0.05, gap: 0.3 });
    const plan = [[20, C.work], [10, C.rest], [20, C.yellow], [10, C.rest], [20, C.orange], [10, C.rest]];
    let b = 0, left = plan[0][0];
    const paint = () => {
      const [len, c] = plan[b];
      glyph.style.setProperty('--c', c);
      set(num, left);
      fr.draw(len, len - left);
    };
    const tk = ticker(() => {
      paint();
      left -= 1;
      if (left < 0) { b = (b + 1) % plan.length; left = plan[b][0]; }
    });
    const go = () => { hero.classList.add('is-in'); glyph.classList.add('is-in'); };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { fr.redraw(); setTimeout(go, 60); });
    paint();
    if (reduced) { paint(); return; }
    whileVisible(hero, tk.start, tk.stop);
  })();

  // ═══════════ Escena: una sesión entera ═══════════
  const ip = $('.ip');
  const ipFrame = Frame($('.ip__frame'), { radius: 0.13, thick: 0.013, gap: 0.2 });
  const E = {
    name: $('.ip__name'), ser: $('.ip__ser'), sq: $('.ip__sq'), bpm: $('.ip__bpm'), num: $('.ip__num'),
    bar: $('.ip__bar'), next: $('.ip__nextTxt'), after: $('.ip__afterTxt'), msg: $('.ip__msg'),
    t1: $('.ip__t1'), t2: $('.ip__t2'), t3: $('.ip__t3'), left: $('.ip__left'), ptime: $('.pz__time'), pnum: $('.pz__num'), ripple: $('.ip__ripple'),
  };
  E.sq.innerHTML = '<i></i>'.repeat(6);
  const sqs = $$('i', E.sq);
  // El mapa de la rutina: un rectangulito por serie, agrupados por ejercicio (One Muscle: 6, 6, 4, 4, 4, 3, 3, 4).
  const GR = [6, 6, 4, 4, 4, 3, 3, 4];
  $('.ip__map').innerHTML = GR.map((g) => `<b>${'<i></i>'.repeat(g)}</b>`).join('');
  const first = $$('.ip__map b:first-child i');
  // Gráfico del resumen: promedio de cada bloque (serie verde, descanso turquesa, últimas amarillo y naranja)
  $('.sm__chart').innerHTML = [128, 112, 141, 120, 146, 124, 151, 126, 156, 129, 161, 131, 166, 133, 171].map((v, i) => {
    const k = i % 2 ? C.rest : i === 12 ? C.yellow : i === 14 ? C.orange : C.work;
    return `<i style="--h:${Math.round((v - 90) / 85 * 100)}%;--d:${i};--k:${k}"></i>`;
  }).join('');
  $('.pz__map').innerHTML = GR.map((g) => `<b>${'<i></i>'.repeat(g)}</b>`).join('');
  $$('.pz__map b:first-child i').forEach((m, i) => { m.className = i < 4 ? 'done' : i === 4 ? 'y' : 'o'; });
  const IPL = {
    '.ip__next .ip__lbl': ['SIGUE', 'NEXT'], '.pz__next .ip__lbl': ['SIGUE', 'NEXT'],
    '.ip__table div:nth-child(1) .ip__lbl': ['RESTANTE', 'LEFT'], '.ip__table div:nth-child(2) .ip__lbl': ['TERMINA', 'ENDS'],
    '.ip__table div:nth-child(3) .ip__lbl': ['SERIES HECHAS', 'SETS DONE'],
    '.pz__t': ['EN PAUSA', 'PAUSED'], '.pz__bar': ['DESCANSO · 0:50', 'REST · 0:50'], '.pz__left': ['FALTAN 0:09 DE LA SERIE 6', '0:09 LEFT IN SET 6'],
    '.pz__seguir': ['SEGUIR', 'RESUME'], '.pz__terminar': ['TERMINAR', 'END'], '.pz__muteTxt': ['SIN SONIDO', 'MUTED'],
    '.pz__lbl1': ['PARTE DE ARRIBA', 'TOP OF SCREEN'], '.pz__f': ['FRANJA', 'STRIP'], '.pz__n': ['NEGRO', 'BLACK'], '.pz__o1 span:nth-child(3)': ['COLOR', 'COLOUR'],
    '.pz__lbl2': ['COLOREAR LAS ÚLTIMAS SERIES', 'COLOUR THE LAST SETS'], '.pz__no': ['NO', 'NO'],
    '.pz__l1': ['RESTANTE', 'LEFT'], '.pz__l2': ['SI SEGUÍS YA', 'IF YOU RESUME'], '.pz__l3': ['SERIES HECHAS', 'SETS DONE'],
    '.sm__t': ['TERMINASTE', 'FINISHED'], '.sm__share': ['COMPARTIR', 'SHARE'], '.sm__k': ['TOTAL', 'TOTAL'],
    '.sm__line .sm__k2': ['SERIES', 'SETS'], '.sm__line .sm__k3': ['DESCANSO', 'REST'], '.sm__line .sm__k4': ['PAUSA', 'PAUSE'],
    '.sm__leg .sm__k2': ['SERIES', 'SETS'], '.sm__leg .sm__k3': ['DESCANSO', 'REST'], '.sm__leg .sm__k4': ['PAUSA', 'PAUSE'],
    '.sm__h1': ['TIEMPO', 'TIME'], '.sm__h2': ['FRECUENCIA CARDÍACA', 'HEART RATE'], '.sm__h3': ['RECUPERACIÓN', 'RECOVERY'],
    '.sm__p1': ['PROMEDIO · ZONA 3', 'AVERAGE · ZONE 3'], '.sm__p2': ['MENOR · ZONA 2', 'LOWEST · ZONE 2'], '.sm__p3': ['MAYOR · ZONA 4', 'HIGHEST · ZONE 4'],
    '.sm__listo': ['LISTO', 'DONE'], '.sm__r1': ['AL TERMINAR', 'AT THE END'], '.sm__r2': ['AL MINUTO', 'AFTER 1 MIN'], '.sm__r3': ['A LOS 2 MIN', 'AFTER 2 MIN'],
    '.sm__z1': ['BASE', 'BASE'], '.sm__z2': ['RITMO', 'TEMPO'], '.sm__z3': ['FUERTE', 'HARD'], '.sm__z4': ['MÁXIMO', 'MAX'], '.sm__from': ['DE 18:02 A 18:44', 'FROM 18:02 TO 18:44'],
  };
  const PRESS = () => t('PRESS DE BANCA', 'BENCH PRESS'), APERT = () => t('APERTURAS CON MANCUERNAS', 'DUMBBELL FLYES');
  const SERIE = (n, extra) => t(`SERIE ${n} DE 6`, `SET ${n} OF 6`) + (extra ? ' · ' + extra : '');
  let lastBeat = -1, lastP = 0.3;

  // done: series hechas del ejercicio; cur: la que corre (se llena de arriba abajo); paint: colores de las últimas
  function squares(done, cur, fill, paint = {}) {
    sqs.forEach((q, i) => { q.className = i < done ? 'done' : i === cur ? 'cur' : ''; q.style.setProperty('--fill', Math.round(fill * 100) + '%'); });
    first.forEach((m, i) => {
      m.className = i < done ? (paint[i] ? 'paint' : 'done') : i === cur ? 'cur' : (paint[i] ? '' : '');
      m.style.setProperty('--k', paint[i] || '');
      if (i >= done && i !== cur && paint[i]) { m.style.borderColor = paint[i]; } else m.style.borderColor = '';
    });
  }
  function renderSesion(p) {
    lastP = p;
    const b = Math.min(5, Math.floor(p * 6)), u = Math.min(0.999, p * 6 - b);
    const paint = { 4: C.yellow, 5: C.orange };
    let c = C.work, sh = C.rest, n = 20, left = 20, name = PRESS(), ser, nextTxt = t('DESCANSO · 0:50', 'REST · 0:50'), nextC = C.rest, striped = false;
    let after = t('DESPUÉS · ', 'AFTER · ') + APERT(), msg = t('VAMOS', 'GO'), done = 0, elapsed = 0, bpm = 96;
    ip.classList.toggle('is-pause', b === 4);
    ip.classList.toggle('is-sum', b === 5);
    if (b !== lastBeat) {
      if (b === 4 && lastBeat !== -1 && !reduced) { E.ripple.classList.remove('is-go'); void E.ripple.offsetWidth; E.ripple.classList.add('is-go'); }
      lastBeat = b;
    }
    if (b === 0) {
      n = 3; left = 3 - Math.floor(u * 3); ser = SERIE(1); squares(0, -1, 0);
      set($('.ip__prepN'), left);
    } else if (b === 1) {
      left = 20 - Math.floor(u * 20); ser = SERIE(1); elapsed = 20 - left; bpm = 128 + Math.floor(u * 22);
      squares(0, 0, (20 - left) / 20);
    } else if (b === 2) {
      c = C.rest; sh = C.work; n = 50; left = 50 - Math.floor(u * 50); name = t('DESCANSO 1/6', 'REST 1/6'); ser = t('SIGUE SERIE 2 DE 6', 'NEXT SET 2 OF 6');
      nextTxt = PRESS() + ' · 2/6'; nextC = C.work; striped = true; msg = t('RESPIRÁ', 'BREATHE');
      done = 1; elapsed = 20 + (50 - left); bpm = 148 - Math.floor(u * 30); squares(1, -1, 0);
    } else if (b === 3) {
      const last = u >= 0.5, v = last ? (u - 0.5) * 2 : u * 2;
      c = last ? C.orange : C.yellow; left = 20 - Math.floor(v * 20);
      ser = last ? SERIE(6, t('ÚLTIMA', 'LAST')) : SERIE(5, t('ANTEÚLTIMA', 'SECOND LAST'));
      done = last ? 5 : 4; elapsed = done * 70 + (20 - left); bpm = 150 + Math.floor(u * 18);
      if (last) { nextTxt = t('DESCANSO · 0:50', 'REST · 0:50'); after = t('DESPUÉS · ', 'AFTER · ') + APERT(); }
      squares(done, done, (20 - left) / 20, paint);
    } else if (b === 4) {
      c = C.orange; n = 20; left = 11; name = t('EN PAUSA', 'PAUSED'); done = 5; elapsed = 5 * 70 + 9; bpm = 142 - Math.floor(u * 20);
      const ps = Math.floor(u * 75);
      ser = SERIE(6, t('ÚLTIMA', 'LAST'));
      set(E.ptime, clock(ps)); set(E.pnum, 11);
      E.ptime.style.color = ps >= 60 ? C.red : '';
      E.pnum.style.setProperty('--k', C.orange);
      squares(5, 5, 0.45, paint);
      set($('.pz__ex'), PRESS());
    } else {
      c = C.ink; sh = C.rest; n = 20; left = 0; name = 'ONE MUSCLE'; ser = t('38:50 · 34 SERIES', '38:50 · 34 SETS'); done = 6; elapsed = 2330; bpm = 112;
      squares(6, -1, 0, paint);
    }
    const doneAll = b === 5 ? 34 : done;
    ip.classList.toggle('is-prep', b === 0);
    ip.classList.toggle('is-first', b <= 1);
    $('.ip__bpm').style.color = bpm >= 150 ? C.red : bpm >= 135 ? C.orange : C.yellow;
    $$('.ip__cdots i').forEach((d, i) => d.classList.toggle('done', i < done));
    $$('.ip__curve b').forEach((s, i) => s.classList.toggle('cur', i === 0 && b < 5));
    ip.style.setProperty('--c', c); ip.style.setProperty('--sh', sh);
    E.bar.style.setProperty('--c2', nextC); E.bar.classList.toggle('is-striped', striped);
    if (E.num.textContent !== String(left)) { set(E.num, left); if (!reduced) { E.num.classList.remove('is-pop'); void E.num.offsetWidth; E.num.classList.add('is-pop'); } }
    set(E.name, name); set(E.ser, ser); set(E.next, nextTxt); set(E.after, after); set(E.msg, msg); set(E.bpm, bpm);
    set(E.t1, clock(2330 - elapsed)); set(E.t2, '22:41'); set(E.t3, `${doneAll}/34`);
    set(E.left, t(`FALTAN ${34 - doneAll} SERIES · EJERCICIO 1 DE 8`, `${34 - doneAll} SETS LEFT · EXERCISE 1 OF 8`));
    ipFrame.draw(n, n - left);
  }
  function ipLabels() {
    for (const [s, v] of Object.entries(IPL)) set($(s, ip), t(...v));
    set($('.ip__prepT'), t('PREPARATE', 'GET READY'));
    set($('.ip__prepS'), t('ARRANCA · ', 'STARTS · ') + PRESS() + ' · 0:20');
    set($('.pz__afterTxt'), t('DESPUÉS · ', 'AFTER · ') + APERT());
    const d = $('.sm__date'); if (d) d.firstChild.textContent = t('LUNES 2/11/2026', 'MONDAY 11/2/2026');
    set($('.sm__recTxt'), ''); $('.sm__recTxt').innerHTML = t('EN EL PRIMER MINUTO<br>MUY BUENA RECUPERACIÓN', 'IN THE FIRST MINUTE<br>VERY GOOD RECOVERY');
    renderSesion(lastP);
  }

  if (window.Stage && Stage.live) {
    window.Scenes.sesion = (root, opts) => Stage.scene(root, {
      hold: opts.hold ?? 5, beats: 6,
      build(tl) { const o = { p: 0 }; tl.to(o, { p: 1, duration: 1, ease: 'none', onUpdate: () => renderSesion(o.p) }, 0); },
      rest() { renderSesion(0.3); },
    });
  }
  ipLabels();
  SSCG.onLang(ipLabels);

  // ═══════════ Funciones ═══════════
  // a · un color por estado
  (() => {
    const box = $('.states'), lbl = $('.states__lbl'), num = $('.states__num');
    const S = [[['EJERCICIO', 'EXERCISE'], C.work, 20], [['DESCANSO', 'REST'], C.rest, 50], [['ANTEÚLTIMA', 'SECOND LAST'], C.yellow, 20], [['DESCANSO', 'REST'], C.rest, 50], [['ÚLTIMA', 'LAST SET'], C.orange, 20], [['PAUSA', 'PAUSE'], C.red, 0]];
    let i = 0, k = 0;
    const draw = () => { const [l, c, s] = S[i]; box.style.setProperty('--c', c); set(lbl, t(...l)); set(num, s ? s - k : '0:' + String(14 + k).padStart(2, '0')); };
    const tk = ticker(() => { draw(); k++; if (k > 2) { k = 0; i = (i + 1) % S.length; } });
    draw(); SSCG.onLang(draw);
    if (!reduced) whileVisible(box, tk.start, tk.stop);
  })();

  // b · el marco
  (() => {
    const svg = $('.marco__svg'), num = $('.marco__num'), fr = Frame(svg, { radius: 0.06, thick: 0.03, gap: 0.3 });
    let left = 15;
    const draw = () => { set(num, left); fr.draw(15, 15 - left); };
    const tk = ticker(() => { draw(); left = left === 0 ? 15 : left - 1; });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(draw);
    if (!reduced) whileVisible(svg, tk.start, tk.stop);
  })();

  // c · colorear las últimas series (No / 1 / 2 / 3)
  (() => {
    const row = $('.series__row'), num = $('.series__num'), lbl = $('.series__lbl'), btns = $$('.seg button');
    row.innerHTML = '<i></i>'.repeat(6);
    const cells = $$('i', row);
    let paint = 2, cur = 0, k = 0;
    const colorOf = (i) => { const first = 6 - paint; return paint && i >= first && i > 0 ? [C.yellow, C.orange, C.red][i - first] : ''; };
    const draw = () => {
      cells.forEach((q, i) => {
        q.className = i < cur ? 'done' : i === cur ? 'cur' : '';
        q.style.setProperty('--k', colorOf(i) || (i === cur ? C.work : C.ink));
      });
      num.style.setProperty('--k', colorOf(cur) || C.work);
      set(num, 20 - k * 4);
      set(lbl, t(`EJERCICIO 1 · SERIE ${cur + 1}/6`, `EXERCISE 1 · SET ${cur + 1}/6`));
    };
    const tk = ticker(() => { draw(); k++; if (k > 4) { k = 0; cur = (cur + 1) % 6; } }, 300);
    btns.forEach((b) => b.addEventListener('click', () => {
      paint = +b.dataset.n;
      btns.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      if (!reduced) cells.forEach((q, i) => { setTimeout(() => { q.classList.add('flip'); setTimeout(() => q.classList.remove('flip'), 300); }, i * 40); });
      draw();
    }));
    $('.seg').addEventListener('keydown', (e) => {
      if (!/Arrow(Left|Right|Up|Down)/.test(e.key)) return;
      e.preventDefault();
      const i = btns.findIndex((x) => x.getAttribute('aria-checked') === 'true');
      const j = (i + (/Right|Down/.test(e.key) ? 1 : 3)) % 4;
      btns[j].click(); btns[j].focus();
    });
    draw(); SSCG.onLang(draw);
    if (!reduced) whileVisible(row, tk.start, tk.stop);
  })();

  // d y f · animaciones de CSS que corren solo en pantalla
  $$('.fig-d, .fig-f').forEach((f) => whileVisible(f, () => f.classList.add('is-play'), () => f.classList.remove('is-play')));
  (() => {
    const n = $('.live__mid b'), isl = $('.island__n');
    let left = 14;
    const tk = ticker(() => { set(n, left); set(isl, left); left = left === 0 ? 20 : left - 1; });
    if (!reduced) whileVisible($('.fig-f'), tk.start, tk.stop);
  })();

  // e · sonidos sintetizados (los mismos del prototipo y de la app)
  (() => {
    let ctx = null, master = null;
    function audio() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
        ctx = new AC(); const comp = ctx.createDynamicsCompressor(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function env(g, at, a, peak, r) { g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + a); g.gain.exponentialRampToValueAtTime(0.0001, at + a + r); }
    function osc(type, f, at, a, peak, r, dest) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, at); o.connect(g); g.connect(dest || master); env(g, at, a, peak, r); o.start(at); o.stop(at + a + r + 0.05); }
    function bell(f, at, p, r) { [[1, 1], [2, 0.35], [3, 0.12], [4.2, 0.05]].forEach(([m, k]) => osc('sine', f * m, at, 0.005, p * k, r / (m * 0.6 + 0.4))); }
    function lp(f) { const l = ctx.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = f; l.connect(master); return l; }
    const SND = {
      warn: [1.4, (at) => { bell(880, at, 0.35, 0.9); bell(1174.66, at + 0.26, 0.35, 1); }, [60, 120, 60]],
      start: [1.4, (at) => { const l = lp(3200); osc('square', 660, at, 0.004, 0.16, 0.12, l); osc('square', 660, at + 0.35, 0.004, 0.16, 0.12, l); osc('square', 1320, at + 0.7, 0.004, 0.2, 0.5, l); }, [40, 300, 60, 280, 120]],
      end: [1.6, (at) => { [[783.99, 0], [659.25, 0.2], [523.25, 0.4]].forEach(([f, d], i) => { osc('sine', f, at + d, 0.01, 0.3, i === 2 ? 1 : 0.4); osc('triangle', f, at + d, 0.01, 0.08, i === 2 ? 0.9 : 0.35); }); }, [120, 80, 80, 80, 40]],
      pause: [0.6, (at) => { const l = lp(2400); osc('square', 587.33, at, 0.004, 0.15, 0.1, l); osc('square', 392, at + 0.13, 0.004, 0.15, 0.22, l); }, [400]],
      fin: [2, (at) => { [[523.25, 0], [659.25, 0.14], [783.99, 0.28], [1046.5, 0.46]].forEach(([f, d], i) => { osc('triangle', f, at + d, 0.01, 0.22, i === 3 ? 1.2 : 0.3); osc('sine', f * 2, at + d, 0.01, 0.05, i === 3 ? 1 : 0.25); }); }, [80, 60, 80, 60, 80, 60, 300]],
    };
    $$('.sounds button').forEach((b) => {
      const i = b.querySelector('i'); i.innerHTML = [0, 1, 2, 3, 4].map((j) => `<b style="--j:${j}"></b>`).join('');
      b.style.setProperty('--k', { warn: C.yellow, start: C.work, end: C.rest, pause: C.red, fin: C.work }[b.dataset.snd]);
      b.addEventListener('click', () => {
        const [dur, play, buzz] = SND[b.dataset.snd];
        if (audio()) play(ctx.currentTime + 0.03);
        if (navigator.vibrate) try { navigator.vibrate(buzz); } catch {}
        b.classList.add('is-on'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('is-on'), dur * 1000);
      });
    });
  })();

  // ═══════════ Apple Watch: deslizá por los estados ═══════════
  (() => {
    const sec = $('.watchsec'), aw = $('.aw'), range = $('#ws-range'), names = $$('.ws-names li');
    const clause = $('.ws-clause'), sub = $('.ws-sub'), num = $('.aw__num');
    const fr = Frame($('.aw__frame'), { radius: 0.23, thick: 0.016, gap: 0.2 });
    const TX = [
      [['Muñeca arriba: el número, enorme.', 'Wrist up: the number, huge.'], ['El número enorme, la serie y tu pulso al lado, y abajo lo que sigue. La franja de arriba y el marco llevan el color del momento.', 'A huge number, the set and your heart rate beside it, and what comes next below. The strip on top and the frame take the colour of the moment.']],
      [['Girás la corona: suben los datos.', 'Turn the crown: the data rises.'], ['Con la corona, o deslizando hacia arriba, aparecen Transcurrido, Restante y Termina. El número se achica para hacerles lugar.', 'With the crown, or a swipe up, Elapsed, Left and Ends slide in. The number shrinks to make room.']],
      [['Muñeca abajo: sigue contando.', 'Wrist down: still counting.'], ['Con la pantalla siempre activa, el número queda en contorno, con el color del momento. Las vibraciones te avisan sin mirar.', 'With the always-on display, the number stays as an outline in the colour of the moment. Buzzes tell you without looking.']],
      [['Al terminar: tu recuperación.', 'When you finish: your recovery.'], ['El reloj mide cuánto baja tu pulso en el primer minuto después de la última serie y lo guarda con la sesión.', 'The watch measures how far your heart rate falls in the first minute after the last set and saves it with the session.']],
    ];
    let s = 0, left = 16, touched = false;
    const awT = () => { set($('.aw__name'), t('EJERCICIO 1', 'EXERCISE 1')); set($('.aw__bar'), t('DESCANSO · 0:50', 'REST · 0:50')); set($('.aw__lbl'), t('SIGUE', 'NEXT')); set($('.aw__afterTxt'), t('DESPUÉS · EJERCICIO 2', 'AFTER · EXERCISE 2')); };
    awT(); SSCG.onLang(awT);
    const show = (v, animate = true) => {
      s = v; range.value = v; range.style.setProperty('--v', v / 3);
      aw.dataset.s = v;
      names.forEach((n, i) => n.classList.toggle('is-on', i === v));
      const write = () => { clause.textContent = t(...TX[v][0]); sub.textContent = t(...TX[v][1]); sec.classList.remove('is-swap'); };
      if (animate && !reduced) { sec.classList.add('is-swap'); setTimeout(write, 200); } else write();
    };
    range.addEventListener('input', () => { touched = true; show(+range.value); });
    names.forEach((n, i) => n.addEventListener('click', () => { touched = true; show(i); }));
    const tk = ticker(() => { set(num, left); fr.draw(20, 20 - left); left = left === 0 ? 20 : left - 1; });
    let auto = null;
    whileVisible(sec, () => {
      if (!reduced) tk.start();
      if (!touched && !reduced && !auto) auto = setInterval(() => { if (touched) { clearInterval(auto); return; } show((s + 1) % 4); }, 3200);
    }, () => { tk.stop(); clearInterval(auto); auto = null; });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => fr.draw(20, 20 - left));
    show(0, false);
    SSCG.onLang(() => show(s, false));
  })();

  // ═══════════ Tu rutina: escribila y aparece como en la lista de la app ═══════════
  (() => {
    const input = $('#rutina-in'), ans = $('.answer'), msg = $('.answer__msg');
    const F = { name: $('.rc__name'), meta: $('.rc__meta'), sq: $('.rc__sq'), total: $('.a-total'), ends: $('.a-ends'), ex: $('.a-ex'), series: $('.a-series') };
    const toSec = (n, u) => (u && /^m/.test(u) ? n * 60 : n);
    const dur = (s) => (s >= 3600 ? Math.floor(s / 3600) + ':' + clock(s % 3600).padStart(5, '0') : clock(s));
    function parse(raw) {
      const s = raw.toLowerCase().replace(/×/g, 'x').replace(/,/g, ' ');
      if (/tabata/.test(s)) return { name: t('TABATA CLÁSICO', 'CLASSIC TABATA'), groups: [8], work: 20, rest: 10, es: 'Tabata: 8 series de 20 s con 10 s de descanso.', en: 'Tabata: 8 sets of 20 s with 10 s of rest.' };
      if (/one\s*muscle/.test(s)) return { name: 'ONE MUSCLE', groups: [6, 6, 4, 4, 4, 3, 3, 4], work: 20, rest: 50, es: 'One Muscle: 8 ejercicios, 34 series de 20 s con 50 s de descanso.', en: 'One Muscle: 8 exercises, 34 sets of 20 s with 50 s of rest.' };
      const U = '(min|m|s|seg|sec|segundos|seconds)?';
      const m = s.match(new RegExp('(\\d+)\\s*(?:x|series?|sets?|rounds?|rondas?|veces)\\D*?(\\d+)\\s*' + U + '\\D+?(\\d+)\\s*' + U));
      if (!m) return null;
      const n = +m[1], w = toSec(+m[2], m[3]), r = toSec(+m[4], m[5]);
      if (!(n >= 1 && n <= 60 && w >= 1 && w <= 3600 && r >= 0 && r <= 3600)) return null;
      return { name: t('MI RUTINA', 'MY ROUTINE'), groups: [n], work: w, rest: r, es: `${n} ${n === 1 ? 'serie' : 'series'} de ${mmss(w)} s con ${mmss(r)} s de descanso.`, en: `${n} ${n === 1 ? 'set' : 'sets'} of ${mmss(w)} s with ${mmss(r)} s of rest.` };
    }
    let cells = [];
    function build() {
      const p = parse(input.value);
      if (!p) {
        ans.classList.add('is-bad');
        msg.textContent = t('No la entendí. Probá con “8 × 20 s / 10 s” o “Tabata”.', 'Didn’t get that. Try “8 × 20 s / 10 s” or “Tabata”.');
        return;
      }
      ans.classList.remove('is-bad');
      const sets = p.groups.reduce((a, g) => a + g, 0);
      const total = sets * p.work + (sets - 1) * p.rest;
      // Colorear las últimas 2 (por defecto): anteúltima amarilla, última naranja; la primera serie nunca.
      let d = 0;
      F.sq.innerHTML = p.groups.map((g) => '<span>' + Array.from({ length: g }, (_, i) => {
        const k = g > 1 && i >= g - 2 && i > 0 ? (i === g - 1 ? C.orange : C.yellow) : C.work;
        return `<i style="--k:${k};--d:${d++}"></i>`;
      }).join('') + '</span>').join('');
      cells = $$('i', F.sq);
      if (!reduced) { F.sq.classList.remove('is-new'); void F.sq.offsetWidth; F.sq.classList.add('is-new'); }
      set(F.name, p.name);
      F.meta.innerHTML = t(`${sets} ${sets === 1 ? 'SERIE' : 'SERIES'} · ${dur(total)} · <em class="w">${p.work}″</em> TRABAJO · <em class="r">${p.rest}″</em> DESCANSO`,
        `${sets} ${sets === 1 ? 'SET' : 'SETS'} · ${dur(total)} · <em class="w">${p.work}″</em> WORK · <em class="r">${p.rest}″</em> REST`);
      set(F.total, dur(total)); set(F.ex, p.groups.length); set(F.series, sets);
      const end = new Date(Date.now() + total * 1000);
      set(F.ends, end.getHours() + ':' + String(end.getMinutes()).padStart(2, '0'));
      msg.textContent = t(p.es, p.en);
    }
    function labels() {
      [['.rt__l1', 'DURACIÓN', 'DURATION'], ['.rt__l2', 'TERMINÁS SI EMPEZÁS YA', 'DONE IF YOU START NOW'], ['.rt__l3', 'EJERCICIOS', 'EXERCISES'], ['.rt__l4', 'SERIES', 'SETS'], ['.rc__nv', 'NUNCA HECHA', 'NEVER DONE']]
        .forEach(([s, es, en]) => set($(s), t(es, en)));
      build();
    }
    input.addEventListener('input', build);
    $$('.type__ex button').forEach((b) => b.addEventListener('click', () => {
      input.value = b.dataset.ex || (SSCG.lang === 'en' ? b.dataset.exEn : b.dataset.exEs);
      build(); input.focus();
    }));
    // Un cuadradito por serie se enciende de a uno, como si la rutina estuviera corriendo.
    let k = 0;
    const tk = ticker(() => { cells.forEach((c, i) => c.classList.toggle('on', i === k)); k = cells.length ? (k + 1) % cells.length : 0; }, 450);
    if (!reduced) whileVisible(ans, tk.start, tk.stop);
    labels();
    SSCG.onLang(labels);
  })();

  // ═══════════ Números que se cuentan al aparecer ═══════════
  $$('.lrow .w').forEach((el) => {
    const to = +el.textContent;
    if (reduced || to < 2) return;
    whileVisible(el, () => {
      if (el._done) return; el._done = true;
      let v = 0; const step = Math.max(1, Math.round(to / 12));
      const id = setInterval(() => { v = Math.min(to, v + step); el.textContent = v; if (v >= to) clearInterval(id); }, 70);
    });
  });

  if (window.Stage) { Stage.smooth(); Stage.init(); }
})();
