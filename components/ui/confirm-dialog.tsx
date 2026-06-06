/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * Reusable confirm dialog — replaces window.confirm().
 *
 * window.confirm()/alert() are silently swallowed by the Tauri Android WebView
 * (the native onJsConfirm bridge isn't wired up), so any delete/clear guarded by
 * window.confirm() never fired on the phone build — the button appeared to do
 * nothing. This dialog is pure Radix/DOM, so it behaves identically on web,
 * desktop, and Android.
 *
 * Co-invented by Ren (vision) and Ace (implementation).
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

/**
 * Promise-based confirm dialog hook.
 *
 *   const { confirm, confirmDialog } = useConfirmDialog();
 *   if (await confirm({ title: 'Delete?', destructive: true })) { ... }
 *   // ...and render {confirmDialog} somewhere in your JSX.
 *
 * Resolves true on confirm, false on cancel / overlay-dismiss / X.
 */
export function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({});
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((result: boolean) => {
    setOpen(false);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(result);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions = {}) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const confirmDialog = (
    <Dialog open={open} onOpenChange={(next) => { if (!next) settle(false); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{options.title ?? 'Are you sure?'}</DialogTitle>
          {options.description ? (
            <DialogDescription>{options.description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => settle(false)}>
            {options.cancelText ?? 'Cancel'}
          </Button>
          <Button
            variant={options.destructive ? 'destructive' : 'default'}
            onClick={() => settle(true)}
          >
            {options.confirmText ?? 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, confirmDialog };
}
