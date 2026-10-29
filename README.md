# Simi

Extensión de Chrome de escritorio para traducir del inglés al español junto al texto seleccionado. Stack: WXT, TypeScript, Manifest V3, React y Tailwind CSS.

## Desarrollo

Requisitos: Node.js 22 o posterior y Chrome 138 o posterior. La disponibilidad efectiva de Translator API se comprueba en cada contexto.

```sh
npm ci
npm run typecheck
npm run build
npm run dev
```

## Controles antes de commit y push

`npm ci` instala automáticamente los hooks versionados de `.githooks` mediante `core.hooksPath` local. En un clon que ya tiene dependencias, ejecuta `npm run hooks:install`. Si tienes otra ruta de hooks configurada, la instalación se detiene para que puedas revisar el conflicto antes de reemplazarla.

- **Pre-commit:** `npm run check:commit` comprueba tipos y ejecuta las pruebas unitarias, incluidas las herramientas de entrega.
- **Pre-push:** `npm run check:push` compila la extensión y ejecuta todas las pruebas.

Antes del primer push instala el navegador de pruebas:

```sh
npx playwright install chromium
```

Cualquier fallo bloquea la operación. Los hooks validan el árbol de trabajo actual, incluido el contenido sin staging; conviene mantenerlo alineado con lo que vas a enviar. No modifican el staging. Necesitas Node.js, npm y las dependencias instaladas disponibles en el entorno desde el que ejecutas Git.

## Integración continua

El workflow `.github/workflows/ci.yml` ejecuta `npm run check:ci` en cada push y pull request de GitHub: prueba las herramientas de entrega, comprueba tipos, compila y ejecuta todas las pruebas de la extensión. Usa Ubuntu y Node.js 24, instala dependencias con `npm ci` y prepara Chromium con las bibliotecas del sistema. Puedes consultar la ejecución en la pestaña **Actions** del repositorio y descargar el informe HTML de Playwright durante 7 días.

Para ejecutar los mismos controles localmente:

```sh
npm run check:ci
```

La instalación de hooks se omite en CI. La comprobación de traducciones con modelos reales, `npm run probe:native`, continúa siendo manual.

## Instalación de la extensión

Para instalar una entrega, abre [Releases](https://github.com/DavidMarioLC/simi/releases) y descarga `simi-X.Y.Z-chrome.zip` de la versión elegida. Descomprímelo en una carpeta permanente, abre `chrome://extensions`, activa «Modo de desarrollador» y usa «Cargar descomprimida» sobre la carpeta que contiene `manifest.json`. Los archivos **Source code** de GitHub contienen el código fuente y no son el paquete compilado de la extensión. Si todavía no hay Releases publicadas, usa la instalación desde el código descrita a continuación.

Al actualizar una instalación descomprimida, reemplaza el contenido de su carpeta con el nuevo ZIP, recarga la extensión desde `chrome://extensions` y recarga las pestañas abiertas. Conserva la ruta de la carpeta. Estas instalaciones no se actualizan automáticamente desde GitHub.

1. Ejecutar `npm run build`.
2. Abrir `chrome://extensions` y activar «Modo de desarrollador».
3. Pulsar «Cargar descomprimida» y elegir `.output/chrome-mv3` de este proyecto.
4. Abrir o recargar la página donde se utilizará la extensión y permitirle acceso a ese sitio desde Chrome.

## Permisos y privacidad

El content script solicita acceso a páginas HTTP/HTTPS para detectar selecciones automáticamente. Chrome permite controlar su acceso por sitio. El permiso `storage` se destina a preferencias locales. El permiso `activeTab` permite conocer la URL de la pestaña al abrir el popup para usar «Abrir en Simi»; el visor PDF puede solicitar acceso opcional al origen del documento. No se solicitan permisos de historial, cookies, panel lateral ni proveedores de traducción remotos.

La traducción usa modelos locales de Chrome. La primera preparación puede necesitar conexión para descargar recursos. El contenido no se envía a un servicio externo ni se guarda como historial.

## Uso

Selecciona una palabra, una frase o varios párrafos en inglés y suelta el ratón. También se admite una selección con teclado; para crear una selección en texto no editable con las flechas, utiliza la navegación por cursor de Chrome (F7). La traducción aparece encima de la primera línea visible de la selección, o debajo si falta espacio.

También puedes seleccionar texto en la vista **Preview** de archivos `.ipynb` de repositorios de `github.com`. Simi detecta la selección en el visor del notebook y muestra la burbuja en la página de GitHub. Si hace falta preparar el modelo, pulsa «Activar traducción». Después de actualizar la extensión, recárgala en `chrome://extensions` y recarga las pestañas de GitHub abiertas.

Si aparece «Activar traducción», púlsalo para preparar el traductor de ese documento. La primera vez puede descargarse un modelo; verás su progreso. Si el gesto de selección ya permite prepararlo, la extensión puede empezar automáticamente. Las siguientes selecciones reutilizan la instancia mientras siga siendo válida.

Cierra la burbuja con Escape, el botón de cierre o un clic fuera. Una nueva selección cambia el resultado. Los resultados largos tienen desplazamiento interno. Desde el icono de Simi puedes activar o desactivar la traducción automática; esa preferencia se conserva localmente y se aplica a las pestañas abiertas.

## PDFs de internet y archivos locales

Para un PDF de internet abierto en una pestaña, abre el popup y pulsa **Abrir en Simi**. Se abre otra pestaña con el visor opcional; el visor habitual y el documento original permanecen disponibles. Si falta acceso al sitio, pulsa «Permitir acceso al sitio» en el visor. Algunos sitios con sesión o enlaces temporales pueden impedir la carga; en ese caso, descarga una copia y ábrela como archivo local.

Para un PDF de tu computadora, pulsa **Abrir PDF local** en el popup y elige el archivo en el visor. El archivo se lee en tu dispositivo, sin subirlo a un servicio externo y sin habilitar acceso a `file://`.

El visor incluye páginas, zoom, búsqueda y un panel de **Tabla de contenido**. Si el PDF incluye un índice integrado, el panel se abre automáticamente y muestra sus capítulos y subcapítulos; puedes desplegarlos individualmente, expandir o contraer todo y pulsar un título para ir a su ubicación. El botón de la barra permite mostrar u ocultar el panel. Si el archivo no incluye ese índice, Simi lo indica; no genera uno a partir del texto.

Al seleccionar texto, aparece automáticamente la burbuja de traducción. Puede pedir la activación inicial del modelo. Un nuevo renderizado por zoom cierra la selección anterior; selecciona de nuevo. Las páginas escaneadas sin texto y los PDFs que requieren contraseña no ofrecen traducción por selección en esta versión.

Consulta [la compatibilidad del visor PDF](docs/pdf-compatibility.md). Después de actualizar la extensión, recárgala en `chrome://extensions`. No necesitas cambiar tu visor PDF predeterminado.

## Compatibilidad y límites

La versión mínima declarada es Chrome 138, pero se comprueba la API y el par inglés a español en cada documento. Una página puede bloquear la API mediante su política de permisos; HTTP remoto no seguro puede no ofrecerla. La primera preparación puede fallar: utiliza «Reintentar» y comprueba la conexión. Al dejar una pestaña o desactivar Simi se libera el traductor local para evitar agotar los servicios de Chrome. Al volver, una nueva selección lo prepara de nuevo. Si Chrome indica que no está disponible, cierra otras pestañas donde hayas usado Simi y pulsa «Reintentar»; si persiste, guarda tu trabajo y reinicia Chrome.

Esta versión cubre texto seleccionable del visor PDF propio de Simi, del documento principal de páginas web accesibles para la extensión y del visor incrustado de notebooks `.ipynb` de `github.com` servido por `notebooks.githubusercontent.com`. No traduce campos de formulario, contenido editable, otros iframes, el visor PDF integrado, páginas internas de Chrome ni Chrome Web Store. GitHub Enterprise y otros visores de notebooks quedan fuera de esta excepción. No detecta automáticamente el idioma de origen: asume inglés. La extensión traduce la selección visible; no descarga ni ejecuta el notebook ni traduce el archivo completo.

Consulta [la evidencia de compatibilidad](docs/translator-compatibility.md) para distinguir lo comprobado con Chrome real de las pruebas con simulaciones.

## Pruebas y empaquetado

```sh
npx playwright install chromium
npm run typecheck
npm run build
npm test
npm run probe:native
npm run probe:pdf
npm run zip
```

`npm test` prueba el paquete compilado con Chromium y un proveedor simulado instalado por el código de pruebas en el mundo aislado. La simulación no forma parte del paquete de producción. Incluye estados de descarga, errores, selección real, geometría, estilos, cierre y preferencias en dos pestañas y entre sesiones.

`npm run probe:native` utiliza Chrome instalado y un perfil temporal independiente. Comprueba traducciones reales de ejemplos sintéticos, navegación, recarga y una página que deniega la API. También provoca una excepción de prueba para comprobar el reintento, restaurando después el método nativo. Los informes y capturas quedan en `test-results/`. Los perfiles temporales se eliminan al terminar.

`npm run probe:notebooks` comprueba el flujo en notebooks públicos reales de GitHub con Chrome instalado y Translator API nativa. Requiere acceso a GitHub y puede descargar los modelos de Chrome. Guarda evidencia temporal en `test-results/native-notebooks.json` y `test-results/native-notebook.png`.

El ZIP de WXT queda en `.output/`. Para instalar localmente usa la carpeta `.output/chrome-mv3`; no hace falta publicar en la tienda.

`npm run probe:pdf` comprueba Translator API real y el visor PDF compilado con Chrome instalado y un perfil temporal. Guarda evidencia de textos sintéticos en `test-results/native-pdf-probe.json`.

## Versiones y Releases

Cada cambio queda registrado en Git; varios commits pueden agruparse en una entrega. `package.json` es la fuente de versión y WXT la incorpora al manifiesto. `package-lock.json` debe conservar el mismo valor en `version` y `packages[""].version`. Se mantiene `private: true`: no distribuimos la extensión mediante npm ni GitHub Packages.

Usamos `MAJOR.MINOR.PATCH`, con tres enteros de 0 a 65535, sin ceros iniciales, sufijos ni la versión `0.0.0`:

- Corrección: `0.1.0` pasa a `0.1.1`.
- Funcionalidad: `0.1.1` pasa a `0.2.0`.
- Durante `0.x`, una incompatibilidad incrementa MINOR y debe advertirse explícitamente en las notas. A partir de `1.0.0`, incrementa MAJOR.
- Documentación o herramientas sin cambios del producto pueden acumularse sin incrementar su versión. `1.0.0` se reserva para la decisión de ofrecer una base estable.

Las notas se preparan en [CHANGELOG.md](CHANGELOG.md), con sección pendiente y un bloque único `## [X.Y.Z]` por entrega. Las fechas son opcionales; una entrada preparada no implica publicación. El bloque inicial `0.1.0` resume el estado actual sin inventar lanzamientos históricos.

Para preparar la siguiente versión, actualiza versión y lockfile juntos, sin crear un tag automáticamente:

```sh
npm version 0.1.1 --no-git-tag-version
```

Prepara las notas correspondientes y revisa los cambios antes de hacer commit. Para comprobar una entrega localmente (ejemplo de la primera versión):

```sh
npm run test:release
node scripts/release.mjs validate v0.1.0
npm run typecheck
npm run zip
npm test
node scripts/release.mjs bundle v0.1.0 /tmp/simi-release-0.1.0
```

El último comando valida el ZIP y escribe únicamente el paquete compilado y `notes.md` en una carpeta nueva. Requiere `unzip`, incluido en los runners Ubuntu de GitHub y en macOS. Las pruebas se ejecutan sobre la salida final del empaquetado. Los probes con modelos reales siguen siendo manuales; las pruebas simuladas de CI no acreditan la disponibilidad del modelo nativo.

Después de integrar los archivos y confirmar que estás en el commit que quieres publicar, crea y envía deliberadamente el tag anotado. Para la primera entrega, conserva `0.1.0`:

```sh
git status --short
git tag -a v0.1.0 -m "Simi 0.1.0"
git push origin refs/tags/v0.1.0
```

El árbol de trabajo debe estar limpio y el commit debe incluir versión, notas y workflow; el tag no incluye archivos sin commit. Para otras entregas sustituye la versión en todos los comandos. No muevas ni reutilices tags publicados.

El workflow `.github/workflows/release.yml` se activa con tags `v*` y rechaza los que no sean `vX.Y.Z` o no coincidan con los metadatos. Descarga el commit etiquetado, valida las notas, instala dependencias con `npm ci`, comprueba tipos, empaqueta y ejecuta las pruebas. Verifica la versión del manifiesto, los recursos y la correspondencia del ZIP con la carpeta compilada. Solo después transfiere ese ZIP y sus notas a un job de publicación, sin recompilar.

Solo el job de publicación usa `contents: write` mediante `GITHUB_TOKEN`. Las políticas de Actions del repositorio y de su organización deben permitir ese permiso. No necesitas secretos npm ni de Chrome. La Release se crea con `gh release create --verify-tag --notes-file`; los tags se preparan explícitamente y una Release existente no se sobrescribe.

Si una ejecución falla antes de crear la Release por un problema transitorio, usa **Re-run failed jobs** en Actions sobre el mismo tag. Un cambio del código o del workflow requiere un nuevo commit y una versión nueva. Si quedó una Release parcial, inspecciónala y resuelve su estado explícitamente: los reintentos rechazan Releases existentes. Un error de red o de permisos al consultar GitHub detiene el proceso; no se interpreta como ausencia de Release. Comprueba la entrega final en Releases y descarga el ZIP publicado. Implementar este mecanismo no publica por sí solo la primera entrega.
