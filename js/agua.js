/* El agua (segunda tanda, pedido del docente): escorrentía y anegamiento, con los datos que ya están y sin inventar caudales.
   Escorrentía: partículas (trazos animados) que siguen la dirección de flujo de GRASS, aguas abajo; el grosor crece con el área de aporte.
   Anegamiento: HAND (altura sobre el cauce al que drena cada lugar) con un nivel de 0,5 / 1 / 2 / 3 m, y los km del tronco que quedan por debajo.
   Siempre con el rótulo: escenario indicativo, no modelo hidráulico. Datos: config.json ("agua") y las capas escorrentia y anegamiento. */
'use strict';
(function () {
  function iniciar(V) {
    const { mapa, cfg, P, nf } = V;
    const A = cfg.agua;
    const caja = document.getElementById('agua'), boton = document.getElementById('b-agua');
    const L = P.longitudinal;
    let nivel = 1, conEsc = true, conAne = true, abierto = false, raf = null, ultimoPaso = -1;
    // partículas: la secuencia de trazos que avanzan a lo largo de cada línea (las líneas van aguas abajo)
    const PASOS = [[0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0], [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5],
      [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5]];
    function animar(ts) {
      if (!abierto || !conEsc) { raf = null; return; }
      const p = Math.floor(ts / 70) % PASOS.length;
      if (p !== ultimoPaso && mapa.getLayer('escorrentia-1')) { mapa.setPaintProperty('escorrentia-1', 'line-dasharray', PASOS[p]); ultimoPaso = p; }
      raf = requestAnimationFrame(animar);
    }
    const nivelTxt = (n) => `${nf(n, n % 1 ? 1 : 0)} m`;
    function punto(k) { let i = 0; while (i < L.km.length - 1 && L.km[i] < k) i++; return [L.lon[i], L.lat[i]]; }
    // en el celular el panel ocupa la mitad de abajo: el mapa se encuadra en la mitad de arriba
    const relleno = (pc) => (V.movil ? { top: 20, left: 20, right: 20, bottom: Math.round(window.innerHeight * 0.5) + 20 } : pc);
    function verTramo(a, b) {
      const pts = [];
      for (let k = a; k <= b + 1e-6; k += Math.max(0.05, (b - a) / 20)) pts.push(punto(k));
      pts.push(punto(b));
      const lo = pts.map((x) => x[0]), la = pts.map((x) => x[1]);
      mapa.fitBounds([[Math.min(...lo), Math.min(...la)], [Math.max(...lo), Math.max(...la)]], { padding: relleno({ top: 60, bottom: 60, left: caja.offsetWidth + 50, right: 60 }), maxZoom: 15, duration: 1200 });
    }
    function aplicar() {
      V.mostrarCapa('escorrentia', abierto && conEsc);
      V.mostrarCapa('anegamiento', abierto && conAne);
      if (mapa.getLayer('anegamiento-0')) mapa.setFilter('anegamiento-0', ['<=', ['get', 'valor'], nivel]);
      if (abierto && conEsc && !raf) raf = requestAnimationFrame(animar);
    }
    function pintar() {
      const k = A.km[String(nivel)] || A.km[String(Number(nivel).toFixed(1))] || { tramos: [], km: 0 };
      caja.innerHTML = '<div class="paso">El agua · escenario indicativo</div><h3>Escorrentía y anegamiento</h3>' +
        `<p class="rotulo">${A.rotulo}</p>` +
        `<label class="opcion"><input type="checkbox" data-a="esc"${conEsc ? ' checked' : ''}> <b>Escorrentía</b>: partículas que siguen el agua</label>` +
        `<p class="nota">${A.escorrentia}</p>` +
        `<label class="opcion"><input type="checkbox" data-a="ane"${conAne ? ' checked' : ''}> <b>Anegamiento</b> (HAND), con un nivel sobre el cauce de:</label>` +
        `<div class="niveles">${A.niveles.map((n) => `<button data-n="${n}" class="${n === nivel ? 'activo' : ''}">${nivelTxt(n)}</button>`).join('')}</div>` +
        `<p class="nota">${A.anegamiento}</p>` +
        `<p class="resumen-agua"><b>Con ${nivelTxt(nivel)}, quedan por debajo ${nf(k.km, 1)} km del tronco${k.tramos.length ? ` en ${k.tramos.length} tramos` : ''}.</b></p>` +
        listas(k) + `<p class="nota">${A.clasif}</p><div class="botones"><button data-a="salir">Cerrar</button></div>`;
    }
    const kmB = (t) => `<button class="km" data-a0="${t.desde}" data-a1="${t.hasta}">km ${t.desde === t.hasta ? nf(t.desde, 1) : `${nf(t.desde, 1)} a ${nf(t.hasta, 1)}`}</button>`;
    const kmL = (m) => (m >= 1000 ? `${nf(m / 1000, 1)} km` : `${Math.round(m)} m`);
    function listas(k) {
      const T = k.totales, C = k.cruces || [], G = k.a_lo_largo || [];
      const sinO = C.filter((t) => !t.obra), sinD = G.filter((t) => t.con_defensa !== 'si');
      let h = `<div class="lista-agua"><h4>Cruces de cauce: ${T.cruces} (${nf(T.cruces_km, 1)} km)</h4>` +
        `<p class="nota">${sinO.length ? `<span class="sin">${sinO.length} sin obra prevista</span>` : 'Todos con obra prevista.'}</p><ul>` +
        (C.length ? C.map((t) => `<li${t.obra ? '' : ' class="sin"'}>${kmB(t)} <span class="largo">${kmL(t.largo_m)}</span>: ${t.obra || 'sin obra prevista'}</li>`).join('') : '<li>ninguno</li>') +
        `</ul><h4>Tramos a lo largo del río: ${T.a_lo_largo} (${nf(T.a_lo_largo_km, 1)} km)</h4>` +
        `<p class="nota">${T.a_lo_largo_con_defensa} con defensa de margen` + (T.a_lo_largo_en_parte ? `, ${T.a_lo_largo_en_parte} en parte` : '') +
        (T.a_lo_largo_sin_defensa ? `, <span class="sin">${T.a_lo_largo_sin_defensa} sin defensa prevista (${nf(T.a_lo_largo_sin_defensa_km, 1)} km)</span>` : '') + '.</p><ul>' +
        (G.length ? G.map((t) => `<li${t.con_defensa === 'si' ? '' : ' class="sin"'}>${kmB(t)} <span class="largo">${kmL(t.largo_m)}</span>, junto a un cauce de ` +
          `${nf(t.cauce_km2, t.cauce_km2 < 100 ? 1 : 0)} km² de aporte: ${t.defensa || 'sin defensa de margen prevista'}` +
          (t.obras_menores && t.obras_menores.length ? ` (en el tramo: ${t.obras_menores.join('; ')})` : '') + '</li>').join('') : '<li>ninguno</li>') + '</ul></div>';
      return h;
    }
    function abrir() {
      abierto = true;
      caja.hidden = false;
      boton.classList.add('activo');
      pintar();
      aplicar();
      if (mapa.getZoom() < 11.5) mapa.fitBounds([[A.caja[0], A.caja[1]], [A.caja[2], A.caja[3]]], { padding: relleno({ top: 40, bottom: 40, left: caja.offsetWidth + 40, right: 60 }), duration: 1400 });
    }
    function cerrar() {
      abierto = false;
      caja.hidden = true;
      boton.classList.remove('activo');
      aplicar();
    }
    boton.onclick = () => (abierto ? cerrar() : abrir());
    caja.addEventListener('click', (e) => {
      const t = e.target;
      if (t.dataset.n) { nivel = Number(t.dataset.n); conAne = true; pintar(); aplicar(); }
      else if (t.dataset.a0) verTramo(Number(t.dataset.a0) - 0.05, Number(t.dataset.a1) + 0.05);
      else if (t.dataset.a === 'salir') cerrar();
    });
    caja.addEventListener('change', (e) => {
      if (e.target.dataset.a === 'esc') conEsc = e.target.checked;
      if (e.target.dataset.a === 'ane') conAne = e.target.checked;
      aplicar();
    });
    // ?agua=1 abre el panel; &nivel=0.5|1|2|3 elige el nivel
    if (V.q.get('agua')) {
      const n = Number(V.q.get('nivel'));
      if (A.niveles.includes(n)) nivel = n;
      abrir();
    }
    window.agua = { abrir, cerrar, nivel: (n) => { nivel = n; pintar(); aplicar(); } };
  }
  if (window.visorAPI && window.visorAPI.listo) iniciar(window.visorAPI);
  else window.addEventListener('visor:listo', (e) => iniciar(e.detail), { once: true });
})();
