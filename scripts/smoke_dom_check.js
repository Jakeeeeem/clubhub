const fs = require('fs');
const path = require('path');

const frontend = path.join(__dirname, '..', 'frontend');
const files = [
  'admin-events.html', 'admin-finances.html', 'admin-members.html', 'admin-shop.html',
  'admin-staff.html', 'admin-teams.html', 'admin-tournament-manager.html',
  'coach-chat.html', 'coach-players.html', 'coach-teams.html',
  'player-finances.html', 'player-shop.html', 'training-manager.html'
];

let ok = true;
files.forEach(f => {
  const p = path.join(frontend, f);
  let txt = '';
  try { txt = fs.readFileSync(p,'utf8'); } catch (e) { console.error(`${f}: ERROR reading file: ${e.message}`); ok = false; return; }
  const hasList = /mobile-card-list/.test(txt);
  const hasCard = /mobile-card/.test(txt);
  const hasMount = /SquadMessenger\.mount\(|SquadMessenger\.load\(/.test(txt);
  console.log(`== ${f} ==`);
  console.log(`  mobile-card-list: ${hasList}`);
  console.log(`  mobile-card: ${hasCard}`);
  console.log(`  SquadMessenger mount/load: ${hasMount}`);
});
process.exit(ok ? 0 : 2);
