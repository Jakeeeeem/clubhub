const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const frontend = path.join(root, "frontend");

function read(file) {
  try {
    return fs.readFileSync(path.join(frontend, file), "utf8");
  } catch (e) {
    return null;
  }
}

const checks = [];

// Check unified-nav.js contains tournaments link for players
const navJs = read("unified-nav.js");
checks.push({
  name: "unified-nav.js exists",
  pass: !!navJs,
});
checks.push({
  name: "player tournaments link present",
  pass:
    (!!navJs && navJs.includes("tournament-manager.html")) ||
    navJs.includes("Tournaments"),
});
checks.push({
  name: "collapsible nav group code present",
  pass:
    !!navJs && navJs.includes("group-toggle") && navJs.includes("nav-group"),
});

// Check group-switcher exposes instance
const gs = read("group-switcher.js");
checks.push({
  name: "group-switcher.js exists",
  pass: !!gs,
});
checks.push({
  name: "group-switcher exposes instance",
  pass: !!gs && gs.includes("window.__groupSwitcherInstance"),
});

// Check CSS changes
const css = read("unified-nav.css");
checks.push({ name: "unified-nav.css exists", pass: !!css });
checks.push({
  name: "icons centered (28px)",
  pass: !!css && css.includes("width: 28px"),
});
checks.push({
  name: ".form-header hidden",
  pass: !!css && css.includes(".form-header") && css.includes("display: none"),
});

// Summary
let ok = true;
console.log("\nRunning static smoke checks...\n");
checks.forEach((c) => {
  const status = c.pass ? "PASS" : "FAIL";
  if (!c.pass) ok = false;
  console.log(`${status} - ${c.name}`);
});

if (!ok) {
  console.log("\nOne or more static checks failed.\n");
  process.exitCode = 2;
} else {
  console.log("\nAll static smoke checks passed.");
}
