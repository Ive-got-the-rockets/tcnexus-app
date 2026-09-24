const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const restApi = fs.readFileSync(
  path.join(__dirname, '..', 'includes', 'class-tcnexus-rest-api.php'),
  'utf8'
);
const mockApi = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'frontend', 'mock-api', 'server.js'),
  'utf8'
);

assert.match(restApi, /'trailer_link'\s*=>\s*\$primary\['trailer_link'\]\s*\?:\s*null/);
assert.match(mockApi, /trailer_link:/);
