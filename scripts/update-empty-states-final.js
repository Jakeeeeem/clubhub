// scripts/update-empty-states-final.js
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

// 1. Static HTML replacements
const staticReplacements = [
  {
    original: '<div style="padding: 2rem; text-align: center; opacity: 0.5;">\n                                <p>No recent activity.</p>\n                            </div>',
    replacement: '<div class="empty-state"><i aria-hidden="true">📋</i><p>No recent activity.</p></div>'
  },
  {
    original: '<div style="padding: 2rem; text-align: center; opacity: 0.5;">\n                                <p>No players in squad.</p>\n                            </div>',
    replacement: '<div class="empty-state"><i aria-hidden="true">⚽</i><p>No players in squad.</p></div>'
  },
  {
    original: '<p style="color: var(--text-muted);">No venues created yet.</p>',
    replacement: '<div class="empty-state"><i aria-hidden="true">🏟️</i><p>No venues created yet.</p></div>'
  },
  {
    original: '<div style="padding: 2rem; text-align: center; opacity: 0.5;">\n                                    <p>No recent activity.</p>\n                                </div>',
    replacement: '<div class="empty-state"><i aria-hidden="true">📋</i><p>No recent activity.</p></div>'
  },
  {
    original: '<div style="padding: 2rem; text-align: center; opacity: 0.5;">\n                                <p>No players in squad.</p>\n                            </div>',
    replacement: '<div class="empty-state"><i aria-hidden="true">⚽</i><p>No players in squad.</p></div>'
  },
  {
    original: '<div style="color: var(--text-muted);">No recent logs.</div>',
    replacement: '<div class="empty-state text-muted"><i aria-hidden="true">📋</i><p>No recent logs.</p></div>'
  },
  {
    original: '<p>No fixtures generated yet. Click "Generate Fixtures" to start the season schedule.</p>',
    replacement: '<div class="empty-state"><i aria-hidden="true">📅</i><p>No fixtures generated yet. Click "Generate Fixtures" to start the season schedule.</p></div>'
  },
  {
    original: '<p>No events scheduled. Create your first event to get started.</p>',
    replacement: '<div class="empty-state"><i aria-hidden="true">📅</i><p>No events scheduled. Create your first event to get started.</p></div>'
  },
  {
    original: '<div style="padding: 2rem; text-align: center; opacity: 0.5;">\n                                    <p>No recent activity.</p>\n                                </div>',
    replacement: '<div class="empty-state"><i aria-hidden="true">📋</i><p>No recent activity.</p></div>'
  },
  {
    original: '<div style="padding: 2rem; text-align: center; opacity: 0.5;">\n                                    <p>No players in squad.</p>\n                                </div>',
    replacement: '<div class="empty-state"><i aria-hidden="true">⚽</i><p>No players in squad.</p></div>'
  },
  {
    original: '<div style="padding: 2rem; text-align: center; opacity: 0.5;">\n                                  <p>No recent activity.</p>\n                                </div>',
    replacement: '<div class="empty-state"><i aria-hidden="true">📋</i><p>No recent activity.</p></div>'
  },
  {
    original: '<div style="padding: 2rem; text-align: center; opacity: 0.5;">\n            <p>No recent activity.</p>\n          </div>',
    replacement: '<div class="empty-state"><i aria-hidden="true">📋</i><p>No recent activity.</p></div>'
  },
  {
    original: '<p style="margin: 0; opacity: 0.8;">No new notifications yet. Check back after your next team update or event invitation.</p>',
    replacement: '<div class="empty-state"><i aria-hidden="true">💬</i><p>No new notifications yet. Check back after your next team update or event invitation.</p></div>'
  },
  {
    original: '<p id="cv-bio" style="color: #ddd; line-height: 1.5;">No bio added.</p>',
    replacement: '<div class="empty-state"><i aria-hidden="true">ℹ️</i><p id="cv-bio" style="color: #ddd; line-height: 1.5; margin: 0;">No bio added.</p></div>'
  },
  {
    original: '<p style="color:var(--text-muted); font-size:0.85rem;">No history yet.</p>',
    replacement: '<div class="empty-state"><i aria-hidden="true">📋</i><p style="margin: 0;">No history yet.</p></div>'
  },
  {
    original: '<p style="margin: 0;">No training videos available for your current squad.</p>',
    replacement: '<div class="empty-state"><i aria-hidden="true">🎥</i><p style="margin: 0;">No training videos available for your current squad.</p></div>'
  }
];

const innerHTMLRegex = /(\w+\.innerHTML\s*=\s*)(['"`])([\s\S]*?)\2/g;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Apply static HTML replacements
  staticReplacements.forEach(rep => {
    content = content.split(rep.original).join(rep.replacement);
  });

  // Also catch variations of spacing and indentations for static placeholders
  content = content.replace(/<div style="padding:\s*2rem;\s*text-align:\s*center;\s*opacity:\s*0\.5;">\s*<p>No recent activity\.<\/p>\s*<\/div>/g, 
    '<div class="empty-state"><i aria-hidden="true">📋</i><p>No recent activity.</p></div>');
  content = content.replace(/<div style="padding:\s*2rem;\s*text-align:\s*center;\s*opacity:\s*0\.5;">\s*<p>No players in squad\.<\/p>\s*<\/div>/g, 
    '<div class="empty-state"><i aria-hidden="true">⚽</i><p>No players in squad.</p></div>');

  // Apply training.js special ternary fallback video block replacement
  if (file.endsWith('training.js')) {
    const drillVideoTernaryOriginal = `<div class="glass-panel" style="padding:2rem; text-align:center; margin-bottom:1.5rem; color:var(--text-muted);">\n          📹 No demo video yet\n        </div>`;
    if (content.includes(drillVideoTernaryOriginal)) {
      content = content.replace(drillVideoTernaryOriginal, `\${renderEmptyState('No demo video yet', '🎥')}`);
      console.log('Applied special training.js video empty state');
    }
  }

  // Apply innerHTML replacements
  content = content.replace(innerHTMLRegex, (m, prefix, quote, value) => {
    const hasNoPattern = /(?:^|>|\s|\\n)No\s+[A-Za-z0-9_]/.test(value) || 
                         /(?:^|>|\s|\\n)No\s+one/.test(value) || 
                         /(?:^|>|\s|\\n)No\s+pending/.test(value);
    
    if (hasNoPattern && !value.includes('<option') && !value.includes('console.log') && !value.includes('throw new Error')) {
      // Extract plain text message with space-insertion logic to prevent merged words
      let plainText = value
        .replace(/<[^>]+>/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
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
      return replacement;
    }
    return m;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${path.relative(FRONTEND_ROOT, file)}`);
  }
});

console.log('Update complete.');
