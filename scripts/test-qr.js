const crypto = require("crypto");

function createToken(eventId, secret, ttlMs = 15 * 60 * 1000) {
  const payload = { eid: eventId, iat: Date.now(), exp: Date.now() + ttlMs };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64");
  return `${payloadB64}.${sig}`;
}

function verifyToken(token, secret) {
  const parts = String(token).split(".");
  if (parts.length !== 2) return { ok: false, reason: "format" };
  const [payloadB64, sig] = parts;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64");
  if (sig !== expected) return { ok: false, reason: "signature" };
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf8"));
  } catch (e) {
    return { ok: false, reason: "payload" };
  }
  if (payload.exp && Date.now() > payload.exp)
    return { ok: false, reason: "expired" };
  return { ok: true, payload };
}

// Demo run
const secret = process.env.QR_TOKEN_SECRET || "dev_secret_change_me";
const eventId = "00000000-0000-0000-0000-000000000001";
console.log(
  "Secret used:",
  secret === "dev_secret_change_me" ? "(default dev secret)" : "(env secret)",
);
const token = createToken(eventId, secret, 2000); // 2s ttl for quick expiry test
console.log("Token:", token);
console.log("Verify immediately:", verifyToken(token, secret));

setTimeout(() => {
  console.log("\nAfter 3 seconds (should be expired):");
  console.log(verifyToken(token, secret));
}, 3000);
