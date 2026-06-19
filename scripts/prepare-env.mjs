import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const environmentProdPath = resolve(
  process.cwd(),
  'src',
  'environments',
  'environment.prod.ts',
);

const apiBaseUrl = process.env['API_BASE_URL'] || 'https://localhost:7257/Api';
const authApiBaseUrl =
  process.env['AUTH_API_BASE_URL'] || 'https://localhost:7154';

const environmentProdContent = `export const environment = {
  production: true,
  apiBaseUrl: '${escapeForTs(apiBaseUrl)}',
  authApiBaseUrl: '${escapeForTs(authApiBaseUrl)}',
};
`;

await mkdir(dirname(environmentProdPath), { recursive: true });
await writeFile(environmentProdPath, environmentProdContent, 'utf8');

function escapeForTs(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
