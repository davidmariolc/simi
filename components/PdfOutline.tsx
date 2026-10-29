import { useId, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

type NativeOutlineItem = Awaited<ReturnType<PDFDocumentProxy['getOutline']>>[number];
export type PdfOutlineItem = Omit<NativeOutlineItem, 'items'> & { items: PdfOutlineItem[] };

type Props = {
  items: PdfOutlineItem[];
  navigate: (destination: NonNullable<PdfOutlineItem['dest']>) => void;
};

export function PdfOutline({ items, navigate }: Props) {
  const id = useId();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  function expandAll() {
    const next = new Set<string>();
    function visit(entries: PdfOutlineItem[], parent = '') {
      entries.forEach((item, index) => {
        const path = `${parent}-${index}`;
        if (item.items.length) { next.add(path); visit(item.items, path); }
      });
    }
    visit(items); setExpanded(next);
  }

  function renderItems(entries: PdfOutlineItem[], parent = '') {
    return <ul className="pdf-outline-list">
      {entries.map((item, index) => {
        const path = `${parent}-${index}`, open = expanded.has(path);
        const title = item.title.trim() || 'Sin título';
        return <li key={path}>
          <div className="pdf-outline-row">
            {item.items.length > 0 ? <button type="button" className="pdf-outline-toggle"
              aria-label={`${open ? 'Contraer' : 'Expandir'} ${title}`} aria-expanded={open} aria-controls={`${id}${path}`}
              onClick={() => setExpanded(previous => {
                const next = new Set(previous);
                if (next.has(path)) next.delete(path); else next.add(path);
                return next;
              })}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ transform: open ? 'rotate(90deg)' : undefined }}><path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.8" /></svg>
            </button> : <span className="pdf-outline-spacer" />}
            {item.dest ? <button type="button" className="pdf-outline-title" onClick={() => navigate(item.dest!)}>{title}</button>
              : <span className="pdf-outline-title">{title}</span>}
          </div>
          {item.items.length > 0 && <div id={`${id}${path}`} hidden={!open}>{open && renderItems(item.items, path)}</div>}
        </li>;
      })}
    </ul>;
  }

  return <>
    <div className="pdf-outline-actions">
      <button type="button" onClick={expandAll}>Expandir todo</button>
      <button type="button" onClick={() => setExpanded(new Set())}>Contraer todo</button>
    </div>
    <nav aria-label="Capítulos del PDF">{renderItems(items)}</nav>
  </>;
}
