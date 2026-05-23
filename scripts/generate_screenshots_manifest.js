const fs = require('fs');
const path = require('path');

const pagesListPath = path.join(__dirname, '..', 'review_screenshots', 'pages_list.txt');
const screenshotsDir = path.join(__dirname, '..', 'review_screenshots');
const outPath = path.join(screenshotsDir, 'pages_manifest.txt');

function sectionToFolder(section) {
  return section.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

const txt = fs.readFileSync(pagesListPath, 'utf8');
const lines = txt.split(/\r?\n/);

let section = 'misc';
const sections = {};

for (const raw of lines) {
  const line = raw.trim();
  if (!line) continue;
  // header (all caps, no leading hyphen)
  if (!line.startsWith('-') && line === line.toUpperCase()) {
    section = line;
    sections[section] = [];
    continue;
  }
  if (line.startsWith('-')) {
    const page = line.replace(/^[-\s]+/, '').trim();
    sections[section] = sections[section] || [];
    sections[section].push(page);
  }
}

const outLines = [];
outLines.push('Generated manifest for screenshots');
outLines.push('');

for (const sec of Object.keys(sections)) {
  const folder = sectionToFolder(sec);
  outLines.push(`SECTION: ${sec}`);
  outLines.push(`FOLDER: ${folder}`);
  for (const page of sections[sec]) {
    const desktop = path.join(screenshotsDir, folder, `Desktop - ${page}.png`);
    const mobile = path.join(screenshotsDir, folder, `Mobile - ${page}.png`);
    const desktopExists = fs.existsSync(desktop);
    const mobileExists = fs.existsSync(mobile);
    outLines.push(`- ${page}`);
    outLines.push(`  Desktop: ${desktopExists ? path.relative(process.cwd(), desktop) : 'MISSING'}`);
    outLines.push(`  Mobile : ${mobileExists ? path.relative(process.cwd(), mobile) : 'MISSING'}`);
  }
  outLines.push('');
}

fs.writeFileSync(outPath, outLines.join('\n'));
console.log('Wrote manifest to', outPath);
