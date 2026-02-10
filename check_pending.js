const data = require("./feature_list.json");
const pending = data.features.filter(f => !f.passes);
const passedIds = new Set(data.features.filter(f => f.passes).map(f => f.id));

console.log("=== PENDING FEATURES BY PRIORITY ===\n");

['P0', 'P1', 'P2'].forEach(priority => {
  const byPrio = pending.filter(f => f.priority === priority);
  if (byPrio.length > 0) {
    console.log(`${priority} Features (${byPrio.length}):`);
    byPrio.forEach(f => {
      const depsReady = (f.dependencies || []).every(d => passedIds.has(d));
      console.log(`  ${f.id}: ${f.name} [${f.effort || 'N/A'}] ${depsReady ? '✓' : '✗ blocked'}`);
    });
    console.log('');
  }
});

console.log('\n=== READY TO IMPLEMENT (Dependencies Met) ===\n');
const ready = pending.filter(f => {
  return (f.dependencies || []).every(d => passedIds.has(d));
});

ready.forEach(f => {
  console.log(`[${f.id}] ${f.name}`);
  console.log(`  Priority: ${f.priority || 'N/A'} | Phase: ${f.phase || 'N/A'} | Effort: ${f.effort || 'N/A'}`);
  console.log(`  ${f.description}`);
  console.log('');
});
