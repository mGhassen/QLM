'use client';

import { useLayoutEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface FloatingToolbarSlotProps {
  children: ReactNode;
}

export default function FloatingToolbarSlot({
  children,
}: FloatingToolbarSlotProps) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    setPortalRoot(
      document.querySelector<HTMLElement>(
        '.doc-studio .studio-wysiwyg-toolbar-dock',
      ),
    );
  }, []);

  useLayoutEffect(() => {
    if (!portalRoot) return;

    function update() {
      const canvas = document.querySelector('.doc-studio .studio-canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setCoords({ top: rect.top + 12, left: rect.left + rect.width / 2 });
    }

    update();
    const raf = requestAnimationFrame(() => setVisible(true));

    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
    };
  }, [portalRoot]);

  if (!portalRoot || !coords) return null;

  return createPortal(
    <div
      className={`studio-wysiwyg-toolbar-portal pointer-events-auto${visible ? ' is-visible' : ''}`}
      style={{ top: coords.top, left: coords.left }}
    >
      {children}
    </div>,
    portalRoot,
  );
}
