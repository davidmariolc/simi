import { useId, useLayoutEffect, useState, type RefObject } from 'react';
import type { OutlineEntry, PdfOutlineItem } from '../lib/pdf-outline';

type Props = {
  items: PdfOutlineItem[];
  active: OutlineEntry | undefined;
  open: boolean;
  panel: RefObject<HTMLElement | null>;
  navigate: (destination: NonNullable<PdfOutlineItem['dest']>) => void;
};

export function PdfOutline({ items, active, open: panelOpen, panel, navigate }: Props) {
  const id = useId();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useLayoutEffect(() => {
    if (!panelOpen || !active) return;
    setExpanded(previous => {
      if (active.ancestors.every(path => previous.has(path))) return previous;
      return new Set([...previous, ...active.ancestors]);
    });
    const frame = requestAnimationFrame(() => {
      const container = panel.current;
      const entry = container?.querySelector<HTMLElement>(`[data-outline-path="${active.path}"]`);
      if (!container || !entry) return;
      const bounds = container.getBoundingClientRect(), target = entry.getBoundingClientRect();
      if (target.top < bounds.top || target.height > container.clientHeight) container.scrollTop += target.top - bounds.top;
      else if (target.bottom > bounds.bottom) container.scrollTop += target.bottom - bounds.bottom;
    });
    return () => cancelAnimationFrame(frame);
  }, [active, panelOpen, panel]);

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
        const current = active?.path === path ? 'location' : undefined, destination = item.dest;
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
            {destination ? <button type="button" className="pdf-outline-title" data-outline-path={path} aria-current={current} onClick={() => navigate(destination)}>{title}</button>
              : <span className="pdf-outline-title" data-outline-path={path} aria-current={current}>{title}</span>}
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
