'use client';

import { useEffect } from 'react';
import { isEditingTarget, isMac } from '#/lib/studio-shortcuts';

interface StudioShortcutHandlers {
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onIndent?: (id: string) => void;
  onOutdent?: (id: string) => void;
  onDeselect?: () => void;
  onNavigate?: (direction: 'prev' | 'next' | 'parent' | 'firstChild') => void;
  onEdit?: () => void;
  onSelectAll?: () => void;
  selectedId: string | null;
  textEditBlockId?: string | null;
  canUndo: boolean;
  canRedo: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  canIndent?: boolean;
  canOutdent?: boolean;
}

export function useStudioShortcuts(handlers: StudioShortcutHandlers) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const editing = isEditingTarget(e.target);
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'a') {
        if (editing) return;
        const blockId = handlers.selectedId ?? handlers.textEditBlockId ?? null;
        if (!blockId || !handlers.onSelectAll) return;
        e.preventDefault();
        handlers.onSelectAll();
        return;
      }

      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handlers.onSave();
        return;
      }

      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (editing || !handlers.canUndo) return;
        e.preventDefault();
        handlers.onUndo();
        return;
      }

      if (
        mod &&
        ((e.key.toLowerCase() === 'z' && e.shiftKey) ||
          (!isMac() && e.key.toLowerCase() === 'y'))
      ) {
        if (editing || !handlers.canRedo) return;
        e.preventDefault();
        handlers.onRedo();
        return;
      }

      if (mod && e.key.toLowerCase() === 'd') {
        if (editing || !handlers.selectedId || !handlers.onDuplicate) return;
        e.preventDefault();
        handlers.onDuplicate(handlers.selectedId);
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !mod && !e.altKey) {
        const targetId =
          handlers.selectedId ?? handlers.textEditBlockId ?? null;
        if (editing || !targetId || !handlers.onDelete) return;
        e.preventDefault();
        handlers.onDelete(targetId);
        return;
      }

      if (e.altKey && e.key === 'ArrowUp') {
        if (
          editing ||
          !handlers.selectedId ||
          !handlers.onMoveUp ||
          !handlers.canMoveUp
        )
          return;
        e.preventDefault();
        handlers.onMoveUp(handlers.selectedId);
        return;
      }

      if (e.altKey && e.key === 'ArrowDown') {
        if (
          editing ||
          !handlers.selectedId ||
          !handlers.onMoveDown ||
          !handlers.canMoveDown
        )
          return;
        e.preventDefault();
        handlers.onMoveDown(handlers.selectedId);
        return;
      }

      if (e.altKey && e.key === 'ArrowRight') {
        if (
          editing ||
          !handlers.selectedId ||
          !handlers.onIndent ||
          !handlers.canIndent
        )
          return;
        e.preventDefault();
        handlers.onIndent(handlers.selectedId);
        return;
      }

      if (e.altKey && e.key === 'ArrowLeft') {
        if (
          editing ||
          !handlers.selectedId ||
          !handlers.onOutdent ||
          !handlers.canOutdent
        )
          return;
        e.preventDefault();
        handlers.onOutdent(handlers.selectedId);
        return;
      }

      if (!mod && !e.altKey && e.key === 'ArrowUp') {
        const id = handlers.selectedId ?? handlers.textEditBlockId ?? null;
        if (editing || !id || !handlers.onNavigate) return;
        e.preventDefault();
        handlers.onNavigate('prev');
        return;
      }

      if (!mod && !e.altKey && e.key === 'ArrowDown') {
        const id = handlers.selectedId ?? handlers.textEditBlockId ?? null;
        if (editing || !id || !handlers.onNavigate) return;
        e.preventDefault();
        handlers.onNavigate('next');
        return;
      }

      if (!mod && !e.altKey && e.key === 'ArrowLeft') {
        const id = handlers.selectedId ?? handlers.textEditBlockId ?? null;
        if (editing || !id || !handlers.onNavigate) return;
        e.preventDefault();
        handlers.onNavigate('parent');
        return;
      }

      if (!mod && !e.altKey && e.key === 'ArrowRight') {
        const id = handlers.selectedId ?? handlers.textEditBlockId ?? null;
        if (editing || !id || !handlers.onNavigate) return;
        e.preventDefault();
        handlers.onNavigate('firstChild');
        return;
      }

      if (e.key === 'Enter' && !mod && !e.altKey) {
        if (editing || !handlers.selectedId || !handlers.onEdit) return;
        e.preventDefault();
        handlers.onEdit();
        return;
      }

      if (e.key === 'Escape') {
        if (editing || !handlers.onDeselect) return;
        if (!handlers.selectedId && !handlers.textEditBlockId) return;
        e.preventDefault();
        handlers.onDeselect();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handlers.onSave,
    handlers.onUndo,
    handlers.onRedo,
    handlers.onDelete,
    handlers.onDuplicate,
    handlers.onMoveUp,
    handlers.onMoveDown,
    handlers.onIndent,
    handlers.onOutdent,
    handlers.onDeselect,
    handlers.onNavigate,
    handlers.onEdit,
    handlers.onSelectAll,
    handlers.selectedId,
    handlers.textEditBlockId,
    handlers.canUndo,
    handlers.canRedo,
    handlers.canMoveUp,
    handlers.canMoveDown,
    handlers.canIndent,
    handlers.canOutdent,
  ]);
}
