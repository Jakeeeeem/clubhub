// Lightweight helper utilities for tournaments used by unit tests
function computeNumRounds(numTeams) {
  const n = Math.max(2, Number(numTeams) || 2);
  return Math.ceil(Math.log2(n));
}

module.exports = { computeNumRounds };
