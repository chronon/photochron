import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseJsonc } from 'jsonc-parser';

interface UserConfig {
  domains?: string[];
  [key: string]: unknown;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '..', 'config', 'app.jsonc');
const config = parseJsonc(readFileSync(configPath, 'utf-8'));

const kvData = [
  {
    key: 'global',
    value: JSON.stringify(config.global)
  },
  // Generate domain:* mappings for each user's domains
  ...Object.entries(config.users).flatMap(([username, data]: [string, UserConfig]) =>
    (data.domains || []).map((domain: string) => ({
      key: `domain:${domain}`,
      value: username
    }))
  ),
  // Generate user:* config entries
  ...Object.entries(config.users).map(([username, data]) => ({
    key: `user:${username}`,
    value: JSON.stringify(data)
  }))
];

const outputPath = join(__dirname, '..', 'config', 'app.kv.json');
writeFileSync(outputPath, JSON.stringify(kvData, null, 2));

console.log(`Generated ${kvData.length} KV entries → config/app.kv.json`);
