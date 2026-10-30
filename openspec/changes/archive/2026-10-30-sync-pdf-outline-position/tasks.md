# Tasks

## 1. Resolución de posiciones del índice

- [x] 1.1 Crear el módulo de resolución en `lib/` con rutas estables, antecesores, caché por documento y concurrencia limitada; añadir pruebas unitarias de destinos explícitos, con nombre, referencias de página, destinos inválidos y páginas sin altura concreta, y verificar que pasan sin cargar texto del PDF.
- [x] 1.2 Implementar la selección de sección mediante página y altura normalizada, incluyendo empate por profundidad y orden, posición anterior al primer destino y última sección; verificar con pruebas unitarias de subcapítulos en una misma página, coordenadas de viewport y marcadores coincidentes.

## 2. Seguimiento del documento vigente

- [x] 2.1 Integrar `updateviewarea` y resolución de destinos en `entrypoints/pdf/App.tsx`, actualizar React solo cuando cambie la ruta y descartar resultados de cargas anteriores; ampliar los fixtures y `tests/pdf.spec.ts` para comprobar scroll, teclado, navegación por páginas, búsqueda, clic en el índice y sustitución durante resolución demorada.
- [x] 2.2 Documentar el seguimiento y sus límites de precisión en README y changelog pendiente; verificar que el texto describe marcadores integrados, posiciones dentro de página y ausencia de persistencia sin anunciar una nueva entrega.

## 3. Ubicación visible y accesible en el panel

- [x] 3.1 Añadir ruta activa a `components/PdfOutline.tsx`, resaltado terracota y `aria-current="location"` en los estilos del visor; añadir pruebas de navegador que confirmen una sola entrada actual, retirada del indicador anterior y conservación del foco.
- [x] 3.2 Desplegar los antecesores al cambiar de sección o reabrir el panel y desplazar exclusivamente su contenedor cuando la entrada esté fuera de vista; verificar en escritorio y ventana estrecha el cierre respetado, reapertura en la sección vigente, contracción manual y ausencia de desplazamiento del PDF, incluyendo una captura de evidencia.

## 4. Verificación integrada

- [x] 4.1 Ejecutar `npm run typecheck`, `npm run build`, `npm run test:release` y `npm test`; verificar regresiones de traducción por selección, búsqueda, zoom, documentos sin índice y navegación del panel existente, y validar el cambio con `openspec validate sync-pdf-outline-position --strict`.
