// scripts/update-empty-states-v2.js
// Enhanced script to replace any remaining user‑visible "No …" messages with renderEmptyState.
// Run with: node scripts/update-empty-states-v2.js (from project root)

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = '/Users/christopherjcallaghan/Documents/sites/clubhub';
const FRONTEND_ROOT = path.join(PROJECT_ROOT, 'frontend');

// Recursively collect all .html and .js files.
function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(full));
    else if (full.endsWith('.html') || full.endsWith('.js')) files.push(full);
  }
  return files;
}

const files = collectFiles(FRONTEND_ROOT);

function pickIcon(message) {
  const lower = message.toLowerCase();
  if (lower.includes('team')) return '🏆';
  if (lower.includes('event')) return '📅';
  if (lower.includes('staff')) return '👥';
  if (lower.includes('player')) return '⚽';
  if (lower.includes('venue')) return '🏟️';
  if (lower.includes('transaction') || lower.includes('payment') || lower.includes('plan')) return '💰';
  return 'ℹ️';
}

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Replace innerHTML / innerText assignments that contain a literal "No …" string.
  const assignRegex = /([\w\.]+(?:innerHTML|innerText)\s*=\s*)(['"])([^'"`]*)\2/gi;
  content = content.replace(assignRegex, (match, prefix, quote, msg) => {
    const trimmed = msg.trim();
    if (!trimmed.startsWith('No ')) return match;
    const icon = pickIcon(trimmed);
    return `${prefix}renderEmptyState('${trimmed}', '${icon}')`;
  });

  // Replace <p>No …</p> fragments inside any string/template.
  const pTagRegex = /<p[^>]*>\s*No[^<]*?<\/p>/gi;
  content = content.replace(pTagRegex, match => {
    const text = match.replace(/<[^>]+>/g, '').trim();
    const icon = pickIcon(text);
    return `${'${'}renderEmptyState('${text}', '${icon}')${'}'}`;
  });

  // Replace stand‑alone "No …" literals (excluding option placeholders and console logs).
  const noLiteralRegex = /(['`])([^'`]*?\bNo [^'`]*?)\1/gi;
  content = content.replace(noLiteralRegex, (match, delim, inner) => {
    if (/option/.test(inner)) return match; // keep option placeholders
    if (/console\.(log|warn|error)/i.test(inner)) return match; // keep debug logs
    const trimmed = inner.trim();
    if (!trimmed.startsWith('No ')) return match;
    const icon = pickIcon(trimmed);
    return `${'${'}renderEmptyState('${trimmed}', '${icon}')${'}'}`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${path.relative(PROJECT_ROOT, filePath)}`);
  }
});

console.log('Second‑pass empty‑state replacement complete.');
