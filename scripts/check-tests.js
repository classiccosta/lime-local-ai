// Fails CI when tests go missing or are switched off. It reads Vitest's report, not
// the source, so skipIf and ctx.skip() count too. `.only` is refused by Vitest itself
// (allowOnly in vite.config.js).
import { readFileSync } from 'node:fs';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const report = read(process.argv[2]);
// Never rewritten by a script: raising or lowering it has to show up in a diff.
const baseline = read(new URL('../test-baseline.json', import.meta.url));

const found = { files: report.testResults.length, tests: report.numPassedTests };
const errors = Object.keys(found)
  .filter((key) => !(found[key] >= baseline[key]))
  .map((key) => `Test ${key}: ${found[key]}, below the baseline of ${baseline[key]}.`);

const off = report.numPendingTests + report.numTodoTests;
if (off > 0) errors.push(`${off} test(s) skipped or todo.`);

for (const error of errors) console.error(error);
if (errors.length > 0) process.exit(1);
console.log(`Test guard passed: ${found.files} files, ${found.tests} tests.`);
