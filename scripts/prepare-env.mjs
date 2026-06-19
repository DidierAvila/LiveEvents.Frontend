import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const environmentProdPath = resolve(
  process.cwd(),
  'src',
  'environments',
  'environment.prod.ts',
);

const isStrictProductionBuild =
  process.env['CI'] === 'true' ||
  process.env['NETLIFY'] === 'true' ||
  process.env['REQUIRE_PROD_ENV_VARS'] === 'true';
const apiBaseUrl = process.env['API_BASE_URL'] || 'https://localhost:7257/Api';
const authApiBaseUrl =
  process.env['AUTH_API_BASE_URL'] || 'https://localhost:7154';

if (isStrictProductionBuild) {
  assertRequiredEnvVar('API_BASE_URL', process.env['API_BASE_URL']);
  assertRequiredEnvVar('AUTH_API_BASE_URL', process.env['AUTH_API_BASE_URL']);
}

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

function assertRequiredEnvVar(name, value) {
  if (typeof value === 'string' && value.trim()) {
    return;
  }

  throw new Error(
    `Falta la variable de entorno requerida "${name}" para el build de produccion.`,
  );
}
