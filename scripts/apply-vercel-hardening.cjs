const fs = require('fs');
const path = require('path');

const root = process.cwd();
const file = (p) => path.join(root, p);
const read = (p) => fs.readFileSync(file(p), 'utf8');
const write = (p, value) => fs.writeFileSync(file(p), value, 'utf8');

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Trecho nao encontrado para ${label}`);
  }
  return source.replace(before, after);
}

// 1) settings.ts: nenhuma escrita em disco durante import da Function.
{
  const p = 'src/server/settings.ts';
  let s = read(p);
  s = s.replace('import fs from "fs";\n', '');
  s = s.replace('import path from "path";\n', '');
  s = replaceOnce(
    s,
    'const uploadDir = path.join(process.cwd(), "uploads", "company");\nif (!fs.existsSync(uploadDir)) {\n  fs.mkdirSync(uploadDir, { recursive: true });\n}\n\n',
    '',
    'settings uploadDir',
  );
  write(p, s);
}

// 2) OCR: arquivo persistente no Postgres; filesystem apenas para compatibilidade legada.
{
  const p = 'src/server/purchases.ts';
  let s = read(p);
  s = replaceOnce(
    s,
    'router.post("/ocr", requirePermission("purchase", "ocr"), upload.single("file"), async (req: AuthRequest, res) => {\n  let jobId = uuidv4();\n  let uploadedFilePath: string | null = null;\n',
    'router.post("/ocr", requirePermission("purchase", "ocr"), upload.single("file"), async (req: AuthRequest, res) => {\n  const jobId = uuidv4();\n',
    'OCR job id',
  );
  s = replaceOnce(
    s,
    '     // Limit to 10 MB\n     const maxBytes = 10 * 1024 * 1024;\n     if (req.file.size > maxBytes) {\n        return res.status(400).json({ error: "O tamanho do arquivo excede o limite de 10 MB." });\n     }\n\n     const ocrUploadsDir = path.join(process.cwd(), "uploads", "ocr");\n     if (!fs.existsSync(ocrUploadsDir)) {\n        fs.mkdirSync(ocrUploadsDir, { recursive: true });\n     }\n     \n     const fileExt = req.file.originalname.split(".").pop()?.toLowerCase() || "bin";\n     const ocrFileName = `${jobId}.${fileExt}`;\n     uploadedFilePath = path.join(ocrUploadsDir, ocrFileName);\n     \n     // Write file asynchronously\n     await fs.promises.writeFile(uploadedFilePath, req.file.buffer);\n     \n     // Create pending ocr job\n',
    '     // Vercel Functions aceitam no maximo 4,5 MB por request; usamos 4 MB para\n     // rejeitar de forma previsivel antes do proxy da plataforma.\n     const maxBytes = 4 * 1024 * 1024;\n     if (req.file.size > maxBytes) {\n        return res.status(400).json({ error: "O tamanho do arquivo excede o limite de 4 MB." });\n     }\n\n     // Persistencia serverless: o arquivo fica no Postgres em data URL, nao em disco efemero.\n     // Leitura/limpeza abaixo continua aceitando caminhos /uploads/ de instalacoes antigas.\n     const persistentFilePath = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;\n\n     // Create pending ocr job\n',
    'OCR persistence',
  );
  s = replaceOnce(s, '        filePath: `/uploads/ocr/${ocrFileName}`,\n', '        filePath: persistentFilePath,\n', 'OCR filePath');
  s = replaceOnce(
    s,
    '     // Delete physical file\n     if (job.filePath) {\n        const localPath = path.join(process.cwd(), job.filePath.replace(/^\\//, ""));\n        if (fs.existsSync(localPath)) {\n           try {\n              fs.unlinkSync(localPath);\n           } catch (e: any) {\n              console.error(`Failed to delete physical file: ${localPath}`, e);\n           }\n        }\n     }\n',
    '     // Compatibilidade com OCRs antigos salvos no filesystem. Novos arquivos ficam no Postgres.\n     if (job.filePath && String(job.filePath).startsWith("/uploads/")) {\n        const localPath = path.join(process.cwd(), String(job.filePath).replace(/^\\//, ""));\n        if (fs.existsSync(localPath)) {\n           try {\n              fs.unlinkSync(localPath);\n           } catch (e: any) {\n              console.error(`Failed to delete physical file: ${localPath}`, e);\n           }\n        }\n     }\n',
    'OCR legacy delete',
  );
  s = replaceOnce(
    s,
    '    let persistentFilePath = job.filePath;\n    try {\n        const localPath = path.join(process.cwd(), String(job.filePath).replace(/^\\//, ""));\n        if (fs.existsSync(localPath) && job.fileType) {\n            const fileBuffer = await fs.promises.readFile(localPath);\n            persistentFilePath = `data:${job.fileType};base64,${fileBuffer.toString("base64")}`;\n        }\n    } catch {}\n',
    '    let persistentFilePath = job.filePath;\n    // Migra transparentemente anexos OCR legados do filesystem para o formato persistente em DB.\n    if (String(job.filePath).startsWith("/uploads/")) {\n      try {\n          const localPath = path.join(process.cwd(), String(job.filePath).replace(/^\\//, ""));\n          if (fs.existsSync(localPath) && job.fileType) {\n              const fileBuffer = await fs.promises.readFile(localPath);\n              persistentFilePath = `data:${job.fileType};base64,${fileBuffer.toString("base64")}`;\n          }\n      } catch {}\n    }\n',
    'OCR legacy attachment migration',
  );
  write(p, s);
}

// 3) Manutencao: data URLs do Postgres nao sao caminhos de arquivo.
{
  const p = 'src/server/maintenance.ts';
  let s = read(p);
  s = replaceOnce(
    s,
    '      if (job.filePath) {\n        const localPath = path.join(process.cwd(), job.filePath.replace(/^\\//, ""));\n        if (fs.existsSync(localPath)) {\n          try {\n            fs.unlinkSync(localPath);\n          } catch (e: any) {\n            console.error(`Failed to delete physical file during purge: ${localPath}`, e);\n          }\n        }\n      }\n',
    '      if (job.filePath && String(job.filePath).startsWith("/uploads/")) {\n        const localPath = path.join(process.cwd(), String(job.filePath).replace(/^\\//, ""));\n        if (fs.existsSync(localPath)) {\n          try {\n            fs.unlinkSync(localPath);\n          } catch (e: any) {\n            console.error(`Failed to delete physical file during purge: ${localPath}`, e);\n          }\n        }\n      }\n',
    'maintenance OCR cleanup',
  );
  write(p, s);
}

// 4) Backup: /tmp no Vercel, comportamento atual preservado em Render/local.
{
  const p = 'src/server/backupService.ts';
  let s = read(p);
  s = replaceOnce(
    s,
    'function backupsDir() {\n  const dir = path.join(process.cwd(), "backups");\n  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });\n  return dir;\n}\n',
    'function backupsDir() {\n  // Vercel Functions possuem filesystem efemero; /tmp e a area gravavel por invocacao.\n  // Fora do Vercel preservamos o comportamento atual para Render/local.\n  const baseDir = process.env.VERCEL ? "/tmp" : process.cwd();\n  const dir = path.join(baseDir, "backups");\n  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });\n  return dir;\n}\n',
    'backup directory',
  );
  write(p, s);
}

// 5) Conexoes Postgres conservadoras em Functions; o DATABASE_URL deve usar o endpoint pooled do Neon.
{
  const p = 'src/db/index.ts';
  let s = read(p);
  s = replaceOnce(
    s,
    'const client = postgres(connectionString, { prepare: false });',
    'const configuredMax = Number(process.env.DB_POOL_MAX || (process.env.VERCEL ? 1 : 10));\nconst maxConnections = Number.isFinite(configuredMax) && configuredMax > 0 ? Math.floor(configuredMax) : 1;\n\nconst client = postgres(connectionString, {\n  prepare: false,\n  max: maxConnections,\n  idle_timeout: 20,\n  connect_timeout: 10,\n});',
    'Postgres pool',
  );
  write(p, s);
}

// 6) Credenciais default do seed nunca ficam como credenciais finais de producao.
write('src/db/hardenProductionUsers.ts', `import bcrypt from "bcryptjs";\nimport { eq } from "drizzle-orm";\nimport { db } from "./index";\nimport { users } from "./schema";\n\nconst MIN_PASSWORD_LENGTH = 12;\n\nfunction requiredPassword(name: string) {\n  const value = String(process.env[name] || "").trim();\n  if (value.length < MIN_PASSWORD_LENGTH) {\n    throw new Error(\`${'${name}'} deve ter pelo menos ${'${MIN_PASSWORD_LENGTH}'} caracteres.\`);\n  }\n  return value;\n}\n\nasync function updatePassword(username: string, password: string) {\n  const passwordHash = await bcrypt.hash(password, 12);\n  const updated = await db\n    .update(users)\n    .set({ passwordHash, isActive: true, deletedAt: null, updatedAt: new Date() })\n    .where(eq(users.username, username))\n    .returning({ id: users.id });\n\n  if (!updated.length) {\n    throw new Error(\`Usuario ${'${username}'} nao encontrado. Execute npm run db:seed antes.\`);\n  }\n}\n\nasync function main() {\n  const masterPassword = requiredPassword("AURA_MASTER_PASSWORD");\n  const adminPassword = requiredPassword("AURA_ADMIN_PASSWORD");\n\n  await updatePassword("master", masterPassword);\n  await updatePassword("admin", adminPassword);\n\n  console.log("Credenciais iniciais de producao atualizadas com sucesso.");\n}\n\nmain()\n  .then(() => process.exit(0))\n  .catch((error) => {\n    console.error("Falha ao proteger credenciais iniciais:", error);\n    process.exit(1);\n  });\n`);

{
  const p = 'package.json';
  const pkg = JSON.parse(read(p));
  pkg.scripts['db:harden'] = 'tsx src/db/hardenProductionUsers.ts';
  write(p, JSON.stringify(pkg, null, 2) + '\n');
}

{
  const p = '.env.example';
  let s = read(p);
  const marker = '# Recuperacao emergencial do Master (temporario)\n';
  const insert = '# Provisionamento inicial de producao (obrigatorio antes de liberar acesso)\n# Use senhas fortes e remova/rotacione estes valores apos executar npm run db:harden.\nAURA_MASTER_PASSWORD=""\nAURA_ADMIN_PASSWORD=""\n\n# Pool de conexoes. Em Vercel o padrao do app e 1 conexao por instancia.\nDB_POOL_MAX=""\n\n';
  if (!s.includes('AURA_MASTER_PASSWORD=')) {
    s = replaceOnce(s, marker, insert + marker, 'env production credentials');
  }
  write(p, s);
}

// 7) Entrada Vercel documentada para Vite: uma Function fixa api/handler.ts + rewrite.
{
  const oldPath = 'api/[...path].ts';
  const newPath = 'api/handler.ts';
  let s = read(oldPath);
  s = replaceOnce(s, 'const rawPath = req.query?.path;', 'const rawPath = req.query?.__path;', 'handler path query');
  s = replaceOnce(s, 'if (key === "path" || value === undefined || value === null) continue;', 'if (key === "__path" || value === undefined || value === null) continue;', 'handler query exclusion');
  write(newPath, s);
  fs.unlinkSync(file(oldPath));
}

write('vercel.json', JSON.stringify({
  $schema: 'https://openapi.vercel.sh/vercel.json',
  buildCommand: 'npm run build:vercel',
  outputDirectory: 'dist',
  functions: {
    'api/handler.ts': { maxDuration: 60 },
  },
  rewrites: [
    { source: '/api/:path*', destination: '/api/handler?__path=:path*' },
    { source: '/(.*)', destination: '/index.html' },
  ],
}, null, 2) + '\n');

// 8) O workflow temporario volta ao formato normal no mesmo commit que leva as mudancas.
const finalWorkflow = [
  'name: Validate deployment source',
  '',
  'on:',
  '  push:',
  '    branches:',
  '      - deploy-vercel-neon-20260902',
  '',
  'permissions:',
  '  contents: write',
  '',
  'jobs:',
  '  validate:',
  "    if: ${{ !contains(github.event.head_commit.message, '[skip ci]') }}",
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - name: Checkout',
  '        uses: actions/checkout@v4',
  '        with:',
  '          fetch-depth: 0',
  '',
  '      - name: Set up Node.js',
  '        uses: actions/setup-node@v4',
  '        with:',
  "          node-version: '20'",
  '          cache: npm',
  '',
  '      - name: Install dependencies',
  '        run: npm ci',
  '',
  '      - name: TypeScript check',
  '        run: npm run lint',
  '',
  '      - name: Production build',
  '        run: npm run build',
  '',
  '      - name: Vercel frontend build',
  '        run: npm run build:vercel',
  '',
  '      - name: Set up Python',
  '        uses: actions/setup-python@v5',
  '        with:',
  "          python-version: '3.12'",
  '',
  '      - name: Install Graphify',
  '        run: pipx install graphifyy',
  '',
  '      - name: Update Graphify incrementally',
  '        run: graphify update .',
  '',
  '      - name: Commit refreshed graph to deployment branch',
  '        shell: bash',
  '        run: |',
  '          if ! git diff --quiet -- graphify-out; then',
  '            git config user.name "github-actions[bot]"',
  '            git config user.email "41898282+github-actions[bot]@users.noreply.github.com"',
  '            git add graphify-out',
  '            git commit -m "chore: refresh graphify [skip ci]"',
  '            git push origin HEAD:deploy-vercel-neon-20260902',
  '          fi',
  '',
  '      - name: Package tracked source',
  '        shell: bash',
  '        run: git archive --format=tar.gz -o /tmp/aura-source.tgz HEAD',
  '',
  '      - name: Upload source artifact',
  '        uses: actions/upload-artifact@v4',
  '        with:',
  '          name: aura-deploy-source',
  '          path: /tmp/aura-source.tgz',
  '          retention-days: 1',
  '',
].join('\n');
write('.github/workflows/package-deploy-source.yml', finalWorkflow);

// Remove este aplicador temporario do estado final do repositorio.
fs.unlinkSync(__filename);
console.log('Vercel hardening aplicado ao working tree.');
