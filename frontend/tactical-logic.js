/**
 * Tactical Logic for Lineup Planner
 */

const FORMATIONS = {
  "4-4-2": [
    { role: "GK", x: 50, y: 92 },
    { role: "LB", x: 15, y: 75 },
    { role: "CB", x: 38, y: 75 },
    { role: "CB", x: 62, y: 75 },
    { role: "RB", x: 85, y: 75 },
    { role: "LM", x: 15, y: 45 },
    { role: "CM", x: 40, y: 45 },
    { role: "CM", x: 60, y: 45 },
    { role: "RM", x: 85, y: 45 },
    { role: "ST", x: 40, y: 20 },
    { role: "ST", x: 60, y: 20 },
  ],
  "4-3-3": [
    { role: "GK", x: 50, y: 92 },
    { role: "LB", x: 15, y: 75 },
    { role: "CB", x: 38, y: 75 },
    { role: "CB", x: 62, y: 75 },
    { role: "RB", x: 85, y: 75 },
    { role: "CM", x: 30, y: 45 },
    { role: "CDM", x: 50, y: 55 },
    { role: "CM", x: 70, y: 45 },
    { role: "LW", x: 20, y: 20 },
    { role: "ST", x: 50, y: 15 },
    { role: "RW", x: 80, y: 20 },
  ],
  "3-5-2": [
    { role: "GK", x: 50, y: 92 },
    { role: "CB", x: 25, y: 75 },
    { role: "CB", x: 50, y: 75 },
    { role: "CB", x: 75, y: 75 },
    { role: "LWB", x: 10, y: 45 },
    { role: "CM", x: 35, y: 45 },
    { role: "CDM", x: 50, y: 55 },
    { role: "CM", x: 65, y: 45 },
    { role: "RWB", x: 90, y: 45 },
    { role: "ST", x: 40, y: 20 },
    { role: "ST", x: 60, y: 20 },
  ],
  "4-2-3-1": [
    { role: "GK", x: 50, y: 92 },
    { role: "LB", x: 15, y: 75 },
    { role: "CB", x: 38, y: 75 },
    { role: "CB", x: 62, y: 75 },
    { role: "RB", x: 85, y: 75 },
    { role: "CDM", x: 40, y: 55 },
    { role: "CDM", x: 60, y: 55 },
    { role: "LW", x: 15, y: 30 },
    { role: "CAM", x: 50, y: 30 },
    { role: "RW", x: 85, y: 30 },
    { role: "ST", x: 50, y: 12 },
  ],
  "5-3-2": [
    { role: "GK", x: 50, y: 92 },
    { role: "LWB", x: 12, y: 65 },
    { role: "CB", x: 32, y: 75 },
    { role: "CB", x: 50, y: 75 },
    { role: "CB", x: 68, y: 75 },
    { role: "RWB", x: 88, y: 65 },
    { role: "CM", x: 30, y: 45 },
    { role: "CDM", x: 50, y: 50 },
    { role: "CM", x: 70, y: 45 },
    { role: "ST", x: 40, y: 18 },
    { role: "ST", x: 60, y: 18 },
  ],
};

/**
 * Normalizes coordinates to ensure they stay within field bounds
 */
function normalizeCoordinate(val, min = 5, max = 95) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Gets the relative positions for a given formation
 */
function getFormationPositions(formationName) {
  return FORMATIONS[formationName] || FORMATIONS["4-4-2"];
}

/**
 * Calculates a snap-to-grid coordinate
 */
function snapToGrid(val, step = 5) {
  return Math.round(val / step) * step;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    FORMATIONS,
    normalizeCoordinate,
    getFormationPositions,
    snapToGrid,
  };
} else {
  window.TacticalLogic = {
    FORMATIONS,
    normalizeCoordinate,
    getFormationPositions,
    snapToGrid,
  };
}
