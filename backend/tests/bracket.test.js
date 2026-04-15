/* eslint-env jest */
const tournaments = require("../routes/tournaments");
const computeNumRounds = tournaments.computeNumRounds;

describe("computeNumRounds helper", () => {
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

  for (const [n, expected] of cases) {
    test(`computeNumRounds(${n}) => ${expected}`, () => {
      const got = computeNumRounds(n);
      expect(got).toBe(expected);
    });
  }
});
