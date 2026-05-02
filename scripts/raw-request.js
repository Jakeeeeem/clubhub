const net = require('net');

const host = process.argv[2] || '127.0.0.1';
const port = parseInt(process.argv[3], 10) || 53822;

const req = `GET /coach-chat.html HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`;

const client = net.createConnection({ host, port }, () => {
  process.stdout.write('== Sent request ==\n');
  process.stdout.write(req + '\n');
});

let chunks = [];
client.on('data', (data) => {
  chunks.push(data);
});
client.on('end', () => {
  const buf = Buffer.concat(chunks);
  process.stdout.write('== Received bytes (utf8) ==\n');
  process.stdout.write(buf.toString('utf8').slice(0, 4000) + '\n\n');
  process.stdout.write('== Received bytes (hex, first 512 bytes) ==\n');
  process.stdout.write(buf.slice(0, 512).toString('hex').match(/.{1,2}/g).join(' ') + '\n');
  process.exit(0);
});
client.on('error', (err) => {
  console.error('socket error', err);
  process.exit(2);
});
