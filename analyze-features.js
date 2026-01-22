const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./feature_list.json', 'utf8'));

console.log('=== VelloPad Feature Status ===\n');
console.log(`Total Features: ${data.totalFeatures}`);
console.log(`Completed: ${data.completedFeatures} (${((data.completedFeatures / data.totalFeatures) * 100).toFixed(1)}%)`);
console.log(`Pending: ${data.totalFeatures - data.completedFeatures}\n`);

const p1Pending = data.features.filter(f => f.priority === 'P1' && !f.passes);
console.log(`\n=== Top 10 P1 Features to Implement ===\n`);

p1Pending.slice(0, 10).forEach((f, i) => {
  console.log(`${i + 1}. [${f.id}] ${f.name}`);
  console.log(`   Priority: ${f.priority}, Phase: ${f.phase}, Effort: ${f.effort}`);
  console.log(`   Category: ${f.category}`);
  console.log(`   Description: ${f.description}`);
  if (f.files && f.files.length > 0) {
    console.log(`   Files: ${f.files[0]}${f.files.length > 1 ? ` (+${f.files.length - 1} more)` : ''}`);
  }
  console.log('');
});

// Group by phase
const byPhase = {};
data.features.forEach(f => {
  if (!f.passes) {
    if (!byPhase[f.phase]) byPhase[f.phase] = [];
    byPhase[f.phase].push(f);
  }
});

console.log('\n=== Pending Features by Phase ===\n');
Object.keys(byPhase).sort((a, b) => parseInt(a) - parseInt(b)).forEach(phase => {
  const features = byPhase[phase];
  const p0 = features.filter(f => f.priority === 'P0').length;
  const p1 = features.filter(f => f.priority === 'P1').length;
  const p2 = features.filter(f => f.priority === 'P2').length;
  console.log(`Phase ${phase}: ${features.length} pending (P0: ${p0}, P1: ${p1}, P2: ${p2})`);
});
