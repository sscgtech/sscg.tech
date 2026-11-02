// SSCG — lo común a todas las páginas: idioma (ES/EN), entradas al hacer scroll y la barra de arriba.
// Cada página escribe su texto en español en el HTML con data-i18n="clave" y deja el inglés en
// window.SSCG_EN = { clave: "texto" } antes de cargar este archivo.
(() => {
  const html = document.documentElement;
  const EN = window.SSCG_EN || {};
  const ES = {};
  const listeners = [];

  const store = {
    get() { try { return localStorage.getItem('sscg-lang'); } catch { return null; } },
    set(v) { try { localStorage.setItem('sscg-lang', v); } catch {} },
  };

  function initialLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'es' || q === 'en') return q;
    const saved = store.get();
    if (saved === 'es' || saved === 'en') return saved;
    return (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
  }

  function apply(lang) {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.dataset.i18n;
      if (!(k in ES)) ES[k] = el.innerHTML;
      el.innerHTML = lang === 'en' && k in EN ? EN[k] : ES[k];
    });
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').forEach((pair) => {
        const [attr, k] = pair.split(':').map((s) => s.trim());
        const key = 'attr:' + k;
        if (!(key in ES)) ES[key] = el.getAttribute(attr) || '';
        el.setAttribute(attr, lang === 'en' && k in EN ? EN[k] : ES[key]);
      });
    });
    html.lang = lang;
    document.querySelectorAll('.lang').forEach((b) => {
      b.innerHTML = lang === 'es' ? '<b>ES</b> · EN' : 'ES · <b>EN</b>';
      b.setAttribute('aria-label', lang === 'es' ? 'Switch to English' : 'Cambiar a español');
    });
    SSCG.lang = lang;
    listeners.forEach((fn) => fn(lang));
  }

  const SSCG = {
    lang: 'es',
    t(es, en) { return SSCG.lang === 'en' ? en : es; },
    onLang(fn) { listeners.push(fn); },
    setLang(l) { store.set(l); apply(l); },
  };
  window.SSCG = SSCG;

  document.addEventListener('click', (e) => {
    const b = e.target.closest('.lang');
    if (b) SSCG.setLang(SSCG.lang === 'es' ? 'en' : 'es');
  });

  // Entradas: cada [data-in] sube una vez cuando entra en pantalla; --i escalona las partes.
  function reveals() {
    const els = document.querySelectorAll('[data-in]');
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    els.forEach((el) => io.observe(el));
    // Si se salta de golpe (un enlace a #sección, la tecla Fin), lo que quedó arriba también se muestra.
    const sweep = () => els.forEach((el) => { if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < innerHeight) { el.classList.add('is-in'); io.unobserve(el); } });
    addEventListener('scroll', sweep, { passive: true });
  }

  // La barra se esconde al bajar y vuelve al subir.
  function bar() {
    const b = document.querySelector('.bar');
    if (!b) return;
    let last = scrollY;
    addEventListener('scroll', () => {
      const y = scrollY;
      b.classList.toggle('is-hidden', y > last && y > 400);
      last = y;
    }, { passive: true });
  }

  apply(initialLang());
  reveals();
  bar();
})();
