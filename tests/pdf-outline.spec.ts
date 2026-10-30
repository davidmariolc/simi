import { test, expect } from '@playwright/test';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { currentPdfOutline, resolvePdfOutline, type PdfOutlineItem } from '../lib/pdf-outline';

function item(title: string, dest: PdfOutlineItem['dest'], items: PdfOutlineItem[] = []): PdfOutlineItem {
  return { title, dest, items, bold: false, italic: false, color: new Uint8ClampedArray(3), url: null, unsafeUrl: undefined, newWindow: undefined, count: undefined };
}
function documentFixture() {
  const calls = { destinations: [] as string[], pages: [] as number[], references: [] as number[], active: 0, max: 0 };
  const document = {
    numPages: 4,
    getDestination: async (name: string) => {
      calls.destinations.push(name);
      if (name === 'broken') throw new Error('Invalid destination');
      if (name === 'missing') return null;
      return [{ num: 10, gen: 0 }, { name: 'XYZ' }, 0, 500, null];
    },
    getPageIndex: async (reference: { num: number }) => { calls.references.push(reference.num); return 1; },
    getPage: async (pageNumber: number) => {
      calls.pages.push(pageNumber); calls.active++; calls.max = Math.max(calls.max, calls.active);
      await new Promise(resolve => setTimeout(resolve, 1)); calls.active--;
      return { getViewport: () => ({ convertToViewportPoint: (x: number, y: number) => [x, 800 - y] }) } as unknown as PDFPageProxy;
    },
  } satisfies Pick<PDFDocumentProxy, 'numPages' | 'getDestination' | 'getPageIndex' | 'getPage'>;
  return { document, calls };
}

test('índice: destinos con nombre, referencias, caché y fallos aislados sin leer texto', async () => {
  const f = documentFixture();
  const index = await resolvePdfOutline([
    item('Parent', null, [item('Named', 'section'), item('Same reference', [{ num: 10, gen: 0 }, { name: 'Fit' }])]),
    item('Duplicate name', 'section'), item('Broken', 'broken'), item('Missing', 'missing'),
    { ...item('External', [0, { name: 'Fit' }]), url: 'https://example.com' },
    item('Outside', [99, { name: 'Fit' }]), item('Unknown mode', [0, { name: 'Unknown' }]),
  ], f.document);
  expect(index.entries.map(entry => [entry.path, entry.pageNumber, entry.top])).toEqual([['-0-1', 2, 0], ['-0-0', 2, 300]]);
  expect(index.entries[1]!.ancestors).toEqual(['-0']);
  expect(f.calls.destinations).toEqual(['section', 'broken', 'missing']);
  expect(f.calls.references).toEqual([10]);
  expect(f.calls.pages).toEqual([2]);
});

test('índice: posiciones explícitas y ajuste de página, concurrencia limitada e invalidación', async () => {
  const f = documentFixture();
  const index = await resolvePdfOutline([
    item('XYZ', [0, { name: 'XYZ' }, 0, 700, null]),
    item('FitH', [1, { name: 'FitH' }, 600]),
    item('FitR', [2, { name: 'FitR' }, 0, 0, 100, 400]),
    item('Null height', [3, { name: 'XYZ' }, null, null, null]),
    item('Page', [0, { name: 'FitB' }]),
  ], f.document);
  expect(index.entries.map(entry => entry.top)).toEqual([0, 100, 200, 400, 0]);
  expect(f.calls.max).toBeLessThanOrEqual(4);
  const large = documentFixture(); large.document.numPages = 20;
  await resolvePdfOutline(Array.from({ length: 20 }, (_, page) => item(`Page ${page}`, [page, { name: 'Fit' }])), large.document);
  expect(large.calls.pages).toHaveLength(20);
  expect(large.calls.max).toBeLessThanOrEqual(4);
  let current = true;
  const cancelled = documentFixture();
  const original = cancelled.document.getDestination;
  cancelled.document.getDestination = async name => { current = false; return original(name); };
  expect((await resolvePdfOutline([item('Named', 'section')], cancelled.document, () => current)).entries).toEqual([]);
  expect(cancelled.calls.pages).toEqual([]);
});

test('sección actual: altura dentro de página, huecos y límites del documento', async () => {
  const index = await resolvePdfOutline([
    item('First', [0, { name: 'XYZ' }, 0, 700]), item('Second', [0, { name: 'XYZ' }, 0, 400]),
    item('Last', [2, { name: 'Fit' }]),
  ], documentFixture().document);
  const at = (pageNumber: number, top: number) => currentPdfOutline(index, { pageNumber, left: 0, top })?.path;
  expect(at(1, 800)).toBeUndefined();
  expect(at(1, 700)).toBe('-0');
  expect(at(1, 401)).toBe('-1'); // One normalized pixel of rounding tolerance.
  expect(at(2, 800)).toBe('-1');
  expect(at(3, 800)).toBe('-2');
  expect(at(4, 300)).toBe('-2');
});

test('sección actual: empate estable por profundidad y orden, geometría del viewport', async () => {
  const f = documentFixture();
  const same = [0, { name: 'XYZ' }, 0, 700];
  const index = await resolvePdfOutline([item('Parent', same, [item('Deep first', same), item('Deep second', same)])], f.document);
  expect(index.entries).toHaveLength(1);
  expect(currentPdfOutline(index, { pageNumber: 1, left: 0, top: 700 })?.path).toBe('-0-0');
  // A rotated viewport can map horizontal PDF coordinates to reading height.
  index.viewports.set(1, { convertToViewportPoint: (x, y) => [y, x] });
  expect(currentPdfOutline(index, { pageNumber: 1, left: 99, top: 700 })?.path).toBe('-0-0');
  expect(currentPdfOutline(index, { pageNumber: 1, left: 50, top: 700 })).toBeUndefined();
});
