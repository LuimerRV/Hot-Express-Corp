/* Hot Express · Home
   Script clásico (sin módulos): funciona publicado y también abriendo index.html con doble clic. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touchLayout = window.matchMedia('(max-width: 1023px)');

  /* ---------------- Scroll suave del sitio (Lenis) ----------------
     Rueda y trackpad con inercia; en pantallas táctiles se mantiene el scroll nativo.
     Los enlaces internos (#…) se deslizan compensando el header fijo. Sin Lenis o con
     movimiento reducido, el sitio usa el scroll normal del navegador. */
  var lenis = null;
  if (!reduced && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6
    });
    (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(performance.now());
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: id === '#top' ? 0 : -72 });
      history.replaceState(null, '', id);
    });
    window.__lenis = lenis;
  }

  /* ---------------- Header: transparente arriba, navy después de recorrer 50px ----------------
     Un marcador invisible a 50px del inicio: cuando sale de la pantalla, el header se vuelve sólido. */
  (function header() {
    var header = document.getElementById('header');
    if (!header) return;
    if (!('IntersectionObserver' in window)) { header.classList.add('is-solid'); return; }
    var sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;left:0;top:50px;width:1px;height:1px;pointer-events:none';
    sentinel.setAttribute('aria-hidden', 'true');
    document.body.prepend(sentinel);
    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-solid', !entries[0].isIntersecting);
    }).observe(sentinel);
  })();

  /* ---------------- Menú móvil ---------------- */
  (function menu() {
    var btn = document.querySelector('.burger');
    var panel = document.getElementById('menu');
    if (!btn || !panel) return;
    function open(on) {
      btn.setAttribute('aria-expanded', String(on));
      btn.setAttribute('aria-label', on ? 'Cerrar menú' : 'Abrir menú');
      document.documentElement.style.overflow = on ? 'hidden' : '';
      if (lenis) { if (on) lenis.stop(); else lenis.start(); }
      if (on) {
        panel.hidden = false;
        requestAnimationFrame(function () { requestAnimationFrame(function () { panel.classList.add('is-open'); }); });
      } else {
        panel.classList.remove('is-open');
        setTimeout(function () { if (btn.getAttribute('aria-expanded') === 'false') panel.hidden = true; }, 450);
      }
    }
    btn.addEventListener('click', function () { open(btn.getAttribute('aria-expanded') !== 'true'); });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) open(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { open(false); btn.focus(); } });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (e) { if (e.matches) open(false); });
  })();

  /* ---------------- Hero: 3 escenas ----------------
     Avanza cada 7 s; se pausa con el botón, al pasar el cursor, con el foco dentro o fuera de pantalla;
     flechas del teclado y gesto de deslizar. Con movimiento reducido parte en pausa. */
  (function hero() {
    var root = document.querySelector('.hero');
    if (!root) return;
    var scenes = Array.prototype.slice.call(root.querySelectorAll('.scene'));
    var imgs = Array.prototype.slice.call(root.querySelectorAll('.hero__img'));
    var num = document.getElementById('scene-n');
    var bar = document.getElementById('scene-bar');
    var pauseBtn = document.getElementById('scene-pause');
    var DURATION = 7000;
    var i = 0, timer = null, userPaused = reduced, held = false, started = 0, remaining = DURATION;
    root.style.setProperty('--scene-ms', DURATION + 'ms');

    function load(img) { if (img && img.loading === 'lazy') img.loading = 'eager'; }

    function show(k) {
      i = (k + scenes.length) % scenes.length;
      scenes.forEach(function (s, j) {
        var on = j === i;
        s.classList.toggle('is-active', on);
        if (on) { s.removeAttribute('aria-hidden'); s.inert = false; } else { s.setAttribute('aria-hidden', 'true'); s.inert = true; }
        imgs[j].classList.toggle('is-active', on);
      });
      load(imgs[i]); load(imgs[(i + 1) % imgs.length]);
      num.textContent = String(i + 1).padStart(2, '0');
      restart();
    }
    function restart() {
      clearTimeout(timer);
      remaining = DURATION;
      bar.classList.remove('is-run', 'is-paused');
      void bar.offsetWidth;
      if (userPaused) return;
      bar.classList.add('is-run');
      tick();
    }
    function tick() {
      clearTimeout(timer);
      if (userPaused || held) { bar.classList.add('is-paused'); return; }
      bar.classList.remove('is-paused');
      started = performance.now();
      timer = setTimeout(function () { show(i + 1); }, remaining);
    }
    function hold(on) {
      if (on === held) return;
      held = on;
      if (on) { clearTimeout(timer); remaining = Math.max(400, remaining - (performance.now() - started)); bar.classList.add('is-paused'); }
      else tick();
    }

    root.querySelectorAll('[data-dir]').forEach(function (b) {
      b.addEventListener('click', function () { show(i + Number(b.getAttribute('data-dir'))); });
    });
    pauseBtn.addEventListener('click', function () {
      userPaused = !userPaused;
      pauseBtn.setAttribute('aria-pressed', String(userPaused));
      pauseBtn.setAttribute('aria-label', userPaused ? 'Reanudar escenas' : 'Pausar escenas');
      restart();
    });
    if (userPaused) { pauseBtn.setAttribute('aria-pressed', 'true'); pauseBtn.setAttribute('aria-label', 'Reanudar escenas'); }

    // el cursor ya no pausa; solo el foco de teclado (accesibilidad) y el botón de pausa
    root.addEventListener('focusin', function (e) { if (e.target.matches(':focus-visible')) hold(true); });
    root.addEventListener('focusout', function (e) { if (!root.contains(e.relatedTarget)) hold(false); });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') show(i + 1);
      if (e.key === 'ArrowLeft') show(i - 1);
    });
    var x0 = null;
    root.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 48) show(i + (dx < 0 ? 1 : -1));
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { hold(!en[0].isIntersecting); }).observe(root);
    }
    show(0);
  })();

  /* ---------------- Seguimiento por Número de Guía ----------------
     TRACKING_URL: dirección del sistema de seguimiento del cliente (pendiente). Usa {guia} donde va el número,
     p. ej. 'https://…/seguimiento?guia={guia}'. Mientras esté vacía, valida el número y ofrece consultarlo
     por correo o teléfono. */
  var TRACKING_URL = '';
  (function tracking() {
    var form = document.getElementById('tracking');
    if (!form) return;
    var input = form.querySelector('#guia');
    var msg = form.querySelector('#guia-msg');
    var initial = msg.innerHTML;
    input.addEventListener('input', function () {
      if (input.getAttribute('aria-invalid')) { input.removeAttribute('aria-invalid'); msg.innerHTML = initial; }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.replace(/\s+/g, '');
      if (!/^[A-Za-z0-9-]{4,30}$/.test(v)) {
        input.setAttribute('aria-invalid', 'true');
        msg.textContent = 'Escribe el Número de Guía de tu Orden de transporte: solo letras y números, sin espacios.';
        input.focus();
        return;
      }
      if (TRACKING_URL) { window.location.href = TRACKING_URL.replace('{guia}', encodeURIComponent(v)); return; }
      var subject = encodeURIComponent('Seguimiento guía ' + v);
      var body = encodeURIComponent('Hola, quisiera conocer el estado de mi envío con Número de Guía ' + v + '.');
      msg.innerHTML = 'Consulta el estado de la guía <b>' + v + '</b> escribiendo a <a href="mailto:info@hotexpress.cl?subject=' + subject + '&amp;body=' + body + '">info@hotexpress.cl</a> o llamando al <a href="tel:+56224107000">+56 2 2410 7000</a>.';
    });
  })();

  /* ---------------- Formulario de contacto ----------------
     CONTACT_ENDPOINT: URL que recibirá el formulario (POST con nombre, correo y mensaje), definida por el cliente.
     Mientras esté vacía, valida los campos y abre el correo con el mensaje listo para enviar a info@hotexpress.cl. */
  var CONTACT_ENDPOINT = '';
  (function contactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    var msg = document.getElementById('cform-msg');
    var f = { nombre: form.elements.nombre, correo: form.elements.correo, mensaje: form.elements.mensaje };
    Object.keys(f).forEach(function (k) {
      f[k].addEventListener('input', function () { f[k].removeAttribute('aria-invalid'); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = { nombre: f.nombre.value.trim(), correo: f.correo.value.trim(), mensaje: f.mensaje.value.trim() };
      var bad = null;
      if (!v.nombre) bad = bad || ['nombre', 'Escribe tu nombre.'];
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo)) bad = bad || ['correo', 'Escribe un correo válido, por ejemplo nombre@empresa.cl.'];
      if (!v.mensaje) bad = bad || ['mensaje', 'Cuéntanos tu consulta en el mensaje.'];
      if (bad) { f[bad[0]].setAttribute('aria-invalid', 'true'); f[bad[0]].focus(); msg.textContent = bad[1]; return; }
      var btn = form.querySelector('button[type="submit"]');
      if (CONTACT_ENDPOINT) {
        btn.disabled = true; msg.textContent = 'Enviando…';
        fetch(CONTACT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); msg.textContent = 'Gracias, ' + v.nombre + '. Recibimos tu mensaje y te responderemos a la brevedad.'; })
          .catch(function () { msg.innerHTML = 'No pudimos enviar el mensaje. Escríbenos a <a href="mailto:info@hotexpress.cl">info@hotexpress.cl</a> o llama al <a href="tel:+56224107000">+56 2 2410 7000</a>.'; })
          .then(function () { btn.disabled = false; });
        return;
      }
      var subject = encodeURIComponent('Consulta desde hotexpress.cl · ' + v.nombre);
      var body = encodeURIComponent(v.mensaje + '\n\n' + v.nombre + '\n' + v.correo);
      window.location.href = 'mailto:info@hotexpress.cl?subject=' + subject + '&body=' + body;
      msg.innerHTML = 'Abrimos tu correo con el mensaje listo. Si no se abrió, escríbenos a <a href="mailto:info@hotexpress.cl">info@hotexpress.cl</a>.';
    });
  })();

  /* ---------------- Índice de servicios ----------------
     Escritorio: el panel fijo cambia con el hover (y con el foco del teclado); el clic abre el servicio.
     Tablet y teléfono: el primer toque abre la fila con su foto y dato; el enlace del detalle abre el servicio. */
  (function services() {
    var list = document.getElementById('svc-list');
    if (!list) return;
    var S = [
      { img: 'svc-cargo', f: 'Mar · Aire · Tierra', t: 'Agente de carga global: cargas marítimas LCL y FCL, consolidados aéreos IATA y distribución terrestre en Chile y EE.UU.', alt: 'Terminal portuaria con contenedores y una grúa cargando un buque' },
      { img: 'svc-vinos', f: 'Ferias · Concursos · Degustaciones', t: 'Transporte de muestras de vino a ferias, concursos y degustaciones, con retiros en Santiago y en las bodegas de las viñas en regiones.', alt: 'Muestras de vino embaladas en una bodega de barricas' },
      { img: 'svc-embalajes', f: 'Fábrica propia', t: 'Embalajes a medida para vinos y botellas delicadas; estatuas, piezas de arte y antigüedades; y envíos frágiles, voluminosos o de forma irregular.', alt: 'Taller construyendo una caja de madera a medida' },
      { img: 'svc-bio', f: 'Ambiente · Refrigerado · Congelado', t: 'Muestras biológicas para clínicas, hospitales y laboratorios, enviadas en el primer vuelo disponible.', alt: 'Muestras biológicas en un contenedor refrigerado' },
      { img: 'svc-importaciones', f: 'Hasta USD 3.000 FOB', t: 'Bodega propia en la terminal Courier del aeropuerto y operador Courier autorizado para importaciones simplificadas.', alt: 'Bodega courier de aeropuerto con carga aérea' },
      { img: 'svc-peligrosas', f: '9 clases IATA', t: 'Equipo certificado que se actualiza cada año, con embalaje adecuado y coordinación directa con aerolíneas.', alt: 'Bultos con etiquetas de mercancías peligrosas' },
      { img: 'svc-hotbox', f: 'EE.UU. · Europa · Asia', t: 'Casillas internacionales con compra asistida y despacho a domicilio en todo Chile.', alt: 'Paquetes de compras internacionales en la entrada de una casa' },
      { img: 'svc-aog', f: '24/7 · 365 días', t: 'Logística urgente de componentes aeronáuticos, con presencia en México, USA, Canadá, América Latina y Europa.', alt: 'Técnicos cargando un componente de motor de avión de noche' },
      { img: 'svc-especiales', f: 'Más de 30 años', t: 'Instrucciones especiales de entrega, regímenes aduaneros especiales, control de temperatura y manipulación delicada.', alt: 'Caja de madera con equipo delicado suspendida de una grúa' }
    ];
    var items = Array.prototype.slice.call(list.querySelectorAll('.idx__item'));
    var rows = items.map(function (li) { return li.querySelector('.idx__row'); });
    var panel = document.querySelector('.panel');
    var ph = document.getElementById('panel-ph');
    var code = document.getElementById('panel-code');
    var name = document.getElementById('panel-name');
    var fact = document.getElementById('panel-fact');
    var text = document.getElementById('panel-text');
    var cache = { 0: ph.querySelector('img') };
    var cur = 0, swapT = null;

    function nameOf(k) { return rows[k].querySelector('.idx__name').firstChild.textContent.trim(); }
    function imgFor(k) {
      if (cache[k]) return cache[k];
      var im = new Image();
      im.decoding = 'async'; im.alt = ''; im.width = 900; im.height = 672;
      im.src = 'img/' + S[k].img + '-900.webp';
      ph.insertBefore(im, code);
      cache[k] = im;
      return im;
    }
    function set(k) {
      if (k === cur) return;
      cur = k;
      rows.forEach(function (r, j) { r.classList.toggle('is-active', j === k); });
      var im = imgFor(k);
      function swap() { Object.keys(cache).forEach(function (j) { cache[j].classList.toggle('is-on', Number(j) === k); }); }
      if (im.complete) swap(); else im.addEventListener('load', swap, { once: true });
      panel.classList.add('is-swapping');
      clearTimeout(swapT);
      swapT = setTimeout(function () {
        code.textContent = rows[k].querySelector('.idx__code').textContent;
        name.textContent = nameOf(k);
        fact.textContent = S[k].f;
        text.textContent = S[k].t;
        panel.classList.remove('is-swapping');
      }, 180);
    }

    // detalle por fila para pantallas táctiles
    function detailFor(k) {
      var li = items[k];
      var d = li.querySelector('.idx__detail');
      if (d) return d;
      d = document.createElement('div');
      d.className = 'idx__detail';
      var link = rows[k].getAttribute('href');
      var ext = rows[k].getAttribute('target') === '_blank' ? ' target="_blank" rel="noopener"' : '';
      d.innerHTML = '<img src="img/' + S[k].img + '-900.webp" alt="' + S[k].alt + '" width="900" height="672" loading="lazy">' +
        '<div><b>' + S[k].f + '</b><p>' + S[k].t + '</p>' +
        (link ? '<a class="btn btn--ghost btn--sm" href="' + link + '"' + ext + '>Ver ' + nameOf(k) + '<span class="btn__ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg></span></a>' : '') + '</div>';
      li.appendChild(d);
      return d;
    }

    rows.forEach(function (r, k) {
      r.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && !touchLayout.matches) set(k); });
      r.addEventListener('focus', function () { if (!touchLayout.matches) set(k); });
      r.addEventListener('click', function (e) {
        if (!touchLayout.matches) return;
        var li = items[k];
        if (li.classList.contains('is-open')) return;      // segundo toque: abre el servicio
        e.preventDefault();
        items.forEach(function (o) { if (o !== li) o.classList.remove('is-open'); });
        detailFor(k);
        li.classList.add('is-open');
      });
    });
    rows[0].classList.add('is-active');

    // precarga las fotos del panel cuando la sección se acerca
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting || touchLayout.matches) return;
        io.disconnect();
        S.forEach(function (_, k) { imgFor(k); });
      }, { rootMargin: '400px 0px' });
      io.observe(list);
    }
  })();

  /* ---------------- Entradas al hacer scroll (fade-up con desenfoque) ---------------- */
  (function reveal() {
    var els = document.querySelectorAll('[data-reveal], [data-reveal-glass]');
    if (reduced || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------------- Importaciones: caja y avión se desplazan según el mouse (data-depth) ---------------- */
  (function importStage() {
    var sec = document.getElementById('importaciones');
    var layers = sec ? sec.querySelectorAll('.imp__stage [data-depth]') : [];
    if (!layers.length || reduced) return;
    var raf = 0, x = 0, y = 0, on = false;
    function apply() {
      raf = 0;
      layers.forEach(function (l) {
        var img = l.querySelector('img'), d = parseFloat(l.getAttribute('data-depth'));
        if (!on) { img.style.removeProperty('--mx'); img.style.removeProperty('--my'); img.style.removeProperty('--rot'); return; }
        img.style.setProperty('--mx', (x * 36 * d).toFixed(1) + 'px');
        img.style.setProperty('--my', (y * 26 * d).toFixed(1) + 'px');
        if (l.classList.contains('imp__box')) img.style.setProperty('--rot', (x * 4).toFixed(2) + 'deg');
      });
    }
    sec.addEventListener('pointermove', function (ev) {
      if (ev.pointerType !== 'mouse') return;
      var r = sec.getBoundingClientRect();
      x = (ev.clientX - r.left) / r.width - .5; y = (ev.clientY - r.top) / r.height - .5; on = true;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    sec.addEventListener('pointerleave', function () { on = false; if (!raf) raf = requestAnimationFrame(apply); });
  })();

  /* ---------------- Mercancías Peligrosas: selector de clases IATA ----------------
     Hover (mouse), clic/toque o foco cambian el panel; flechas ← → recorren las clases. */
  (function dangerousGoods() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.dg__tab'));
    var panel = document.getElementById('dg-panel');
    if (!tabs.length || !panel) return;
    var num = document.getElementById('dg-num'), name = document.getElementById('dg-name'), ex = document.getElementById('dg-ex');
    var ind = document.querySelector('.dg__ind');   // indicador rojo deslizante del riel
    var sec = panel.closest('.dg');
    var first = sec.querySelector('.dg__bg');
    var layers = {};                                  // una capa de fondo por imagen, creada al necesitarla
    if (first) layers[first.getAttribute('data-img')] = first;
    var want = first ? first.getAttribute('data-img') : null;
    function layer(key) {
      if (layers[key]) return layers[key];
      var im = new Image();
      im.className = 'dg__bg';
      im.alt = ''; im.setAttribute('aria-hidden', 'true'); im.decoding = 'async';
      im.sizes = '(orientation: portrait) 180vh, 100vw';
      im.srcset = 'img/' + key + '-1000.webp 1000w, img/' + key + '-1600.webp 1600w, img/' + key + '-2400.webp 2400w';
      im.src = 'img/' + key + '-1600.webp';
      first.parentNode.insertBefore(im, first.nextSibling);
      layers[key] = im;
      return im;
    }
    // fundido cruzado: la nueva capa aparece cuando terminó de cargar
    function showBg(key) {
      if (!key || !first) return;
      want = key;
      var im = layer(key);
      function on() {
        if (want !== key) return;
        if (sec.__py) im.style.translate = '0 ' + sec.__py;   // entra con el mismo desplazamiento de parallax
        Object.keys(layers).forEach(function (k) { layers[k].classList.toggle('is-on', k === key); });
      }
      if (im.complete && im.naturalWidth) on(); else im.addEventListener('load', on, { once: true });
    }
    // precarga las demás imágenes en reposo cuando la sección se acerca
    if ('IntersectionObserver' in window) {
      var pre = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        pre.disconnect();
        (window.requestIdleCallback || setTimeout)(function () { tabs.forEach(function (x) { layer(x.getAttribute('data-img')); }); });
      }, { rootMargin: '600px 0px' });
      pre.observe(sec);
    }
    var t = null;
    function pick(tab, focus) {
      if (focus) tab.focus();
      if (tab.getAttribute('aria-selected') === 'true') return;
      tabs.forEach(function (x) { var on = x === tab; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; });
      if (ind) ind.style.setProperty('--i', tabs.indexOf(tab));
      showBg(tab.getAttribute('data-img'));
      panel.classList.add('is-swap');
      clearTimeout(t);
      t = setTimeout(function () {
        num.textContent = tab.getAttribute('data-n');
        name.textContent = tab.getAttribute('data-name');
        ex.textContent = tab.getAttribute('data-ex');
        panel.classList.remove('is-swap');
      }, 180);
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { pick(tab); });
      tab.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') pick(tab); });
      tab.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          pick(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true);
        }
      });
    });
  })();

  /* ---------------- Parallax de fondos (Cifras, Mercancías Peligrosas, Contacto) ----------------
     Solo trabaja mientras la sección está en pantalla (IntersectionObserver activa/desactiva el
     cálculo); escribe --py una vez por cuadro con requestAnimationFrame. La imagen mide 124% de la
     sección, así que el desplazamiento máximo (±10%) nunca deja ver sus bordes. */
  (function parallax() {
    if (reduced || !('IntersectionObserver' in window)) return;
    var secs = Array.prototype.slice.call(document.querySelectorAll('.stats, .dg, .closing'));
    if (!secs.length) return;
    var active = new Set(), ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight;
      active.forEach(function (sec) {
        var r = sec.getBoundingClientRect();
        var p = (vh - r.top) / (vh + r.height);            // 0 al entrar por abajo, 1 al salir por arriba
        p = Math.max(0, Math.min(1, p));
        var y = ((p - 0.5) * 2 * r.height * 0.115).toFixed(1) + 'px';
        // se mueve solo la imagen (antes una variable heredada obligaba a recalcular toda la sección)
        sec.querySelectorAll('.stats__bg, .closing__bg, .dg__bg.is-on').forEach(function (im) { im.style.translate = '0 ' + y; });
        sec.__py = y;
      });
    }
    function request() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) active.add(en.target); else active.delete(en.target); });
      if (active.size) { window.addEventListener('scroll', request, { passive: true }); request(); }
      else window.removeEventListener('scroll', request);
    }, { rootMargin: '100px 0px' });
    secs.forEach(function (s) { io.observe(s); });
    window.addEventListener('resize', request, { passive: true });
  })();

  /* ---------------- Parallax del hero ----------------
     Las escenas del slider bajan al 35% de la velocidad del scroll. Al estar arriba de todo,
     el desplazamiento nunca deja ver un borde: solo «sobra» imagen sobre la parte que ya salió. */
  (function heroParallax() {
    var hero = document.querySelector('.hero');
    var media = hero && hero.querySelector('.hero__media');
    if (!media || reduced || !('IntersectionObserver' in window)) return;
    var on = false, ticking = false;
    function update() {
      ticking = false;
      var y = Math.min(window.scrollY, hero.offsetHeight) * 0.40;
      media.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
    }
    function request() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    new IntersectionObserver(function (en) {
      var vis = en[0].isIntersecting;
      if (vis && !on) { window.addEventListener('scroll', request, { passive: true }); on = true; request(); }
      else if (!vis && on) { window.removeEventListener('scroll', request); on = false; }
    }).observe(hero);
  })();

  /* ---------------- Alianzas: carrusel infinito ----------------
     Duplica la fila (copia oculta a lectores de pantalla) y la desplaza en bucle con CSS.
     Con movimiento reducido queda estática y se desliza a mano. */
  (function allies() {
    var box = document.querySelector('.allies-marquee');
    var track = box && box.querySelector('.allies-track');
    if (!track) return;
    if (reduced) { box.classList.add('is-static'); return; }
    Array.prototype.slice.call(track.children).forEach(function (li) {
      var c = li.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.querySelectorAll('a, button').forEach(function (el) { el.tabIndex = -1; });
      track.appendChild(c);
    });
    track.classList.add('is-looping');
  })();

  /* ---------------- Cifras: tarjetas escalonadas + contadores al entrar ---------------- */
  (function stats() {
    var sec = document.querySelector('.stats');
    if (!sec) return;
    var nums = sec.querySelectorAll('[data-count]');
    function fmt(el, v) { return (el.getAttribute('data-prefix') || '') + v + (el.getAttribute('data-suffix') || ''); }
    // contador con desaceleración; arranca cuando su tarjeta termina de entrar
    function count(el, delay) {
      var to = Number(el.getAttribute('data-count')), dur = 1800;
      setTimeout(function () {
        var t0 = performance.now();
        (function step(now) {
          var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
          el.textContent = fmt(el, Math.round(to * e));
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      }, delay);
    }
    if (reduced || !('IntersectionObserver' in window)) { sec.classList.add('is-in'); return; }
    nums.forEach(function (el) { el.textContent = fmt(el, 0); });
    var io = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      io.disconnect();
      sec.classList.add('is-in');
      nums.forEach(function (el) {
        var card = el.closest('.stats__card');
        var d = card ? parseFloat(card.style.getPropertyValue('--d')) || 0 : 0;
        count(el, d * 1000 + 250);
      });
    }, { threshold: .3 });
    io.observe(sec);
  })();
})();
