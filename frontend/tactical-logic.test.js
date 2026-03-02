const TacticalLogic = require("./tactical-logic");

describe("TacticalLogic", () => {
  test("getFormationPositions returns correct number of players (11)", () => {
    const positions = TacticalLogic.getFormationPositions("4-4-2");
    expect(positions.length).toBe(11);
  });

  test("getFormationPositions defaults to 4-4-2 for unknown formation", () => {
    const positions = TacticalLogic.getFormationPositions("invalid");
    expect(positions).toEqual(TacticalLogic.FORMATIONS["4-4-2"]);
  });

  test("normalizeCoordinate keeps value within bounds", () => {
    expect(TacticalLogic.normalizeCoordinate(-10)).toBe(5);
    expect(TacticalLogic.normalizeCoordinate(110)).toBe(95);
    expect(TacticalLogic.normalizeCoordinate(50)).toBe(50);
  });

  test("snapToGrid rounds to nearest step", () => {
    expect(TacticalLogic.snapToGrid(12, 5)).toBe(10);
    expect(TacticalLogic.snapToGrid(14, 5)).toBe(15);
    expect(TacticalLogic.snapToGrid(48, 10)).toBe(50);
  });

  test("Formations have valid coordinates (0-100)", () => {
    Object.values(TacticalLogic.FORMATIONS).forEach((formation) => {
      formation.forEach((pos) => {
        expect(pos.x).toBeGreaterThanOrEqual(0);
        expect(pos.x).toBeLessThanOrEqual(100);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeLessThanOrEqual(100);
      });
    });
  });
});
