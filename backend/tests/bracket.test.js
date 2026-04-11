const tournaments = require("../routes/tournaments");
const computeNumRounds = tournaments.computeNumRounds;

const cases = [
  [2, 1],
  [3, 2],
  [4, 2],
  [5, 3],
  [6, 3],
  [7, 3],
  [8, 3],
  [9, 4],
  [16, 4],
];

let ok = true;
for (const [n, expected] of cases) {
  const got = computeNumRounds(n);
  if (got !== expected) {
    console.error(
      `FAIL: computeNumRounds(${n}) => ${got}, expected ${expected}`,
    );
    ok = false;
  } else {
    console.log(`OK: computeNumRounds(${n}) => ${got}`);
  }
}

if (!ok) {
  console.error("One or more bracket helper tests failed");
  process.exit(1);
}
console.log("All bracket helper tests passed");
process.exit(0);
