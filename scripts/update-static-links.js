const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'frontend');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
let changed = 0;
files.forEach(file => {
  const p = path.join(dir, file);
  let txt = fs.readFileSync(p, 'utf8');
  const orig = txt;
  // Replace styles.css href (only when not already versioned)
  txt = txt.replace(/href=("|')styles\.css("|')/g, 'href="styles.css?v=20260502"');
  // Replace unified-nav.css
  txt = txt.replace(/href=("|')unified-nav\.css("|')/g, 'href="unified-nav.css?v=20260502"');
  // Replace unified-nav.js references without query
  txt = txt.replace(/src=("|')unified-nav\.js("|')/g, 'src="unified-nav.js?v=20260502"');
  if (txt !== orig) {
    fs.writeFileSync(p, txt, 'utf8');
    changed++;
    console.log('Updated', file);
  }
});
console.log('Done. Files changed:', changed);
