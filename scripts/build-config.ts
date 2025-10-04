import { execSync } from 'child_process';

console.log('Building configuration files...');
execSync('tsx scripts/build-wrangler.ts', { stdio: 'inherit' });
execSync('tsx scripts/build-kv.ts', { stdio: 'inherit' });
console.log('Configuration files built successfully');
