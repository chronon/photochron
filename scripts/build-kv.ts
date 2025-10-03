import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '..', 'config', 'app.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

const kvData = [
  {
    key: 'global',
    value: JSON.stringify(config.global)
  },
  ...Object.entries(config.users).map(([username, data]) => ({
    key: `user:${username}`,
    value: JSON.stringify(data)
  }))
];

const outputPath = join(__dirname, '..', 'config', 'app.kv.json');
writeFileSync(outputPath, JSON.stringify(kvData, null, 2));

console.log(`Generated ${kvData.length} KV entries → config/app.kv.json`);
