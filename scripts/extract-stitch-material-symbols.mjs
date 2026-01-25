#!/usr/bin/env node
/**
 * ICONS-LOCAL-LIBRARY-1 - Dev-only extraction script
 *
 * Extracts Material Symbols icon names from Stitch HTML files.
 * Usage: node scripts/extract-stitch-material-symbols.mjs <file1.html> [file2.html ...]
 *
 * Outputs a deduped, sorted JSON array of icon names to stdout.
 * Never writes into the app at runtime (dev-only).
 */

import { readFileSync } from 'fs';

function extractIconNames(htmlContent) {
  // Match <span class="material-symbols-outlined">ICON_NAME</span>
  const regex = /<span[^>]*class="[^"]*material-symbols-outlined[^"]*"[^>]*>([^<]+)<\/span>/gi;
  const icons = new Set();

  let match;
  while ((match = regex.exec(htmlContent)) !== null) {
    const iconName = match[1].trim();
    if (iconName && !iconName.includes('<') && !iconName.includes('{')) {
      icons.add(iconName);
    }
  }

  return icons;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node extract-stitch-material-symbols.mjs <file1.html> [file2.html ...]');
    console.error('');
    console.error('Extracts Material Symbols icon names from Stitch HTML files.');
    console.error('Outputs a deduped, sorted JSON array to stdout.');
    process.exit(1);
  }

  const allIcons = new Set();

  for (const filePath of args) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const icons = extractIconNames(content);
      for (const icon of icons) {
        allIcons.add(icon);
      }
    } catch (error) {
      console.error(`Error reading ${filePath}: ${error.message}`);
      process.exit(1);
    }
  }

  const sortedIcons = Array.from(allIcons).sort();
  console.log(JSON.stringify(sortedIcons, null, 2));
}

main();
