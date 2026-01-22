#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const featureListPath = path.join(__dirname, 'feature_list.json');
const featureList = JSON.parse(fs.readFileSync(featureListPath, 'utf8'));

const p1Pending = featureList.features.filter(
  f => f.priority === 'P1' && !f.passes
);

console.log(`\nP1 Pending Features (${p1Pending.length}):\n`);

p1Pending.forEach(f => {
  console.log(`  ${f.id}: ${f.name}`);
  console.log(`    Phase: ${f.phase} | Effort: ${f.effort}`);
  console.log(`    Category: ${f.category}`);
  if (f.dependencies && f.dependencies.length > 0) {
    console.log(`    Dependencies: ${f.dependencies.join(', ')}`);
  }
  console.log();
});

console.log(`\nTotal P1 pending: ${p1Pending.length}`);
