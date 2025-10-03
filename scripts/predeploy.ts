import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseJsonc(content: string): Record<string, unknown> {
  const lines = content.split('\n').filter((line) => !line.trim().startsWith('//'));
  return JSON.parse(lines.join('\n'));
}

const appConfigPath = join(__dirname, '..', 'config', 'app.json');
const wranglerTemplatePath = join(__dirname, '..', 'wrangler.jsonc.example');
const wranglerOutputPath = join(__dirname, '..', 'wrangler.jsonc');
const appConfig = JSON.parse(readFileSync(appConfigPath, 'utf-8'));
const wranglerTemplate = parseJsonc(readFileSync(wranglerTemplatePath, 'utf-8'));

const wranglerConfig = {
  ...wranglerTemplate,
  ...appConfig.wrangler
};

const routes = Object.values(appConfig.users as Record<string, { domain: string }>).flatMap(
  (user) => [
    { pattern: user.domain, custom_domain: true },
    { pattern: `admin.${user.domain}`, custom_domain: true }
  ]
);

wranglerConfig.routes = routes;

delete wranglerConfig.vars;

writeFileSync(wranglerOutputPath, JSON.stringify(wranglerConfig, null, 2));
execSync(`prettier --write ${wranglerOutputPath}`, { stdio: 'inherit' });

console.log(
  `Generated wrangler.jsonc with ${routes.length} routes for ${Object.keys(appConfig.users).length} users`
);
