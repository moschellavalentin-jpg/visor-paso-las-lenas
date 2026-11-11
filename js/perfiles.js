/* Perfiles interactivos (puntos 2 y 4 del visor): el longitudinal del tronco y del túnel, con la rasante y la pendiente del terreno frente a la máxima de la
   norma; los tres transversales; y el perfil que dibuja el usuario sobre el mapa, leído del MDE de 60 m (datos/mde_60m.bin). Son los mismos datos de la lámina 2/4 (datos/perfiles.json, que arma e07_18_visor.py).
   Al pasar el mouse, el punto se marca en el mapa; con un clic, el mapa va a ese punto. Gráficos en SVG, sin bibliotecas: funciona sin internet. */
'use strict';
(function () {
  function iniciar(V) {
    const { mapa, P, nf, MOR } = V;
    const TX = V.T.perfiles;
    const C = { tierra: '#7A6A55', reserva: '#2E7D32', corte: '#D9A441', relleno: '#6E9CC7', tunel: '#D8D2C6', texto: '#1F1F1E', texto2: '#4A4A4A', grilla: '#E2DED6' };
    const panel = document.getElementById('perfiles');
    const cont = document.getElementById('p-grafico');
    const nota = document.getElementById('p-nota');
    const boton = document.getElementById('b-perfiles');
    const NS = 'http://www.w3.org/2000/svg';
    const L = P.longitudinal, TU = P.tunel;
    let vista = 'longitudinal';

    const el = (tag, at, padre, texto) => {
      const e = document.createElementNS(NS, tag);
      Object.entries(at).forEach(([k, v]) => { if (v != null) e.setAttribute(k, v); });
      if (texto != null) e.textContent = texto;
      if (padre) padre.appendChild(e);
      return e;
    };
    const ruta = (xs, ys) => xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join('');
    const cerca = (arr, v) => {  // indice del valor mas cercano en un arreglo creciente
      let lo = 0, hi = arr.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m; else hi = m; }
      return Math.abs(arr[lo] - v) <= Math.abs(arr[hi] - v) ? lo : hi;
    };
    const seccion = (k) => (P.secciones.find((s) => k >= s.km0 - 0.05 && k <= s.km1 + 0.05) || P.secciones[k < 66.85 ? 0 : 1]).nombre;
    const info = document.createElement('div');
    info.className = 'p-info';
    function mostrarInfo(html, x, y) {
      info.innerHTML = html;
      info.hidden = false;
      const w = info.offsetWidth, h = info.offsetHeight, W = cont.clientWidth, H = cont.clientHeight;
      info.style.left = `${x + 14 + w > W - 4 ? x - w - 14 : x + 14}px`;
      info.style.top = `${Math.max(4, Math.min(H - h - 4, y - h / 2))}px`;
    }

    function abrir(v) {
      vista = v || vista;
      panel.hidden = false;
      boton.classList.add('activo');
      panel.querySelectorAll('.pestanas button').forEach((b) => b.classList.toggle('activo', b.dataset.p === vista));
      nota.textContent = TX[vista];
      acciones.hidden = vista !== 'dibujado';
      if (vista === 'dibujado' && puntos.length < 2 && !dibujando) empezarDibujo();
      if (vista === 'transversales') {  // las trazas en el mapa
        V.mostrarCapa('transversales', true);
        const lon = P.transversales.flatMap((t) => t.lon), lat = P.transversales.flatMap((t) => t.lat);
        setTimeout(() => mapa.fitBounds([[Math.min(...lon), Math.min(...lat)], [Math.max(...lon), Math.max(...lat)]], { padding: 60, duration: 900 }), 60);
      }
      requestAnimationFrame(() => { mapa.resize(); dibujar(); });
    }
    function cerrar() {
      if (dibujando) terminar(true);
      panel.hidden = true;
      boton.classList.remove('activo');
      V.marcar(null);
      setTimeout(() => mapa.resize(), 30);
    }
    boton.onclick = () => (panel.hidden ? abrir() : cerrar());
    document.getElementById('p-cerrar').onclick = cerrar;
    panel.querySelectorAll('.pestanas button').forEach((b) => { b.onclick = () => abrir(b.dataset.p); });
    window.addEventListener('resize', () => { if (!panel.hidden) dibujar(); });

    function dibujar() {
      cont.innerHTML = '';
      const W = cont.clientWidth, H = cont.clientHeight;
      if (W < 60 || H < 60) return;
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}` }, cont);
      cont.appendChild(info);
      info.hidden = true;
      ({ longitudinal, transversales, dibujado })[vista](svg, W, H);
    }

    // ------------------------------------------------------------------ perfil dibujado (punto 4): clic para marcar puntos; doble clic o Terminar para cerrar
    const acciones = document.getElementById('p-acciones');
    let puntos = [], dibujando = false, PD = null;
    const vacio = { type: 'FeatureCollection', features: [] };
    mapa.addSource('dibujo', { type: 'geojson', data: vacio });
    mapa.addLayer({ id: 'dibujo-linea', type: 'line', source: 'dibujo', filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'guia'], 0]],
      paint: { 'line-color': '#E65100', 'line-width': 3 } }, 'marca');
    mapa.addLayer({ id: 'dibujo-guia', type: 'line', source: 'dibujo', filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'guia'], 1]],
      paint: { 'line-color': '#E65100', 'line-width': 2, 'line-dasharray': [1.5, 1.5] } }, 'marca');
    mapa.addLayer({ id: 'dibujo-vertices', type: 'circle', source: 'dibujo', filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-radius': 4.5, 'circle-color': '#ffffff', 'circle-stroke-color': '#E65100', 'circle-stroke-width': 2.5 } }, 'marca');
    function pintarDibujo(guia) {
      const f = puntos.map((c) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: {} }));
      if (puntos.length > 1) f.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: puntos }, properties: { guia: 0 } });
      if (guia && puntos.length) f.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [puntos[puntos.length - 1], guia] }, properties: { guia: 1 } });
      mapa.getSource('dibujo').setData({ type: 'FeatureCollection', features: f });
    }
    function empezarDibujo() {
      puntos = []; PD = null; dibujando = true; V.ocupado = true;
      mapa.doubleClickZoom.disable();
      mapa.getCanvas().style.cursor = 'crosshair';
      pintarDibujo();
      V.cargarMDE();
      if (!panel.hidden && vista === 'dibujado') dibujar();
    }
    function terminar(cancelar) {
      puntos = puntos.filter((c, i) => i === 0 || Math.abs(c[0] - puntos[i - 1][0]) + Math.abs(c[1] - puntos[i - 1][1]) > 1e-7);  // el doble clic marca dos veces
      dibujando = false; V.ocupado = false;
      mapa.getCanvas().style.cursor = '';
      setTimeout(() => mapa.doubleClickZoom.enable(), 400);
      if (cancelar || puntos.length < 2) { if (puntos.length < 2) { puntos = []; pintarDibujo(); } return; }
      pintarDibujo();
      V.cargarMDE().then(() => { PD = calcular(); if (!panel.hidden && vista === 'dibujado') dibujar(); });
    }
    mapa.on('click', (e) => { if (dibujando) { puntos.push([e.lngLat.lng, e.lngLat.lat]); pintarDibujo(); } });
    mapa.on('dblclick', (e) => { if (dibujando) { e.preventDefault(); terminar(); } });
    mapa.on('mousemove', (e) => { if (dibujando && puntos.length) pintarDibujo([e.lngLat.lng, e.lngLat.lat]); });
    document.addEventListener('keydown', (e) => { if (dibujando && e.key === 'Enter') terminar(); if (dibujando && e.key === 'Escape') { puntos = []; terminar(true); dibujar(); } });
    document.getElementById('p-terminar').onclick = () => terminar();
    document.getElementById('p-nuevo').onclick = () => empezarDibujo();
    document.getElementById('p-borrar').onclick = () => { puntos = []; PD = null; if (dibujando) terminar(true); pintarDibujo(); V.marcar(null); dibujar(); };

    const RT = 6371008.8, rad = Math.PI / 180;
    const distancia = (a, b) => {  // haversine, en metros
      const dl = (b[1] - a[1]) * rad, dn = (b[0] - a[0]) * rad;
      const h = Math.sin(dl / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dn / 2) ** 2;
      return 2 * RT * Math.asin(Math.sqrt(h));
    };
    function calcular() {
      // muestras cada 30 m (la mitad de la celda del MDE; si la linea es muy larga, hasta 4.000 muestras)
      const largos = puntos.slice(1).map((c, i) => distancia(puntos[i], c)), total = largos.reduce((a, b) => a + b, 0);
      const paso = Math.max(30, total / 4000);
      const d = [], lon = [], lat = [], z = [];
      let acum = 0;
      largos.forEach((Ls, i) => {
        const a = puntos[i], b = puntos[i + 1], n = Math.max(1, Math.round(Ls / paso));
        for (let j = 0; j < n; j++) {
          const t = j / n;
          d.push(acum + Ls * t); lon.push(a[0] + (b[0] - a[0]) * t); lat.push(a[1] + (b[1] - a[1]) * t);
        }
        acum += Ls;
      });
      d.push(total); lon.push(puntos[puntos.length - 1][0]); lat.push(puntos[puntos.length - 1][1]);
      lon.forEach((x, i) => z.push(V.cotaEn(x, lat[i])));
      // pendiente del terreno en tramos de 300 m (150 m antes y después), como la del tronco
      const pend = d.map((di, i) => {
        let a = i, b = i;
        while (a > 0 && di - d[a - 1] <= 150) a--;
        while (b < d.length - 1 && d[b + 1] - di <= 150) b++;
        return z[a] == null || z[b] == null || d[b] === d[a] ? null : (z[b] - z[a]) / (d[b] - d[a]) * 100;
      });
      const zv = z.filter((v) => v != null), pv = pend.filter((v) => v != null).map(Math.abs);
      let sube = 0, baja = 0;
      for (let i = 1; i < z.length; i++) if (z[i] != null && z[i - 1] != null) { const dz = z[i] - z[i - 1]; if (dz > 0) sube += dz; else baja -= dz; }
      return { d, lon, lat, z, pend, total, sube, baja, fuera: z.length - zv.length, zmin: Math.min(...zv), zmax: Math.max(...zv),
        media: zv.length > 1 ? (z[z.length - 1] - z[0]) / total * 100 : null, pmax: pv.length ? Math.max(...pv) : null };
    }

    function dibujado(svg, W, H) {
      if (!PD) {
        el('text', { x: W / 2, y: H / 2 - 8, 'text-anchor': 'middle', 'font-size': 14, fill: C.texto2 }, svg,
          dibujando ? 'Hacé clic en el mapa para marcar los puntos de la línea.' : 'Para dibujar un perfil, tocá «Dibujar otro».');
        el('text', { x: W / 2, y: H / 2 + 14, 'text-anchor': 'middle', 'font-size': 12, fill: C.texto2 }, svg,
          'Doble clic, Enter o «Terminar» para cerrar la línea; Esc la borra.');
        return;
      }
      const m = { l: 58, r: 18, t: 34, b: 24 }, gap = 24;
      const hP = Math.max(44, Math.round((H - m.t - m.b) * 0.27)), hZ = H - m.t - m.b - gap - hP;
      const z0 = Math.floor(PD.zmin / 50) * 50 - 50, z1 = Math.ceil(PD.zmax / 50) * 50 + 50;
      const X = (dm) => m.l + dm / PD.total * (W - m.l - m.r);
      const Y = (zz) => m.t + (1 - (zz - z0) / (z1 - z0)) * hZ;
      const yP = m.t + hZ + gap, pMax = Math.min(40, Math.max(14, Math.ceil(((PD.pmax || 0) + 1) / 5) * 5));  // más de 40 %, en el borde
      const YP = (pp) => yP + (1 - Math.min(pp, pMax) / pMax) * hP;
      const exag = (hZ / (z1 - z0)) / ((W - m.l - m.r) / PD.total);
      // resumen
      el('text', { x: m.l, y: 14, 'font-size': 12, fill: C.texto }, svg,
        `Largo: ${nf(PD.total / 1000, 2)} km · cota de ${nf(PD.zmin)} a ${nf(PD.zmax)} m · sube ${nf(PD.sube)} m y baja ${nf(PD.baja)} m · ` +
        `pendiente media ${nf(PD.media, 1)} % · la mayor en 300 m: ${nf(PD.pmax, 1)} % · escala vertical: ${nf(exag, 1)} veces la horizontal` +
        (PD.pmax > 40 ? ' (en el gráfico, más de 40 % va en el borde)' : '') + (PD.fuera ? ` · ${PD.fuera} muestras fuera del área del modelo` : ''));
      const pasoZ = [50, 100, 200, 250, 500, 1000].find((v) => (z1 - z0) / v <= 6) || 1000;
      for (let zz = Math.ceil(z0 / pasoZ) * pasoZ; zz <= z1; zz += pasoZ) {
        el('line', { x1: m.l, x2: W - m.r, y1: Y(zz), y2: Y(zz), stroke: C.grilla, 'stroke-width': 0.7 }, svg);
        el('text', { x: m.l - 6, y: Y(zz) + 4, 'text-anchor': 'end', 'font-size': 11, fill: C.texto2 }, svg, nf(zz));
      }
      el('text', { x: 13, y: m.t + hZ / 2, 'font-size': 11, fill: C.texto2, 'text-anchor': 'middle', transform: `rotate(-90 13 ${m.t + hZ / 2})` }, svg, 'cota (m)');
      // terreno: tramos continuos (sin los puntos fuera del modelo)
      let tramoX = [], tramoY = [];
      const cerrarTramo = () => {
        if (tramoX.length > 1) {
          el('path', { d: ruta(tramoX, tramoY) + `L${tramoX[tramoX.length - 1]},${m.t + hZ}L${tramoX[0]},${m.t + hZ}Z`, fill: '#E9E4DA' }, svg);
          el('path', { d: ruta(tramoX, tramoY), fill: 'none', stroke: C.tierra, 'stroke-width': 1.3 }, svg);
        }
        tramoX = []; tramoY = [];
      };
      PD.d.forEach((dm, i) => { if (PD.z[i] == null) cerrarTramo(); else { tramoX.push(X(dm)); tramoY.push(Y(PD.z[i])); } });
      cerrarTramo();
      // pendiente del terreno en 300 m, con la máxima absoluta de la norma como referencia
      (pMax <= 20 ? [0, 5, 10].concat(pMax > 14 ? [pMax] : []) : [0, 10, 20, 30, 40].filter((v) => v <= pMax)).forEach((pp) => {
        el('line', { x1: m.l, x2: W - m.r, y1: YP(pp), y2: YP(pp), stroke: C.grilla, 'stroke-width': 0.7 }, svg);
        el('text', { x: m.l - 6, y: YP(pp) + 4, 'text-anchor': 'end', 'font-size': 11, fill: C.texto2 }, svg, `${pp} %`);
      });
      [P.dnv.fuera[1], P.dnv.dentro[1]].forEach((pp, i) => el('line', { x1: m.l, x2: W - m.r, y1: YP(pp), y2: YP(pp), stroke: i ? C.texto : C.texto2, 'stroke-width': 1,
        'stroke-dasharray': i ? null : '4 3' }, svg));
      el('text', { x: W - m.r - 4, y: YP(P.dnv.dentro[1]) - 4, 'text-anchor': 'end', 'font-size': 10.5, fill: C.texto2 }, svg,
        `máxima absoluta (DNV, 2010): ${P.dnv.fuera[1]} % para ${P.dnv.fuera[2]} km/h (trazos) y ${P.dnv.dentro[1]} % para ${P.dnv.dentro[2]} km/h`);
      let dp = '';
      PD.d.forEach((dm, i) => { if (PD.pend[i] != null) dp += `${dp && PD.pend[i - 1] != null ? 'L' : 'M'}${X(dm).toFixed(1)},${YP(Math.abs(PD.pend[i])).toFixed(1)}`; });
      el('path', { d: dp, fill: 'none', stroke: '#E65100', 'stroke-width': 1.1 }, svg);
      el('text', { x: 13, y: yP + hP / 2, 'font-size': 11, fill: C.texto2, 'text-anchor': 'middle', transform: `rotate(-90 13 ${yP + hP / 2})` }, svg, 'pendiente');
      const pasoD = [0.1, 0.25, 0.5, 1, 2, 5, 10].find((v) => PD.total / 1000 / v <= 10) || 10;
      for (let dk = 0; dk <= PD.total / 1000 + 1e-9; dk += pasoD) el('text', { x: X(dk * 1000), y: H - 6, 'text-anchor': 'middle', 'font-size': 11, fill: C.texto2 }, svg, `${nf(dk, pasoD < 1 ? 2 : 0)} km`);
      // cursor
      const cursor = el('line', { y1: m.t, y2: yP + hP, stroke: '#E65100', 'stroke-width': 1, visibility: 'hidden' }, svg);
      const punto = el('circle', { r: 4.5, fill: '#ffffff', stroke: '#E65100', 'stroke-width': 2, visibility: 'hidden' }, svg);
      const zona = el('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: yP + hP - m.t, fill: 'transparent', style: 'cursor: crosshair' }, svg);
      let actual = null;
      zona.addEventListener('mousemove', (ev) => {
        const r = svg.getBoundingClientRect();
        const dm = Math.max(0, Math.min(PD.total, ((ev.clientX - r.left) * (W / r.width) - m.l) / (W - m.l - m.r) * PD.total));
        const i = cerca(PD.d, dm), x = X(PD.d[i]);
        actual = [PD.lon[i], PD.lat[i]];
        cursor.setAttribute('x1', x); cursor.setAttribute('x2', x); cursor.setAttribute('visibility', 'visible');
        if (PD.z[i] != null) { punto.setAttribute('cx', x); punto.setAttribute('cy', Y(PD.z[i])); punto.setAttribute('visibility', 'visible'); } else punto.setAttribute('visibility', 'hidden');
        mostrarInfo(`<b>a ${nf(PD.d[i] / 1000, 2)} km del inicio</b><br>` + (PD.z[i] == null ? 'fuera del área del modelo' :
          `cota del terreno: ${nf(PD.z[i])} m<br>pendiente en 300 m: ${PD.pend[i] == null ? '—' : nf(PD.pend[i], 1) + ' %'}`), x, PD.z[i] == null ? m.t + hZ / 2 : Y(PD.z[i]));
        V.marcar(actual[0], actual[1], '');
      });
      zona.addEventListener('mouseleave', () => { cursor.setAttribute('visibility', 'hidden'); punto.setAttribute('visibility', 'hidden'); info.hidden = true; V.marcar(null); });
      zona.addEventListener('click', () => { if (actual) mapa.easeTo({ center: actual, duration: 700 }); });
    }
    // ?dibujo=lon,lat;lon,lat;... dibuja esa linea (para enlazar un perfil)
    const qd = V.q.get('dibujo');
    if (qd) {
      puntos = qd.split(';').map((par) => par.split(',').map(Number)).filter((c) => c.length === 2 && c.every(Number.isFinite));
      if (puntos.length > 1) { pintarDibujo(); V.cargarMDE().then(() => { PD = calcular(); abrir('dibujado'); }); }
    }

    // ------------------------------------------------------------------ longitudinal: tronco y túnel
    function longitudinal(svg, W, H) {
      const m = { l: 58, r: 18, t: 30, b: 24 }, gap = 26;
      const hP = Math.max(48, Math.round((H - m.t - m.b) * 0.27));
      const hZ = H - m.t - m.b - gap - hP;
      const xMax = P.LP + P.LT;
      const todas = L.cota.concat(TU.terreno, TU.rasante);
      const z0 = Math.floor(Math.min(...todas) / 250) * 250, z1 = Math.ceil(Math.max(...todas) / 250) * 250 + 250;
      const X = (k) => m.l + (k / xMax) * (W - m.l - m.r);
      const Y = (z) => m.t + (1 - (z - z0) / (z1 - z0)) * hZ;
      const yP = m.t + hZ + gap, pMax = 14;
      const YP = (p) => yP + (1 - Math.min(p, pMax) / pMax) * hP;
      // dentro de la Reserva
      for (let i = 0; i < L.km.length;) {
        if (!L.reserva[i]) { i++; continue; }
        let j = i;
        while (j + 1 < L.km.length && L.reserva[j + 1]) j++;
        [[m.t, hZ], [yP, hP]].forEach(([y, h]) => el('rect', { x: X(L.km[i]), y, width: X(L.km[j]) - X(L.km[i]), height: h, fill: C.reserva, 'fill-opacity': 0.08 }, svg));
        i = j + 1;
      }
      // grilla de cotas
      for (let z = Math.ceil(z0 / 500) * 500; z <= z1; z += 500) {
        el('line', { x1: m.l, x2: W - m.r, y1: Y(z), y2: Y(z), stroke: C.grilla, 'stroke-width': 0.7 }, svg);
        el('text', { x: m.l - 6, y: Y(z) + 4, 'text-anchor': 'end', 'font-size': 11, fill: C.texto2 }, svg, nf(z));
      }
      el('text', { x: 13, y: m.t + hZ / 2, 'font-size': 11, fill: C.texto2, 'text-anchor': 'middle', transform: `rotate(-90 13 ${m.t + hZ / 2})` }, svg, 'cota (m)');
      // túnel: entre la rasante y la superficie
      const xt = TU.km.map(X);
      el('path', { d: ruta(xt, TU.terreno.map(Y)) + ruta(xt.slice().reverse(), TU.rasante.slice().reverse().map(Y)).replace('M', 'L') + 'Z', fill: C.tunel, 'fill-opacity': 0.6 }, svg);
      // rasante: corte y relleno
      P.rasantes.forEach((r) => {
        for (let k = 0; k < r.km.length - 1; k++) {
          const d = (r.terreno[k] - r.rasante[k]) + (r.terreno[k + 1] - r.rasante[k + 1]);
          if (Math.abs(d) < 0.2) continue;
          el('path', { d: `M${X(r.km[k])},${Y(r.rasante[k])}L${X(r.km[k + 1])},${Y(r.rasante[k + 1])}L${X(r.km[k + 1])},${Y(r.terreno[k + 1])}L${X(r.km[k])},${Y(r.terreno[k])}Z`,
            fill: d > 0 ? C.corte : C.relleno, 'fill-opacity': 0.9 }, svg);
        }
      });
      el('path', { d: ruta(L.km.map(X), L.cota.map(Y)), fill: 'none', stroke: C.tierra, 'stroke-width': 1.1 }, svg);
      el('path', { d: ruta(xt, TU.terreno.map(Y)), fill: 'none', stroke: C.tierra, 'stroke-width': 1.1 }, svg);
      P.rasantes.forEach((r) => el('path', { d: ruta(r.km.map(X), r.rasante.map(Y)), fill: 'none', stroke: MOR, 'stroke-width': 1.8 }, svg));
      el('path', { d: ruta(xt, TU.rasante.map(Y)), fill: 'none', stroke: MOR, 'stroke-width': 1.8, 'stroke-dasharray': '6 3' }, svg);
      // límite internacional y lugares
      el('line', { x1: X(P.limite_km), x2: X(P.limite_km), y1: m.t, y2: m.t + hZ, stroke: C.texto, 'stroke-width': 1 }, svg);
      el('text', { x: X(P.limite_km) + 4, y: m.t + hZ - 8, 'text-anchor': 'start', 'font-size': 11, fill: C.texto }, svg, 'Chile');
      P.marcas.forEach((mk) => {
        const z = mk.km <= P.LP ? L.cota[cerca(L.km, mk.km)] : TU.terreno[TU.terreno.length - 1];
        const x = X(mk.km), y = Y(z), yl = Math.max(m.t + 10, y - 28);
        el('line', { x1: x, x2: x, y1: y - 5, y2: yl + 3, stroke: C.texto2, 'stroke-width': 0.7 }, svg);
        el('text', { x, y: yl, 'text-anchor': mk.nombre === 'portal chileno' ? 'end' : mk.nombre === 'portal N4' ? 'end' : 'middle', 'font-size': 11, 'font-weight': 'bold', fill: C.texto }, svg, mk.nombre);
      });
      el('text', { x: X((P.LP + P.limite_km) / 2), y: m.t + hZ - 8, 'text-anchor': 'middle', 'font-size': 11, fill: MOR }, svg, 'túnel');
      el('text', { x: X(P.limite_km), y: m.t - 4, 'text-anchor': 'middle', 'font-size': 10.5, fill: C.texto }, svg, 'límite internacional');
      // pendiente del terreno frente a la máxima de la norma
      [0, 5, 10].forEach((p) => {
        el('line', { x1: m.l, x2: X(P.LP), y1: YP(p), y2: YP(p), stroke: C.grilla, 'stroke-width': 0.7 }, svg);
        el('text', { x: m.l - 6, y: YP(p) + 4, 'text-anchor': 'end', 'font-size': 11, fill: C.texto2 }, svg, `${p} %`);
      });
      el('path', { d: ruta(L.km.map(X), L.pend.map(YP)), fill: 'none', stroke: C.tierra, 'stroke-width': 0.8 }, svg);
      const escalon = (n) => ruta(L.km.map(X), L.km.map((k, i) => YP((L.reserva[i] ? P.dnv.dentro : P.dnv.fuera)[n])));
      el('path', { d: escalon(0), fill: 'none', stroke: C.texto2, 'stroke-width': 1.1, 'stroke-dasharray': '4 3' }, svg);
      el('path', { d: escalon(1), fill: 'none', stroke: C.texto, 'stroke-width': 1.2 }, svg);
      el('text', { x: 13, y: yP + hP / 2, 'font-size': 11, fill: C.texto2, 'text-anchor': 'middle', transform: `rotate(-90 13 ${yP + hP / 2})` }, svg, 'pendiente');
      for (let k = 0; k <= P.LP; k += 10) el('text', { x: X(k), y: H - 6, 'text-anchor': 'middle', 'font-size': 11, fill: C.texto2 }, svg, `km ${k}`);
      // leyenda
      const ley = [['linea', C.tierra, 'terreno (modelo de 30 m)'], ['linea', MOR, 'rasante'], ['trazos', MOR, 'rasante del túnel'], ['area', C.corte, 'corte'],
        ['area', C.relleno, 'relleno'], ['area', C.reserva, 'dentro de la Reserva', 0.25], ['trazos', C.texto2, 'pendiente máxima deseable'],
        ['linea', C.texto, 'pendiente máxima absoluta (DNV, 2010)']];
      let lx = m.l + 10;
      const ly = 14;
      ley.forEach(([t, c, n, op]) => {
        if (t === 'area') el('rect', { x: lx, y: ly - 7, width: 14, height: 9, fill: c, 'fill-opacity': op || 0.9 }, svg);
        else el('line', { x1: lx, x2: lx + 16, y1: ly - 2.5, y2: ly - 2.5, stroke: c, 'stroke-width': 1.8, 'stroke-dasharray': t === 'trazos' ? '4 2' : null }, svg);
        const tx = el('text', { x: lx + 20, y: ly + 1, 'font-size': 11, fill: C.texto2 }, svg, n);
        lx += 20 + tx.getComputedTextLength() + 14;
      });
      // cursor: el punto en el gráfico y en el mapa
      const cursor = el('line', { y1: m.t, y2: yP + hP, stroke: MOR, 'stroke-width': 1, visibility: 'hidden' }, svg);
      const punto = el('circle', { r: 4.5, fill: '#ffffff', stroke: MOR, 'stroke-width': 2, visibility: 'hidden' }, svg);
      const zona = el('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: yP + hP - m.t, fill: 'transparent', style: 'cursor: crosshair' }, svg);
      let actual = null;
      zona.addEventListener('mousemove', (ev) => {
        const r = svg.getBoundingClientRect();
        const k = Math.max(0, Math.min(xMax, ((ev.clientX - r.left) * (W / r.width) - m.l) / (W - m.l - m.r) * xMax));
        let html, x, z;
        if (k <= P.LP) {
          const i = cerca(L.km, k), dnv = L.reserva[i] ? P.dnv.dentro : P.dnv.fuera;
          x = X(L.km[i]); z = L.cota[i];
          actual = [L.lon[i], L.lat[i]];
          html = `<b>km ${nf(L.km[i], 1)}</b> · ${seccion(L.km[i])}${L.reserva[i] ? ' · dentro de la Reserva' : ''}<br>terreno: ${nf(z)} m`;
          const ras = P.rasantes.map((q) => (L.km[i] >= q.km[0] && L.km[i] <= q.km[q.km.length - 1] ? [q, cerca(q.km, L.km[i])] : null)).find((v) => v);
          if (ras) {
            const [q, j] = ras, d = q.terreno[j] - q.rasante[j];
            html += `<br>rasante (${q.nombre}): ${nf(q.rasante[j])} m${Math.abs(d) >= 0.5 ? ` · ${d > 0 ? 'corte' : 'relleno'} de ${nf(Math.abs(d), 1)} m` : ''}`;
          }
          html += `<br>pendiente del terreno: ${nf(L.pend[i], 1)} %<br>máxima (DNV, 2010), ${dnv[2]} km/h: ${dnv[0]} % deseable y ${dnv[1]} % absoluta`;
          V.marcar(actual[0], actual[1], `km ${nf(L.km[i], 1)}`);
        } else {
          const i = cerca(TU.km, k), dk = TU.km[i] - P.LP;
          x = X(TU.km[i]); z = TU.rasante[i];
          actual = [TU.lon[i], TU.lat[i]];
          html = `<b>túnel</b>, a ${nf(dk, 2)} km del portal N4${TU.km[i] > P.limite_km ? ' · en Chile' : ''}<br>rasante: ${nf(TU.rasante[i])} m` +
            `<br>superficie del modelo: ${nf(TU.terreno[i])} m (cobertura de ${nf(TU.terreno[i] - TU.rasante[i])} m)`;
          V.marcar(actual[0], actual[1], `túnel, ${nf(dk, 1)} km`);
        }
        cursor.setAttribute('x1', x); cursor.setAttribute('x2', x); cursor.setAttribute('visibility', 'visible');
        punto.setAttribute('cx', x); punto.setAttribute('cy', Y(z)); punto.setAttribute('visibility', 'visible');
        mostrarInfo(html, x, Y(z));
      });
      zona.addEventListener('mouseleave', () => { cursor.setAttribute('visibility', 'hidden'); punto.setAttribute('visibility', 'hidden'); info.hidden = true; V.marcar(null); });
      zona.addEventListener('click', () => { if (actual) mapa.easeTo({ center: actual, zoom: Math.max(mapa.getZoom(), 13), duration: 900 }); });
    }

    // ------------------------------------------------------------------ transversales: los tres a la misma escala, sin exageración vertical
    function transversales(svg, W, H) {
      const TR = P.transversales, n = TR.length, gap = 30, m = { l: 50, r: 10, t: 24, b: 36 };
      const wE = (W - gap * (n - 1)) / n;
      const rng = Math.max(...TR.map((t) => Math.max(...t.cota) - Math.min(...t.cota))) + 60;
      const s = Math.max(3000 / (wE - m.l - m.r), rng / (H - m.t - m.b));  // metros por píxel, el mismo en los dos ejes
      TR.forEach((t, k) => {
        const x0 = k * (wE + gap) + m.l, pw = 3000 / s, ph = rng / s;
        const zc = (Math.min(...t.cota) + Math.max(...t.cota)) / 2, y0 = m.t + (H - m.t - m.b - ph) / 2;
        const X = (d) => x0 + (d + 1500) / s, Y = (z) => y0 + (zc + rng / 2 - z) / s;
        el('path', { d: ruta(t.dist.map(X), t.cota.map(Y)) + `L${X(1500)},${y0 + ph}L${X(-1500)},${y0 + ph}Z`, fill: '#E9E4DA' }, svg);
        el('path', { d: ruta(t.dist.map(X), t.cota.map(Y)), fill: 'none', stroke: '#5E4F3D', 'stroke-width': 1.3 }, svg);
        el('line', { x1: X(0), x2: X(0), y1: y0 - 4, y2: y0 + ph, stroke: MOR, 'stroke-width': 1.2, 'stroke-dasharray': '5 3' }, svg);
        el('text', { x: x0, y: Math.max(14, y0 - 10), 'font-size': 12, 'font-weight': 'bold', fill: C.texto }, svg, `${t.nombre} · km ${nf(t.km, 1)}`);
        const paso = 100 / s >= 16 ? 100 : 100 / s >= 8 ? 200 : 500;  // marcas de cota sin amontonarse
        for (let z = Math.ceil((zc - rng / 2) / paso) * paso; z <= zc + rng / 2; z += paso) {
          el('line', { x1: x0 - 4, x2: x0, y1: Y(z), y2: Y(z), stroke: C.texto2, 'stroke-width': 0.8 }, svg);
          el('text', { x: x0 - 6, y: Y(z) + 4, 'text-anchor': 'end', 'font-size': 10.5, fill: C.texto2 }, svg, nf(z));
        }
        [-1500, 0, 1500].forEach((d) => el('text', { x: X(d), y: y0 + ph + 14, 'text-anchor': d < 0 ? 'start' : d > 0 ? 'end' : 'middle', 'font-size': 10.5, fill: d ? C.texto2 : MOR },
          svg, d === 0 ? 'eje' : `${d < 0 ? '−' : ''}${nf(Math.abs(d))} m`));
        const punto = el('circle', { r: 4, fill: '#ffffff', stroke: MOR, 'stroke-width': 2, visibility: 'hidden' }, svg);
        const zona = el('rect', { x: X(-1500), y: y0, width: pw, height: ph, fill: 'transparent', style: 'cursor: crosshair' }, svg);
        zona.addEventListener('mousemove', (ev) => {
          const r = svg.getBoundingClientRect();
          const i = cerca(t.dist, ((ev.clientX - r.left) * (W / r.width) - x0) * s - 1500), d = t.dist[i];
          punto.setAttribute('cx', X(d)); punto.setAttribute('cy', Y(t.cota[i])); punto.setAttribute('visibility', 'visible');
          const lado = Math.abs(d) < 15 ? 'sobre el eje' : `a ${nf(Math.abs(d))} m a la ${d < 0 ? 'derecha' : 'izquierda'} del eje`;
          mostrarInfo(`<b>${t.nombre}</b> · ${lado}<br>cota del terreno: ${nf(t.cota[i])} m`, X(d), Y(t.cota[i]));
          V.marcar(t.lon[i], t.lat[i], t.nombre);
        });
        zona.addEventListener('mouseleave', () => { punto.setAttribute('visibility', 'hidden'); info.hidden = true; V.marcar(null); });
        const ic = cerca(t.dist, 0);
        zona.addEventListener('click', () => mapa.easeTo({ center: [t.lon[ic], t.lat[ic]], zoom: Math.max(mapa.getZoom(), 13), duration: 900 }));
      });
      el('text', { x: W / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': 11, fill: C.texto2 }, svg,
        'distancia al eje (negativa a la derecha del eje, como en la lámina 2/4); la misma escala en los dos ejes');
    }

    const qp = V.q.get('perfil');
    if (qp === 'longitudinal' || qp === 'transversales' || (qp === 'dibujado' && !qd)) abrir(qp);
    V.perfiles = { abrir, cerrar };
  }
  if (window.visorAPI && window.visorAPI.listo) iniciar(window.visorAPI);
  else window.addEventListener('visor:listo', (e) => iniciar(e.detail), { once: true });
})();
