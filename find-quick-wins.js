const data = require("./feature_list.json");
const pending = data.features.filter(f => !f.passes && f.priority === "P1");
const passedIds = new Set(data.features.filter(f => f.passes).map(f => f.id));
const available = pending.filter(f => {
  const deps = f.dependencies || [];
  return deps.every(d => passedIds.has(d));
});
available.sort((a, b) => (parseInt(a.effort) || 0) - (parseInt(b.effort) || 0));
console.log("Quick wins (sorted by effort):");
available.slice(0, 15).forEach(f => {
  console.log(`  ${f.id}: ${f.name} (${f.effort})`);
});
