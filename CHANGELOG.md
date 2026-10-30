# Changelog

Las notas describen entregas de Simi. Un bloque preparado no implica que la Release ya esté publicada; consulta Releases en GitHub para conocer las entregas disponibles.

## [Pendiente]

## [0.2.0] - 2026-10-29

### Funcionalidades

- Tabla de contenido del PDF en un panel lateral, con capítulos y subcapítulos desplegables, controles para expandir o contraer todo y navegación a sus destinos.

## [0.1.0]

### Funcionalidades

- Traducción local del inglés al español junto al texto seleccionado mediante los modelos de Chrome, con activación inicial, progreso de descarga y reintento.
- Traducción de selecciones en notebooks públicos de GitHub.
- Visor PDF opcional para documentos de internet y archivos locales, con selección de texto, búsqueda y zoom.
- Popup para activar o desactivar la traducción automática y conservar la preferencia localmente.
- Identidad visual terracota e icono andino de Simi.

### Correcciones

- Burbuja más compacta y visible por encima de las superposiciones de las páginas.
- Apertura del visor PDF al 100 % y presentación del icono de marca en su barra.

### Compatibilidad

- Chrome de escritorio 138 o posterior, sujeto a disponibilidad de Translator API y del par inglés a español en cada contexto.
- La instalación desde GitHub requiere descomprimir el ZIP compilado y cargar la carpeta en modo desarrollador; no recibe actualizaciones automáticas.
- Las páginas escaneadas sin texto, PDFs con contraseña, campos editables y el visor PDF integrado de Chrome quedan fuera del alcance.
