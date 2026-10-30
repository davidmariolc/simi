# Proposal

## Why

El índice del visor PDF permite saltar a capítulos, pero no indica qué sección se está leyendo al desplazarse o cambiar de página. Sin esa referencia, el usuario pierde su ubicación en documentos largos aunque tenga el índice abierto.

## What Changes

- Resaltar la entrada del índice que corresponde a la posición visible del PDF, incluso entre subcapítulos de una misma página cuando sus destinos permiten distinguirlos.
- Sincronizar el indicador al usar scroll, teclado, navegación por páginas, búsqueda y enlaces del índice.
- Desplegar los antecesores de la sección activa y desplazar únicamente el panel cuando su entrada quede fuera de vista, sin mover el foco ni cambiar la posición del documento.
- Respetar el cierre manual del panel y recuperar la ubicación vigente al volver a abrirlo.
- Resolver empates y marcadores incompletos de manera determinista; descartar el estado al cambiar de documento.
- Mantener el procesamiento local y los permisos existentes. No se incluye generación de índices, persistencia de lectura, cambios de versión ni publicación.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pdf-viewer`: tabla de contenido sincronizada con la posición de lectura, identificación accesible de la sección actual y visibilidad automática de su entrada.

## Impact

- `entrypoints/pdf/App.tsx`: recibir posición de PDF.js e integrar la resolución de los destinos del índice con el ciclo de carga.
- `components/PdfOutline.tsx` y `entrypoints/pdf/style.css`: estado activo, expansión automática y desplazamiento exclusivo del panel.
- Un módulo de resolución en `lib/`, fixtures sintéticos y pruebas unitarias/de navegador para destinos, navegación y cambios de documento.
- README y changelog para documentar el seguimiento. Sin servicios externos ni dependencias nuevas.

La especificación principal de `pdf-viewer` aún no recoge el panel ya implementado en 0.2.0. El delta añadirá ese contrato como base del seguimiento, sin rediseñar su comportamiento existente.
