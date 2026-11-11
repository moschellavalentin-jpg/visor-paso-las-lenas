/* Recorrido guiado (punto 3 del visor): la propuesta en ocho pasos, con los textos del informe (config.json, "recorrido"), y "ir al km" del tronco.
   Cada paso encuadra el mapa y, si hace falta, enciende una capa (lo descartado, la nieve) o cambia el mapa base; al salir, todo vuelve a como estaba. */
'use strict';
(function () {
  function iniciar(V) {
    const { mapa, cfg, P, nf } = V;
    const R = cfg.recorrido;
    const tarjeta = document.getElementById('recorrido');
    const boton = document.getElementById('b-recorrido');
    const tocadas = [...new Set(R.flatMap((p) => p.capas || []))];
    let paso = -1, antes = null;

    function ir(k) {
      if (!antes) antes = { base: V.base(), capas: Object.fromEntries(tocadas.map((id) => [id, V.capaVisible(id)])) };
      paso = Math.max(0, Math.min(R.length - 1, k));
      const p = R[paso];
      tocadas.forEach((id) => V.mostrarCapa(id, antes.capas[id] || (p.capas || []).includes(id)));
      if (V.base() !== (p.base || antes.base)) V.ponerBase(p.base || antes.base);
      tarjeta.hidden = false;
      boton.classList.add('activo');
      tarjeta.innerHTML = `<div class="paso">Recorrido guiado · paso ${paso + 1} de ${R.length}</div><h3>${p.titulo}</h3><p>${p.texto}</p>` +
        `<div class="botones"><button data-a="ant"${paso === 0 ? ' disabled' : ''}>← Anterior</button>` +
        `<button data-a="sig" class="principal">${paso === R.length - 1 ? 'Terminar' : 'Siguiente →'}</button><button data-a="salir">Salir</button>` +
        `<div class="puntos">${R.map((r, j) => `<span data-j="${j}" class="${j === paso ? 'activo' : ''}" title="${r.titulo}"></span>`).join('')}</div></div>`;
      const izq = Math.min(tarjeta.offsetWidth + 36, mapa.getContainer().clientWidth * 0.45);
      mapa.fitBounds([[p.caja[0], p.caja[1]], [p.caja[2], p.caja[3]]], { padding: { top: 40, bottom: 40, left: izq, right: 60 }, duration: 1800, maxZoom: 15 });
    }
    function salir() {
      if (antes) {
        tocadas.forEach((id) => V.mostrarCapa(id, antes.capas[id]));
        if (V.base() !== antes.base) V.ponerBase(antes.base);
      }
      antes = null;
      paso = -1;
      tarjeta.hidden = true;
      boton.classList.remove('activo');
    }
    tarjeta.addEventListener('click', (e) => {
      const a = e.target.dataset.a, j = e.target.dataset.j;
      if (a === 'ant') ir(paso - 1);
      else if (a === 'sig') { if (paso === R.length - 1) salir(); else ir(paso + 1); }
      else if (a === 'salir') salir();
      else if (j != null) ir(Number(j));
    });
    boton.onclick = () => (tarjeta.hidden ? ir(0) : salir());
    document.addEventListener('keydown', (e) => {
      if (tarjeta.hidden || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') ir(paso + 1);
      else if (e.key === 'ArrowLeft') ir(paso - 1);
      else if (e.key === 'Escape') salir();
    });

    // ------------------------------------------------------------------ ir al km: el punto del tronco, qué tramo es y qué hay a menos de 500 m
    const L = P.longitudinal;
    const form = document.getElementById('ir-km'), entrada = document.getElementById('km');
    let ficha = null;
    function irAlKm(k) {
      if (ficha) ficha.remove();
      if (!Number.isFinite(k) || k < 0 || k > P.LP + 1e-6) {
        entrada.value = '';
        entrada.placeholder = `de 0 a ${nf(P.LP, 1)}`;
        entrada.focus();
        return;
      }
      let lo = 0, hi = L.km.length - 1;  // muestras que rodean al km pedido
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L.km[m] <= k) lo = m; else hi = m; }
      const t = Math.max(0, Math.min(1, (k - L.km[lo]) / ((L.km[hi] - L.km[lo]) || 1))), j = t < 0.5 ? lo : hi;
      const lon = L.lon[lo] + t * (L.lon[hi] - L.lon[lo]), lat = L.lat[lo] + t * (L.lat[hi] - L.lat[lo]), cota = L.cota[lo] + t * (L.cota[hi] - L.cota[lo]);
      const dnv = L.reserva[j] ? P.dnv.dentro : P.dnv.fuera;
      const sec = (P.secciones.find((s) => k >= s.km0 && k <= s.km1) || P.secciones.reduce((a, s) => (Math.min(Math.abs(k - s.km0), Math.abs(k - s.km1)) <
        Math.min(Math.abs(k - a.km0), Math.abs(k - a.km1)) ? s : a))).nombre;
      // sobre el punto: los tramos que lo contienen y lo que está a menos de 50 m; cerca: lo demás a menos de 500 m
      const txt = (h) => (h.sin_km ? h.nombre : h.km0 === h.km1 ? `${h.nombre} (km ${nf(h.km0, 1)})` : `${h.nombre} (km ${nf(h.km0, 1)} a ${nf(h.km1, 1)})`);
      const sobre = [...new Set(P.hitos.filter((h) => k >= h.km0 - 0.05 && k <= h.km1 + 0.05).map(txt))];
      const cerca = [...new Set(P.hitos.filter((h) => k >= h.km0 - 0.5 && k <= h.km1 + 0.5).map(txt))].filter((x) => !sobre.includes(x));
      const html = `<div class="ficha"><h4>km ${nf(k, 1)} del tronco</h4><table>` +
        `<tr><td>tramo</td><td>${sec}</td></tr>` +
        `<tr><td>cota del terreno</td><td>${nf(cota)} m</td></tr><tr><td>pendiente del terreno</td><td>${nf(L.pend[j], 1)} %</td></tr>` +
        `<tr><td>máxima (DNV, 2010)</td><td>${dnv[0]} % deseable y ${dnv[1]} % absoluta (${dnv[2]} km/h)</td></tr></table>` +
        (sobre.length ? `<p><b>Este punto está en:</b> ${sobre.join('; ')}.</p>` : '') +
        (cerca.length ? `<p><b>A menos de 500 m:</b> ${cerca.join('; ')}.</p>` : '') +
        '<p class="fuente">Kilómetros del tronco contados desde El Sosneado. Cota y pendiente: modelo de elevación de 30 m (Copernicus DEM).</p></div>';
      V.marcar(lon, lat, '');  // el km lo dice la ficha
      mapa.flyTo({ center: [lon, lat], zoom: 14, duration: 1600 });
      mapa.once('moveend', () => { ficha = new maplibregl.Popup({ maxWidth: '360px', anchor: 'left', offset: 16 }).setLngLat([lon, lat]).setHTML(html).addTo(mapa); });
    }
    form.addEventListener('submit', (e) => { e.preventDefault(); irAlKm(parseFloat(entrada.value.replace(',', '.'))); });

    // ?paso=1..8 abre el recorrido en ese paso; ?km= va a ese km
    if (V.q.get('paso')) ir(parseInt(V.q.get('paso'), 10) - 1);
    else if (V.q.get('km')) { entrada.value = V.q.get('km').replace('.', ','); irAlKm(parseFloat(V.q.get('km').replace(',', '.'))); }
  }
  if (window.visorAPI && window.visorAPI.listo) iniciar(window.visorAPI);
  else window.addEventListener('visor:listo', (e) => iniciar(e.detail), { once: true });
})();
