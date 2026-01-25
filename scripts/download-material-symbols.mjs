#!/usr/bin/env node
/**
 * ICONS-LOCAL-LIBRARY-1 - Generate Material Symbols SVGs
 *
 * Generates normalized SVGs from embedded path data (Material Symbols Outlined).
 * Dev-only script - run once to populate the svg/ folder.
 *
 * Usage: node scripts/download-material-symbols.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SVG_DIR = join(__dirname, '../apps/web/public/icons/material-symbols/svg');

// Icons extracted from Stitch HTML - deduped and sorted
const ICONS = [
  'admin_panel_settings',
  'analytics',
  'article',
  'auto_awesome',
  'auto_fix_high',
  'award_star',
  'block',
  'calculate',
  'campaign',
  'check',
  'check_circle',
  'data_object',
  'deployed_code',
  'download',
  'error',
  'health_and_safety',
  'history',
  'home',
  'hub',
  'inventory_2',
  'memory',
  'monitoring',
  'orders',
  'preview',
  'publish',
  'search',
  'settings',
  'settings_suggest',
  'settings_voice',
  'target',
  'title',
  'visibility',
  'warning',
];

/**
 * Creates a normalized SVG with viewBox="0 0 24 24" and currentColor fill.
 * These are simplified Material Symbols Outlined icons.
 */
function createSvg(pathData) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="${pathData}"/>
</svg>`;
}

// Material Symbols Outlined path data (weight 300, grade 0, optical size 20)
// Source: https://fonts.google.com/icons
const ICON_PATHS = {
  admin_panel_settings:
    'M12 23q-3.475-.875-5.738-3.988Q4 15.9 4 12.05V5l8-3 8 3v7.05q0 .55-.05 1.075t-.15 1.025h-2.05q.15-.5.2-1.012Q18 12.625 18 12.05V6.4l-6-2.25L6 6.4v5.65q0 2.825 1.35 5.1t3.65 3.6q.325.15.638.275.312.125.612.225.15.525.438.987.287.463.662.863-.45.25-.925.45-.475.2-.925.35Zm5.5.5q-1.875 0-3.188-1.312Q13 20.875 13 19t1.312-3.188Q15.625 14.5 17.5 14.5t3.188 1.312Q22 17.125 22 19t-1.312 3.188Q19.375 23.5 17.5 23.5Zm-.625-1.65 3.25-3.25-1.05-1.05-2.2 2.2-.95-.95-1.05 1.05ZM12 13Z',
  analytics:
    'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM5 19V5h14v14H5z M7 12h2v5H7zm4-3h2v8h-2zm4-3h2v11h-2z',
  article:
    'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 15h7v2H7zm0-4h10v2H7zm0-4h10v2H7z',
  auto_awesome:
    'm19 9 1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25zm0 14-1.25-2.75L15 19l2.75-1.25L19 15l1.25 2.75L23 19l-2.75 1.25zM9 20l-2.5-5.5L1 12l5.5-2.5L9 4l2.5 5.5L17 12l-5.5 2.5z',
  auto_fix_high:
    'm20 7-1.5 3.5L15 12l3.5 1.5L20 17l1.5-3.5L24 12l-3.5-1.5zM9.5 5l-2 4.5L3 11.5l4.5 2L9.5 18l2-4.5 4.5-2-4.5-2zM20 20l-1.5-3.5-3.5-1.5 3.5-1.5L20 10l1.5 3.5 3.5 1.5-3.5 1.5z',
  award_star:
    'M12 7.13l.97 2.29.47 1.11 1.2.1 2.47.21-1.88 1.63-.91.79.27 1.18.56 2.41-2.12-1.28L12 14.96l-1.03.61-2.12 1.28.56-2.41.27-1.18-.91-.79-1.88-1.63 2.47-.21 1.2-.1.47-1.11.97-2.29M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z',
  block:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z',
  calculate:
    'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM6.25 7.72h5v1.5h-5zM13 15.75h5v1.5h-5zm0-2.5h5v1.5h-5zM8 18h1.5v-2h2v-1.5h-2v-2H8v2H6V16h2zm6.09-7.95l1.41-1.41 1.41 1.41 1.06-1.06-1.41-1.42 1.41-1.41L16.91 5 15.5 6.41 14.09 5l-1.06 1.06 1.41 1.41-1.41 1.42z',
  campaign:
    'M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm5.03 1.71L11 9.53v4.94l-1.97-1.18-.48-.29H4v-2h4.55l.48-.29zM15.5 12c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z',
  check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  check_circle:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z',
  data_object:
    'M4 7v2c0 .55-.45 1-1 1H2v4h1c.55 0 1 .45 1 1v2c0 1.65 1.35 3 3 3h3v-2H7c-.55 0-1-.45-1-1v-2c0-1.3-.84-2.42-2-2.83v-.34C5.16 11.42 6 10.3 6 9V7c0-.55.45-1 1-1h3V4H7C5.35 4 4 5.35 4 7zm17 3c-.55 0-1-.45-1-1V7c0-1.65-1.35-3-3-3h-3v2h3c.55 0 1 .45 1 1v2c0 1.3.84 2.42 2 2.83v.34c-1.16.41-2 1.52-2 2.83v2c0 .55-.45 1-1 1h-3v2h3c1.65 0 3-1.35 3-3v-2c0-.55.45-1 1-1h1v-4h-1z',
  deployed_code:
    'm12 19.2-7-3.8V8.6l7 3.8v6.8Zm2 0V12.4l7-3.8v6.8l-7 3.8ZM12 2l9 4.9-9 4.9-9-4.9L12 2Zm0 2.15L6.35 6.9 12 9.65l5.65-2.75L12 4.15Z',
  download:
    'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
  error:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z',
  health_and_safety:
    'M10.5 13H8v-3h2.5V7.5h3V10H16v3h-2.5v2.5h-3V13zM12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm6 9.09c0 4-2.55 7.7-6 8.83-3.45-1.13-6-4.82-6-8.83V6.31l6-2.12 6 2.12v4.78z',
  history:
    'M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  hub: 'M8.4 18.2c.38.62.94 1.12 1.6 1.44V22H6v-2h2v-.55c-1.14-.13-2.2-.58-3.08-1.25L3.2 19.2 1.8 17.8l1.05-1.05C2.15 15.87 1.7 14.8 1.55 13.55L0 14V10l1.55.45c.15-1.25.6-2.32 1.3-3.2L1.8 6.2 3.2 4.8l1.05 1.05C5.12 5.15 6.2 4.7 7.45 4.55V2h4v2.55c1.25.15 2.32.6 3.2 1.3L15.7 4.8l1.41 1.41-1.05 1.05c.7.88 1.15 1.95 1.3 3.2L20 10v4l-2.55-.45c-.15 1.25-.6 2.32-1.3 3.2l1.05 1.05-1.41 1.41-1.05-1.05c-.88.7-1.95 1.15-3.2 1.3V22h-4v-2.36c-.66-.32-1.22-.82-1.6-1.44zM12 16c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z',
  inventory_2:
    'M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-1 18H5V9h14v11zm1-13H4V4h16v3z M9 12h6v2H9z',
  memory:
    'M15 9H9v6h6V9zm-2 4h-2v-2h2v2zm8-2V9h-2V7c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H9v2H7c-1.1 0-2 .9-2 2v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2zm-4 6H7V7h10v10z',
  monitoring:
    'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM5 19V5h14v14H5zm4.5-7l2.5 3 3.5-4.5 4.5 6H5l4.5-6z',
  orders:
    'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  preview:
    'M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7-2c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
  publish: 'M5 4v2h14V4H5zm0 10h4v6h6v-6h4l-7-7-7 7z',
  search:
    'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  settings:
    'M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  settings_suggest:
    'M17.41 6.59L15 5.5l2.41-1.09L18.5 2l1.09 2.41L22 5.5l-2.41 1.09L18.5 9l-1.09-2.41zm3.87 6.13L20.5 11l-.78 1.72-1.72.78 1.72.78.78 1.72.78-1.72L23 13.5l-1.72-.78zm-5.04 1.65l1.94 1.47-2.5 4.33-2.24-.94c-.2.13-.42.26-.64.37l-.3 2.4h-5l-.3-2.41c-.22-.11-.43-.23-.64-.37l-2.24.94-2.5-4.33 1.94-1.47c-.01-.11-.01-.24-.01-.36s0-.25.01-.37l-1.94-1.47 2.5-4.33 2.24.94c.2-.13.42-.26.64-.37L7.5 6h5l.3 2.41c.22.11.43.23.64.37l2.24-.94 2.5 4.33-1.94 1.47c.01.12.01.24.01.36s0 .24-.01.36zM13 14c0-1.66-1.34-3-3-3s-3 1.34-3 3 1.34 3 3 3 3-1.34 3-3z',
  settings_voice:
    'M7 24h2v-2H7v2zm5-11c1.66 0 2.99-1.34 2.99-3L15 4c0-1.66-1.34-3-3-3S9 2.34 9 4v6c0 1.66 1.34 3 3 3zm-1 11h2v-2h-2v2zm4 0h2v-2h-2v2zm4-14h-1.7c0 3-2.54 5.1-5.3 5.1S6.7 13 6.7 10H5c0 3.41 2.72 6.23 6 6.72V20h2v-3.28c3.28-.49 6-3.31 6-6.72z',
  target:
    'M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3-8c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z',
  title:
    'M5 4v3h5.5v12h3V7H19V4z',
  visibility:
    'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
  warning:
    'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
};

async function main() {
  console.log('Downloading Material Symbols SVGs...');
  console.log(`Target: ${SVG_DIR}`);
  console.log(`Icons: ${ICONS.length}`);

  // Ensure directory exists
  mkdirSync(SVG_DIR, { recursive: true });

  let success = 0;
  let failed = 0;

  for (const icon of ICONS) {
    const pathData = ICON_PATHS[icon];
    if (!pathData) {
      console.error(`Missing path data for: ${icon}`);
      failed++;
      continue;
    }

    const svg = createSvg(pathData);
    const filePath = join(SVG_DIR, `${icon}.svg`);
    writeFileSync(filePath, svg, 'utf-8');
    console.log(`  ✓ ${icon}.svg`);
    success++;
  }

  console.log('');
  console.log(`Downloaded: ${success}/${ICONS.length}`);
  if (failed > 0) {
    console.log(`Failed: ${failed}`);
  }
  console.log('');
  console.log('Run build-material-symbols-sprite.mjs to generate the sprite.');
}

main();
