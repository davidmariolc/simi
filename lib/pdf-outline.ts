import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

type NativeOutlineItem = Awaited<ReturnType<PDFDocumentProxy['getOutline']>>[number];
export type PdfOutlineItem = Omit<NativeOutlineItem, 'items'> & { items: PdfOutlineItem[] };
export type OutlineEntry = {
  path: string;
  ancestors: string[];
  depth: number;
  order: number;
  pageNumber: number;
  top: number;
};
export type OutlineViewport = Pick<ReturnType<PDFPageProxy['getViewport']>, 'convertToViewportPoint'>;
export type OutlineIndex = { entries: OutlineEntry[]; viewports: Map<number, OutlineViewport> };
export type PdfReadingPosition = { pageNumber: number; left: number; top: number };
type OutlineDocument = Pick<PDFDocumentProxy, 'getDestination' | 'getPageIndex' | 'getPage' | 'numPages'>;

/** Resolve only bookmark geometry, never page text. Caches belong to this document. */
export async function resolvePdfOutline(items: PdfOutlineItem[], document: OutlineDocument, isCurrent = () => true): Promise<OutlineIndex> {
  const pending: { item: PdfOutlineItem; path: string; ancestors: string[]; order: number }[] = [];
  function visit(children: PdfOutlineItem[], ancestors: string[] = [], parent = '') {
    children.forEach((item, index) => {
      const path = `${parent}-${index}`;
      pending.push({ item, path, ancestors, order: pending.length });
      visit(item.items, [...ancestors, path], path);
    });
  }
  visit(items);
  const destinations = new Map<string, ReturnType<PDFDocumentProxy['getDestination']>>();
  const pageIndices = new Map<string, Promise<number>>();
  const viewportTasks = new Map<number, Promise<OutlineViewport>>();
  const viewports = new Map<number, OutlineViewport>(), entries: OutlineEntry[] = [];
  let cursor = 0;
  async function worker() {
    while (isCurrent() && cursor < pending.length) {
      const { item, path, ancestors, order } = pending[cursor++]!;
      try {
        if (!item.dest || item.url) continue;
        let destination = item.dest;
        if (typeof destination === 'string') {
          if (!destinations.has(destination)) destinations.set(destination, document.getDestination(destination));
          const resolved = await destinations.get(destination)!;
          if (!resolved) continue;
          destination = resolved;
        }
        if (!isCurrent() || !Array.isArray(destination)) continue;
        const [reference, mode] = destination;
        let pageIndex: number;
        if (Number.isInteger(reference)) pageIndex = reference;
        else if (reference && Number.isInteger(reference.num) && Number.isInteger(reference.gen)) {
          const key = `${reference.num}:${reference.gen}`;
          if (!pageIndices.has(key)) pageIndices.set(key, document.getPageIndex(reference));
          pageIndex = await pageIndices.get(key)!;
        } else continue;
        const pageNumber = pageIndex + 1;
        if (!isCurrent() || pageNumber < 1 || pageNumber > document.numPages || !mode) continue;
        if (!['XYZ', 'Fit', 'FitB', 'FitH', 'FitBH', 'FitV', 'FitBV', 'FitR'].includes(mode.name)) continue;
        if (!viewportTasks.has(pageNumber)) viewportTasks.set(pageNumber,
          document.getPage(pageNumber).then(page => page.getViewport({ scale: 1 })));
        const viewport = await viewportTasks.get(pageNumber)!;
        if (!isCurrent()) continue;
        let top = 0;
        const y = mode.name === 'XYZ' ? destination[3]
          : mode.name === 'FitH' || mode.name === 'FitBH' ? destination[2]
          : mode.name === 'FitR' ? destination[5] : null;
        if (typeof y === 'number' && Number.isFinite(y)) {
          const x = typeof destination[2] === 'number' && mode.name !== 'FitH' && mode.name !== 'FitBH' ? destination[2] : 0;
          top = Math.max(0, viewport.convertToViewportPoint(x, y)[1]);
        }
        if (!Number.isFinite(top)) continue;
        viewports.set(pageNumber, viewport);
        entries.push({ path, ancestors, depth: ancestors.length, order, pageNumber, top });
      } catch {
        // A broken bookmark must not prevent other sections or the PDF from loading.
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, () => worker()));
  entries.sort((a, b) => a.pageNumber - b.pageNumber || a.top - b.top || b.depth - a.depth || a.order - b.order);
  return { entries: entries.filter((entry, index) => !index || entry.pageNumber !== entries[index - 1]!.pageNumber || entry.top !== entries[index - 1]!.top), viewports };
}

/** Binary search in reading order. Missing page geometry means no bookmarks on that page. */
export function currentPdfOutline(index: OutlineIndex, position: PdfReadingPosition): OutlineEntry | undefined {
  const viewport = index.viewports.get(position.pageNumber);
  const top = viewport ? Math.max(0, viewport.convertToViewportPoint(position.left, position.top)[1]) : 0;
  let low = 0, high = index.entries.length;
  while (low < high) {
    const middle = (low + high) >>> 1, entry = index.entries[middle]!;
    if (entry.pageNumber < position.pageNumber || (entry.pageNumber === position.pageNumber && entry.top <= top + 1)) low = middle + 1;
    else high = middle;
  }
  return index.entries[low - 1];
}
