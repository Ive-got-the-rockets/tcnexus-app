const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const models = fs.readFileSync(path.join(root, 'src/app/core/models.ts'), 'utf8');
const service = fs.readFileSync(path.join(root, 'src/app/core/courses.service.ts'), 'utf8');

assert.match(models, /live_duration\?: string \| null/);
assert.match(models, /live_start_date\?: string \| null/);
assert.match(service, /getLiveShows\(\): Observable<Course\[\]>/);
assert.match(service, /\$\{this\.baseUrl\}\/live-shows/);
assert.doesNotMatch(service, /withLocalBrianLiveMock/);
assert.match(service, /catchError\(\(\) => of\(\[\] as Course\[\]\)\)/);

console.log('live show frontend API contract is present');
