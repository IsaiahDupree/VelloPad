const fs = require('fs');
const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));

// Count features by status
const total = data.features.length;
const completed = data.features.filter(f => f.passes).length;
const pending = total - completed;

// Count by priority
const p0Total = data.features.filter(f => f.priority === 'P0').length;
const p0Completed = data.features.filter(f => f.priority === 'P0' && f.passes).length;
const p0Pending = p0Total - p0Completed;

const p1Total = data.features.filter(f => f.priority === 'P1').length;
const p1Completed = data.features.filter(f => f.priority === 'P1' && f.passes).length;
const p1Pending = p1Total - p1Completed;

const p2Total = data.features.filter(f => f.priority === 'P2').length;
const p2Completed = data.features.filter(f => f.priority === 'P2' && f.passes).length;
const p2Pending = p2Total - p2Completed;

console.log('=== VelloPad Project Status ===\n');
console.log('Overall Progress:');
console.log(`Total Features: ${total}`);
console.log(`Completed: ${completed} (${(completed/total*100).toFixed(1)}%)`);
console.log(`Pending: ${pending}\n`);

console.log('By Priority:');
console.log(`P0 (Critical): ${p0Completed}/${p0Total} (${(p0Completed/p0Total*100).toFixed(1)}%)`);
console.log(`P1 (Important): ${p1Completed}/${p1Total} (${(p1Completed/p1Total*100).toFixed(1)}%)`);
console.log(`P2 (Nice-to-Have): ${p2Completed}/${p2Total} (${(p2Completed/p2Total*100).toFixed(1)}%)\n`);

// Find pending P0 features
const pendingP0 = data.features.filter(f => f.priority === 'P0' && !f.passes);
console.log('Pending P0 Features:');
pendingP0.forEach(f => {
  console.log(`  - ${f.id}: ${f.name} (${f.effort})`);
  if (f.dependencies && f.dependencies.length > 0) {
    console.log(`    Dependencies: ${f.dependencies.join(', ')}`);
  }
});

console.log('\n=== Phase Breakdown ===\n');
for (let phase = 1; phase <= 14; phase++) {
  const phaseFeatures = data.features.filter(f => f.phase === phase);
  const phaseCompleted = phaseFeatures.filter(f => f.passes).length;
  if (phaseFeatures.length > 0) {
    const pct = (phaseCompleted/phaseFeatures.length*100).toFixed(0);
    const status = pct === '100' ? '✅' : pct >= '50' ? '🔄' : '⏳';
    console.log(`${status} Phase ${phase}: ${phaseCompleted}/${phaseFeatures.length} (${pct}%)`);
  }
}

// Identify ready-to-implement features
console.log('\n=== Ready to Implement (No Pending Dependencies) ===\n');
const readyFeatures = data.features.filter(f => {
  if (f.passes) return false; // Already done
  if (!f.dependencies || f.dependencies.length === 0) return true;

  // Check if all dependencies are satisfied
  const allDepsMet = f.dependencies.every(depId => {
    const dep = data.features.find(df => df.id === depId);
    return dep && dep.passes;
  });
  return allDepsMet;
});

const readyP0 = readyFeatures.filter(f => f.priority === 'P0');
const readyP1 = readyFeatures.filter(f => f.priority === 'P1');

console.log('P0 Features Ready:');
readyP0.slice(0, 5).forEach(f => {
  console.log(`  - ${f.id}: ${f.name} (${f.effort})`);
});

console.log('\nP1 Features Ready (top 10):');
readyP1.slice(0, 10).forEach(f => {
  console.log(`  - ${f.id}: ${f.name} (${f.effort})`);
});
