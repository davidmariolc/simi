# pdf-viewer Specification

## Purpose

Permitir leer PDFs de internet y archivos locales en un visor opcional de Simi dentro del navegador, con texto seleccionable y controles básicos de lectura, conservando el visor predeterminado del usuario.

## Requirements

### Requirement: Apertura explícita de un PDF de internet

Simi SHALL ofrecer «Abrir en Simi» desde el popup para abrir un PDF HTTP/HTTPS de la pestaña activa en una pestaña del visor propio. SHALL conservar la pestaña original y SHALL NOT registrarse como visor predeterminado ni redirigir automáticamente documentos.

#### Scenario: PDF remoto accesible
- **WHEN** el usuario acciona «Abrir en Simi» desde una pestaña con un PDF HTTP/HTTPS accesible
- **THEN** el visor de Simi carga el documento y permite leer y seleccionar su texto
- **THEN** la pestaña original permanece disponible

#### Scenario: Navegación habitual sin apertura explícita
- **WHEN** el usuario abre un PDF sin accionar «Abrir en Simi»
- **THEN** Simi no sustituye el visor elegido por el navegador

#### Scenario: Pestaña no admitida
- **WHEN** la pestaña activa usa una URL interna o no contiene un PDF remoto admitido
- **THEN** Simi impide la apertura o informa claramente que no puede cargar ese documento

### Requirement: Apertura de un archivo local

Simi SHALL ofrecer acceso al visor desde el popup y un selector de archivos en el visor para abrir PDFs locales elegidos por el usuario. SHALL leer el archivo en el dispositivo sin requerir acceso general al sistema de archivos ni subirlo a un servicio externo.

#### Scenario: Archivo local seleccionado
- **WHEN** el usuario abre el visor, elige un PDF local y confirma el selector
- **THEN** Simi muestra el documento y permite seleccionar su texto
- **THEN** no sube el archivo a un servicio externo

#### Scenario: Selector cancelado
- **WHEN** el usuario cancela el selector de archivos
- **THEN** el documento vigente permanece intacto y no aparece un error de carga

### Requirement: Controles de lectura

El visor SHALL ofrecer navegación por páginas, indicador de página actual y total, zoom y búsqueda de texto. SHALL conservar el contenido original y ofrecer controles utilizables mediante teclado con etiquetas en español.

#### Scenario: Navegación y zoom
- **WHEN** el usuario cambia de página o ajusta el zoom
- **THEN** el visor actualiza el documento y sus indicadores sin modificar el PDF original

#### Scenario: Búsqueda de texto
- **WHEN** el usuario busca un texto presente en el PDF
- **THEN** el visor permite localizar y recorrer sus coincidencias
- **WHEN** no encuentra coincidencias
- **THEN** muestra un estado comprensible de ausencia de resultados

#### Scenario: Controles mediante teclado
- **WHEN** el usuario recorre los controles con Tab y los acciona mediante teclado
- **THEN** puede abrir archivos, navegar, ajustar el zoom y utilizar la búsqueda

### Requirement: Carga y errores explícitos

El visor SHALL distinguir carga, documento preparado y fallo. SHALL informar de permisos denegados, acceso remoto fallido, archivos inválidos y documentos que no puede abrir, permitiendo elegir otro archivo o volver al original. SHALL NOT eludir autenticación ni mostrar un documento parcial como completo.

#### Scenario: Acceso remoto denegado
- **WHEN** el sitio exige una sesión o un permiso que Simi no puede utilizar, o rechaza la descarga
- **THEN** el visor informa que no pudo acceder al PDF
- **THEN** ofrece abrir el original o elegir un archivo local descargado por el usuario

#### Scenario: Documento inválido o protegido no admitido
- **WHEN** el archivo no es un PDF válido o requiere protección que el visor no puede resolver
- **THEN** Simi muestra un error comprensible y permite elegir otro documento

#### Scenario: Documento sin texto seleccionable
- **WHEN** una página no contiene texto seleccionable
- **THEN** el visor permite leerla y explica que su traducción por selección no está disponible
- **THEN** no presenta OCR ni traducción del documento completo

### Requirement: Contenido limitado a la sesión del visor

Simi SHALL mantener documentos, URLs de origen, selecciones y traducciones solo durante la sesión necesaria para el visor, sin guardarlos como historial ni registrarlos en logs. SHALL liberar el documento anterior y descartar su selección al cambiar de archivo o cerrar el visor.

#### Scenario: Sustitución del archivo
- **WHEN** el usuario abre otro PDF en el mismo visor
- **THEN** se descarta la selección del anterior y sus resultados pendientes no aparecen en el nuevo documento

#### Scenario: Inspección de persistencia
- **WHEN** el usuario abre y traduce PDFs remotos y locales
- **THEN** Simi no escribe el documento, la URL de origen, las selecciones ni las traducciones en almacenamiento persistente o logs
- **THEN** las preferencias existentes siguen conservándose

### Requirement: Tabla de contenido integrada
El visor SHALL mostrar el índice integrado del PDF en un panel lateral con títulos jerárquicos, expansión individual y controles para expandir o contraer todo. SHALL permitir navegar a los destinos internos y mostrar u ocultar el panel. SHALL indicar si no existe índice sin generar uno desde el texto.

#### Scenario: Navegación desde el índice
- **WHEN** se abre un PDF con índice integrado y el usuario pulsa un título con destino interno
- **THEN** el visor navega a ese destino y conserva los controles de lectura y traducción

#### Scenario: Documento sin índice
- **WHEN** se abre el panel de un PDF sin índice integrado
- **THEN** el panel informa de su ausencia y la lectura sigue disponible

### Requirement: Sección actual sincronizada con la lectura
El visor SHALL señalar una única entrada actual del índice según el inicio del área visible del documento. SHALL actualizarla tras scroll, teclado, controles de página, búsqueda y navegación desde el índice. SHALL distinguir destinos a distinta altura dentro de una página cuando el PDF proporciona esas posiciones.

#### Scenario: Scroll entre secciones
- **WHEN** la lectura cruza el inicio de otra sección con destino resoluble
- **THEN** el índice actualiza el indicador a la sección que corresponde a la nueva posición

#### Scenario: Subcapítulos en una página
- **WHEN** dos subcapítulos tienen destinos a distinta altura en una misma página y el usuario avanza entre ellos
- **THEN** cambia el subcapítulo actual sin exigir un cambio de página

#### Scenario: Otras formas de navegación
- **WHEN** el usuario navega mediante teclado, controles de página, búsqueda o un título del índice
- **THEN** el indicador se actualiza a partir de la posición visible resultante

#### Scenario: Antes del primer destino
- **WHEN** el área visible comienza antes del primer destino resoluble del índice
- **THEN** no se marca una sección que todavía no se ha alcanzado

### Requirement: Visibilidad de la entrada actual
Con el panel abierto, el visor SHALL desplegar los antecesores de una nueva sección actual y desplazar únicamente el índice si esa entrada queda fuera de su área visible. SHALL preservar el foco y la posición del documento. SHALL permitir la expansión y contracción manual sin reabrir ramas por cada actualización de posición dentro de la misma sección.

#### Scenario: Sección dentro de una rama cerrada
- **WHEN** cambia la sección actual a una entrada cuyos antecesores están contraídos
- **THEN** se despliegan sus antecesores y se muestra la entrada actual sin modificar el foco ni desplazar el PDF

#### Scenario: Entrada fuera de vista
- **WHEN** cambia la sección actual y su entrada queda fuera del área visible del panel
- **THEN** se desplaza el panel lo necesario para mostrarla

#### Scenario: Contracción manual
- **WHEN** el usuario contrae una rama que contiene la sección actual y sigue leyendo dentro de esa sección
- **THEN** se respeta la contracción hasta que cambie la sección o vuelva a abrirse el panel

### Requirement: Cierre manual y recuperación del panel
El seguimiento SHALL continuar con el panel cerrado sin abrirlo automáticamente por cambios de posición. Al volver a abrirlo, el visor SHALL mostrar la sección vigente con sus antecesores desplegados y su entrada visible.

#### Scenario: Lectura con el panel cerrado
- **WHEN** el usuario cierra el panel y avanza a otra sección
- **THEN** el panel permanece cerrado
- **WHEN** el usuario lo abre de nuevo
- **THEN** se presenta la ubicación actual en lugar de la selección anterior

### Requirement: Indicación accesible de ubicación
La entrada actual SHALL distinguirse visualmente con los colores de Simi y mediante una indicación semántica de ubicación para tecnologías de asistencia. La actualización automática SHALL NOT tomar el foco ni convertir cada desplazamiento en un anuncio intrusivo.

#### Scenario: Ubicación accesible
- **WHEN** una sección se convierte en la sección actual
- **THEN** su título recibe el resaltado y una indicación semántica de ubicación actual
- **THEN** la entrada anterior pierde ambas indicaciones y el foco se conserva

### Requirement: Destinos ambiguos o no resolubles
El seguimiento SHALL ignorar destinos inválidos, externos o sin ubicación interna resoluble sin impedir leer el PDF. Ante destinos coincidentes, SHALL elegir de manera estable la entrada más profunda y, si persiste el empate, la primera en el orden del índice. Los destinos que solo identifican una página SHALL tratarse como su inicio.

#### Scenario: Marcadores coincidentes
- **WHEN** varias entradas apuntan a la misma posición
- **THEN** se aplica el desempate estable sin alternar entre ellas al actualizar la vista

#### Scenario: Destinos no utilizables
- **WHEN** parte del índice contiene destinos externos, ausentes o inválidos
- **THEN** se conserva el resto del índice y el seguimiento usa únicamente destinos resolubles

### Requirement: Seguimiento limitado al documento vigente
La posición, la sección actual y los destinos resueltos SHALL mantenerse únicamente durante la sesión del documento vigente. Cambiar de PDF o cerrar el visor SHALL descartar ese estado e impedir que resultados pendientes de otro documento alteren el índice nuevo.

#### Scenario: Sustitución durante la resolución
- **WHEN** el usuario abre otro PDF mientras se resuelven destinos del anterior
- **THEN** se elimina la sección anterior y se ignoran sus resultados pendientes
- **THEN** el nuevo PDF determina su propia ubicación sin escribir un historial de lectura
