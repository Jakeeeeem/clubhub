// scripts/dry-run-empty-states.js
const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = '/Users/christopherjcallaghan/Documents/sites/clubhub/frontend';

function collectFiles(dir, arr = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.name === 'node_modules' || e.name === '.git') continue;
    if (e.isDirectory()) collectFiles(full, arr);
    else if (full.endsWith('.html') || full.endsWith('.js')) arr.push(full);
  }
  return arr;
}

const files = collectFiles(FRONTEND_ROOT);

// Regex to find assignments to innerHTML of the form:
// .innerHTML = '...' or "..." or `...`
// We want to capture the string itself.
// To handle multiline template literals, we use [\s\S]*?
const innerHTMLRegex = /(\w+\.innerHTML\s*=\s*)(['"`])([\s\S]*?)\2/g;

let matchCount = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = innerHTMLRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const prefix = match[1];
    const quote = match[2];
    const value = match[3];

    // Check if the value contains any "No ..." patterns (case-insensitive or sensitive)
    // We only want to target strings that have a user-visible "No [something]" message.
    // Let's check if the string contains a word starting with "No " or has a pattern like "No upcoming events", etc.
    const hasNoPattern = /(?:^|>|\s|\\n)No\s+[A-Za-z0-9_]/.test(value) || 
                         /(?:^|>|\s|\\n)No\s+one/.test(value) || 
                         /(?:^|>|\s|\\n)No\s+pending/.test(value);
    
    // Exclude options (<option)
    if (hasNoPattern && !value.includes('<option') && !value.includes('console.log') && !value.includes('throw new Error')) {
      matchCount++;
      console.log(`\n[MATCH ${matchCount}] File: ${path.relative(FRONTEND_ROOT, file)}`);
      console.log(`Original: ${fullMatch.trim().replace(/\n/g, ' ')}`);
      
      // Determine what the message inside the HTML tags is
      // Strip HTML tags to extract the plain message text
      let plainText = value
        .replace(/<[^>]*>/g, '') // remove tags
        .replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, ' ')
        .trim();
      
      // Remove any emojis at the start/end of the plain text to avoid duplicate emojis
      plainText = plainText.replace(/^[\u{1F300}-\u{1F9FF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]\s*/u, '');
      plainText = plainText.replace(/\s*[\u{1F300}-\u{1F9FF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]$/u, '');
      plainText = plainText.trim();

      console.log(`Extracted Message: "${plainText}"`);
    }
  }
});

console.log(`\nTotal matches found: ${matchCount}`);
