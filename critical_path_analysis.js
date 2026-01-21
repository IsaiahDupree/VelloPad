const fs = require('fs');
const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));

// Get pending P0 features
const pendingP0 = data.features.filter(f => f.priority === 'P0' && !f.passes);

console.log('=== CRITICAL PATH ANALYSIS ===\n');
console.log(`Total Pending P0 Features: ${pendingP0.length}\n`);

// Build dependency graph
const graph = {};
pendingP0.forEach(f => {
  graph[f.id] = {
    name: f.name,
    effort: f.effort,
    dependencies: (f.dependencies || []).filter(depId => {
      const dep = data.features.find(df => df.id === depId);
      return dep && !dep.passes; // Only include unmet dependencies
    }),
    blockedBy: []
  };
});

// Find what each feature blocks
pendingP0.forEach(f => {
  (f.dependencies || []).forEach(depId => {
    if (graph[depId]) {
      graph[depId].blockedBy.push(f.id);
    }
  });
});

// Identify implementation waves
console.log('=== IMPLEMENTATION WAVES ===\n');

let wave = 1;
let remaining = [...pendingP0];

while (remaining.length > 0) {
  // Find features with no pending dependencies
  const ready = remaining.filter(f => {
    const unmetDeps = (f.dependencies || []).filter(depId => {
      const dep = data.features.find(df => df.id === depId);
      return dep && !dep.passes;
    });
    return unmetDeps.length === 0;
  });

  if (ready.length === 0) {
    console.log('⚠️  Circular dependency detected!');
    break;
  }

  console.log(`Wave ${wave}:`);
  let totalEffort = 0;
  ready.forEach(f => {
    const effort = parseInt(f.effort);
    totalEffort += effort;
    const blocks = graph[f.id] ? graph[f.id].blockedBy.length : 0;
    console.log(`  - ${f.id}: ${f.name} (${f.effort}) ${blocks > 0 ? `[blocks ${blocks} features]` : ''}`);
  });
  console.log(`  Total effort: ${totalEffort}pts\n`);

  // Mark as "done" for next wave and remove from remaining
  ready.forEach(f => {
    const feature = data.features.find(df => df.id === f.id);
    if (feature) feature.passes = true;
  });
  remaining = remaining.filter(f => !ready.find(r => r.id === f.id));
  wave++;
}

// Reset feature status
data.features.forEach(f => {
  const original = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
  const origFeature = original.features.find(of => of.id === f.id);
  if (origFeature) f.passes = origFeature.passes;
});

// Find critical path (features that block the most other features)
console.log('=== CRITICAL PATH (High Priority) ===\n');
const criticalFeatures = pendingP0
  .map(f => ({
    ...f,
    blocksCount: graph[f.id] ? graph[f.id].blockedBy.length : 0
  }))
  .sort((a, b) => b.blocksCount - a.blocksCount)
  .slice(0, 5);

criticalFeatures.forEach((f, i) => {
  console.log(`${i + 1}. ${f.id}: ${f.name} (${f.effort})`);
  console.log(`   Blocks: ${f.blocksCount} features`);
  if (graph[f.id] && graph[f.id].blockedBy.length > 0) {
    console.log(`   → ${graph[f.id].blockedBy.join(', ')}`);
  }
  console.log();
});

// Estimate time to complete
console.log('=== EFFORT ESTIMATION ===\n');
const totalEffort = pendingP0.reduce((sum, f) => sum + parseInt(f.effort), 0);
console.log(`Total Remaining P0 Effort: ${totalEffort} story points`);
console.log(`Estimated at 1 point = 1 hour: ${totalEffort} hours (~${(totalEffort/8).toFixed(1)} days)`);
console.log(`Estimated at 1 point = 30 min: ${totalEffort/2} hours (~${(totalEffort/16).toFixed(1)} days)`);
