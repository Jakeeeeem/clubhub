const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');
const out = [];

function isHtmlFile(f) {
  return f.endsWith('.html');
}

const files = fs.readdirSync(frontendDir).filter(isHtmlFile).sort();
files.forEach(f => {
  const p = path.join(frontendDir, f);
  const content = fs.readFileSync(p, 'utf8');
  const hasViewport = /<meta\s+name=["']viewport["']/.test(content);
  const usesMobileClass = /\bmobile(-|_)|mobile-only|mobile-card/.test(content);
  out.push({ file: `frontend/${f}`, hasViewport, usesMobileClass });
});

const reportPath = path.join(__dirname, '..', 'docs', 'MOBILE_INVENTORY.json');
fs.writeFileSync(reportPath, JSON.stringify(out, null, 2));
console.log('Wrote', reportPath);
console.log('Summary:', out.length, 'pages;', out.filter(x=>x.hasViewport).length, 'have viewport meta');
