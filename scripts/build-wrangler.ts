import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { parse as parseJsonc } from 'jsonc-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));

const appConfigPath = join(__dirname, '..', 'config', 'app.jsonc');
const wranglerTemplatePath = join(__dirname, '..', 'wrangler.jsonc.example');
const wranglerOutputPath = join(__dirname, '..', 'wrangler.jsonc');
const appConfig = parseJsonc(readFileSync(appConfigPath, 'utf-8'));
const wranglerTemplate = parseJsonc(readFileSync(wranglerTemplatePath, 'utf-8')) as Record<
  string,
  unknown
>;

const routes = Object.values(appConfig.users as Record<string, { domains: string[] }>).flatMap(
  (user) =>
    (user.domains || []).map((domain) => ({
      pattern: domain,
      custom_domain: true
    }))
);

const wranglerConfig = {
  ...wranglerTemplate,
  ...appConfig.wrangler,
  routes
};

writeFileSync(wranglerOutputPath, JSON.stringify(wranglerConfig, null, 2));
execSync(`prettier --write ${wranglerOutputPath}`, { stdio: 'inherit' });

console.log(
  `Generated wrangler.jsonc with ${routes.length} routes for ${Object.keys(appConfig.users).length} users`
);
