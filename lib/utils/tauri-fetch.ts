/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * Tauri-compatible fetch wrapper
 * Uses regular window.fetch() with CORS (CSP already allows localhost:*).
 * The Tauri HTTP plugin has a streaming bug on Windows that causes
 * "Failed to fetch" at readChunk — bypassing it entirely. Flask CORS
 * is configured to accept tauri://localhost and http://localhost:33445.
 */

/**
 * Fetch wrapper for Flask backend calls.
 * Uses standard fetch — CSP connect-src allows http://localhost:*
 * and Flask CORS allows our Tauri origins.
 */
export async function backendFetch(
  url: string,
  options?: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout, ...fetchOptions } = options || {};

  console.log(`🔧 backendFetch: ${fetchOptions.method || 'GET'} ${url}`);

  const controller = new AbortController();
  const timeoutId = timeout
    ? setTimeout(() => controller.abort(), timeout)
    : null;

  try {
    const response = await window.fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    console.log(`✅ backendFetch response: ${response.status} ${response.statusText}`);
    return response;
  } catch (error) {
    console.error('❌ backendFetch error:', error);
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/** Flask backend base URL */
export const FLASK_URL = 'http://localhost:5000';
