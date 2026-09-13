const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const layoutSource = fs.readFileSync(path.join(__dirname, 'layout-style-3.ts'), 'utf8');
const modelsSource = fs.readFileSync(path.join(__dirname, '../../core/models.ts'), 'utf8');

assert.match(layoutSource, /course\.landing_background/);
assert.match(modelsSource, /landing_background\?: string \| null/);

console.log('featured background contract passes');
