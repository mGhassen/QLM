const STUDIO_NODES =
  '.studio-chrome, .studio-page-chrome, .studio-empty-page-insert, .studio-block-toolbar, .studio-inline-insert, .studio-insert-menu, ' +
  '.studio-transform-box, .studio-transform-handle, .studio-transform-move, ' +
  '.studio-grid-handles, .studio-grid-col-handle, .studio-toc-chrome, .studio-toc-add, ' +
  '.studio-toc-edit-panel, .studio-fig-src-btn, .studio-fig-meta, .studio-editor-toolbar, ' +
  '.resize-handle, .studio-spacing-handles, .studio-block-chrome-dock, .studio-table-edit-layer, .tiptap-bubble-menu, [data-tiptap-bubble-menu]';

function findPrintSource(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(
      '.studio-canvas .doc-shell.layout-paginated',
    ) ??
    document.querySelector<HTMLElement>('.doc-shell.layout-paginated') ??
    document.querySelector<HTMLElement>(
      '.studio-canvas .doc-shell.layout-web > .doc-page',
    ) ??
    document.querySelector<HTMLElement>('.doc-shell.layout-web > .doc-page')
  );
}

function printCssFromShell(shell: HTMLElement | null) {
  const printSize = shell?.getAttribute('data-print-size') ?? 'A4';
  const orientation = shell?.getAttribute('data-page-orientation');
  const marginsRaw = shell?.getAttribute('data-print-margins') ?? '10,16,10,16';
  const [top, right, bottom, left] = marginsRaw
    .split(',')
    .map((v) => Number(v) || 0);
  const landscape = orientation === 'landscape' ? ' landscape' : '';

  return `
  html, body {
    margin: 0;
    padding: 0;
    background: #fff !important;
    height: auto !important;
    overflow: visible !important;
  }

  @page {
    size: ${printSize}${landscape};
    margin: ${top}mm ${right}mm ${bottom}mm ${left}mm;
  }
`;
}

const PRINT_CSS_BASE = `

  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .doc-measure-column {
    display: none !important;
  }

  .doc-shell {
    background: #fff !important;
    padding: 0 !important;
    min-height: 0 !important;
    gap: 0 !important;
  }

  .doc-shell.layout-paginated {
    display: block !important;
  }

  .doc-page-sheet {
    break-after: page;
    page-break-after: always;
    box-shadow: none !important;
    margin: 0 !important;
    overflow: visible !important;
    max-height: none !important;
    height: auto !important;
    min-height: var(--doc-page-height, 297mm) !important;
  }

  .doc-page-sheet:last-child {
    break-after: auto;
    page-break-after: auto;
  }

  .doc-page {
    max-width: none !important;
    box-shadow: none !important;
    margin: 0 !important;
  }

  .doc-page .doc-section.page-break {
    break-before: page;
    page-break-before: always;
  }

  .doc-break:not(.doc-break-studio) {
    display: none !important;
  }

  .studio-block,
  .studio-block.studio-chrome-visible {
    outline: none !important;
  }

  .doc-chrome-zone--studio {
    pointer-events: none !important;
    outline: none !important;
  }

  .ProseMirror {
    outline: none !important;
  }

  .ProseMirror p.is-editor-empty:first-child::before {
    content: none !important;
  }
`;

function resolvePrintCss(source: HTMLElement) {
  const shell = source.classList.contains('doc-shell')
    ? source
    : (source.closest('.doc-shell') as HTMLElement | null);
  return printCssFromShell(shell) + PRINT_CSS_BASE;
}

function prepareCloneForPrint(root: HTMLElement) {
  root.querySelectorAll(STUDIO_NODES).forEach((el) => el.remove());
  root.querySelectorAll('.doc-measure-column').forEach((el) => el.remove());
  root.querySelectorAll('.studio-block').forEach((el) => {
    el.classList.remove('studio-chrome-visible', 'studio-block-cover');
    el.removeAttribute('data-studio-selected');
  });
  root.querySelectorAll('.ProseMirror').forEach((el) => {
    el.removeAttribute('contenteditable');
    el.classList.remove('ProseMirror-focused');
  });
  root.querySelectorAll('.doc-chrome-zone').forEach((el) => {
    el.classList.remove('studio-selected', 'doc-chrome-zone--studio');
  });
}

function waitForAssets(doc: Document): Promise<void> {
  const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
  const stylesheets = Promise.all(
    links.map(
      (link) =>
        new Promise<void>((resolve) => {
          const el = link as HTMLLinkElement;
          if (el.sheet) resolve();
          else {
            el.addEventListener('load', () => resolve(), { once: true });
            el.addEventListener('error', () => resolve(), { once: true });
          }
        }),
    ),
  );
  const fonts = doc.fonts?.ready ?? Promise.resolve();
  const images = Promise.all(
    Array.from(doc.images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          }
        }),
    ),
  );

  return Promise.all([stylesheets, fonts, images]).then(
    () => new Promise((resolve) => setTimeout(resolve, 200)),
  );
}

export async function exportDocAsPdf(title: string, sourceSelector?: string) {
  const source =
    (sourceSelector
      ? document.querySelector<HTMLElement>(sourceSelector)
      : null) ?? findPrintSource();

  if (!source) {
    window.print();
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: 'none',
  });
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    iframe.remove();
    return;
  }

  const clone = source.cloneNode(true) as HTMLElement;
  prepareCloneForPrint(clone);

  doc.open();
  doc.write('<!DOCTYPE html><html><head></head><body></body></html>');
  doc.close();

  doc.documentElement.className = document.documentElement.className;
  doc.documentElement.setAttribute('data-theme', 'light');
  doc.title = title;

  document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    doc.head.appendChild(node.cloneNode(true));
  });

  const printStyle = doc.createElement('style');
  printStyle.textContent = resolvePrintCss(source);
  doc.head.appendChild(printStyle);

  if (source.classList.contains('doc-shell')) {
    doc.body.appendChild(clone);
  } else {
    const shell = doc.createElement('div');
    shell.className = 'doc-shell';
    shell.appendChild(clone);
    doc.body.appendChild(shell);
  }

  await waitForAssets(doc);

  win.focus();
  win.print();

  const cleanup = () => iframe.remove();
  win.addEventListener('afterprint', cleanup, { once: true });
  setTimeout(cleanup, 60_000);
}
