# Spec Delta

## ADDED Requirements

### Requirement: Reanudación de lectura por PDF

Simi SHALL guardar automáticamente el número de página actual cuando el lector cambie de página y recuperarlo al volver a abrir el mismo PDF en el mismo perfil de Chrome. La entrada persistente SHALL contener únicamente una huella del contenido y el número de página.

#### Scenario: Reapertura de un PDF local
- **WHEN** el usuario cambia de página, cierra el visor y elige nuevamente el mismo PDF
- **THEN** el visor abre la página guardada aunque el archivo tenga otro nombre

#### Scenario: Reapertura de un PDF de internet
- **WHEN** el usuario vuelve a abrir con Simi un PDF de internet cuyo contenido coincide con un PDF con progreso guardado
- **THEN** el visor abre la página guardada para ese contenido

#### Scenario: PDF sin una página válida guardada
- **WHEN** se abre un PDF sin progreso, con un número fuera de rango o con el almacenamiento indisponible
- **THEN** el visor permite leer el documento desde la primera página

## MODIFIED Requirements

### Requirement: Seguimiento limitado al documento vigente

La posición dentro de la página, la sección actual y los destinos resueltos SHALL mantenerse únicamente durante la sesión del documento vigente. Cambiar de PDF o cerrar el visor SHALL descartar ese estado e impedir que resultados pendientes de otro documento alteren el índice nuevo. El número de página se conserva según el requisito de reanudación de lectura.

#### Scenario: Sustitución durante la resolución
- **WHEN** el usuario abre otro PDF mientras se resuelven destinos del anterior
- **THEN** se elimina la sección anterior y se ignoran sus resultados pendientes
- **THEN** el nuevo PDF determina su propia ubicación a partir de su página inicial o guardada
