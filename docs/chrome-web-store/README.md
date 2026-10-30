# Imágenes de Chrome Web Store

Material preparado para Simi 0.1.0. Subir los archivos PNG individualmente en la ficha.

| Archivo | Dimensiones | Uso |
| --- | --- | --- |
| `01-web-1280x800.png` | 1280 × 800 | Primera captura: traducción junto al texto en una página |
| `02-pdf-1280x800.png` | 1280 × 800 | Segunda captura: selección en el visor PDF de Simi |
| `03-github-1280x800.png` | 1280 × 800 | Tercera captura: traducción en un notebook de GitHub |
| `promo-440x280.png` | 440 × 280 | Imagen promocional pequeña |
| `icon-128.png` | 128 × 128 | Icono de la ficha |

## Procedencia

- Las tres capturas se tomaron del paquete de producción `.output/chrome-mv3`, con Chrome de escritorio, un perfil temporal, escala de dispositivo 1 y Translator API real. No se sustituyeron las traducciones ni se redibujó la interfaz de Simi.
- La primera captura usa un artículo ficticio con texto de demostración, servido únicamente en el navegador de captura. No representa un sitio de un cliente.
- El PDF es el [documento público de ejemplo de Mozilla PDF.js](https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf), abierto como archivo local en el visor de Simi. Se selecciona «Abstract».
- El notebook es [07 - Bar and Categorical Data Plots.ipynb](https://github.com/bokeh/bokeh-notebooks/blob/main/tutorial/07%20-%20Bar%20and%20Categorical%20Data%20Plots.ipynb), del repositorio público de Bokeh. Se selecciona la frase que comienza por «Bokeh makes».
- `capture-report.json` conserva la versión de Chrome y los resultados nativos mostrados.
- `promo.html` es la fuente editable de la imagen promocional. Se renderizó con un viewport de 440 × 280, reutilizando `assets/simi-icon.svg` y la paleta de marca. No se utilizó generación de imágenes por IA.
- El icono es una copia de `public/icon/128.png`.

## Revisión

Las capturas muestran la experiencia existente. El contenido inglés del ejemplo se mantiene seleccionado, y la traducción aparece en la burbuja real. La imagen promocional presenta la marca y la dirección de traducción; no representa una pantalla del producto.

[Requisitos oficiales de imágenes](https://developer.chrome.com/docs/webstore/images).
