/*
 * Global type declarations for CommandTauri
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 */

// Tauri global types
declare global {
  interface Window {
    __TAURI__?: {
      // Add Tauri API types as needed
      invoke: (cmd: string, args?: any) => Promise<any>;
      // Add other Tauri APIs as they're used
    };
  }
}

export {};
