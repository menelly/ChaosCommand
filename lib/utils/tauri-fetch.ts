/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * Tauri-compatible fetch wrapper
 * Uses @tauri-apps/plugin-http when running inside Tauri,
 * falls back to regular window.fetch() in browser dev mode.
 */

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

/**
 * Smart fetch that uses Tauri's HTTP plugin.
 * This is needed because Tauri v2's webview blocks cross-origin
 * fetch() calls unless they go through the HTTP plugin.
 */
export async function backendFetch(
  url: string,
  options?: RequestInit & { timeout?: number }
): Promise<Response> {
  // Strip our custom timeout prop so it doesn't confuse fetch
  const { timeout: _timeout, ...fetchOptions } = options || {};

  console.log(`🔧 backendFetch: ${fetchOptions.method || 'GET'} ${url}`);

  try {
    const response = await tauriFetch(url, fetchOptions);
    console.log(`✅ backendFetch response: ${response.status} ${response.statusText}`);
    return response;
  } catch (error) {
    console.error('❌ backendFetch error:', error);
    throw error;
  }
}

/** Flask backend base URL */
export const FLASK_URL = 'http://localhost:5000';
