# Design

## Context

Ambas rutas de carga del visor obtienen los bytes del PDF y los entregan al mismo visor PDF.js. La extensión ya dispone de almacenamiento local.

## Goals / Non-Goals

La reanudación recupera el número de página. El zoom, la posición dentro de la página y el estado del índice pertenecen a la sesión de lectura.

## Decisions

- Calcular SHA-256 sobre los bytes antes de entregarlos a PDF.js, que puede transferirlos al worker. El contenido identifica de forma uniforme a PDFs locales y remotos, incluso tras un cambio de nombre o de URL.
- Usar una clave `pdfProgress:<huella>` con un número en el almacenamiento local de la extensión. Cada documento tiene su propia clave, de modo que pestañas con PDFs distintos pueden guardar su página de forma independiente.
- Restaurar una página válida al inicializar el visor y comenzar a guardar en el evento de cambio de página de PDF.js. El guardado se habilita después de aplicar la posición inicial y se desvincula antes de reemplazar el documento.

## Risks / Trade-offs

- Los cambios en los bytes del PDF generan una huella distinta y una posición independiente.
- Un fallo de cálculo, lectura o escritura del progreso permite que el visor siga funcionando con el estado disponible en memoria.
