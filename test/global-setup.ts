import { execSync } from 'node:child_process';
import './setup-env';

// Roda uma vez antes de todos os testes e2e: deixa o banco de teste
// com todas as migrations aplicadas (não apaga dados).
export default function globalSetup() {
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}
