# Ficha de Simi para Chrome Web Store

Textos preparados para Simi 0.1.0, revisados el 12 de octubre de 2026. Copiar únicamente el contenido de cada campo al panel. Las indicaciones y la lista de pendientes son para preparar la publicación.

## Nombre

Simi — inglés a español

Este campo procede de `name` en el manifiesto del paquete validado.

## Resumen

Traduce el texto seleccionado junto a la selección con los modelos locales de Chrome.

Este texto coincide con `description` en el manifiesto y cumple el máximo de 132 caracteres.

## Descripción detallada

Copiar el contenido del siguiente bloque como texto plano:

```text
Lee en inglés y consulta la traducción al español junto al texto que seleccionas. Simi utiliza los modelos locales de Chrome para ayudarte a entender palabras, frases y párrafos sin cambiar de pestaña.

TRADUCE MIENTRAS LEES
• Selecciona texto en una página web y consulta la traducción en una burbuja junto a la selección.
• Traduce texto seleccionable en la vista Preview de notebooks de GitHub.
• Abre PDFs de internet o de tu computadora en el visor de Simi y traduce sus selecciones. El visor incluye búsqueda, navegación por páginas y zoom.
• Activa o desactiva la traducción automática desde el icono de la extensión.
• Cierra la burbuja con Escape, el botón de cierre o un clic fuera.

TRADUCCIÓN LOCAL
El texto se procesa en tu dispositivo con los modelos de Chrome. Simi no envía tus selecciones a un servicio de traducción externo ni guarda un historial de traducciones. Los PDFs locales se leen en tu computadora, sin subirlos a un servicio externo. La preferencia de traducción automática se guarda localmente.

CÓMO EMPEZAR
1. Abre una página con texto en inglés y permite que Simi acceda al sitio.
2. Selecciona una palabra, frase o varios párrafos.
3. Si aparece «Activar traducción», pulsa el botón. La primera preparación puede necesitar internet para descargar los modelos de Chrome.
4. Consulta el resultado junto al texto seleccionado.

Para un PDF de internet, abre el menú de Simi y pulsa «Abrir en Simi». Para un archivo de tu computadora, pulsa «Abrir PDF local» y elige el documento. El visor de Simi se abre en otra pestaña.

COMPATIBILIDAD
Simi está dirigida a Chrome de escritorio, versión 138 o posterior. La traducción depende de que Chrome ofrezca los modelos de inglés a español y de que la página permita utilizarlos. Algunos contextos pueden impedir la traducción o requerir preparar el modelo de nuevo.

Esta versión traduce de inglés a español y no detecta automáticamente el idioma. No traduce páginas completas, campos editables, páginas internas de Chrome ni el visor PDF integrado de Chrome. Para PDFs debes utilizar el visor de Simi; los documentos escaneados sin texto seleccionable y los PDFs con contraseña no son compatibles. El soporte de notebooks se limita al visor de github.com; no incluye GitHub Enterprise ni otros visores incrustados.
```

## Clasificación

| Campo | Valor preparado |
| --- | --- |
| Idioma | Español |
| Categoría sugerida | Productividad; elegir la opción equivalente disponible en el panel |
| Contenido para adultos | No |

## Enlaces

| Campo | URL |
| --- | --- |
| Página principal | https://github.com/DavidMarioLC/simi |
| Soporte | https://github.com/DavidMarioLC/simi/issues |
| Política de privacidad | https://davidmariolc.github.io/simi/privacy.html |

GitHub Issues estaba habilitado al preparar esta ficha. El repositorio puede servir como página principal; no se ha configurado un dominio verificado del editor.

## Propósito único

Texto para la sección de privacidad del panel:

```text
Traducir del inglés al español el texto que el usuario selecciona mientras lee páginas web, notebooks de GitHub y documentos abiertos en el visor PDF de Simi, mediante los modelos locales de Chrome.
```

## Plan de imágenes

| Recurso | Estado | Preparación |
| --- | --- | --- |
| Icono 128 × 128 | Preparado | `chrome-web-store/icon-128.png` |
| Captura 1: traducción en una web | Preparada a 1280 × 800 | `chrome-web-store/01-web-1280x800.png` |
| Captura 2: visor PDF de Simi | Preparada a 1280 × 800 | `chrome-web-store/02-pdf-1280x800.png` |
| Captura 3: notebook de GitHub | Preparada a 1280 × 800 | `chrome-web-store/03-github-1280x800.png` |
| Imagen promocional 440 × 280 | Preparada | `chrome-web-store/promo-440x280.png` |

Las nuevas capturas muestran el producto real con traducciones nativas y contenido de demostración o público. Subirlas en el orden indicado. Su procedencia y la fuente editable de la imagen promocional están en [la carpeta de imágenes](chrome-web-store/README.md).

## Pendientes antes del envío

- Subir los PNG preparados en `docs/chrome-web-store/` a sus campos correspondientes.
- Añadir la URL pública de la política de privacidad al panel y completar las declaraciones de datos y las justificaciones de permisos.
- Revisar que el icono, las capturas y la descripción correspondan al ZIP `simi-0.1.0-chrome.zip`.

## Referencias oficiales

- [Completar la ficha](https://developer.chrome.com/docs/webstore/cws-dashboard-listing).
- [Título, resumen y descripción](https://developer.chrome.com/docs/webstore/best-listing).
- [Dimensiones de imágenes](https://developer.chrome.com/docs/webstore/images).

Estos materiales preparan la ficha; no se ha creado ni enviado un registro en la tienda.
