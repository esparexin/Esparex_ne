const fs = require('fs');
const { execSync } = require('child_process');

const baseline = {
  knip: JSON.parse(fs.readFileSync('.baseline/knip-baseline.json', 'utf8')),
  jscpd: JSON.parse(fs.readFileSync('.baseline/jscpd-baseline.json', 'utf8')),
};

try { execSync('npx --yes knip --reporter json > .current-knip.json'); } catch(e) {}
try { execSync('npx --yes jscpd . --min-lines 5 --min-tokens 50 --reporters json --output .current-jscpd'); } catch(e) {}
const current = {
  knip: JSON.parse(fs.readFileSync('.current-knip.json', 'utf8')),
  jscpd: JSON.parse(fs.readFileSync('.current-jscpd/jscpd-report.json', 'utf8')),
};

const countKnip = (k) => k.issues ? k.issues.reduce((acc, iss) => acc + (iss.files?.length || 0) + (iss.exports?.length || 0), 0) : ((k.files?.length || 0) + (k.exports?.length || 0));
const baseUnused = countKnip(baseline.knip);
const currUnused = countKnip(current.knip);
const baseClones = baseline.jscpd.statistics.total.clones;
const currClones = current.jscpd.statistics.total.clones;

let failed = false;
if (currUnused > baseUnused) {
  console.error(`FAIL: unused files+exports increased (${baseUnused} -> ${currUnused})`);
  failed = true;
}
if (currClones > baseClones) {
  console.error(`FAIL: duplicate clones increased (${baseClones} -> ${currClones})`);
  failed = true;
}
if (!failed) console.log(`OK: debt held or improved (unused ${currUnused}<=${baseUnused}, clones ${currClones}<=${baseClones})`);
process.exit(failed ? 1 : 0);
