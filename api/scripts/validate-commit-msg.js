const fs = require('fs');

// Read the commit message file
const commitMsgFile = process.argv[2];
if (!commitMsgFile) {
  console.error('Error: No commit message file specified.');
  process.exit(1);
}

const commitMsg = fs.readFileSync(commitMsgFile, 'utf8').trim();

// Regex for conventional commit format
const commitRegex = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(?:\(.+\))?: .{1,100}$/;

// Skip validation for merge commits or release commits
if (commitMsg.startsWith('Merge ') || commitMsg.startsWith('Revert ')) {
  process.exit(0);
}

if (!commitRegex.test(commitMsg)) {
  console.error('\x1b[31m%s\x1b[0m', '❌ Invalid commit message format!');
  console.error('\x1b[33m%s\x1b[0m', 'Your commit message must follow the Conventional Commits specification:');
  console.error('  <type>(<scope>): <subject>  or  <type>: <subject>');
  console.error('\nAllowed types:');
  console.error('  feat     - A new feature');
  console.error('  fix      - A bug fix');
  console.error('  docs     - Documentation changes');
  console.error('  style    - Changes that do not affect the meaning of the code (formatting, white-space, etc)');
  console.error('  refactor - A code change that neither fixes a bug nor adds a feature');
  console.error('  perf     - A code change that improves performance');
  console.error('  test     - Adding missing tests or correcting existing tests');
  console.error('  build    - Changes that affect the build system or external dependencies');
  console.error('  ci       - Changes to CI configuration files and scripts');
  console.error('  chore    - Other changes that don\'t modify src or test files');
  console.error('  revert   - Reverts a previous commit');
  console.error('\nExample:');
  console.error('  feat: add authentication page');
  console.error('  fix(auth): fix password validation regex\n');
  process.exit(1);
}

console.log('\x1b[32m%s\x1b[0m', '✔ Commit message format is valid.');
process.exit(0);
