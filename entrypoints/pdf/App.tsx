import { useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { EventBus, PDFViewer, PDFLinkService, PDFFindController } from 'pdfjs-dist/web/pdf_viewer.mjs';
import { mountPdfSelection } from '../../lib/pdf-selection';
import { originPermission, pdfChannel, remotePdfUrl } from '../../lib/pdf-session';
import { BrandIcon } from '../../components/BrandIcon';
import { PdfOutline } from '../../components/PdfOutline';
import { currentPdfOutline, resolvePdfOutline, type OutlineEntry, type OutlineIndex, type PdfOutlineItem, type PdfReadingPosition } from '../../lib/pdf-outline';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type Engine = {
  load: (source: File | string) => Promise<void>;
  viewer: PDFViewer;
  search: (query: string, previous: boolean, again: boolean) => void;
  navigate: (destination: NonNullable<PdfOutlineItem['dest']>) => Promise<void>;
};

export function App() {
  const container = useRef<HTMLDivElement>(null), pages = useRef<HTMLDivElement>(null), bubble = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null), engine = useRef<Engine | undefined>(undefined);
  const workspace = useRef<HTMLDivElement>(null), outlineToggle = useRef<HTMLButtonElement>(null);
  const outlinePanel = useRef<HTMLElement>(null);
  const [status, setStatus] = useState('Abre un PDF local o utiliza «Abrir en Simi» desde la pestaña de un PDF de internet.');
  const [busy, setBusy] = useState(false), [ready, setReady] = useState(false);
  const [number, setNumber] = useState(1), [total, setTotal] = useState(0), [zoom, setZoom] = useState(100);
  const [query, setQuery] = useState(''), [matches, setMatches] = useState('');
  const [remote, setRemote] = useState<string>(), [permission, setPermission] = useState<string>();
  const [noText, setNoText] = useState(false), [title, setTitle] = useState('Visor PDF');
  const [outline, setOutline] = useState<PdfOutlineItem[] | undefined>();
  const [outlineOpen, setOutlineOpen] = useState(false), [outlineError, setOutlineError] = useState(false);
  const [currentSection, setCurrentSection] = useState<OutlineEntry>();

  useEffect(() => {
    let generation = 0, disposed = false;
    let task: pdfjs.PDFDocumentLoadingTask | undefined, fetchAbort: AbortController | undefined;
    let outlineIndex: OutlineIndex = { entries: [], viewports: new Map() };
    let readingPosition: PdfReadingPosition | undefined, activePath: string | undefined;
    const syncOutline = () => {
      const entry = readingPosition ? currentPdfOutline(outlineIndex, readingPosition) : undefined;
      if (entry?.path !== activePath) { activePath = entry?.path; setCurrentSection(entry); }
    };
    const bus = new EventBus();
    const links = new PDFLinkService({ eventBus: bus, externalLinkTarget: 2 });
    const find = new PDFFindController({ eventBus: bus, linkService: links });
    const viewer = new PDFViewer({ container: container.current!, viewer: pages.current!, eventBus: bus, linkService: links,
      findController: find, annotationMode: 0, textLayerMode: 1 });
    links.setViewer(viewer);
    const selection = mountPdfSelection(container.current!, bubble.current!);
    const pageText = new Map<number, boolean>();
    const layout = new ResizeObserver(() => {
      const top = document.querySelector('.pdf-message')!.getBoundingClientRect().bottom;
      workspace.current!.style.top = `${top}px`;
      selection.close();
      viewer.update();
    });
    layout.observe(document.querySelector('.pdf-toolbar')!);
    layout.observe(document.querySelector('.pdf-message')!);
    layout.observe(container.current!);
    bus.on('pagesinit', () => { viewer.currentScale = 1; });
    bus.on('pagechanging', ({ pageNumber }: { pageNumber: number }) => { setNumber(pageNumber); setNoText(pageText.get(pageNumber) === false); });
    bus.on('scalechanging', ({ scale }: { scale: number }) => setZoom(Math.round(scale * 100)));
    bus.on('updateviewarea', ({ location }: { location: PdfReadingPosition }) => {
      if (disposed) return;
      readingPosition = location; syncOutline();
    });
    bus.on('textlayerrendered', ({ pageNumber }: { pageNumber: number }) => {
      const doc = viewer.pdfDocument, current = generation;
      if (!doc) return;
      void doc.getPage(pageNumber).then(p => p.getTextContent()).then(text => {
        if (disposed || current !== generation) return;
        const hasText = text.items.some(item => 'str' in item && item.str.trim());
        pageText.set(pageNumber, hasText);
        if (viewer.currentPageNumber === pageNumber) setNoText(!hasText);
      }).catch(() => { if (current === generation) setStatus('No se pudo leer el texto de esta página.'); });
    });
    bus.on('updatefindmatchescount', ({ matchesCount }: { matchesCount: { current: number; total: number } }) => setMatches(`${matchesCount.current} de ${matchesCount.total}`));
    bus.on('updatefindcontrolstate', ({ state }: { state: number }) => { if (state === 1) setMatches('Sin coincidencias'); });
    async function load(source: File | string) {
      const current = ++generation;
      fetchAbort?.abort(); fetchAbort = new AbortController();
      selection.reset(); viewer.setDocument(null); links.setDocument(null); find.setDocument(null!);
      const previous = task; task = undefined; void previous?.destroy();
      pageText.clear(); setReady(false); setNoText(false); setBusy(true); setPermission(undefined); setMatches(''); setQuery('');
      setOutline(undefined); setOutlineError(false);
      outlineIndex = { entries: [], viewports: new Map() }; readingPosition = undefined; activePath = undefined; setCurrentSection(undefined);
      setStatus('Cargando PDF…'); setTotal(0); setNumber(1);
      setRemote(typeof source === 'string' ? source : undefined);
      setTitle(typeof source === 'string' ? 'PDF de internet' : source.name);
      try {
        let bytes: ArrayBuffer;
        if (typeof source === 'string') {
          const pattern = originPermission(source);
          if (!await browser.permissions.contains({ origins: [pattern] })) {
            if (current !== generation) return;
            setPermission(pattern); throw new Error('Permite el acceso a este sitio para cargar el PDF, o elige una copia local.');
          }
          if (current !== generation) return;
          const response = await fetch(source, { credentials: 'include', signal: fetchAbort.signal });
          if (!response.ok) throw new Error('No se pudo acceder al PDF. Comprueba tu sesión en el sitio o abre una copia local.');
          if (response.url && !await browser.permissions.contains({ origins: [originPermission(response.url)] })) {
            if (current !== generation) return;
            setPermission(originPermission(response.url));
            throw new Error('El PDF redirige a otro sitio. Permite su acceso para reintentar o abre una copia local.');
          }
          bytes = await response.arrayBuffer();
        } else bytes = await source.arrayBuffer();
        if (disposed || current !== generation) return;
        const header = new TextDecoder().decode(bytes.slice(0, 1024));
        if (!header.includes('%PDF-')) throw new Error('El contenido no es un PDF válido. Puede ser una página de acceso; abre el original o elige otro archivo.');
        task = pdfjs.getDocument({ data: bytes,
          cMapUrl: new URL('pdfjs/cmaps/', location.href).href, cMapPacked: true,
          standardFontDataUrl: new URL('pdfjs/standard_fonts/', location.href).href,
          wasmUrl: new URL('pdfjs/wasm/', location.href).href, verbosity: 0 });
        const loading = task;
        const document = await loading.promise;
        if (disposed || current !== generation) { await loading.destroy(); return; }
        viewer.setDocument(document); links.setDocument(document); find.setDocument(document);
        setTotal(document.numPages); setReady(true); setStatus('Selecciona texto en inglés para traducirlo.');
        void document.getOutline().then(async items => {
          if (disposed || current !== generation) return;
          setOutline(items ?? []);
          setOutlineOpen(Boolean(items?.length));
          const index = await resolvePdfOutline(items ?? [], document, () => !disposed && current === generation);
          if (disposed || current !== generation) return;
          outlineIndex = index; syncOutline();
        }).catch(() => {
          if (disposed || current !== generation) return;
          setOutline([]); setOutlineError(true);
        });
      } catch (error) {
        if (disposed || current !== generation) return;
        const message = error instanceof Error && error.name === 'PasswordException'
          ? 'Este PDF requiere contraseña. Ábrelo en su visor original o elige otro archivo.'
          : error instanceof TypeError ? 'No se pudo descargar el PDF. Comprueba el acceso al sitio o abre una copia local.'
          : error instanceof Error && !(error instanceof pdfjs.InvalidPDFException) ? error.message : 'No se pudo abrir este PDF. Elige otro archivo.';
        setStatus(message);
        const failed = task; task = undefined; void failed?.destroy();
      } finally { if (!disposed && current === generation) setBusy(false); }
    }
    engine.current = { load, viewer, navigate: async destination => {
      selection.close();
      const current = generation;
      try { await links.goToDestination(destination); }
      catch { if (!disposed && current === generation) setStatus('No se pudo abrir este capítulo. Puedes navegar con el número de página.'); }
    }, search: (text, previous, again) => {
      if (!text.trim()) { bus.dispatch('findbarclose', {}); setMatches(''); return; }
      setMatches('Buscando…');
      bus.dispatch('find', { source: window, type: again ? 'again' : '', query: text, caseSensitive: false, entireWord: false,
        highlightAll: true, findPrevious: previous, matchDiacritics: false });
    } };
    const token = location.hash.slice(1);
    history.replaceState(null, '', location.pathname);
    if (token) void (async () => {
      for (let attempt = 0; attempt < 5 && !disposed; attempt++) {
        const reply = await browser.runtime.sendMessage({ channel: pdfChannel, kind: 'consume', token });
        const url = remotePdfUrl(reply?.url);
        if (url) { await load(url); return; }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!disposed) setStatus('La sesión de apertura ya no está disponible. Vuelve a «Abrir en Simi» o elige un PDF local.');
    })();
    const cleanup = () => {
      if (disposed) return;
      disposed = true; layout.disconnect(); ++generation; fetchAbort?.abort(); selection.dispose(); viewer.setDocument(null); void task?.destroy(); engine.current = undefined;
    };
    window.addEventListener('pagehide', cleanup, { once: true });
    return () => { window.removeEventListener('pagehide', cleanup); cleanup(); };
  }, []);

  async function grant() {
    if (!permission || !remote) return;
    try {
      const granted = await browser.permissions.request({ origins: [permission] });
      if (granted) await engine.current?.load(remote);
      else setStatus('Acceso denegado. Puedes abrir el original o elegir una copia local.');
    } catch { setStatus('No se pudo solicitar el acceso. Reintenta o elige un archivo local.'); }
  }
  return <main className="pdf-app">
    <header className="pdf-toolbar">
      <button ref={outlineToggle} type="button" aria-label="Tabla de contenido" aria-expanded={outlineOpen} aria-controls="pdf-outline" disabled={!ready}
        onClick={() => setOutlineOpen(open => !open)}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M3 4h12M3 9h12M3 14h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
      <div className="pdf-brand"><div className="pdf-brand-identity"><BrandIcon className="h-[28px] w-[28px] rounded-[8px]" /><strong>Simi</strong></div><span title={title}>{title}</span></div>
      <button onClick={() => input.current?.click()}>Abrir PDF local</button>
      <input ref={input} hidden type="file" accept="application/pdf,.pdf" aria-label="Archivo PDF local" onChange={event => {
        const file = event.target.files?.[0]; event.target.value = ''; if (file) void engine.current?.load(file);
      }} />
      <div className="pdf-navigation">
        <button aria-label="Página anterior" disabled={!ready || number <= 1} onClick={() => { if (engine.current) engine.current.viewer.currentPageNumber--; }}>←</button>
        <label>Página <input aria-label="Página" type="number" min={1} max={total || 1} value={number} disabled={!ready} onChange={e => {
          const value = Number(e.target.value); if (engine.current && value >= 1 && value <= total) engine.current.viewer.currentPageNumber = value;
        }} /></label><span>de {total}</span>
        <button aria-label="Página siguiente" disabled={!ready || number >= total} onClick={() => { if (engine.current) engine.current.viewer.currentPageNumber++; }}>→</button>
      </div>
      <button aria-label="Reducir zoom" disabled={!ready || zoom <= 25} onClick={() => { if (engine.current) engine.current.viewer.currentScale = Math.max(.25, zoom / 100 - .25); }}>−</button>
      <span aria-label="Zoom">{zoom}%</span>
      <button aria-label="Aumentar zoom" disabled={!ready || zoom >= 400} onClick={() => { if (engine.current) engine.current.viewer.currentScale = Math.min(4, zoom / 100 + .25); }}>+</button>
      <form onSubmit={event => { event.preventDefault(); engine.current?.search(query, false, true); }}>
        <input aria-label="Buscar en PDF" placeholder="Buscar en PDF" value={query} disabled={!ready} onChange={e => { setQuery(e.target.value); engine.current?.search(e.target.value, false, false); }} />
        <button aria-label="Coincidencia anterior" type="button" disabled={!ready || !query} onClick={() => engine.current?.search(query, true, true)}>↑</button>
        <button aria-label="Coincidencia siguiente" disabled={!ready || !query}>↓</button>
        <span role="status" aria-label="Resultados de búsqueda">{matches}</span>
      </form>
    </header>
    <div className="pdf-message" role="status" aria-label="Estado del documento" aria-busy={busy}>
      {status} {noText && <span>Esta página no tiene texto seleccionable; la traducción requiere un PDF con texto.</span>}
      {permission && <button onClick={() => { void grant(); }}>Permitir acceso al sitio</button>}
      {remote && !busy && !ready && <><button onClick={() => { void engine.current?.load(remote); }}>Reintentar carga</button><a href={remote} target="_blank" rel="noreferrer">Abrir original</a></>}
    </div>
    <div ref={workspace} className={`pdf-workspace${outlineOpen ? ' pdf-workspace-with-outline' : ''}`}>
      <aside ref={outlinePanel} id="pdf-outline" className="pdf-outline" aria-label="Tabla de contenido" hidden={!outlineOpen} onKeyDown={event => {
        if (event.key === 'Escape') { setOutlineOpen(false); outlineToggle.current?.focus(); }
      }}>
        <div className="pdf-outline-header"><h2>Tabla de contenido</h2><button type="button" aria-label="Cerrar tabla de contenido" onClick={() => { setOutlineOpen(false); outlineToggle.current?.focus(); }}>×</button></div>
        {!ready ? <p>Abre un PDF para ver su tabla de contenido.</p>
          : outline === undefined ? <p role="status">Cargando tabla de contenido…</p>
          : outlineError ? <p role="status">No se pudo leer la tabla de contenido de este PDF.</p>
          : outline.length === 0 ? <p>Este PDF no incluye una tabla de contenido integrada.</p>
          : <PdfOutline items={outline} active={currentSection} open={outlineOpen} panel={outlinePanel} navigate={destination => { void engine.current?.navigate(destination); }} />}
      </aside>
      <div ref={container} className="pdf-container" tabIndex={0} aria-label="Documento PDF"><div ref={pages} className="pdfViewer" /></div>
    </div>
    <div ref={bubble} className="pdf-bubble-host" />
  </main>;
}
