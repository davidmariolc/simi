# Design

## Context

Ver `proposal.md` para la motivación. `App.tsx` crea un `PDFViewer`, un `EventBus` y un `PDFLinkService` por sesión del visor. Escucha `pagechanging` para el número de página, pero no envía ubicación a `PdfOutline`. El componente identifica entradas mediante rutas de índices y conserva un conjunto de ramas expandidas. PDF.js instalado emite `updateviewarea` con página y coordenadas PDF del inicio visible, incluyendo actualizaciones de posición dentro de una página.

El diseño es necesario porque coordina resolución asíncrona de destinos, eventos de lectura, estado de React y desplazamiento de dos contenedores independientes. La especificación principal no recoge aún el panel existente; su contrato básico se añade en el delta como antecedente, sin reconstruirlo.

## Goals / Non-Goals

**Goals:**
- Calcular una ubicación estable sin resolver destinos ni leer texto en cada evento de scroll.
- Separar la sección activa de la expansión manual, la visibilidad del panel y el foco.
- Compartir un algoritmo verificable entre navegación por página y por posición dentro de ella.

**Non-Goals:**
- Inferir encabezados desde el contenido, OCR o seguimiento del cursor y de la selección de traducción.
- Almacenar progreso, introducir servicios o dependencias, publicar paquetes o modificar la versión.
- Conocer qué párrafo está mirando el usuario: la referencia es el inicio visible del documento.

## Decisions

### 1. Índice de destinos resueltos por documento

Crear un módulo de seguimiento en `lib/` que aplane el árbol y conserve ruta estable, antecesores, profundidad y orden original. Resolver destinos explícitos y con nombre mediante `getDestination` y referencias a páginas mediante `getPageIndex`, reutilizando promesas por nombre o referencia. Resolver con concurrencia limitada para índices grandes; aislar el fallo de cada entrada. La lectura se habilita sin esperar al índice.

Convertir posiciones explícitas y puntos visibles al mismo sistema de coordenadas de lectura usando el viewport de la página, con escala normalizada. Los destinos de ajuste de página o sin altura concreta se representan como inicio de página. No derivar posiciones del DOM de títulos, porque los marcadores pueden apuntar a texto no renderizado. La resolución se invalida mediante la generación del documento ya existente.

Alternativa descartada: comparar solo números de página. No distingue subcapítulos en la misma página.

### 2. Selección desde `updateviewarea`

Conservar la última posición visible y buscar el último destino alcanzado, ordenando por página y altura normalizada. Para pequeños errores de redondeo al navegar, usar una tolerancia de un píxel en coordenadas normalizadas. Entre destinos coincidentes, elegir mayor profundidad y después menor orden original. Antes del primer destino, no hay entrada activa. En páginas posteriores al último destino se mantiene esa última sección.

Guardar la ubicación reciente mientras se resuelven los destinos; al finalizar, calcular inmediatamente la sección para esa ubicación. En eventos posteriores, actualizar React solo si cambia la ruta activa. Usar búsquedas sobre el índice resuelto, sin llamadas asíncronas por evento. El scroll y la navegación de PDF.js convergen en la misma fuente de posición; no usar el último clic como verdad de lectura.

Alternativa descartada: marcar únicamente la entrada pulsada. Queda obsoleta al leer o buscar.

### 3. Estado activo y revelado del índice

Pasar la ruta activa y el estado abierto a `PdfOutline`. Aplicar `aria-current="location"` y estilos terracota al título activo, también cuando sea un encabezado sin acción. Al cambiar la ruta activa, o al reabrir el panel, unir sus antecesores al conjunto expandido. Conservar las ramas ajenas y permitir que el usuario contraiga manualmente la actual hasta el próximo cambio de sección o reapertura.

Después de renderizar los antecesores, medir entrada y panel. Si no está completamente visible, ajustar únicamente `scrollTop` del panel lo mínimo necesario. Si la entrada es más alta que el panel, alinear su inicio. No usar `focus()` ni un desplazamiento que afecte a los antecesores del documento. El indicador no necesita una región de anuncios en vivo.

Alternativa descartada: centrar siempre la entrada y reconstruir las ramas en cada scroll. Interrumpe la exploración manual del índice.

### 4. Ciclo de vida y degradación

El seguimiento nunca modifica `outlineOpen`. Con el panel cerrado sigue calculando la sección sin desplazarlo. Cada carga reinicia ruta activa, índice y cachés; comprobar generación y estado de desmontaje después de las operaciones asíncronas. Un error de resolución de marcadores no debe cambiar el estado de carga del PDF ni deshabilitar lectura, búsqueda o traducción.

## Risks / Trade-offs

- Marcadores idénticos o sin coordenadas precisas → regla estable de empate y aproximación al inicio de página; documentar que no se infiere información ausente.
- Índices grandes → cachés locales, concurrencia limitada y búsqueda sobre destinos precalculados.
- Eventos frecuentes de zoom o scroll → actualizar el estado solo al cambiar de sección y usar coordenadas normalizadas.
- Desplazamiento involuntario del PDF al revelar una entrada → modificar únicamente el contenedor lateral y verificar que el foco y la posición del documento no cambian.
- Documento sustituido durante la resolución → invalidación por generación y pruebas con respuestas demoradas.

## Migration Plan

No hay migración de datos ni cambios de permisos. Verificar con PDFs sintéticos que tengan destinos en distintas páginas y alturas, marcadores coincidentes e inválidos. Ejecutar tipos, compilación, pruebas del resolvedor y pruebas de navegador, incluyendo regresiones de búsqueda y traducción. La reversión consiste en retirar la integración del seguimiento conservando el panel y sus enlaces.
