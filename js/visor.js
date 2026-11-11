/* Visor del acceso argentino al paso Las Leñas (muestra: nivel 1, perfiles, recorrido guiado, ir al km, perfil dibujado y vuelo 3D). MapLibre GL JS 4.7.1.
   Los textos que ve el usuario vienen de datos/config.json (los arma e07_18_visor.py con las reglas del informe). */
'use strict';
(async function () {
  const BASE = location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
  const abs = (p) => (/^https?:/.test(p) ? p : BASE + p);
  // si se abre como archivo o desde una carpeta sin datos, se avisa en vez de mostrar un mapa en blanco
  const EN_LINEA = 'https://moschellavalentin-jpg.github.io/visor-paso-las-lenas/';
  const avisoCarga = (html) => { const a = document.getElementById('aviso-carga'); a.innerHTML = html; a.hidden = false; };
  if (location.protocol === 'file:') {
    avisoCarga('<h2>Así no se abre</h2><p>El visor se abrió como archivo (file:///), y así el navegador no le deja leer sus datos.</p>' +
      '<p>Abrilo con <b>ABRIR_VISOR.bat</b>, en la carpeta <b>VISOR_PASO_LAS_LENAS</b>: lo sirve en http://localhost y lo abre en el navegador.</p>' +
      `<p>También se puede ver en línea: <a href="${EN_LINEA}">${EN_LINEA}</a></p>`);
    return;
  }
  const leer = (p) => fetch(abs(p)).then((r) => { if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json(); });
  let cfg, P;
  try {
    [cfg, P] = await Promise.all([leer('datos/config.json'), leer('datos/perfiles.json')]);
  } catch (err) {
    avisoCarga('<h2>No se encontraron los datos del visor</h2><p>Esta carpeta no tiene la carpeta <b>datos</b> junto a index.html: no es la del visor completo.</p>' +
      '<p>Abrí el visor con <b>ABRIR_VISOR.bat</b> desde la carpeta <b>VISOR_PASO_LAS_LENAS</b>.</p>' +
      `<p>También se puede ver en línea: <a href="${EN_LINEA}">${EN_LINEA}</a></p>`);
    return;
  }
  const T = cfg.textos;
  const MOR = '#8B169B', GRIS = '#8F8F8F', GRIS_C = '#D9D9D9';
  const MOVIL = window.matchMedia('(max-width: 760px)').matches;  // celular: menú en un botón, paneles plegables, 3D liviano  // lo descartado, en gris (como en la lámina 4/4)
  const FONDO = { argenmap: '#FFF5EA', otro: '#F3F1EC' };  // el fondo de Argenmap: si faltara una tesela, no queda un rectángulo de otro color
  const F = { r: ['Open Sans Regular'], b: ['Open Sans Bold'], i: ['Open Sans Italic'] };
  const HALO = { 'text-halo-color': '#ffffff', 'text-halo-width': 1.6 };
  const Z2 = cfg.textos.niveles[1].desde, Z3 = cfg.textos.niveles[2].desde, Z4 = cfg.textos.niveles[3].desde;
  const ancho = (a, b) => ['interpolate', ['linear'], ['zoom'], 8, a, 15, b];
  const ANCHO_AGUA = ['interpolate', ['linear'], ['ln', ['max', ['get', 'valor'], 0.1]], -1, 1.3, 2, 2.6, 7, 6];  // por el área de aporte (km²)
  const rot = (tam, color, fuente, extra) => Object.assign({ type: 'symbol', layout: { 'text-field': ['get', 'etiqueta'], 'text-font': fuente || F.b, 'text-size': tam, 'text-offset': [0, 1.15], 'text-anchor': 'top', 'text-optional': true }, paint: Object.assign({ 'text-color': color || MOR }, HALO) }, extra || {});

  // estilo de cada capa del catalogo: lista de capas de MapLibre (id y source se completan abajo)
  const E = {
    reserva: [{ type: 'fill', paint: { 'fill-color': '#2E7D32', 'fill-opacity': 0.07 } }, { type: 'line', paint: { 'line-color': '#2E7D32', 'line-width': 2, 'line-dasharray': [3, 1.5] } }],
    glaciares: [{ type: 'fill', paint: { 'fill-color': '#DDF0FB', 'fill-opacity': 0.85 } }, { type: 'line', paint: { 'line-color': '#6FA8D6', 'line-width': 0.6 } }],
    laguna: [{ type: 'fill', paint: { 'fill-color': '#9CC9EE' } }],
    lecho: [{ type: 'fill', paint: { 'fill-color': '#7FD3E6', 'fill-opacity': 0.55 } }, { type: 'line', paint: { 'line-color': '#4FB3CF', 'line-width': 0.6 } }],
    nieve: [{ type: 'line', layout: { 'line-cap': 'butt' }, paint: { 'line-color': ['interpolate', ['linear'], ['get', 'valor'], 0, '#DCEBFA', 20, '#8EC1EE', 40, '#3F86D0', 80, '#123A7A'],
      'line-width': ancho(12, 26), 'line-opacity': 0.9 } }],
    transversales: [{ type: 'line', paint: { 'line-color': '#5E4F3D', 'line-width': 2, 'line-dasharray': [3, 1.5] } },
      { type: 'symbol', layout: { 'symbol-placement': 'line-center', 'text-field': ['get', 'etiqueta'], 'text-font': F.b, 'text-size': 12, 'text-offset': [0, -0.9] }, paint: Object.assign({ 'text-color': '#5E4F3D' }, HALO) }],
    drenaje: [{ type: 'line', paint: { 'line-color': '#1E88E5', 'line-width': 0.9, 'line-opacity': 0.85 } }],
    cd01: [{ type: 'fill', paint: { 'fill-color': '#1E88E5', 'fill-opacity': 0.08 } }, { type: 'line', paint: { 'line-color': '#1565C0', 'line-width': 2 } }],
    afectacion: [{ type: 'fill', paint: { 'fill-color': '#E1BEE7', 'fill-opacity': 0.5 } }],
    zona_camino: [{ type: 'fill', paint: { 'fill-color': MOR, 'fill-opacity': 0.1 } }, { type: 'line', paint: { 'line-color': MOR, 'line-width': 0.7, 'line-opacity': 0.5 } }],
    amortiguacion: [{ type: 'fill', paint: { 'fill-color': '#B39DDB', 'fill-opacity': 0.25 } }, { type: 'line', paint: { 'line-color': '#7E57C2', 'line-width': 1, 'line-dasharray': [2, 1] } }],
    urbana: [{ type: 'fill', paint: { 'fill-color': '#F4A582', 'fill-opacity': 0.45 } }],
    parcelas: [{ type: 'fill', paint: { 'fill-color': '#FFF3C4', 'fill-opacity': 0.35 } }, { type: 'line', paint: { 'line-color': '#555555', 'line-width': 1.3 } },
      rot(11, '#333333', F.r, { minzoom: Z3, layout: { 'text-field': ['get', 'etiqueta'], 'text-font': F.r, 'text-size': 11, 'text-optional': true } })],
    rios: [{ type: 'line', paint: { 'line-color': '#4A90D9', 'line-width': ['case', ['==', ['get', 'clase'], 'atuel'], 2.2, 0.8] } },
      { type: 'symbol', filter: ['==', ['get', 'clase'], 'atuel'], layout: { 'symbol-placement': 'line', 'text-field': ['get', 'etiqueta'], 'text-font': F.i, 'text-size': 12, 'symbol-spacing': 450 }, paint: Object.assign({ 'text-color': '#2F6EB5' }, HALO) }],
    lim_internacional: [{ type: 'line', paint: { 'line-color': '#444444', 'line-width': 1.6, 'line-dasharray': [6, 2, 1, 2] } }],
    lim_depto: [{ type: 'line', paint: { 'line-color': '#777777', 'line-width': 1, 'line-dasharray': [4, 2] } }],
    zsf: [{ type: 'line', paint: { 'line-color': '#A1887F', 'line-width': 1.2, 'line-dasharray': [2, 2] } }],
    rutas: [{ type: 'line', paint: { 'line-color': ['case', ['==', ['get', 'clase'], 'nacional'], '#D32F2F', '#F57C00'], 'line-width': ancho(1.2, 3) } },
      { type: 'symbol', layout: { 'symbol-placement': 'line', 'text-field': ['get', 'etiqueta'], 'text-font': F.b, 'text-size': 11, 'symbol-spacing': 380 }, paint: Object.assign({ 'text-color': '#7A1F1F' }, HALO) }],
    senda: [{ type: 'line', paint: { 'line-color': '#8D6E63', 'line-width': 1.6, 'line-dasharray': [1, 1.5] } }],
    descartados: [{ type: 'line', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-cap': 'round' }, paint: { 'line-color': GRIS, 'line-width': ancho(2.2, 4.5), 'line-dasharray': [2, 1.5] } },
      { type: 'fill', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': GRIS_C, 'fill-opacity': 0.75 } },
      { type: 'line', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'line-color': GRIS, 'line-width': 1.2 } },
      { type: 'circle', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 6, 'circle-color': GRIS, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } },
      { type: 'symbol', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'symbol-placement': 'line-center', 'text-field': ['get', 'etiqueta'], 'text-font': F.i, 'text-size': 12, 'text-offset': [0, -0.9] },
        paint: Object.assign({ 'text-color': '#6E6E6E' }, HALO) },
      { type: 'symbol', filter: ['!=', ['geometry-type'], 'LineString'], layout: { 'text-field': ['get', 'etiqueta'], 'text-font': F.i, 'text-size': 12, 'text-offset': [0, 1.1], 'text-anchor': 'top' },
        paint: Object.assign({ 'text-color': '#6E6E6E' }, HALO) }],
    escorrentia: [{ type: 'line', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#1E88E5', 'line-opacity': 0.4, 'line-width': ANCHO_AGUA } },
      { type: 'line', paint: { 'line-color': '#E1F5FE', 'line-width': ANCHO_AGUA, 'line-dasharray': [0, 4, 3] } }],
    anegamiento: [{ type: 'fill', paint: { 'fill-color': ['interpolate', ['linear'], ['get', 'valor'], 0.5, '#0D47A1', 1, '#1565C0', 2, '#1E88E5', 3, '#64B5F6'],
      'fill-opacity': 0.55 } }],
    tramos_rio: [{ type: 'line', maxzoom: Z3, paint: { 'line-color': '#2F6EB5', 'line-width': 12, 'line-opacity': 0.35 } },
      { type: 'line', minzoom: Z3, paint: { 'line-color': '#2F6EB5', 'line-width': 3, 'line-dasharray': [1, 1] } },
      { type: 'symbol', minzoom: Z3, layout: { 'symbol-placement': 'line', 'text-field': 'defensa de margen', 'text-font': F.i, 'text-size': 11 }, paint: Object.assign({ 'text-color': '#2F6EB5' }, HALO) }],
    tronco: [{ type: 'line', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': ancho(4, 10) } },
      { type: 'line', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': MOR, 'line-width': ancho(2.2, 6) } }],
    desvio: [{ type: 'line', layout: { 'line-cap': 'round' }, paint: { 'line-color': MOR, 'line-width': ancho(2, 4.5) } },
      { type: 'symbol', minzoom: 12.5, layout: { 'symbol-placement': 'line', 'text-field': ['get', 'etiqueta'], 'text-font': F.i, 'text-size': 12 }, paint: Object.assign({ 'text-color': MOR }, HALO) }],
    doble_calzada: [{ type: 'line', paint: { 'line-color': MOR, 'line-width': 3 } }],
    tunel: [{ type: 'line', paint: { 'line-color': MOR, 'line-width': 2.5, 'line-dasharray': [2, 1.5] } }],
    viaducto: [{ type: 'line', paint: { 'line-color': '#1F1F1E', 'line-width': ancho(5, 12) } }, { type: 'line', paint: { 'line-color': MOR, 'line-width': ancho(2.5, 7) } }],
    puentes_largo: [{ type: 'line', paint: { 'line-color': '#1F1F1E', 'line-width': 9 } }, { type: 'line', paint: { 'line-color': MOR, 'line-width': 4 } }],
    puentes: [{ type: 'circle', maxzoom: Z3, paint: { 'circle-radius': 4, 'circle-color': '#1F1F1E', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 } }],
    obras: [{ type: 'circle', paint: { 'circle-radius': ['match', ['get', 'clase'], 'alcantarilla', 3, 'mayor', 4.5, 5], 'circle-color': ['match', ['get', 'clase'], 'alcantarilla', '#455A64', 'mayor', '#1565C0', '#00897B'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 } }],
    pasos: [{ type: 'circle', paint: { 'circle-radius': 3.5, 'circle-color': ['match', ['get', 'clase'], 'inferior', '#6D4C41', '#FFB300'], 'circle-stroke-color': '#4E342E', 'circle-stroke-width': 1 } }],
    rotondas: [{ type: 'circle', paint: { 'circle-radius': 6, 'circle-color': '#ffffff', 'circle-stroke-color': MOR, 'circle-stroke-width': 2.5 } },
      { type: 'symbol', layout: { 'text-field': ['get', 'etiqueta'], 'text-font': F.b, 'text-size': 11, 'text-offset': [1, -1] }, paint: Object.assign({ 'text-color': MOR }, HALO) }],
    b3_huella: [{ type: 'fill', paint: { 'fill-color': MOR, 'fill-opacity': 0.15 } }, { type: 'line', paint: { 'line-color': MOR, 'line-width': 2 } }],
    peaje: [{ type: 'fill', paint: { 'fill-color': MOR, 'fill-opacity': 0.45 } }, { type: 'line', paint: { 'line-color': MOR, 'line-width': 1.2 } }],
    carriles: [{ type: 'line', filter: ['==', ['get', 'clase'], 'carga'], paint: { 'line-color': MOR, 'line-width': 2 } },
      { type: 'line', filter: ['==', ['get', 'clase'], 'turismo'], paint: { 'line-color': MOR, 'line-width': 2, 'line-dasharray': [2, 1] } }],
    p6: [{ type: 'fill', paint: { 'fill-color': MOR, 'fill-opacity': 0.35 } }, { type: 'line', paint: { 'line-color': MOR, 'line-width': 1.5 } },
      { type: 'symbol', layout: { 'text-field': ['get', 'etiqueta'], 'text-font': F.b, 'text-size': 12 }, paint: Object.assign({ 'text-color': MOR }, HALO) }],
    servicios: [{ type: 'fill', paint: { 'fill-color': '#CE93D8', 'fill-opacity': 0.5 } }, { type: 'line', paint: { 'line-color': MOR, 'line-width': 1 } }],
    puestos: [{ type: 'fill', paint: { 'fill-color': '#BF360C', 'fill-opacity': 0.75 } }],
    apartaderos: [{ type: 'fill', paint: { 'fill-color': '#BF360C', 'fill-opacity': 0.75 } }],
    b3_punto: [{ type: 'circle', maxzoom: Z4, paint: { 'circle-radius': 7, 'circle-color': MOR, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } }, rot(13)],
    portal: [{ type: 'circle', paint: { 'circle-radius': 6, 'circle-color': MOR, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } }, rot(13)],
    sitios: [{ type: 'circle', paint: { 'circle-radius': 5, 'circle-color': '#ffffff', 'circle-stroke-color': '#6D4C41', 'circle-stroke-width': 2 } }, rot(12, '#5D4037', F.i)],
    km: [{ type: 'circle', filter: ['==', ['get', 'cada'], 10], paint: { 'circle-radius': 3, 'circle-color': MOR, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 } },
      { type: 'circle', minzoom: Z2, filter: ['==', ['get', 'cada'], 5], paint: { 'circle-radius': 2.5, 'circle-color': MOR } },
      { type: 'circle', minzoom: Z3, filter: ['==', ['get', 'cada'], 1], paint: { 'circle-radius': 2, 'circle-color': MOR } },
      rot(11, MOR, F.b, { filter: ['==', ['get', 'cada'], 10] }), rot(11, MOR, F.b, { minzoom: Z2, filter: ['==', ['get', 'cada'], 5] }),
      rot(10, MOR, F.r, { minzoom: Z3, filter: ['==', ['get', 'cada'], 1] })],
  };
  const ORDEN = ['reserva', 'glaciares', 'laguna', 'lecho', 'anegamiento', 'drenaje', 'cd01', 'afectacion', 'zona_camino', 'amortiguacion', 'urbana', 'parcelas', 'rios', 'escorrentia', 'lim_internacional',
    'lim_depto', 'zsf', 'rutas', 'senda', 'transversales', 'descartados', 'tramos_rio', 'nieve', 'tronco', 'desvio', 'doble_calzada', 'tunel', 'viaducto', 'puentes_largo', 'puentes', 'obras', 'pasos',
    'rotondas', 'b3_huella', 'peaje', 'carriles', 'p6', 'servicios', 'puestos', 'apartaderos', 'b3_punto', 'portal', 'sitios', 'km'];
  const CAT = Object.fromEntries(cfg.capas.map((c) => [c.id, c]));
  const q = new URLSearchParams(location.search);
  const BASE_INICIAL = cfg.bases.some((b) => b.id === q.get('base')) ? q.get('base') : 'argenmap';

  // ---- estilo de MapLibre
  const style = { version: 8, glyphs: BASE + 'datos/glifos/{fontstack}/{range}.pbf', sources: {}, layers: [] };
  const zona = cfg.zona;
  // cada base propia tiene dos capas: toda Mendoza (hasta el zoom 11) y, encima, la zona del corredor (10 m / 30 m) con el borde fundido
  cfg.bases.forEach((b) => {
    const capas = b.capas || [{ teselas: b.teselas, maxzoom: b.maxzoom }];
    b.ids = capas.map((_, i) => (b.capas ? `base-${b.id}-${i}` : `base-${b.id}`));
    capas.forEach((c, i) => {
      style.sources[b.ids[i]] = Object.assign({ type: 'raster', tiles: [abs(c.teselas)], tileSize: 256, scheme: b.esquema, maxzoom: c.maxzoom, attribution: b.atribucion },
        c.minzoom != null ? { minzoom: c.minzoom } : {}, c.bounds ? { bounds: c.bounds } : {});
      style.layers.push({ id: b.ids[i], type: 'raster', source: b.ids[i], layout: { visibility: (b.id === BASE_INICIAL || b.id === 'argenmap') ? 'visible' : 'none' } });
    });
  });
  const RL = cfg.relieve;  // relieve para el 3D (solo se usa en el vuelo)
  style.sources.relieve = { type: 'raster-dem', tiles: [abs(RL.teselas)], tileSize: 256, encoding: RL.codificacion, minzoom: RL.minzoom, maxzoom: RL.maxzoom,
    bounds: RL.bounds, attribution: RL.atribucion };
  style.sources['relieve-movil'] = Object.assign({}, style.sources.relieve, { maxzoom: RL.maxzoom_movil });  // 3D liviano en el celular: el relieve hasta el zoom 10
  style.layers.unshift({ id: 'fondo', type: 'background', paint: { 'background-color': FONDO.argenmap } });
  const SUB = {};
  const simbolos = [];
  ORDEN.filter((id) => CAT[id]).forEach((id) => {
    const c = CAT[id];
    style.sources['c-' + id] = { type: 'geojson', data: abs(c.archivo) };
    SUB[id] = [];
    E[id].forEach((s, k) => {
      const capa = Object.assign({}, s, { id: id + '-' + k, source: 'c-' + id });
      capa.minzoom = Math.max(c.minzoom || 0, s.minzoom || 0);
      capa.layout = Object.assign({}, s.layout || {}, { visibility: c.visible ? 'visible' : 'none' });
      SUB[id].push(capa.id);
      (s.type === 'symbol' ? simbolos : style.layers).push(capa);
    });
  });
  style.layers.push(...simbolos);

  const mapa = new maplibregl.Map({ container: 'mapa', style, bounds: [[zona[0], zona[1]], [zona[2], zona[3]]], fitBoundsOptions: { padding: 10 }, maxZoom: 17.5, maxPitch: 85, hash: true,
    attributionControl: false });
  mapa.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');
  mapa.addControl(new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 140 }), 'bottom-left');
  mapa.addControl(new maplibregl.AttributionControl({ compact: false, customAttribution: 'Datos: IGN, IDE Mendoza, IANIGLA, Copernicus y OpenStreetMap; elaboración propia' }), 'bottom-right');

  // ---- textos fijos
  document.getElementById('titulo').textContent = T.titulo;
  document.getElementById('subtitulo').textContent = T.subtitulo;
  document.getElementById('pie').textContent = T.pie;

  // ---- mapa base: Argenmap por defecto (hasta el zoom que el IGN sirve completo en el corredor; más cerca se amplía esa imagen);
  //      si no hay conexión, o si a pesar de eso falta una tesela dentro de la zona, pasa a la imagen propia y lo avisa
  let baseActual = BASE_INICIAL, erroresIGN = 0, tesela_ok = false;
  const contBases = document.getElementById('bases');
  cfg.bases.forEach((b) => {
    const l = document.createElement('label');
    l.innerHTML = `<input type="radio" name="base" value="${b.id}" ${b.id === BASE_INICIAL ? 'checked' : ''}> ${b.titulo}`;
    contBases.appendChild(l);
  });
  // las bases propias van sobre Argenmap: fuera del mosaico (y en su borde fundido) se ve Argenmap, no un gris. El vuelo 3D pide la imagen sola
  // (conArgenmap = false): el mosaico de Mendoza cubre todo su horizonte y así anda sin conexión
  function ponerBase(id, conArgenmap = true) {
    baseActual = id;
    const fondoIGN = id === 'argenmap' || conArgenmap;
    cfg.bases.forEach((b) => b.ids.forEach((l) => mapa.setLayoutProperty(l, 'visibility', (b.id === id || (b.id === 'argenmap' && fondoIGN)) ? 'visible' : 'none')));
    mapa.setPaintProperty('fondo', 'background-color', fondoIGN ? FONDO.argenmap : FONDO.otro);
    contBases.querySelector(`input[value="${id}"]`).checked = true;
  }
  function avisoBase(txt) {
    ponerBase('sentinel', false);  // Argenmap no responde: la imagen propia sola
    const a = document.getElementById('aviso-base');
    a.textContent = txt;
    a.hidden = false;
  }
  contBases.addEventListener('change', (e) => { document.getElementById('aviso-base').hidden = true; ponerBase(e.target.value); });
  mapa.on('error', (e) => {
    if (e.sourceId !== 'base-argenmap' || baseActual !== 'argenmap') return;
    const c = mapa.getCenter();
    const enZona = c.lng >= zona[0] && c.lng <= zona[2] && c.lat >= zona[1] && c.lat <= zona[3];
    if (e.error && e.error.status) {  // el servidor contestó, pero sin esa tesela
      if (enZona) avisoBase('El IGN no tiene esta parte del mapa a esta escala: se muestra la imagen Sentinel-2 propia. Se puede volver a Argenmap arriba.');
    } else if (!tesela_ok && ++erroresIGN >= 3) {
      avisoBase('Sin conexión con el servidor del IGN: se muestra la imagen Sentinel-2 propia, que funciona sin internet.');
    }
  });
  mapa.on('sourcedata', (e) => { if (e.sourceId === 'base-argenmap' && e.tile) tesela_ok = true; });

  // ---- capas, leyenda segun la escala y nivel de detalle
  const contCapas = document.getElementById('capas');
  const grupos = [...new Set(cfg.capas.map((c) => c.grupo))];
  const muestra = (id) => {
    // la primera capa dibujada que tenga un color que no sea blanco (el borde blanco de una linea o de un punto no sirve de muestra)
    const primero = (v) => (typeof v === 'string' ? v : Array.isArray(v) ? v.map(primero).find((x) => x && x.startsWith('#')) : undefined);
    const blanco = (c) => /^#f{3}(f{3})?$/i.test(c);
    const colorDe = (x) => { const p = x.paint || {}; return [p['fill-color'], p['line-color'], p['circle-color'], p['circle-stroke-color'], p['text-color']].map(primero).find((v) => v && !blanco(v)); };
    if (id === 'nieve') return 'background: linear-gradient(90deg, #DCEBFA, #8EC1EE, #3F86D0, #123A7A)';
    if (id === 'anegamiento') return 'background: linear-gradient(90deg, #0D47A1, #1E88E5, #64B5F6); opacity: .8';
    if (id === 'descartados') return `background: linear-gradient(90deg, ${GRIS} 0 45%, transparent 45% 55%, ${GRIS} 55%); height: 4px`;
    const dib = E[id].filter((x) => x.type !== 'symbol');
    const s = dib.find(colorDe) || dib[0] || E[id][0];
    const col = colorDe(s) || colorDe(E[id][0]) || MOR;
    if (s.type === 'line') return `background: linear-gradient(transparent 5px, ${col} 5px, ${col} 9px, transparent 9px)`;
    if (s.type === 'circle') return `background: radial-gradient(circle, ${col} 4px, transparent 5px)`;
    return `background: ${col}; opacity: .8`;
  };
  const escalaDe = (z) => {
    const lat = mapa.getCenter().lat * Math.PI / 180;
    const mpp = 40075016.686 * Math.cos(lat) / (512 * Math.pow(2, z));
    const d = mpp * 96 / 0.0254;
    const p = Math.pow(10, Math.floor(Math.log10(d)) - 1);
    return Math.round(d / p) * p;
  };
  const miles = (n) => n.toLocaleString('es-AR');
  grupos.forEach((g) => {
    const div = document.createElement('div');
    div.className = 'grupo';
    div.innerHTML = `<h3>${g}</h3>`;
    cfg.capas.filter((c) => c.grupo === g && E[c.id]).forEach((c) => {
      const fila = document.createElement('label');
      fila.className = 'capa';
      fila.dataset.id = c.id;
      fila.title = c.texto;
      fila.innerHTML = `<input type="checkbox" ${c.visible ? 'checked' : ''}><span class="muestra" style="${muestra(c.id)}"></span><span class="nombre">${c.titulo}</span><span class="desde"></span>`;
      if (c.nota) fila.insertAdjacentHTML('beforeend', `<span class="nota-capa">${c.nota}</span>`);
      fila.querySelector('input').addEventListener('change', (e) => SUB[c.id].forEach((l) => mapa.setLayoutProperty(l, 'visibility', e.target.checked ? 'visible' : 'none')));
      div.appendChild(fila);
    });
    contCapas.appendChild(div);
  });
  function actualizarEscala() {
    const z = mapa.getZoom();
    document.getElementById('escala').textContent = `≈ 1:${miles(escalaDe(z))}`;
    const nivel = T.niveles.filter((n) => z >= n.desde).pop();
    document.getElementById('nivel').innerHTML = `<b>${nivel.nombre}.</b> ${nivel.texto}`;
    contCapas.querySelectorAll('.capa').forEach((f) => {
      const c = CAT[f.dataset.id];
      const fuera = z < (c.minzoom || 0);
      f.classList.toggle('fuera', fuera);
      f.querySelector('.desde').textContent = fuera ? `desde ≈ 1:${miles(escalaDe(c.minzoom))}` : '';
    });
  }
  function mostrarCapa(id, si) {
    if (!SUB[id]) return;
    SUB[id].forEach((l) => mapa.setLayoutProperty(l, 'visibility', si ? 'visible' : 'none'));
    const f = contCapas.querySelector(`.capa[data-id="${id}"] input`);
    if (f) f.checked = si;
  }
  const capaVisible = (id) => !!SUB[id] && mapa.getLayoutProperty(SUB[id][0], 'visibility') !== 'none';
  mapa.on('zoom', actualizarEscala);
  mapa.on('moveend', actualizarEscala);
  mapa.once('load', actualizarEscala);

  // ---- fichas al hacer clic
  const interactivas = () => Object.values(SUB).flat().filter((l) => mapa.getLayer(l) && mapa.getLayoutProperty(l, 'visibility') !== 'none');
  mapa.on('click', (e) => {
    if (API.ocupado) return;  // dibujando un perfil
    const f = mapa.queryRenderedFeatures(e.point, { layers: interactivas() }).find((x) => x.properties.titulo);
    if (!f) return;
    const p = f.properties;
    let html = `<div class="ficha"><h4>${p.titulo}</h4>`;
    if (p.texto) html += `<p>${p.texto}</p>`;
    if (p.datos) {
      const d = JSON.parse(p.datos);
      html += '<table>' + Object.entries(d).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('') + '</table>';
    }
    if (p.clase === 'laguna') {
      html += '<div class="galeria">' + T.fotos.map((n) => `<img src="${abs('datos/fotos/' + n)}" alt="${T.epigrafe_foto}" data-foto="${n}">`).join('') + '</div>';
      html += `<p class="epigrafe">${T.epigrafe_foto}</p>`;
    }
    html += `<p class="fuente">Fuente: ${p.fuente}</p></div>`;
    new maplibregl.Popup({ maxWidth: MOVIL ? '290px' : '360px' }).setLngLat(e.lngLat).setHTML(html).addTo(mapa);
  });
  document.getElementById('mapa').addEventListener('click', (e) => {
    const n = e.target.dataset && e.target.dataset.foto;
    if (n) abrirModal(`<img class="grande" src="${abs('datos/fotos/' + n)}" alt="${T.epigrafe_foto}"><p class="epigrafe">${T.epigrafe_foto}</p>`);
  });
  mapa.on('mousemove', (e) => {
    if (API.ocupado) return;
    const hay = mapa.queryRenderedFeatures(e.point, { layers: interactivas() }).some((x) => x.properties.titulo);
    mapa.getCanvas().style.cursor = hay ? 'pointer' : '';
  });

  // ---- ventanas: lo que no se sabe, descargas y acerca de
  const modal = document.getElementById('modal');
  function abrirModal(html) { document.getElementById('m-contenido').innerHTML = html; modal.hidden = false; }
  document.getElementById('m-cerrar').onclick = () => { modal.hidden = true; };
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.hidden = true; });
  document.getElementById('b-nosesabe').onclick = () => abrirModal('<h2>Lo que no se sabe</h2><p>Lo que este trabajo no pudo medir o saber, y que hay que resolver antes de pasar a proyecto.</p><dl>' +
    T.no_se_sabe.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('') + '</dl>');
  document.getElementById('b-descargas').onclick = () => {
    const filas = cfg.capas.filter((c) => c.descargable).map((c) => `<tr><td>${c.titulo}</td><td>${c.elementos}</td><td>${c.fuente}</td><td>${c.licencia}</td>` +
      `<td><a href="${abs(c.archivo)}" download>GeoJSON</a></td></tr>`).join('');
    abrirModal('<h2>Descargas</h2><p>Cada capa del visor, en GeoJSON (WGS 84), con su fuente y su licencia. Las parcelas llevan solo la nomenclatura, nunca titulares.</p>' +
      `<table><tr><th>Capa</th><th>Elementos</th><th>Fuente</th><th>Licencia</th><th></th></tr>${filas}</table>` +
      '<h3>Mapas base</h3><ul>' + cfg.bases.map((b) => `<li><b>${b.titulo}:</b> ${b.atribucion}</li>`).join('') + '</ul>' +
      '<p class="nota">El visor usa MapLibre GL JS (licencia BSD de 3 cláusulas) y la tipografía Open Sans (licencia Apache 2.0).</p>');
  };
  // ---- cómo se hizo: los métodos, del informe y de los scripts; cada tramo con su km y «ver en el mapa»
  document.getElementById('b-como').onclick = () => abrirModal('<h2>Cómo se hizo</h2>' + T.como.map((s, i) => `<section class="como"><h3>${i + 1}. ${s.titulo}</h3>` +
    s.parrafos.map((p) => `<p>${p}</p>`).join('') +
    s.items.map((it, j) => `<div class="como-item"><h4>${it.titulo}</h4><p>${it.texto}</p>` +
      (it.ver ? `<button class="ver" data-s="${i}" data-j="${j}">ver en el mapa</button>` : '') + '</div>').join('') +
    `<p class="fuente">${s.fuente}</p></section>`).join(''));
  modal.addEventListener('click', (e) => {
    if (!e.target.classList.contains('ver')) return;
    const v = T.como[Number(e.target.dataset.s)].items[Number(e.target.dataset.j)].ver;
    modal.hidden = true;
    (v.capas || []).forEach((id) => mostrarCapa(id, true));
    if (v.base) ponerBase(v.base);
    mapa.fitBounds([[v.caja[0], v.caja[1]], [v.caja[2], v.caja[3]]], { padding: 50, duration: 1400, maxZoom: 15 });
  });
  document.getElementById('b-acerca').onclick = () => abrirModal(`<h2>Acerca de</h2><p>${T.acerca}</p><p>${T.pie}</p>`);
  // ---- ayuda «Cómo usar» y glosario: el mismo texto que la ficha A4 «Cómo usar el visor» (scripts/e07_18_ayuda.py)
  const negrita = (s) => s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  document.getElementById('b-ayuda').onclick = () => {
    const A = T.ayuda;
    abrirModal(`<h2>${A.titulo}</h2><p>${A.que_es}</p>` +
      (A.imagen ? `<figure class="ayuda-fig"><img src="${abs(A.imagen)}" alt="El visor con sus partes numeradas"><figcaption>El visor en la computadora, con sus partes numeradas.</figcaption></figure>` : '') +
      `<ol class="ayuda-zonas">${A.zonas_txt.map((z) => `<li>${negrita(z)}</li>`).join('')}</ol>` +
      `<h3>Las herramientas</h3><ul class="ayuda-herr">${A.herramientas.map((h) => `<li>${negrita(h)}</li>`).join('')}</ul>` +
      `<h3>Glosario</h3><dl class="glosario">${A.glosario.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl>`);
  };
  // ---- menú «Informe»: el informe y las cuatro láminas en PDF, para bajar
  document.getElementById('b-informe').onclick = () => abrirModal('<h2>Informe y láminas</h2><p>Los documentos del trabajo, en PDF, los mismos de la entrega. ' +
    'Las láminas son grandes: para imprimirlas, a tamaño real, sin ajustar a la página.</p><table><tr><th>Documento</th><th>Hoja</th><th>Peso</th><th></th></tr>' +
    cfg.informe.map((d) => `<tr><td>${d.titulo}</td><td>${d.hoja}</td><td>${Number(d.mb).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB</td><td><a href="${abs(d.archivo)}" download>PDF</a> · ` +
      `<a href="${abs(d.archivo)}" target="_blank" rel="noopener">abrir</a></td></tr>`).join('') + '</table>');
  document.getElementById('b-panel').onclick = (e) => {
    document.getElementById('panel').classList.toggle('oculto');
    e.target.classList.toggle('activo');
    setTimeout(() => mapa.resize(), 50);
  };
  // ?base=sentinel|sombreado elige el mapa base; ?abrir=nosesabe|descargas|acerca|como|ayuda|informe abre esa ventana al cargar
  // (perfiles.js lee ?perfil=longitudinal|transversales y recorrido.js, ?paso=1..8 y ?km=)
  const bq = { nosesabe: 'b-nosesabe', descargas: 'b-descargas', acerca: 'b-acerca', como: 'b-como', ayuda: 'b-ayuda', informe: 'b-informe' }[q.get('abrir')];
  if (bq) document.getElementById(bq).click();

  // ---- lo que comparten los perfiles, el recorrido e ir al km: la marca en el mapa y el acceso a capas y bases
  const nf = (v, d = 0) => Number(v).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const API = { mapa, cfg, P, T, abs, MOR, F, HALO, nf, q, ponerBase, base: () => baseActual, mostrarCapa, capaVisible, listo: false, ocupado: false, movil: MOVIL };
  // el MDE de 60 m (perfil dibujado y altura del dron): se baja una sola vez, cuando hace falta
  let mdeP = null, M = null;
  API.cargarMDE = () => (mdeP = mdeP || fetch(abs(cfg.mde.archivo)).then((r) => r.arrayBuffer()).then((b) => { M = new Uint16Array(b); return M; }));
  API.cotaEn = (lon, lat) => {  // interpolacion bilineal; null fuera del area o sin dato
    const I = cfg.mde;
    if (!M) return null;
    const fx = (lon - I.oeste) / I.dx - 0.5, fy = (I.norte - lat) / I.dy - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy);
    if (x0 < 0 || y0 < 0 || x0 + 1 >= I.ancho || y0 + 1 >= I.alto) return null;
    const a = M[y0 * I.ancho + x0], b = M[y0 * I.ancho + x0 + 1], c = M[(y0 + 1) * I.ancho + x0], d = M[(y0 + 1) * I.ancho + x0 + 1];
    if (!a || !b || !c || !d) return null;
    const tx = fx - x0, ty = fy - y0;
    return ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty) * I.escala;
  };
  API.panel = (si) => {  // mostrar u ocultar el panel de capas
    document.getElementById('panel').classList.toggle('oculto', !si);
    document.getElementById('b-panel').classList.toggle('activo', si);
    setTimeout(() => mapa.resize(), 30);
  };
  API.marcar = (lon, lat, texto) => {
    const s = mapa.getSource('marca');
    if (s) s.setData(lon == null ? { type: 'FeatureCollection', features: [] } : { type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { texto: texto || '' } });
  };
  window.visorAPI = API;
  // ---- celular: el menú en un botón (se cierra al elegir) y el panel de capas plegado al abrir
  const nav = document.querySelector('#cabecera nav');
  document.getElementById('b-menu').onclick = () => nav.classList.toggle('abierto');
  nav.addEventListener('click', (e) => { if (MOVIL && e.target.tagName === 'BUTTON' && !e.target.closest('#ir-km')) nav.classList.remove('abierto'); });
  document.getElementById('ir-km').addEventListener('submit', () => { if (MOVIL) nav.classList.remove('abierto'); });
  document.getElementById('panel-cerrar').onclick = () => API.panel(false);
  if (MOVIL) API.panel(false);
  window.visor = mapa;  // para las pruebas
  mapa.once('load', () => {
    mapa.addSource('marca', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    mapa.addLayer({ id: 'marca', type: 'circle', source: 'marca', paint: { 'circle-radius': 8, 'circle-color': '#ffffff', 'circle-stroke-color': MOR, 'circle-stroke-width': 3.5 } });
    mapa.addLayer({ id: 'marca-rotulo', type: 'symbol', source: 'marca', layout: { 'text-field': ['get', 'texto'], 'text-font': F.b, 'text-size': 13, 'text-anchor': 'left',
      'text-offset': [1.1, 0], 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: Object.assign({ 'text-color': MOR }, HALO) });
    (q.get('capas') || '').split(',').filter((id) => SUB[id]).forEach((id) => mostrarCapa(id, true));  // ?capas=descartados,nieve enciende esas capas
    API.listo = true;
    window.dispatchEvent(new CustomEvent('visor:listo', { detail: API }));
  });
})();
