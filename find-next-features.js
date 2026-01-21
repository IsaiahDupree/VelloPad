const fs = require('fs');
const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8')).features;

// Find features that are not passing
const pending = features.filter(f => !f.passes);

// Check if dependencies are met
const canImplement = pending.filter(feature => {
  const deps = feature.dependencies || [];
  return deps.every(depId => {
    const depFeature = features.find(f => f.id === depId);
    return depFeature && depFeature.passes;
  });
});

// Sort by priority
const sorted = canImplement.sort((a, b) => {
  const priorityOrder = { P0: 0, P1: 1, P2: 2 };
  return priorityOrder[a.priority] - priorityOrder[b.priority];
});

// Show top 15
console.log('Ready to implement (dependencies met):\n');
sorted.slice(0, 15).forEach(f => {
  console.log(`${f.priority} | ${f.id.padEnd(8)} | ${f.name.padEnd(40)} | Phase ${f.phase} | ${f.effort}`);
});

console.log(`\n\nTotal pending: ${pending.length}`);
console.log(`Total ready: ${canImplement.length}`);
console.log(`P0 ready: ${canImplement.filter(f => f.priority === 'P0').length}`);
