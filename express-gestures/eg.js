// Express Gestures — el trackpad de la portada muestra un gesto distinto cada tanto.
// Cada gesto: cantidad de dedos, dónde arrancan, hacia dónde van (o toque) y qué hace.
(() => {
  const pad = document.querySelector('.pad');
  if (!pad) return;
  const dedos = [...pad.querySelectorAll('.pad__f')];
  const g = pad.querySelector('.pad__g');
  const a = pad.querySelector('.pad__a');

  const GESTOS = [
    { n: 3, x: 42, y: 50, tap: true, es: ['3 DEDOS · TOQUE', 'Click del medio'], en: ['3 FINGERS · TAP', 'Middle click'] },
    { n: 4, x: 38, y: 62, dy: -34, es: ['4 DEDOS · ARRIBA', 'Sube el volumen'], en: ['4 FINGERS · UP', 'Volume up'] },
    { n: 4, x: 60, y: 50, dx: -30, es: ['4 DEDOS · A LA IZQUIERDA', 'Canción siguiente'], en: ['4 FINGERS · LEFT', 'Next track'] },
    { n: 3, x: 90, y: 66, dy: -34, edge: true, es: ['3 DEDOS · BORDE DERECHO', 'Más brillo'], en: ['3 FINGERS · RIGHT EDGE', 'Brighter screen'] },
    { n: 4, x: 42, y: 50, tap: true, es: ['4 DEDOS · TOQUE', 'Pausa la música'], en: ['4 FINGERS · TAP', 'Pause the music'] },
    { n: 3, x: 40, y: 68, dy: -36, es: ['3 DEDOS · ARRIBA', 'Mission Control'], en: ['3 FINGERS · UP', 'Mission Control'] },
  ];

  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0;

  function ubicar(gesto, dx = 0, dy = 0) {
    const sep = gesto.edge ? 5 : 12;   // en el borde los dedos van juntos
    dedos.forEach((d, k) => {
      const on = k < gesto.n;
      d.classList.toggle('is-on', on);
      const x = gesto.x + (k - (gesto.n - 1) / 2) * sep + dx;
      const y = gesto.y + dy + (k % 2 ? -4 : 4);
      d.style.setProperty('--x', x + '%');
      d.style.setProperty('--y', y + '%');
    });
  }

  function etiqueta(gesto) {
    const [t1, t2] = gesto[SSCG.lang === 'en' ? 'en' : 'es'];
    g.textContent = t1;
    a.textContent = t2;
  }

  function mostrar() {
    const gesto = GESTOS[i];
    pad.classList.toggle('is-edge', !!gesto.edge);
    dedos.forEach((d) => { d.style.transition = 'none'; });
    ubicar(gesto);
    dedos.forEach((d) => d.offsetWidth);
    dedos.forEach((d) => { d.style.transition = ''; });
    etiqueta(gesto);
    if (quieto) return;
    setTimeout(() => {
      if (gesto.tap) {
        dedos.forEach((d) => d.classList.add('is-tap'));
        setTimeout(() => dedos.forEach((d) => d.classList.remove('is-tap')), 180);
      } else {
        ubicar(gesto, gesto.dx || 0, gesto.dy || 0);
      }
    }, 450);
    setTimeout(() => dedos.forEach((d) => d.classList.remove('is-on')), 1900);
  }

  SSCG.onLang(() => etiqueta(GESTOS[i]));
  mostrar();
  if (!quieto) setInterval(() => { i = (i + 1) % GESTOS.length; mostrar(); }, 2600);
})();
