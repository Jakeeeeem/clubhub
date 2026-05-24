// scripts/test-empty-state-replace.js
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

function getIcon(message) {
  const msg = message.toLowerCase();
  if (msg.includes('team') || msg.includes('squad') || msg.includes('competition') || msg.includes('tournament') || msg.includes('league')) {
    return '🏆';
  }
  if (msg.includes('match') || msg.includes('fixture') || msg.includes('play')) {
    return '⚽';
  }
  if (msg.includes('transaction') || msg.includes('plan') || msg.includes('finance') || msg.includes('bill') || msg.includes('invoice') || msg.includes('subscrib') || msg.includes('price') || msg.includes('pay') || msg.includes('money') || msg.includes('shop') || msg.includes('product') || msg.includes('order') || msg.includes('bib') || msg.includes('inventory')) {
    return '💰';
  }
  if (msg.includes('member') || msg.includes('staff') || msg.includes('user') || msg.includes('coach') || msg.includes('registrant') || msg.includes('people') || msg.includes('player') || msg.includes('contact') || msg.includes('conversation')) {
    return '👥';
  }
  if (msg.includes('event') || msg.includes('session') || msg.includes('schedule') || msg.includes('fixture') || msg.includes('calendar') || msg.includes('training') || msg.includes('date') || msg.includes('rsvp') || msg.includes('attendance')) {
    return '📅';
  }
  if (msg.includes('venue') || msg.includes('court') || msg.includes('pitch') || msg.includes('field') || msg.includes('booking')) {
    return '🏟️';
  }
  if (msg.includes('video') || msg.includes('tv') || msg.includes('demo') || msg.includes('youtube')) {
    return '🎥';
  }
  if (msg.includes('notification') || msg.includes('message') || msg.includes('alert') || msg.includes('chat') || msg.includes('announcement')) {
    return '💬';
  }
  if (msg.includes('log') || msg.includes('report') || msg.includes('history') || msg.includes('activity')) {
    return '📋';
  }
  return 'ℹ️';
}

const innerHTMLRegex = /(\w+\.innerHTML\s*=\s*)(['"`])([\s\S]*?)\2/g;

let matchCount = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  let hasDiff = false;
  
  const newContent = content.replace(innerHTMLRegex, (m, prefix, quote, value) => {
    const hasNoPattern = /(?:^|>|\s|\\n)No\s+[A-Za-z0-9_]/.test(value) || 
                         /(?:^|>|\s|\\n)No\s+one/.test(value) || 
                         /(?:^|>|\s|\\n)No\s+pending/.test(value);
    
    if (hasNoPattern && !value.includes('<option') && !value.includes('console.log') && !value.includes('throw new Error')) {
      matchCount++;
      hasDiff = true;

      // Extract plain text message
      let plainText = value
        .replace(/<[^>]*>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, ' ')
        .trim();
      
      plainText = plainText.replace(/^[\u{1F300}-\u{1F9FF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]\s*/u, '');
      plainText = plainText.replace(/\s*[\u{1F300}-\u{1F9FF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]$/u, '');
      plainText = plainText.trim();

      const icon = getIcon(plainText);
      const isTableRow = value.includes('<tr>') || value.includes('<td') || value.includes('colspan') || prefix.includes('tbody') || prefix.includes('tableBody');
      const containsTemplateExpr = value.includes('${');

      let replacement;
      if (isTableRow) {
        let colspan = 10;
        const colspanMatch = value.match(/colspan=["']?(\d+)["']?/i);
        if (colspanMatch) {
          colspan = parseInt(colspanMatch[1], 10);
        }
        if (containsTemplateExpr) {
          replacement = `${prefix}\`<tr><td colspan="${colspan}" style="border:none; padding:2rem; background:transparent;">\${renderEmptyState(\`${plainText}\`, '${icon}')}</td></tr>\``;
        } else {
          const escaped = plainText.replace(/'/g, "\\'");
          replacement = `${prefix}\`<tr><td colspan="${colspan}" style="border:none; padding:2rem; background:transparent;">\${renderEmptyState('${escaped}', '${icon}')}</td></tr>\``;
        }
      } else {
        if (containsTemplateExpr) {
          replacement = `${prefix}renderEmptyState(\`${plainText}\`, '${icon}')`;
        } else {
          const escaped = plainText.replace(/'/g, "\\'");
          replacement = `${prefix}renderEmptyState('${escaped}', '${icon}')`;
        }
      }
      
      console.log(`\n--- Match ${matchCount} ---`);
      console.log(`File: ${path.relative(FRONTEND_ROOT, file)}`);
      console.log(`- ${m.trim()}`);
      console.log(`+ ${replacement.trim()}`);
      
      return replacement;
    }
    return m;
  });
});

console.log(`\nTotal matches: ${matchCount}`);
