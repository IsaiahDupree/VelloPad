const features = require('./feature_list.json').features;
const pending = features.filter(f => !f.passes && f.priority === 'P0');
console.log('P0 Pending Features:', pending.length);
pending.forEach(f => {
  console.log(`\n${f.id}: ${f.name}`);
  console.log(`  Phase: ${f.phase}, Effort: ${f.effort}`);
  console.log(`  Description: ${f.description}`);
  console.log(`  Dependencies: ${f.dependencies.join(', ') || 'none'}`);
});
