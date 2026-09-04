/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus 5)
 *
 * GLOBAL IMPERATIVE CONFIRM — the app-wide replacement for window.confirm().
 *
 * ⚠️ WHY THIS EXISTS. NEVER CALL THE GLOBAL confirm() IN THIS APP.
 *
 * The platform global fails in BOTH directions, and both are wrong:
 *
 *  • TAURI DESKTOP: window.confirm is shimmed to an async IPC call, so it returns a
 *    PROMISE, not a boolean. A Promise is ALWAYS truthy. That means BOTH common
 *    guard shapes fail OPEN — the destructive action runs even when the user
 *    clicks Cancel:
 *        if (!confirm('Delete?')) return      // !Promise === false → never returns
 *        if (confirm('Delete?')) { delete() } // Promise → always deletes
 *
 *  • TAURI ANDROID: the native onJsConfirm bridge isn't wired, so the call is
 *    swallowed and the button silently does nothing.
 *
 * Found 2026-09-04 by Justin's external security audit of Chaos Command, on the
 * permanent profile-wipe path — where "Cancel" would have deleted every tracker
 * and every entry for the logged-in PIN anyway. In a medical app. Thank you, Justin.
 *
 * HOW TO USE — one line, no JSX, works anywhere (hooks, handlers, non-component code):
 *
 *     import { confirmAsync } from '@/components/ui/confirm-host'
 *     if (!(await confirmAsync({ title: 'Delete this entry?', destructive: true }))) return
 *
 * <ConfirmHost /> is mounted ONCE in the root layout. If it somehow isn't mounted,
 * the promise never resolves and the destructive action never runs — this FAILS SAFE
 * on purpose, which is the opposite of what the platform global does.
 *
 * (The older useConfirmDialog() hook in ./confirm-dialog still works and is still
 * correct — it just needs per-component JSX. New code should prefer confirmAsync.)
 */

'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ConfirmOptions } from '@/components/ui/confirm-dialog';

export type { ConfirmOptions };

interface ConfirmRequest {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

// Module-level bridge between the imperative call and the mounted host.
let emit: ((req: ConfirmRequest) => void) | null = null;
// Requests made before the host mounts (e.g. very early in boot) wait here.
const pending: ConfirmRequest[] = [];

/**
 * Imperative confirm. Resolves true on confirm, false on cancel / dismiss.
 * Never resolves if <ConfirmHost /> is not mounted — deliberately fail-safe.
 */
export function confirmAsync(options: ConfirmOptions = {}): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const request: ConfirmRequest = { options, resolve };
    if (emit) emit(request);
    else pending.push(request);
  });
}

export function ConfirmHost() {
  const [current, setCurrent] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    emit = (request) => {
      setCurrent((prev) => {
        // A second confirm while one is open: answer the old one "no" (safe) and show the new.
        prev?.resolve(false);
        return request;
      });
    };
    while (pending.length) emit(pending.shift()!);
    return () => { emit = null; };
  }, []);

  const settle = (result: boolean) => {
    setCurrent((prev) => { prev?.resolve(result); return null; });
  };

  const options = current?.options ?? {};

  return (
    <Dialog open={current !== null} onOpenChange={(next) => { if (!next) settle(false); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{options.title ?? 'Are you sure?'}</DialogTitle>
          {options.description ? (
            // whitespace-pre-line: callers pass multi-paragraph warnings with real
            // \n\n breaks; without this they collapse into one wall of text.
            <DialogDescription className="whitespace-pre-line text-left">
              {options.description}
            </DialogDescription>
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
}
