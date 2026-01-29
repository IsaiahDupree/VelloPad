const fs = require('fs');
const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));

console.log('=== FEATURE STATUS SUMMARY ===\n');
console.log('Total Features:', data.totalFeatures);
console.log('Completed:', data.completedFeatures);
console.log('Pending:', data.totalFeatures - data.completedFeatures);
console.log('Progress:', data.stats.percentComplete + '%\n');

// Group by priority
const byPriority = {};
data.features.forEach(f => {
  const p = f.priority || 'Unknown';
  if (!byPriority[p]) byPriority[p] = { total: 0, passing: 0, pending: 0 };
  byPriority[p].total++;
  if (f.passes) byPriority[p].passing++;
  else byPriority[p].pending++;
});

console.log('=== BY PRIORITY ===');
Object.keys(byPriority).sort().forEach(p => {
  const stats = byPriority[p];
  console.log(`${p}: ${stats.passing}/${stats.total} passing (${stats.pending} pending)`);
});

console.log('\n=== TOP P1 PENDING FEATURES ===');
const p1Pending = data.features.filter(f => !f.passes && f.priority === 'P1');
p1Pending.slice(0, 15).forEach((f, i) => {
  console.log(`${i+1}. ${f.id}: ${f.name}`);
  if (f.category) console.log(`   Category: ${f.category}`);
  if (f.dependencies && f.dependencies.length > 0) {
    console.log(`   Dependencies: ${f.dependencies.join(', ')}`);
  }
});

console.log('\n=== P2 PENDING FEATURES ===');
const p2Pending = data.features.filter(f => !f.passes && f.priority === 'P2');
console.log(`Total P2 pending: ${p2Pending.length}`);
