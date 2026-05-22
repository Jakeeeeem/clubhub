const fs = require('fs');
const path = require('path');
const screenshotScript = require('../take_screenshots');

// The take_screenshots.js exports no module; instead, we'll parse it directly.
const content = fs.readFileSync(path.join(__dirname, '..', 'take_screenshots.js'), 'utf8');
const match = content.match(/const categories = \{[\s\S]*?\};/m);
if (!match) {
  console.error('Could not find categories in take_screenshots.js');
  process.exit(1);
}
let objSrc = match[0].replace('const categories = ', '');
objSrc = objSrc.replace(/;\s*$/, '');
// Evaluate safely
const categories = eval('(' + objSrc + ')');

const out = [];
for (const [cat, files] of Object.entries(categories)) {
  out.push(cat.toUpperCase());
  files.forEach(f => out.push('- ' + f.replace('.html','')));
  out.push('');
}
const outPath = path.join(__dirname, '..', 'review_screenshots', 'pages_list.txt');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out.join('\n'));
console.log('Written', outPath);
