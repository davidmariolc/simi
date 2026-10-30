import { test, expect, chromium, type Page } from '@playwright/test';
import { mkdtemp, rm, cp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pdfFixture, pdfOutlineFixture } from '../scripts/pdf-fixture.mjs';

async function setup(origins: string[] = [], delayOutline = false) {
  const profile = await mkdtemp(join(tmpdir(), 'simi-pdf-test-'));
  const context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true,
    ignoreDefaultArgs: ['--disable-extensions'], args: ['--enable-unsafe-extension-debugging', '--enable-caret-browsing'], viewport: { width: 1100, height: 800 } });
  let extensionPath = resolve('.output/chrome-mv3');
  if (origins.length) {
    // Solo el fixture de red preautoriza sus orígenes: Chromium headless no puede aceptar el diálogo nativo.
    extensionPath = join(profile, 'test-extension');
    await cp(resolve('.output/chrome-mv3'), extensionPath, { recursive: true });
    const manifestPath = join(extensionPath, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.host_permissions = origins;
    await writeFile(manifestPath, JSON.stringify(manifest));
  }
  const cdp = await context.browser()!.newBrowserCDPSession();
  const { id } = await cdp.send('Extensions.loadUnpacked', { path: extensionPath });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const mock = { mode: 'available', calls: [] as string[], creates: 0, destroys: 0, delay: 0, result: undefined as string | undefined };
    Object.assign(globalThis, { __pdfMock: mock, Translator: class {
      static availability() { return Promise.resolve(mock.mode === 'absent' ? 'unavailable' : 'available'); }
      static async create(options: { monitor?: (monitor: EventTarget) => void }) {
        mock.creates++;
        if (mock.mode === 'create-error') throw new Error('Synthetic');
        if (mock.mode === 'download') { const monitor = new EventTarget(); options.monitor?.(monitor); const event = new Event('downloadprogress'); Object.assign(event, { loaded: .5 }); monitor.dispatchEvent(event); await new Promise(r => setTimeout(r, 100)); }
        return new this();
      }
      async translate(text: string) { mock.calls.push(text); await new Promise(r => setTimeout(r, mock.delay)); if (mock.mode === 'error') throw new Error('Synthetic'); return mock.result ?? `ES: ${text}`; }
      destroy() { mock.destroys++; }
    } });
  });
  page.on('pageerror', error => console.log('PDF page error:', error.message));
  if (delayOutline) await page.addInitScript(() => {
    // Delay the real PDF.js request only in this browser test, never in the package.
    const stopped = new WeakSet<Worker>(), post = Worker.prototype.postMessage, terminate = Worker.prototype.terminate;
    Object.assign(globalThis, { __outlineDelay: { pending: false, released: false } });
    Worker.prototype.postMessage = function(message, options) {
      if (message?.action === 'GetDestination') {
        (globalThis as any).__outlineDelay.pending = true;
        setTimeout(() => {
          if (!stopped.has(this)) post.call(this, message, options as StructuredSerializeOptions);
          (globalThis as any).__outlineDelay.released = true;
        }, 600);
      } else post.call(this, message, options as StructuredSerializeOptions);
    };
    Worker.prototype.terminate = function() { stopped.add(this); terminate.call(this); };
  });
  await page.goto(`chrome-extension://${id}/pdf.html`);
  return { context, id, page, cleanup: async () => { await context.close(); await rm(profile, { recursive: true, force: true }); } };
}
async function upload(page: Page, blank = false) {
  await page.getByLabel('Archivo PDF local').setInputFiles({ name: 'synthetic.pdf', mimeType: 'application/pdf', buffer: pdfFixture(blank) });
  await expect(page.getByLabel('Estado del documento')).toContainText('Selecciona texto', { timeout: 8000 });
  if (!blank) await expect(page.locator('.textLayer').first()).toContainText('Hello world');
}
async function select(page: Page, text = 'Hello world', keyboard = false) {
  const span = page.locator('.textLayer:not([hidden]) span').filter({ hasText: text }).first();
  await span.evaluate((element, keyboard) => {
    const range = document.createRange(); range.selectNodeContents(element);
    const selection = getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(keyboard ? new KeyboardEvent('keyup', { key: 'Shift', bubbles: true }) : new PointerEvent('pointerup', { bubbles: true }));
  }, keyboard);
}
async function activate(page: Page) {
  const button = page.getByRole('button', { name: 'Activar traducción', exact: true });
  await button.or(page.getByTestId('translation-result')).waitFor();
  if (await button.isVisible()) await button.click();
  await expect(page.getByTestId('translation-result')).toBeVisible();
}
async function scrollPdfTo(page: Page, pageNumber: number, top: number) {
  await page.locator('.pdf-container').evaluate((container, { pageNumber, top }) => {
    const target = container.querySelector<HTMLElement>(`.page[data-page-number="${pageNumber}"]`)!;
    container.scrollTop += target.getBoundingClientRect().top - container.getBoundingClientRect().top + top * target.clientHeight / 792;
  }, { pageNumber, top });
}

async function uploadOutline(page: Page) {
  await page.getByLabel('Archivo PDF local').setInputFiles({ name: 'reading-position.pdf', mimeType: 'application/pdf', buffer: pdfOutlineFixture() });
  await expect(page.getByLabel('Estado del documento')).toContainText('Selecciona texto');
}

test('PDF local: render, lectura, búsqueda y burbuja automática', async () => {
  const f = await setup();
  try {
    await upload(f.page);
    await f.page.getByLabel('Archivo PDF local').setInputFiles([]);
    await expect(f.page.locator('.textLayer').first()).toContainText('Hello world');
    await select(f.page); await activate(f.page);
    await expect(f.page.getByTestId('translation-result')).toHaveText('ES: Hello world');
    await select(f.page, 'Good morning', true);
    await expect(f.page.getByTestId('translation-result')).toHaveText('ES: Good morning');
    await f.page.getByRole('button', { name: 'Cerrar traducción' }).click();
    await expect(f.page.getByTestId('translation-result')).toHaveCount(0);
    await f.page.getByRole('button', { name: 'Aumentar zoom' }).click();
    await expect(f.page.locator('.textLayer:not([hidden])').first()).toContainText('Hello world');
    await select(f.page); await expect(f.page.getByTestId('translation-result')).toBeVisible();
    await f.page.keyboard.press('Escape');
    await expect(f.page.getByTestId('translation-result')).toHaveCount(0);
    await f.page.getByRole('button', { name: 'Página siguiente' }).click();
    await expect(f.page.getByLabel('Página', { exact: true })).toHaveValue('2');
    await f.page.getByLabel('Buscar en PDF').fill('Hello');
    await expect(f.page.getByLabel('Resultados de búsqueda')).toContainText('de 2');
    await f.page.getByRole('button', { name: 'Coincidencia siguiente' }).click();
    await f.page.getByLabel('Buscar en PDF').fill('notfoundxyz');
    await expect(f.page.getByLabel('Resultados de búsqueda')).toHaveText('Sin coincidencias');
    expect(await f.page.evaluate(() => (globalThis as any).__pdfMock.creates)).toBe(1);
  } finally { await f.cleanup(); }
});

test('PDF: tabla de contenido completa, jerarquía, destinos y panel adaptable', async () => {
  const f = await setup();
  try {
    await f.page.getByLabel('Archivo PDF local').setInputFiles({ name: 'outline.pdf', mimeType: 'application/pdf', buffer: pdfFixture(false, false, true) });
    const panel = f.page.getByRole('complementary', { name: 'Tabla de contenido' });
    const toggle = f.page.getByRole('button', { name: 'Tabla de contenido', exact: true });
    await expect(panel).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(panel.getByText('I. Foundations', { exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: '1. Introduction', exact: true })).toHaveAttribute('aria-current', 'location');
    await panel.getByRole('button', { name: 'Contraer I. Foundations', exact: true }).click();
    await expect(panel.getByRole('button', { name: '1. Introduction', exact: true })).toHaveCount(0);
    await panel.getByRole('button', { name: 'Expandir I. Foundations', exact: true }).click();
    await panel.getByRole('button', { name: 'Expandir 1. Introduction', exact: true }).focus();
    await f.page.keyboard.press('Enter');
    await panel.getByRole('button', { name: '1.1 Getting started', exact: true }).click();
    await expect(f.page.getByLabel('Página', { exact: true })).toHaveValue('2');
    await panel.getByRole('button', { name: '1. Introduction', exact: true }).click();
    await expect(f.page.getByLabel('Página', { exact: true })).toHaveValue('1');
    const content = await f.page.locator('.pdf-container').boundingBox(), sidebar = await panel.boundingBox();
    expect(content!.x).toBeGreaterThanOrEqual(sidebar!.x + sidebar!.width);
    await expect(f.page.locator('.textLayer').first()).toContainText('Hello world');
    await select(f.page); await activate(f.page);
    await expect(f.page.getByTestId('translation-result')).toHaveText('ES: Hello world');
    await panel.getByRole('button', { name: 'Contraer todo', exact: true }).click();
    await expect(panel.getByRole('button', { name: '1.1 Getting started', exact: true })).toHaveCount(0);
    await panel.getByRole('button', { name: 'Expandir todo', exact: true }).click();
    await expect(panel.getByRole('button', { name: '1.1 Getting started', exact: true })).toBeVisible();
    const appendix = panel.getByRole('button', { name: 'Appendix: final notes', exact: true });
    await appendix.scrollIntoViewIfNeeded();
    await expect(appendix).toBeInViewport();
    await appendix.click();
    await expect(f.page.getByLabel('Página', { exact: true })).toHaveValue('2');
    await panel.evaluate(el => el.scrollTop = 0);
    await f.page.screenshot({ path: 'test-results/pdf-outline-desktop.png' });
    await panel.getByRole('button', { name: 'Cerrar tabla de contenido' }).click();
    await expect(toggle).toBeFocused();
    await expect(f.page.locator('.pdf-container')).toHaveCSS('left', '0px');
    await toggle.click();
    await f.page.setViewportSize({ width: 390, height: 844 });
    await expect(panel).toBeInViewport();
    const narrow = (await panel.boundingBox())!;
    expect(narrow.x + narrow.width).toBeLessThanOrEqual(390);
    await f.page.screenshot({ path: 'test-results/pdf-outline-narrow.png' });
    await panel.getByRole('button', { name: 'Cerrar tabla de contenido' }).focus();
    await f.page.keyboard.press('Escape');
    await expect(panel).toBeHidden(); await expect(toggle).toBeFocused();
    await upload(f.page);
    await toggle.click();
    await expect(panel).toContainText('no incluye una tabla de contenido integrada');
    await expect(panel.getByText('I. Foundations', { exact: true })).toHaveCount(0);
    await expect(panel.getByRole('button', { name: 'Appendix: final notes', exact: true })).toHaveCount(0);
  } finally { await f.cleanup(); }
});

test('PDF: sección actual al leer, navegar, buscar y cambiar zoom', async () => {
  const f = await setup();
  try {
    await uploadOutline(f.page);
    const panel = f.page.getByRole('complementary', { name: 'Tabla de contenido' });
    const current = panel.locator('[aria-current="location"]');
    await expect(current).toHaveText('1. Foundations');
    await f.page.locator('.pdf-container').focus();
    await scrollPdfTo(f.page, 1, 120);
    await expect(current).toHaveText('1.1 First steps');
    await expect(current).toHaveCount(1);
    await expect(f.page.locator('.pdf-container')).toBeFocused();
    await f.page.keyboard.press('PageDown');
    await expect(current).toHaveText('1.2 Reading further');
    await expect(panel.getByRole('button', { name: '1.1 First steps', exact: true })).not.toHaveAttribute('aria-current');
    await scrollPdfTo(f.page, 1, 450);
    await expect(f.page.getByLabel('Página', { exact: true })).toHaveValue('1');
    await expect(current).toHaveText('1.2 Reading further');
    // PageDown can leave page 1 current; filling the unchanged value does not navigate.
    await panel.getByRole('button', { name: '1. Foundations', exact: true }).click();
    await expect(current).toHaveText('1. Foundations');
    await f.page.getByRole('button', { name: 'Página siguiente' }).click();
    await expect(current).toHaveText('2. Practice');
    await f.page.getByLabel('Página', { exact: true }).fill('1');
    await expect(current).toHaveText('1. Foundations');
    await f.page.getByLabel('Buscar en PDF').fill('Reading further');
    await expect(f.page.getByLabel('Resultados de búsqueda')).toContainText('de 1');
    await expect(current).toHaveText('1.2 Reading further');
    await f.page.getByLabel('Buscar en PDF').fill('');
    await f.page.getByRole('button', { name: 'Aumentar zoom' }).click();
    await expect(current).toHaveText('1.2 Reading further');
    await panel.getByRole('button', { name: '1.1 First steps', exact: true }).click();
    await expect(current).toHaveText('1.1 First steps');
    await expect(current).toHaveCSS('font-weight', '650');
  } finally { await f.cleanup(); }
});

test('PDF: revelar sección actual respeta contracción, cierre, foco y posición del PDF', async () => {
  const f = await setup();
  try {
    await uploadOutline(f.page);
    const panel = f.page.getByRole('complementary', { name: 'Tabla de contenido' });
    const current = panel.locator('[aria-current="location"]');
    const toggle = f.page.getByRole('button', { name: 'Tabla de contenido', exact: true });
    await scrollPdfTo(f.page, 1, 120);
    await expect(current).toHaveText('1.1 First steps');
    await panel.getByRole('button', { name: 'Contraer 1. Foundations', exact: true }).click();
    await scrollPdfTo(f.page, 1, 150);
    await expect(panel.getByRole('button', { name: 'Expandir 1. Foundations', exact: true })).toHaveAttribute('aria-expanded', 'false');
    await expect(panel.getByRole('button', { name: '1.1 First steps', exact: true })).toHaveCount(0);
    await f.page.locator('.pdf-container').focus();
    await scrollPdfTo(f.page, 1, 450);
    await expect(current).toHaveText('1.2 Reading further');
    await expect(current).toBeInViewport();
    await expect(f.page.locator('.pdf-container')).toBeFocused();
    await f.page.screenshot({ path: 'test-results/pdf-outline-current-section.png' });
    await toggle.click();
    await expect(panel).toBeHidden();
    await scrollPdfTo(f.page, 4, 0);
    await expect(f.page.getByLabel('Página', { exact: true })).toHaveValue('4');
    await expect(panel).toBeHidden();
    const before = await f.page.locator('.pdf-container').evaluate(el => el.scrollTop);
    await toggle.click();
    await expect(current).toHaveText('Final chapter');
    await expect(current).toBeInViewport();
    await expect(toggle).toBeFocused();
    expect(await f.page.locator('.pdf-container').evaluate(el => el.scrollTop)).toBeCloseTo(before, 0);
    expect(await panel.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    await panel.evaluate(el => el.scrollTop = 0);
    await scrollPdfTo(f.page, 4, 20);
    await expect(current).toHaveText('Final chapter');
    expect(await panel.evaluate(el => el.scrollTop)).toBe(0);
    await f.page.setViewportSize({ width: 390, height: 844 });
    await toggle.click(); await toggle.click();
    await expect(current).toBeInViewport();
    await expect(toggle).toBeFocused();
    await f.page.screenshot({ path: 'test-results/pdf-outline-current-section-narrow.png' });
    await upload(f.page);
    await expect(f.page.locator('[aria-current="location"]')).toHaveCount(0);
  } finally { await f.cleanup(); }
});

test('PDF: sustituir el documento durante resolución demorada del índice', async () => {
  const f = await setup([], true);
  const errors: string[] = [];
  f.page.on('pageerror', error => errors.push(error.message));
  try {
    await uploadOutline(f.page);
    await expect.poll(() => f.page.evaluate(() => (globalThis as any).__outlineDelay.pending)).toBe(true);
    await upload(f.page);
    await expect.poll(() => f.page.evaluate(() => (globalThis as any).__outlineDelay.released)).toBe(true);
    await expect(f.page.locator('[aria-current="location"]')).toHaveCount(0);
    await f.page.getByRole('button', { name: 'Tabla de contenido', exact: true }).click();
    await expect(f.page.getByRole('complementary', { name: 'Tabla de contenido' })).toContainText('no incluye una tabla de contenido integrada');
    await expect(f.page.getByText('1. Foundations', { exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally { await f.cleanup(); }
});

test('PDF: burbuja compacta, contenido largo y cierre visible en ventana estrecha', async () => {
  const f = await setup();
  try {
    await f.page.setViewportSize({ width: 300, height: 400 });
    await upload(f.page);
    await f.page.evaluate(() => (globalThis as any).__pdfMock.result = 'Correr');
    await select(f.page); await activate(f.page);
    const panel = f.page.getByRole('region', { name: 'Traducción al español' });
    await expect(f.page.getByTestId('translation-result')).toHaveText('Correr');
    expect((await panel.boundingBox())!.width).toBeLessThan(320);
    expect((await panel.boundingBox())!.height).toBeLessThan(55);
    await expect(panel).toHaveAccessibleDescription('Del inglés al español');
    await panel.screenshot({ path: 'test-results/minimal-bubble-pdf.png' });
    await f.page.evaluate(() => (globalThis as any).__pdfMock.result = 'Traduccion'.repeat(500));
    await f.page.locator('.textLayer:not([hidden]) span').filter({ hasText: 'Good morning' }).first().scrollIntoViewIfNeeded();
    await select(f.page, 'Good morning'); await activate(f.page);
    const result = f.page.getByTestId('translation-result');
    await expect(result).toContainText('Traduccion');
    const bounds = (await panel.boundingBox())!;
    const container = (await f.page.locator('.pdf-container').boundingBox())!;
    expect(bounds.width).toBeLessThanOrEqual(284);
    expect(bounds.x).toBeGreaterThanOrEqual(8);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(292);
    expect(bounds.y).toBeGreaterThanOrEqual(container.y + 8);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(container.y + container.height - 8);
    expect(await result.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await result.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    await result.evaluate(el => el.scrollTop = el.scrollHeight);
    const close = f.page.getByRole('button', { name: 'Cerrar traducción' });
    await expect(close).toBeInViewport();
    await panel.screenshot({ path: 'test-results/minimal-bubble-pdf-narrow.png' });
    await close.focus(); await f.page.keyboard.press('Enter');
    await expect(panel).toHaveCount(0);
  } finally { await f.cleanup(); }
});

test('PDF: archivos inválidos, página sin texto y sustitución', async () => {
  const f = await setup();
  try {
    await f.page.getByLabel('Archivo PDF local').setInputFiles({ name: 'invalid.pdf', mimeType: 'application/pdf', buffer: Buffer.from('<html>login</html>') });
    await expect(f.page.getByLabel('Estado del documento')).toContainText('no es un PDF válido');
    await f.page.getByLabel('Archivo PDF local').setInputFiles({ name: 'protected.pdf', mimeType: 'application/pdf', buffer: pdfFixture(false, true) });
    await expect(f.page.getByLabel('Estado del documento')).toContainText('requiere contraseña');
    await upload(f.page, true);
    await expect(f.page.getByLabel('Estado del documento')).toContainText('no tiene texto seleccionable');
    await upload(f.page);
    await select(f.page); await activate(f.page);
    await upload(f.page, true);
    await expect(f.page.getByTestId('translation-result')).toHaveCount(0);
    await expect(f.page.getByLabel('Estado del documento')).toContainText('no tiene texto seleccionable');
  } finally { await f.cleanup(); }
});

test('PDF: preferencia, resultados pendientes, zoom y cierre', async () => {
  const f = await setup();
  try {
    await upload(f.page); await select(f.page); await activate(f.page);
    await f.page.evaluate(() => { (globalThis as any).__pdfMock.delay = 300; });
    await select(f.page, 'Good morning'); await select(f.page);
    await expect(f.page.getByTestId('translation-result')).toHaveText('ES: Hello world');
    await select(f.page, 'Good morning'); await f.page.keyboard.press('Escape');
    await f.page.waitForTimeout(400); await expect(f.page.getByTestId('translation-result')).toHaveCount(0);
    await select(f.page); await expect(f.page.getByTestId('translation-result')).toBeVisible();
    await f.page.getByRole('button', { name: 'Aumentar zoom' }).click();
    await expect(f.page.getByTestId('translation-result')).toHaveCount(0);
    await f.page.evaluate(() => (globalThis as any).chrome.storage.local.set({ enabled: false }));
    await select(f.page); await expect(f.page.getByTestId('translation-result')).toHaveCount(0);
    await f.page.evaluate(() => (globalThis as any).chrome.storage.local.set({ enabled: true }));
    await select(f.page, 'Good morning'); await activate(f.page); await expect(f.page.getByTestId('translation-result')).toHaveText('ES: Good morning');
  } finally { await f.cleanup(); }
});

test('PDF: descarga, indisponibilidad y reintento conservan lectura', async () => {
  const f = await setup();
  try {
    await upload(f.page);
    await f.page.evaluate(() => { (globalThis as any).__pdfMock.mode = 'absent'; });
    await select(f.page); await expect(f.page.getByRole('region', { name: 'Traducción al español' })).toContainText('no tiene disponible');
    await f.page.evaluate(() => { (globalThis as any).__pdfMock.mode = 'download'; });
    await f.page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await activate(f.page);
    await f.page.evaluate(() => { (globalThis as any).__pdfMock.mode = 'error'; });
    await select(f.page, 'Good morning'); await expect(f.page.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible();
    await f.page.evaluate(() => { (globalThis as any).__pdfMock.mode = 'available'; });
    await f.page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await expect(f.page.getByTestId('translation-result')).toHaveText('ES: Good morning');
    await expect(f.page.locator('.textLayer').first()).toContainText('Good morning');
  } finally { await f.cleanup(); }
});

test('PDF remoto: popup, sesión, URL sin sufijo, redirección y errores', async () => {
  const { createServer } = await import('node:http');
  const server = createServer((request, response) => {
    if (request.url === '/redirect') { response.writeHead(302, { Location: `http://localhost:${(server.address() as any).port}/document` }); response.end(); return; }
    if (request.url === '/login') { response.setHeader('Content-Type', 'text/html'); response.end('<html>Sign in</html>'); return; }
    if (request.url === '/private' && !request.headers.cookie?.includes('session=synthetic')) { response.writeHead(401); response.end(); return; }
    response.setHeader('Content-Type', 'application/pdf');
    if (request.url === '/slow') { setTimeout(() => response.end(pdfFixture(true)), 600); return; }
    response.end(pdfFixture());
  });
  await new Promise<void>(r => server.listen(0, '0.0.0.0', r));
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  const f = await setup(['http://127.0.0.1/*', 'http://localhost/*']);
  try {
    await f.context.addCookies([{ name: 'session', value: 'synthetic', url: origin, sameSite: 'Lax' }]);
    const popup = await f.context.newPage();
    await popup.goto(`chrome-extension://${f.id}/popup.html`);
    const original = await f.context.newPage();
    await original.goto(`${origin}/document`);
    async function open(url: string) {
      const event = f.context.waitForEvent('page');
      await popup.evaluate(async url => {
        const reply = await (globalThis as any).chrome.runtime.sendMessage({ channel: 'simi-pdf-v1', kind: 'open', url });
        if (reply?.error) throw new Error(reply.error);
      }, url);
      const viewer = await event;
      await viewer.waitForLoadState();
      return viewer;
    }
    const localEvent = f.context.waitForEvent('page');
    await popup.getByRole('button', { name: 'Abrir PDF local', exact: true }).click();
    const localViewer = await localEvent; await upload(localViewer);
    const remote = await open(`${origin}/document`);
    await expect(remote.getByLabel('Estado del documento')).toContainText('Selecciona texto');
    await expect(remote.locator('.textLayer').first()).toContainText('Hello world');
    expect(remote.url()).not.toContain(origin);
    expect(original.url()).toBe(`${origin}/document`);
    const slow = await open(`${origin}/slow`);
    await expect(slow.getByLabel('Estado del documento')).toContainText('Cargando');
    await upload(slow);
    await slow.waitForTimeout(800);
    await expect(slow.locator('.textLayer').first()).toContainText('Hello world');
    const privatePage = await open(`${origin}/private`);
    await expect(privatePage.getByLabel('Estado del documento')).toContainText('Selecciona texto');
    const redirected = await open(`${origin}/redirect`);
    await expect(redirected.getByLabel('Estado del documento')).toContainText('Selecciona texto');
    const login = await open(`${origin}/login`);
    await expect(login.getByLabel('Estado del documento')).toContainText('no es un PDF válido');
    await expect(login.getByRole('link', { name: 'Abrir original' })).toHaveAttribute('href', `${origin}/login`);
    await f.context.clearCookies();
    const denied = await open(`${origin}/private`);
    await expect(denied.getByLabel('Estado del documento')).toContainText('No se pudo acceder');
    await remote.reload();
    await expect(remote.getByLabel('Estado del documento')).toContainText('Abre un PDF local');
    const rejected = await f.page.evaluate(() => (globalThis as any).chrome.runtime.sendMessage({ channel: 'simi-pdf-v1', kind: 'open', url: 'https://example.com/secret.pdf' }));
    expect(rejected == null).toBe(true);
    const invalid = await popup.evaluate(() => (globalThis as any).chrome.runtime.sendMessage({ channel: 'simi-pdf-v1', kind: 'open', url: 'chrome://settings' }));
    expect(invalid.error).toBeTruthy();
    expect(await f.page.evaluate(() => (globalThis as any).chrome.storage.local.get(null))).toEqual({});
  } finally { await f.cleanup(); server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); }
});

test('PDF: selección real, varias páginas, geometría y acceso sin permiso', async () => {
  const f = await setup();
  try {
    await upload(f.page);
    const first = f.page.locator('.textLayer:not([hidden]) span').filter({ hasText: 'Hello world' }).first();
    const box = (await first.boundingBox())!;
    await f.page.mouse.move(box.x + 1, box.y + box.height / 2);
    await f.page.mouse.down(); await f.page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, { steps: 15 }); await f.page.mouse.up();
    await activate(f.page);
    await expect(f.page.getByTestId('translation-result')).toContainText('Hello');
    await f.page.locator('.pdf-container').focus();
    await first.evaluate(element => {
      const range = document.createRange(); range.setStart(element.firstChild!, 0); range.collapse(true);
      const selection = getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    });
    await f.page.keyboard.down('Shift');
    for (let i = 0; i < 5; i++) await f.page.keyboard.press('ArrowRight');
    await f.page.keyboard.up('Shift');
    await expect(f.page.getByTestId('translation-result')).toHaveText('ES: Hello');
    const rectangle = await f.page.getByRole('region', { name: 'Traducción al español' }).boundingBox();
    expect(rectangle!.x).toBeGreaterThanOrEqual(0); expect(rectangle!.y).toBeGreaterThanOrEqual(0);
    expect(rectangle!.x + rectangle!.width).toBeLessThanOrEqual(1100);
    await f.page.locator('.pdf-container').evaluate(e => { e.scrollTop = 2000; });
    await expect(f.page.getByTestId('translation-result')).toHaveCount(0);
    await expect(f.page.locator('.textLayer').filter({ hasText: 'second page' })).toBeVisible();
    await f.page.evaluate(() => {
      const spans = [...document.querySelectorAll('.textLayer span')];
      const first = spans.find(s => s.textContent === 'Hello world')!, last = spans.find(s => s.textContent?.includes('second page'))!;
      const range = document.createRange(); range.setStart(first.firstChild!, 0); range.setEnd(last.firstChild!, last.textContent!.length);
      const selection = getSelection()!; selection.removeAllRanges(); selection.addRange(range);
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', bubbles: true }));
    });
    await expect(f.page.getByTestId('translation-result')).toContainText('Hello world');
    await expect(f.page.getByTestId('translation-result')).toContainText('second page');
    await f.page.getByTestId('translation-result').click();
    await f.page.keyboard.press('Escape');
    await expect(f.page.getByTestId('translation-result')).toHaveCount(0);
    const popup = await f.context.newPage(); await popup.goto(`chrome-extension://${f.id}/popup.html`);
    const event = f.context.waitForEvent('page');
    await popup.evaluate(() => (globalThis as any).chrome.runtime.sendMessage({ channel: 'simi-pdf-v1', kind: 'open', url: 'https://example.com/document.pdf' }));
    const remote = await event;
    await expect(remote.getByLabel('Estado del documento')).toContainText('Permite el acceso');
    await expect(remote.getByRole('button', { name: 'Permitir acceso al sitio' })).toBeVisible();
    expect(await remote.locator('canvas').count()).toBe(0);
  } finally { await f.cleanup(); }
});

test('PDF: cambiar de pestaña libera el traductor y se recupera al volver', async () => {
  const f = await setup();
  try {
    await upload(f.page); await select(f.page); await activate(f.page);
    const opened = f.context.waitForEvent('page');
    await f.page.evaluate(async () => {
      const current = await (globalThis as any).chrome.tabs.getCurrent();
      await (globalThis as any).chrome.tabs.create({ windowId: current.windowId, url: 'about:blank', active: true });
    });
    const other = await opened;
    await expect(f.page.getByTestId('translation-result')).toHaveCount(0);
    expect(await f.page.evaluate(() => (globalThis as any).__pdfMock.destroys)).toBe(1);
    await other.close(); await f.page.bringToFront();
    await select(f.page, 'Good morning'); await activate(f.page);
    await expect(f.page.getByTestId('translation-result')).toHaveText('ES: Good morning');
    expect(await f.page.evaluate(() => (globalThis as any).__pdfMock.creates)).toBe(2);
  } finally { await f.cleanup(); }
});
