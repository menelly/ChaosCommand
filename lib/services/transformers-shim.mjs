/*
 * Shim to load the web bundle of @huggingface/transformers.
 * Next.js resolves through package.json exports which picks the Node.js bundle.
 * This file uses a direct filesystem import to bypass exports resolution.
 */
export { pipeline, env } from '../../node_modules/@huggingface/transformers/dist/transformers.web.js';
