# Acceso argentino al paso Las Leñas · visor

Visor web de la propuesta de acceso argentino al paso Las Leñas, de El Sosneado al portal N4 (Mendoza): trabajo final de Cartografía Aplicada, Ingeniería en Agrimensura, Universidad Juan Agustín Maza.

**En línea:** https://moschellavalentin-jpg.github.io/visor-paso-las-lenas/

## Qué tiene

- Las capas de la propuesta con el detalle que corresponde a cada escala, como en las láminas.
- Perfiles: el longitudinal del tronco y del túnel, los tres transversales y un perfil que se dibuja sobre el mapa.
- Un recorrido guiado en ocho pasos, «ir al km» y un vuelo 3D sobre el camino con ocho paradas.
- El agua: la escorrentía (partículas que siguen la dirección del flujo) y un anegamiento indicativo con HAND, con niveles de 0,5 a 3 m y la lista de cruces de cauce y de tramos a lo largo del río. Es un escenario indicativo, no un modelo hidráulico: no hay caudales ni lluvias de diseño.
- Mapas base propios de toda Mendoza (Sentinel-2 y relieve sombreado), con la zona del corredor a 10 m, sobre Argenmap.
- Los paneles «Lo que no se sabe», «Cómo se hizo», «Descargas» (cada capa con su fuente y su licencia) e «Informe» (el informe y las cuatro láminas en PDF), y la ayuda «?» con un glosario. Anda en la computadora y en el celular.

## Sin conexión

Descargar el repositorio (Code → Download ZIP), descomprimirlo y hacer doble clic en `ABRIR_VISOR.bat` (Windows): sirve la carpeta en `http://localhost` y abre el navegador. Abierto como archivo (`file:///`), el navegador no deja leer los datos, y el visor lo avisa.

## Datos

Cada capa lleva su fuente y su licencia en el panel «Descargas». Imagen: contiene datos modificados de Copernicus Sentinel (2025-2026). Relieve: Copernicus DEM GLO-30 (zona del corredor) y GLO-90 (Mendoza). Mapa base: Argenmap, del Instituto Geográfico Nacional. Las parcelas llevan solo la nomenclatura, nunca titulares. El visor usa MapLibre GL JS (licencia BSD de 3 cláusulas) y la tipografía Open Sans (licencia Apache 2.0).

Trabajo académico: no es cartografía oficial. Luca Valentín Moschella.
