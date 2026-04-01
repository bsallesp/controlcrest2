/**
 * Integração local → API Azure → ACS envia e-mail de verdade.
 * Não usa browser (sem CORS). Mesmo payload que o formulário (app.component.ts onSubmit).
 *
 * URL: CONTACT_API_URL ou contactApiUrl em src/environments/environment.development.ts
 *
 * Uso: npm run test:integration
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveContactUrl() {
  const fromEnv = process.env.CONTACT_API_URL?.trim();
  if (fromEnv) return fromEnv;

  const envFile = path.join(__dirname, '../src/environments/environment.development.ts');
  const src = fs.readFileSync(envFile, 'utf8');
  const m = src.match(/contactApiUrl:\s*['"]([^'"]+)['"]/);
  const url = m?.[1]?.trim() ?? '';
  return url;
}

const url = resolveContactUrl();

if (!url || url.includes('PLACEHOLDER')) {
  console.error(
    'Defina CONTACT_API_URL ou edite contactApiUrl em environment.development.ts (URL real da Function).'
  );
  process.exit(1);
}

const payload = {
  name: 'Teste integração local (npm run test:integration)',
  phone: '(555) 987-6543',
  address: '100 Integration Ln, Fort Lauderdale, FL 33301',
  message: 'Disparo automático local → Azure Function → ACS. Pode apagar.'
};

console.log('POST', url);

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify(payload)
});

const text = await res.text();
let body;
try {
  body = text ? JSON.parse(text) : {};
} catch {
  body = { raw: text };
}

if (!res.ok) {
  console.error('Falhou:', res.status, res.statusText, body);
  process.exit(1);
}

if (!body.ok) {
  console.error('Resposta HTTP OK mas ok !== true:', body);
  process.exit(1);
}

console.log('OK — e-mail deve ter sido enfileirado/enviado pela Function (ACS).', body);
