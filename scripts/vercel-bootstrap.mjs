import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const secrets = [
  process.env.DATABASE_URL,
  process.env.JWT_SECRET,
  process.env.AURA_MASTER_PASSWORD,
  process.env.AURA_ADMIN_PASSWORD,
].filter(Boolean);

function sanitize(value = '') {
  let text = String(value);
  for (const secret of secrets) {
    text = text.split(secret).join('[REDACTED]');
  }
  text = text.replace(/postgres(?:ql)?:\/\/[^\s'\"<>]+/gi, '[REDACTED_DATABASE_URL]');
  return text.slice(-2500);
}

function run(name, command) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, {
    shell: true,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    name,
    ok: result.status === 0,
    exitCode: result.status,
    startedAt,
    finishedAt: new Date().toISOString(),
    output: sanitize(`${result.stdout || ''}\n${result.stderr || ''}`),
  };
}

const report = {
  generatedAt: new Date().toISOString(),
  environment: process.env.VERCEL_ENV || 'unknown',
  branch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown',
  databaseConfigured: Boolean(process.env.DATABASE_URL),
  requiredPasswordsConfigured: Boolean(process.env.AURA_MASTER_PASSWORD && process.env.AURA_ADMIN_PASSWORD),
  steps: [],
};

const push = run('db:push', 'npm run db:push');
report.steps.push(push);

if (push.ok) {
  const seed = run('db:seed', 'npm run db:seed');
  report.steps.push(seed);

  if (seed.ok) {
    report.steps.push(run('db:harden', 'npm run db:harden'));
  }
}

report.ok = report.steps.length === 3 && report.steps.every((step) => step.ok);
mkdirSync('public', { recursive: true });
writeFileSync('public/bootstrap-status.json', JSON.stringify(report, null, 2));

console.log(`Vercel bootstrap diagnostic: ${report.ok ? 'SUCCESS' : 'FAILED'} (${report.steps.map((s) => `${s.name}:${s.ok ? 'ok' : 'fail'}`).join(', ')})`);
