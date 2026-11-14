// Rebuild _deploy/ — the folder you upload to Cloudflare Pages.
//
// It packs the last commit, not the working tree, on purpose: the judges are
// told to check that the repository holds the work, so whatever is live should
// be something that is actually pushed. If you have edits you have not
// committed, this stops and tells you rather than quietly shipping them.

import { execFileSync } from 'node:child_process';
import { rmSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();
const force = process.argv.includes('--force');

const dirty = run('git', ['status', '--porcelain']);
if (dirty && !force) {
  console.error('\nUncommitted changes — these would NOT be in the upload:\n');
  console.error(dirty.split('\n').map(line => '  ' + line).join('\n'));
  console.error('\nCommit and push them first, then run this again.');
  console.error('(Or `npm run pack -- --force` to package the last commit anyway.)\n');
  process.exit(1);
}

const unpushed = run('git', ['log', '--oneline', '@{upstream}..HEAD']).split('\n').filter(Boolean);

rmSync('_deploy', { recursive: true, force: true });
mkdirSync('_deploy');
execFileSync('sh', ['-c', 'git archive HEAD | tar -x -C _deploy']);
for (const name of ['.github', '.wrangler', '.gitignore', 'scripts']) {
  rmSync(join('_deploy', name), { recursive: true, force: true });
}

// Nothing that holds a player token or a private key may ever go up.
const banned = [];
const walk = dir => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (/^rooms\.local|^\.env|node_modules/.test(entry)) banned.push(path);
  }
};
walk('_deploy');
if (banned.length) {
  console.error('\nRefusing to package — these must never be published:\n');
  console.error(banned.map(path => '  ' + path).join('\n') + '\n');
  process.exit(1);
}

const files = [];
const count = dir => readdirSync(dir).forEach(entry => {
  const path = join(dir, entry);
  statSync(path).isDirectory() ? count(path) : files.push(path);
});
count('_deploy');

console.log(`\n_deploy/ rebuilt — ${files.length} files from ${run('git', ['log', '-1', '--format=%h %s'])}`);
if (unpushed.length) {
  console.log(`\n⚠  ${unpushed.length} commit(s) not pushed to the team repo yet:`);
  console.log(unpushed.map(line => '   ' + line).join('\n'));
  console.log('   Run: git push origin main');
}
console.log('\nNow upload _deploy/ to Cloudflare Pages.\n');
