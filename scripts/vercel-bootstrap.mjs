import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const MIN_PASSWORD_LENGTH = 12;
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

function passwordLength(name) {
  return String(process.env[name] || '').trim().length;
}

function hasStrongPassword(name) {
  return passwordLength(name) >= MIN_PASSWORD_LENGTH;
}

const masterPasswordLength = passwordLength('AURA_MASTER_PASSWORD');
const adminPasswordLength = passwordLength('AURA_ADMIN_PASSWORD');

console.log(`Vercel preflight: masterLength=${masterPasswordLength}, adminLength=${adminPasswordLength}, databaseConfigured=${Boolean(process.env.DATABASE_URL)}`);

const report = {
  generatedAt: new Date().toISOString(),
  environment: process.env.VERCEL_ENV || 'unknown',
  branch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown',
  databaseConfigured: Boolean(process.env.DATABASE_URL),
  requiredPasswordsConfigured:
    hasStrongPassword('AURA_MASTER_PASSWORD') && hasStrongPassword('AURA_ADMIN_PASSWORD'),
  passwordLengths: {
    master: masterPasswordLength,
    admin: adminPasswordLength,
  },
  steps: [],
};

if (!report.databaseConfigured) {
  report.steps.push({
    name: 'preflight',
    ok: false,
    exitCode: 1,
    startedAt: report.generatedAt,
    finishedAt: new Date().toISOString(),
    output: 'DATABASE_URL não configurada.',
  });
} else if (!report.requiredPasswordsConfigured) {
  report.steps.push({
    name: 'preflight',
    ok: false,
    exitCode: 1,
    startedAt: report.generatedAt,
    finishedAt: new Date().toISOString(),
    output: `Senhas inválidas no Preview. Comprimentos detectados: master=${masterPasswordLength}, admin=${adminPasswordLength}. Mínimo=${MIN_PASSWORD_LENGTH}.`,
  });
} else {
  const push = run('db:push', 'npm run db:push');
  report.steps.push(push);

  if (push.ok) {
    const seed = run('db:seed', 'npm run db:seed');
    report.steps.push(seed);

    if (seed.ok) {
      report.steps.push(run('db:harden', 'npm run db:harden'));
    }
  }
}

report.ok = report.steps.length === 3 && report.steps.every((step) => step.ok);
mkdirSync('public', { recursive: true });
writeFileSync('public/bootstrap-status.json', JSON.stringify(report, null, 2));

console.log(`Vercel bootstrap diagnostic: ${report.ok ? 'SUCCESS' : 'FAILED'} (${report.steps.map((s) => `${s.name}:${s.ok ? 'ok' : 'fail'}`).join(', ')})`);

if (!report.ok) {
  process.exitCode = 1;
}
