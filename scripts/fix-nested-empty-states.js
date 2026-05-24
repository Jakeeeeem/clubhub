// scripts/fix-nested-empty-states.js
// This script cleans up over‑nested renderEmptyState calls and any remaining hard‑coded "No …" UI strings.
// Run with: node scripts/fix-nested-empty-states.js (from project root)

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = '/Users/christopherjcallaghan/Documents/sites/clubhub';
const FRONTEND_ROOT = path.join(PROJECT_ROOT, 'frontend');

function collectFiles(dir, arr = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) collectFiles(full, arr);
    else if (full.endsWith('.html') || full.endsWith('.js')) arr.push(full);
  }
  return arr;
}

const files = collectFiles(FRONTEND_ROOT);

// Collapse `${renderEmptyState(${renderEmptyState('msg','icon')}, 'icon')}` into a single call.
const nestedRegex = /\$\{\s*renderEmptyState\(\s*\$\{\s*renderEmptyState\(['"]([^'\"]+)['"],\s*['"]([^'\"]+)['"]\)\s*\}\s*,\s*['"]([^'\"]+)['"]\s*\)\s*\}/g;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // 1. Fix nested renderEmptyState calls
  content = content.replace(nestedRegex, (match, msg, icon1, icon2) => {
    // Prefer the innermost icon if they match, otherwise keep the outermost.
    const icon = icon1 === icon2 ? icon1 : icon2;
    return `${'${'}renderEmptyState('${msg.replace(/'/g, "\\'")}', '${icon}')${'}'};`;
  });

  // 2. Replace any leftover plain "No …" strings that are not options or console logs.
  const plainNoRegex = /([\w\.]+(?:innerHTML|innerText)\s*=\s*)(['"])(\s*No[^'"`]*)\2/g;
  content = content.replace(plainNoRegex, (m, prefix, q, msg) => {
    const clean = msg.trim();
    const icon = clean.toLowerCase().includes('team') ? '🏆' : 'ℹ️';
    return `${prefix}renderEmptyState('${clean.replace(/'/g, "\\'")}', '${icon}')`;
  });

  // 3. Collapse duplicate renderEmptyState inside template literals
  const doubleRenderRegex = /\`([^`]*?)\$\{\s*renderEmptyState\(['"]([^'\"]+)['"],\s*['"]([^'\"]+)['"]\)\s*\}([^`]*?)\`/g;
  content = content.replace(doubleRenderRegex, (m, pre, msg, icon, post) => {
    return `\`${pre}${'${'}renderEmptyState('${msg.replace(/'/g, "\\'")}', '${icon}')${'}'}${post}\``;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Cleaned ${path.relative(PROJECT_ROOT, file)}`);
  }
});

console.log('Nested empty‑state cleanup complete.');
