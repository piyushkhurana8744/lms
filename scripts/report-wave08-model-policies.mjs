import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const modelsDir = resolve(root, 'packages/database/src/models');
const modelFiles = readdirSync(modelsDir).filter((name) => name.endsWith('.ts')).sort();
const registrations = modelFiles.flatMap((file) => {
  const source = readFileSync(resolve(modelsDir, file), 'utf8');
  const count = source.match(/plugin\(tenantIsolationPlugin\)/g)?.length || 0;
  const names = [...source.matchAll(/model(?:<[^;]+?>)?\(\s*['"]([^'"]+)['"]/gs)].map((match) => match[1]);
  return Array.from({ length: count }, (_, index) => ({ model: names[index] || names.at(-1) || `UNRESOLVED:${file}:${index + 1}`, file: `packages/database/src/models/${file}` }));
});

const registryText = readFileSync(resolve(root, 'packages/database/src/tenantModelPolicyRegistry.ts'), 'utf8');
const policies = [...registryText.matchAll(/^\s+(\w+): \{([^\n]+)\}/gm)].map((match) => {
  const body = match[2];
  const strings = (field) => [...(body.match(new RegExp(`${field}: \\[([^\\]]*)\\]`))?.[1] || '').matchAll(/'([^']+)'/g)].map((item) => item[1]);
  return { model: match[1], mode: body.match(/mode: '([^']+)'/)?.[1] || 'UNKNOWN', authorizedExceptions: strings('allowedPolicies'), operationCoverage: strings('operationCoverage'), lastTestEvidence: body.match(/lastTestEvidence: '([^']+)'/)?.[1] || 'NONE' };
});
const byModel = new Map(policies.map((policy) => [policy.model, policy]));
const modelCoverage = registrations.map((registration) => ({ ...registration, ...(byModel.get(registration.model) || { mode: 'UNCLASSIFIED', authorizedExceptions: [], operationCoverage: [], lastTestEvidence: 'NONE' }) }));
const failClosedModels = policies.filter(({ mode }) => mode === 'FAIL_CLOSED').map(({ model }) => model);
const stagedModels = policies.filter(({ mode }) => mode === 'STAGED').map(({ model }) => model);

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? (['dist', 'node_modules', '__tests__'].includes(entry.name) ? [] : files(resolve(dir, entry.name))) : entry.name.endsWith('.ts') ? [resolve(dir, entry.name)] : []);
}
const runtimeFiles = [...files(resolve(root, 'apps/api/src')), ...files(resolve(root, 'apps/worker/src'))];
const rawDriverCalls = runtimeFiles.flatMap((file) => readFileSync(file, 'utf8').split('\n').flatMap((line, index) => /\.(collection|db)\b/.test(line) ? [{ file: relative(root, file), line: index + 1, snippet: line.trim().slice(0, 180) }] : []));

const protectedBaseline = ['Course', 'NotificationIntent', 'OrganizationDomain'];
const expectedRegistrationCount = 69;
const violations = [
  ...protectedBaseline.filter((model) => !failClosedModels.includes(model)).map((model) => `Protected model ${model} is no longer FAIL_CLOSED`),
  ...(registrations.length > expectedRegistrationCount ? [`Introduced ${registrations.length - expectedRegistrationCount} tenant-plugin registration(s) without updating the reviewed baseline`] : []),
  ...(registrations.length < expectedRegistrationCount ? [`Tenant-plugin registration count regressed from ${expectedRegistrationCount} to ${registrations.length}`] : [])
];
console.log(JSON.stringify({
  generatedBy: 'scripts/report-wave08-model-policies.mjs', tenantOwnedModelRegistrations: registrations.length,
  failClosedCount: failClosedModels.length, failClosedModels, failOpenCount: registrations.length - failClosedModels.length,
  stagedCount: stagedModels.length, stagedModels, unclassifiedCount: registrations.length - failClosedModels.length - stagedModels.length,
  modelCoverage, directCollectionRawDriverInventory: rawDriverCalls,
  regressionGuard: { expectedRegistrationCount, protectedBaseline, violations }
}, null, 2));
if (process.argv.includes('--check') && violations.length) process.exitCode = 1;
