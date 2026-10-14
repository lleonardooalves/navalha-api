import 'dotenv/config';

// Os testes e2e nunca usam o banco de desenvolvimento.
const urlTeste = process.env.DATABASE_URL_TEST;
if (!urlTeste) {
  throw new Error('Defina DATABASE_URL_TEST (veja o .env.example)');
}
process.env.DATABASE_URL = urlTeste;
