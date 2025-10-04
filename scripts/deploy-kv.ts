import { execSync } from 'child_process';

const kvFile = 'config/app.kv.json';
const binding = 'CHRONONAGRAM';

console.log('Uploading KV data to local and remote...');
execSync(`wrangler kv bulk put --binding=${binding} --local ${kvFile}`, { stdio: 'inherit' });
execSync(`wrangler kv bulk put --binding=${binding} --remote ${kvFile}`, { stdio: 'inherit' });
console.log('KV data uploaded successfully');
