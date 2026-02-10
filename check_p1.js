const data = require("./feature_list.json");
const p1Pending = data.features.filter(f => !f.passes && f.priority === "P1");
const passedIds = new Set(data.features.filter(f => f.passes).map(f => f.id));

console.log("P1 Features NOT Passing:\n");
p1Pending.forEach(f => {
  const depsReady = (f.dependencies || []).every(d => passedIds.has(d));
  console.log(`${f.id}: ${f.name}`);
  console.log(`  Effort: ${f.effort}`);
  console.log(`  Dependencies: ${(f.dependencies || []).join(', ') || 'None'}`);
  console.log(`  Ready: ${depsReady ? 'YES ✓' : 'NO (waiting on deps)'}`);
  if (!depsReady) {
    const missing = (f.dependencies || []).filter(d => !passedIds.has(d));
    console.log(`  Missing: ${missing.join(', ')}`);
  }
  console.log('');
});
