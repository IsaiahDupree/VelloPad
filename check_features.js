const fs = require('fs');
const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const p0Remaining = data.features.filter(f => f.priority === 'P0' && !f.passes);
console.log('=== REMAINING P0 FEATURES (' + p0Remaining.length + ') ===\n');
p0Remaining.forEach((f, i) => {
  console.log((i+1) + '. ' + f.id + ': ' + f.name + ' (' + f.effort + ')');
  console.log('   Phase: ' + f.phase + ' | Category: ' + f.category);
  const depsMet = f.dependencies.every(dep => data.features.find(x => x.id === dep)?.passes);
  const unmet = f.dependencies.filter(dep => !data.features.find(x => x.id === dep)?.passes);
  console.log('   Dependencies: ' + (depsMet ? '✅ Ready' : '❌ Blocked: ' + unmet.join(', ')));
  console.log('');
});
