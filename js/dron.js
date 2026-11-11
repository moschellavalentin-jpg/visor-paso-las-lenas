/* Vuelo 3D tipo dron (punto 5 del visor): sigue el tronco de El Sosneado al portal N4 a unos cientos de metros sobre el camino, con las 8 paradas de las NOTAS
   (config.json, "dron"). Una sola línea de tiempo sirve para el vuelo interactivo (pausa, velocidad y salto a cada parada) y para grabar el video cuadro por
   cuadro (?dron=video). Relieve: el MDE de 30 m en teselas (sin exageración vertical); la altura de la cámara se controla con el MDE de 60 m. */
'use strict';
(function () {
  function iniciar(V) {
    const { mapa, cfg, P, nf, T } = V;
    const D = cfg.dron, PA = D.paradas;
    const L = P.longitudinal, TU = P.tunel;
    const caja = document.getElementById('dron'), badge = document.getElementById('dron-km'), boton = document.getElementById('b-vuelo');
    const modoVideo = V.q.get('dron') === 'video';

    // ---- la ruta: el tronco y, después del portal, el túnel (para mirar más allá del portal)
    const RK = L.km.concat(TU.km.slice(1)), RLO = L.lon.concat(TU.lon.slice(1)), RLA = L.lat.concat(TU.lat.slice(1));
    const suave = (a, n) => a.map((_, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - n); j <= Math.min(a.length - 1, i + n); j++) { s += a[j]; c++; } return s / c; });
    const RZ = suave(L.cota, 17).concat(TU.rasante.slice(1));  // cota del camino suavizada (±500 m); en el túnel, la rasante
    const idx = (k) => { let lo = 0, hi = RK.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (RK[m] <= k) lo = m; else hi = m; } return lo; };
    const interp = (arr, k) => { const i = idx(k), t = Math.max(0, Math.min(1, (k - RK[i]) / ((RK[i + 1] - RK[i]) || 1))); return arr[i] + t * (arr[i + 1] - arr[i]); };
    function punto(k) {
      if (k >= 0) return [interp(RLO, k), interp(RLA, k)];
      const a = punto(0), b = punto(0.5), f = -k / 0.5;  // antes del km 0, en la misma dirección
      return [a[0] + (a[0] - b[0]) * f, a[1] + (a[1] - b[1]) * f];
    }
    const cota = (k) => interp(RZ, Math.max(0, k));
    const rad = Math.PI / 180, RT = 6371008.8;
    const rumbo = (a, b) => Math.atan2((b[0] - a[0]) * Math.cos(a[1] * rad), b[1] - a[1]) / rad;
    const destino = (o, dist, az) => [o[0] + dist * Math.sin(az * rad) / (RT * Math.cos(o[1] * rad)) / rad, o[1] + dist * Math.cos(az * rad) / RT / rad];
    const suelo = (c) => V.cotaEn(c[0], c[1]);
    const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
    const lerp = (a, b, u) => a + (b - a) * u;
    const mezcla = (A, B, u) => ({ cam: [lerp(A.cam[0], B.cam[0], u), lerp(A.cam[1], B.cam[1], u)], alt: lerp(A.alt, B.alt, u),
      obj: [lerp(A.obj[0], B.obj[0], u), lerp(A.obj[1], B.obj[1], u)], objAlt: lerp(A.objAlt, B.objAlt, u) });

    // ---- poses de la cámara: siguiendo el camino, y en órbita lenta alrededor de cada parada
    const ATRAS = 0.6, ADELANTE = 1.0;  // km
    function seguir(k, extra = 0) {
      const cam = punto(k - ATRAS), obj = punto(k + ADELANTE);
      const base = Math.max(cota(k - ATRAS), suelo(cam) || 0);
      return { cam, alt: base + D.altura_m + extra, obj, objAlt: cota(k + ADELANTE) };
    }
    function orbita(i, az) {
      const pa = PA[i], obj = pa.objetivo, oz = cota(pa.km);
      const cam = destino(obj, D.orbita_m, az);
      return { cam, alt: Math.max(oz + D.altura_m + 100, (suelo(cam) || 0) + 250), obj, objAlt: oz };
    }

    // ---- línea de tiempo (segundos a velocidad 1x)
    const VEL = 1.0, T_PARADA = 9, T_MEZCLA = 2.2, T_INICIO = 6, T_FIN = 7, GIRO = 40;
    const SEG = [];
    let t = 0;
    SEG.push({ tipo: 'inicio', t0: 0, t1: T_INICIO });
    t = T_INICIO;
    let kAnt = PA[0].km;
    PA.forEach((pa, i) => {
      if (pa.km > kAnt + 1e-6) { const dur = Math.max(4, (pa.km - kAnt) / VEL); SEG.push({ tipo: 'viaje', t0: t, t1: t + dur, k0: kAnt, k1: pa.km, i }); t += dur; }
      SEG.push({ tipo: 'parada', t0: t, t1: t + T_PARADA, i });
      t += T_PARADA;
      kAnt = pa.km;
    });
    SEG.push({ tipo: 'fin', t0: t, t1: t + T_FIN });
    const TOTAL = t + T_FIN;
    const segEn = (tt) => SEG.find((s) => tt >= s.t0 && tt < s.t1) || SEG[SEG.length - 1];

    function pose(tt) {
      const s = segEn(tt), u = (tt - s.t0) / (s.t1 - s.t0);
      if (s.tipo === 'inicio') return { pose: seguir(0, lerp(2200, 0, ease(u))), k: 0, s };
      if (s.tipo === 'fin') return { pose: seguir(P.LP, lerp(0, 1800, ease(u))), k: P.LP, s };
      if (s.tipo === 'viaje') { const k = s.k0 + (s.k1 - s.k0) * ease(u); return { pose: seguir(k), k, s }; }
      const pa = PA[s.i], A = seguir(pa.km), az0 = rumbo(pa.objetivo, A.cam), dt = tt - s.t0;
      const azEn = (x) => az0 + GIRO * Math.max(0, Math.min(1, (x - T_MEZCLA) / (T_PARADA - 2 * T_MEZCLA)));
      let p;
      if (dt < T_MEZCLA) p = mezcla(A, orbita(s.i, az0), ease(dt / T_MEZCLA));
      else if (dt > T_PARADA - T_MEZCLA) p = mezcla(orbita(s.i, az0 + GIRO), A, ease((dt - (T_PARADA - T_MEZCLA)) / T_MEZCLA));
      else p = orbita(s.i, azEn(dt));
      return { pose: p, k: pa.km, s };
    }
    function aplicar(p) {
      const o = mapa.calculateCameraOptionsFromTo(new maplibregl.LngLat(p.cam[0], p.cam[1]), p.alt, new maplibregl.LngLat(p.obj[0], p.obj[1]), p.objAlt);
      mapa.jumpTo(o);
    }

    // en el vuelo se ve solo lo que explica la tablita de referencias: se apagan las capas de obra y las menores, y se enciende lo descartado
    // (todo vuelve a como estaba al salir: el mapa 2D no cambia)
    const OCULTAS = ['parcelas', 'zona_camino', 'obras', 'pasos', 'senda', 'afectacion', 'transversales', 'zsf', 'lim_depto', 'lim_internacional', 'urbana',
      'amortiguacion', 'puestos', 'apartaderos', 'servicios', 'nieve', 'drenaje', 'cd01'];
    const ENCENDIDAS = ['descartados'];
    const GRIS = '#8F8F8F', NARANJA = '#F57C00', ROJO = '#D32F2F', MOR = V.MOR;
    // la tablita: máximo 12 renglones; primero lo existente frente a lo propuesto
    const sw = (cont) => `<svg width="38" height="16" viewBox="0 0 38 16" aria-hidden="true">${cont}</svg>`;
    const linea = (c, w, d) => sw(`<line x1="2" y1="8" x2="36" y2="8" stroke="${c}" stroke-width="${w}"${d ? ` stroke-dasharray="${d}"` : ''} stroke-linecap="butt"/>`);
    const area = (c, op, borde) => sw(`<rect x="3" y="2" width="32" height="12" rx="2" fill="${c}" fill-opacity="${op}"${borde ? ` stroke="${borde}" stroke-width="1.2"` : ''}/>`);
    const REFS = [
      [linea(NARANJA, 3), 'Ruta existente (RP 220 hoy)'],
      [linea(ROJO, 3), 'Otras rutas existentes'],
      [sw(`<line x1="2" y1="8" x2="36" y2="8" stroke="${MOR}" stroke-opacity="0.75" stroke-width="9"/>`), 'Traza propuesta'],
      [linea(MOR, 3, '6 3'), 'Túnel propuesto'],
      [sw(`<line x1="2" y1="8" x2="36" y2="8" stroke="#1F1F1E" stroke-width="9"/><line x1="2" y1="8" x2="36" y2="8" stroke="${MOR}" stroke-width="4"/>`), 'Viaducto y puentes propuestos'],
      [area(MOR, 0.4, MOR), 'Complejo B-3, peaje y parador P-6 (propuestos)'],
      [linea('#2F6EB5', 3.5, '2 2'), 'Tramo junto al río, con defensa de margen'],
      [linea(GRIS, 3.5, '5 3'), 'Alternativas descartadas'],
      [linea('#2E7D32', 2.5, '6 3'), 'Límite de la Reserva Laguna del Atuel'],
      [area('#7FD3E6', 0.75, '#4FB3CF'), 'Lecho activo del río (Sentinel-2)'],
      [sw(`<rect x="20" y="3" width="15" height="10" rx="2" fill="#9CC9EE"/><line x1="2" y1="11" x2="20" y2="6" stroke="#4A90D9" stroke-width="2"/>`), 'Ríos, arroyos y laguna'],
      [area('#DDF0FB', 0.95, '#6FA8D6'), 'Glaciares (IANIGLA)'],
    ];
    const ref = document.createElement('section');
    ref.id = 'dron-ref';
    ref.hidden = true;
    ref.innerHTML = '<h4>Referencias<button class="plegar" title="Mostrar u ocultar">▾</button></h4>' + REFS.map(([s, t]) => `<div class="fila">${s}<span>${t}</span></div>`).join('');
    ref.querySelector('.plegar').onclick = () => { ref.classList.toggle('plegada'); ref.querySelector('.plegar').textContent = ref.classList.contains('plegada') ? '▸' : '▾'; };
    document.getElementById('zona-mapa').appendChild(ref);
    // la esquina de la tablita: la de arriba a la derecha si el camino no pasa por ahí; si pasa, otra libre (abajo a la derecha o arriba a la izquierda).
    // Se mira dónde caen en la pantalla los próximos 25 km del camino y el objetivo de la parada; vuelve a su esquina después de 2 s libre.
    const ESQ = V.movil ? ['ar-der', 'ar-izq'] : ['ar-der', 'ab-der', 'ar-izq'];  // en el celular, abajo va la tarjeta de la parada
    let esquina = 'ar-der', libreDesde = null, tapa = false;
    function margenes() {
      const v = document.body.classList.contains('modo-video');
      return v ? { t: 36, r: 40, b: 70, l: 44, badge: badge.offsetHeight + 36 + 14 } : { t: 12, r: 54, b: 64, l: 14, badge: badge.offsetHeight + 14 + 10 };
    }
    function rectDe(e, W_, H_, w, h) {
      const m = margenes();
      if (e === 'ar-der') return { x: W_ - m.r - w, y: m.t, w, h };
      if (e === 'ab-der') return { x: W_ - m.r - w, y: H_ - m.b - h, w, h };
      return { x: m.l, y: m.badge, w, h };
    }
    function ubicar(e) {
      const m = margenes();
      Object.assign(ref.style, { top: '', bottom: '', left: '', right: '' });
      if (e === 'ar-der') Object.assign(ref.style, { top: `${m.t}px`, right: `${m.r}px` });
      else if (e === 'ab-der') Object.assign(ref.style, { bottom: `${m.b}px`, right: `${m.r}px` });
      else Object.assign(ref.style, { top: `${m.badge}px`, left: `${m.l}px` });
      ref.dataset.esquina = e;
      esquina = e;
    }
    function ocupada(e, pts) {
      const c = mapa.getContainer(), r = rectDe(e, c.clientWidth, c.clientHeight, ref.offsetWidth, ref.offsetHeight), g = 12;
      return pts.some((p) => p.x > r.x - g && p.x < r.x + r.w + g && p.y > r.y - g && p.y < r.y + r.h + g);
    }
    function elegirEsquina(k, tt, objetivo) {
      if (ref.hidden) return;
      const pts = [];
      for (let kk = Math.max(0, k - 0.3); kk <= Math.min(RK[RK.length - 1], k + 25); kk += 0.2) pts.push(mapa.project(punto(kk)));
      if (objetivo) pts.push(mapa.project(objetivo));
      if (ocupada(esquina, pts)) {
        const libre = ESQ.find((e) => e !== esquina && !ocupada(e, pts));
        if (libre) ubicar(libre);
        libreDesde = null;
      } else if (esquina !== 'ar-der') {
        if (ocupada('ar-der', pts)) libreDesde = null;
        else if (libreDesde == null || tt < libreDesde) libreDesde = tt;
        else if (tt - libreDesde >= 2) { ubicar('ar-der'); libreDesde = null; }
      }
      tapa = ocupada(esquina, pts);  // solo si ninguna esquina quedó libre
    }
    // la RP 220 existente, fina y naranja, adentro de la banda morada de la traza propuesta: se ve que se mejora la ruta que ya está (donde la traza nueva
    // se aparta, después del km 66,8, la naranja sigue sola)
    let estilo2D = null;
    function estilo3D(si) {
      if (si) {
        estilo2D = { troncoAncho: mapa.getPaintProperty('tronco-1', 'line-width'), troncoOp: mapa.getPaintProperty('tronco-1', 'line-opacity'),
          rutasColor: mapa.getPaintProperty('rutas-0', 'line-color'), casco: mapa.getLayoutProperty('tronco-0', 'visibility'),
          sitios: mapa.getLayoutProperty('sitios-0', 'visibility') };
        mapa.setLayoutProperty('tronco-0', 'visibility', 'none');
        mapa.setLayoutProperty('sitios-0', 'visibility', 'none');  // los círculos de los sitios; sus nombres quedan
        mapa.setPaintProperty('tronco-1', 'line-width', ['interpolate', ['linear'], ['zoom'], 10, 5, 16, 14]);
        mapa.setPaintProperty('tronco-1', 'line-opacity', 0.75);
        mapa.setPaintProperty('rutas-0', 'line-color', ['case', ['==', ['get', 'etiqueta'], 'RP 220'], NARANJA, ROJO]);
        if (!mapa.getLayer('rp220-3d')) {
          mapa.addLayer({ id: 'rp220-3d', type: 'line', source: 'c-rutas', filter: ['==', ['get', 'etiqueta'], 'RP 220'], layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': NARANJA, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.4, 16, 3] } }, 'desvio-0');
        }
      } else if (estilo2D) {
        if (mapa.getLayer('rp220-3d')) mapa.removeLayer('rp220-3d');
        mapa.setLayoutProperty('tronco-0', 'visibility', estilo2D.casco || 'visible');
        mapa.setLayoutProperty('sitios-0', 'visibility', estilo2D.sitios || 'visible');
        mapa.setPaintProperty('tronco-1', 'line-width', estilo2D.troncoAncho);
        mapa.setPaintProperty('tronco-1', 'line-opacity', estilo2D.troncoOp == null ? 1 : estilo2D.troncoOp);
        mapa.setPaintProperty('rutas-0', 'line-color', estilo2D.rutasColor);
        estilo2D = null;
      }
    }

    // ---- la tarjeta: título y texto de cada parada, avance y controles
    let tActual = 0, jugando = false, vel = 1, ultimo = null, activo = false, antes = null, segMostrado = null;
    function tarjeta(s) {
      let paso, titulo, texto;
      if (s.tipo === 'inicio') { paso = 'Vuelo 3D'; titulo = T.titulo; texto = D.inicio; }
      else if (s.tipo === 'fin') { paso = 'Fin del recorrido'; titulo = 'Portal N4 y túnel a Chile'; texto = D.fin; }
      else if (s.tipo === 'viaje') { paso = `Hacia la parada ${s.i + 1} de ${PA.length}`; titulo = PA[s.i].titulo; texto = ''; }
      else { paso = `Parada ${s.i + 1} de ${PA.length} · km ${nf(PA[s.i].km, 1)}`; titulo = PA[s.i].titulo; texto = PA[s.i].texto; }
      caja.innerHTML = `<div class="d-paso">${paso}</div><h3>${titulo}</h3>${texto ? `<p>${texto}</p>` : ''}` +
        `<div class="d-barra" title="Ir a ese momento"><div class="d-avance"></div>${SEG.filter((x) => x.tipo === 'parada').map((x) => `<span style="left:${x.t0 / TOTAL * 100}%" title="${PA[x.i].titulo}"></span>`).join('')}</div>` +
        `<div class="d-controles"><button data-a="jugar" class="principal">${jugando ? 'Pausa' : 'Seguir'}</button>` +
        `<select data-a="vel" title="Velocidad">${[0.5, 1, 2].map((v) => `<option value="${v}"${v === vel ? ' selected' : ''}>${nf(v, v % 1 ? 1 : 0)}×</option>`).join('')}</select>` +
        `<select data-a="parada" title="Ir a una parada"><option value="">Ir a una parada…</option>${PA.map((pa, i) => `<option value="${i}">${i + 1}. ${pa.titulo}</option>`).join('')}</select>` +
        '<button data-a="salir">Salir</button></div>';
      segMostrado = s;
    }
    function poner(tt) {
      tActual = Math.max(0, Math.min(TOTAL - 1e-3, tt));
      const r = pose(tActual);
      aplicar(r.pose);
      elegirEsquina(r.k, tActual, r.s.tipo === 'parada' ? PA[r.s.i].objetivo : null);
      if (r.s !== segMostrado) tarjeta(r.s);
      const av = caja.querySelector('.d-avance');
      if (av) av.style.width = `${tActual / TOTAL * 100}%`;
      badge.textContent = `km ${nf(r.k, 1)}`;
    }
    // notebook común: si el vuelo anda a menos de unos 22 cuadros por segundo en una pantalla de alta densidad, se dibuja a densidad 1 (2 a 4 veces menos)
    let muestras = [], reducido = false;
    function medir(dt) {
      muestras.push(dt);
      if (muestras.length < 90) return;
      const media = muestras.reduce((a, b) => a + b, 0) / muestras.length;
      muestras = [];
      if (media > 45 && !reducido && (window.devicePixelRatio || 1) > 1) { reducido = true; mapa.setPixelRatio(1); }
    }
    function cuadro(ts) {
      if (!activo) return;
      if (jugando && ultimo != null) {
        if (!modoVideo) medir(ts - ultimo);
        poner(tActual + (ts - ultimo) / 1000 * vel);
        if (tActual >= TOTAL - 2e-3) { jugando = false; tarjeta(segEn(tActual)); }
      }
      ultimo = ts;
      requestAnimationFrame(cuadro);
    }
    caja.addEventListener('click', (e) => {
      const a = e.target.dataset.a;
      if (a === 'jugar') { jugando = !jugando; if (jugando && tActual >= TOTAL - 0.01) poner(0); e.target.textContent = jugando ? 'Pausa' : 'Seguir'; }
      else if (a === 'salir') salir();
      else if (e.target.closest('.d-barra')) { const r = e.target.closest('.d-barra').getBoundingClientRect(); poner((e.clientX - r.left) / r.width * TOTAL); }
    });
    caja.addEventListener('change', (e) => {
      if (e.target.dataset.a === 'vel') vel = Number(e.target.value);
      if (e.target.dataset.a === 'parada' && e.target.value !== '') { const s = SEG.find((x) => x.tipo === 'parada' && x.i === Number(e.target.value)); poner(s.t0 + T_MEZCLA); }
    });
    document.addEventListener('keydown', (e) => {
      if (!activo || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === ' ') { e.preventDefault(); caja.querySelector('[data-a=jugar]').click(); }
      else if (e.key === 'Escape') salir();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const ps = SEG.filter((x) => x.tipo === 'parada');
        const sig = e.key === 'ArrowRight' ? ps.find((x) => x.t0 > tActual + 0.5) : ps.slice().reverse().find((x) => x.t0 + T_MEZCLA < tActual - 0.5);
        if (sig) poner(sig.t0 + T_MEZCLA);
      }
    });

    // ---- entrar y salir del vuelo: relieve, cielo, imagen propia (y Argenmap debajo, para el horizonte fuera de la zona) y sin panel
    async function entrar(tInicial = 0, jugar = true) {
      if (activo) return;
      antes = { base: V.base(), panel: !document.getElementById('panel').classList.contains('oculto'), cam: { center: mapa.getCenter(), zoom: mapa.getZoom(), bearing: mapa.getBearing(), pitch: mapa.getPitch() } };
      if (V.perfiles) V.perfiles.cerrar();
      const rec = document.getElementById('recorrido');
      if (!rec.hidden) rec.querySelector('[data-a=salir]').click();
      V.panel(false);
      antes.capas = Object.fromEntries(OCULTAS.concat(ENCENDIDAS).map((id) => [id, V.capaVisible(id)]));
      OCULTAS.forEach((id) => V.mostrarCapa(id, false));
      ENCENDIDAS.forEach((id) => V.mostrarCapa(id, true));
      estilo3D(true);
      activo = true; jugando = false;
      boton.classList.add('activo');
      await V.cargarMDE();
      V.ponerBase('sentinel', false);  // la imagen propia sola: cubre toda Mendoza y el horizonte se ve sin conexión
      mapa.setTerrain({ source: V.movil ? 'relieve-movil' : 'relieve', exaggeration: 1 });
      if (V.movil) {  // celular: 3D liviano (densidad 1, relieve hasta el zoom 10) y la tablita plegada, con su botón
        reducido = true;
        mapa.setPixelRatio(1);
        ref.classList.add('plegada');
        ref.querySelector('.plegar').textContent = '▸';
      }
      try {
        mapa.setSky({ 'sky-color': '#8DB6E0', 'horizon-color': '#E6ECF2', 'fog-color': '#E6ECF2', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.75, 'atmosphere-blend': 0.6 });
      } catch (err) { /* sin cielo, el vuelo igual anda */ }
      caja.hidden = false; badge.hidden = false; ref.hidden = false;
      ubicar('ar-der');
      setTimeout(() => { mapa.resize(); poner(tInicial); jugando = jugar; tarjeta(segEn(tActual)); ultimo = null; requestAnimationFrame(cuadro); }, 60);
    }
    function salir() {
      if (!activo) return;
      activo = false; jugando = false;
      caja.hidden = true; badge.hidden = true; ref.hidden = true;
      estilo3D(false);
      boton.classList.remove('activo');
      mapa.setTerrain(null);
      if (reducido) { reducido = false; mapa.setPixelRatio(window.devicePixelRatio || 1); }
      V.ponerBase(antes.base);
      OCULTAS.concat(ENCENDIDAS).forEach((id) => V.mostrarCapa(id, antes.capas[id]));
      V.panel(antes.panel);
      setTimeout(() => mapa.jumpTo(antes.cam), 60);
    }
    boton.onclick = () => (activo ? salir() : entrar());

    // ---- ?dron=1 abre el vuelo (&t=segundos, &pausa=1); ?dron=video lo prepara para grabar cuadro por cuadro
    const qd = V.q.get('dron');
    if (qd) {
      if (modoVideo) { document.body.classList.add('modo-video'); setTimeout(() => mapa.resize(), 30); }
      entrar(Number(V.q.get('t')) || 0, !(modoVideo || V.q.get('pausa')));
    }
    window.dron = {
      total: TOTAL,
      tablita: () => ({ esquina, tapa }),
      paradas: SEG.filter((x) => x.tipo === 'parada').map((x) => ({ titulo: PA[x.i].titulo, t0: x.t0, t1: x.t1 })),
      irA: (tt, espera = 20000) => new Promise((res) => {  // para el video: pone la cámara en tt y espera a que el mapa termine de dibujar
        let listo = false;
        const fin = (ok) => { if (!listo) { listo = true; res(ok); } };
        mapa.once('idle', () => fin(true));
        setTimeout(() => fin(false), espera);
        poner(tt);
        mapa.triggerRepaint();
      }),
    };
  }
  if (window.visorAPI && window.visorAPI.listo) iniciar(window.visorAPI);
  else window.addEventListener('visor:listo', (e) => iniciar(e.detail), { once: true });
})();
