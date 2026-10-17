import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const SLUG = 'teste-auth';
const cliente = { slug: SLUG, nome: 'Ana', email: 'ana@teste.com', senha: 'senha-forte-123' };

async function limpar(prisma: PrismaService) {
  const barbearia = await prisma.barbearia.findUnique({ where: { slug: SLUG } });
  if (!barbearia) return;
  await prisma.usuario.deleteMany({ where: { barbeariaId: barbearia.id } });
  await prisma.barbearia.delete({ where: { id: barbearia.id } });
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    prisma = app.get(PrismaService);
    await limpar(prisma);
    await prisma.barbearia.create({ data: { nome: 'Auth Teste', slug: SLUG } });
  });

  afterAll(async () => {
    await limpar(prisma);
    await app.close();
  });

  it('cadastra, faz login e acessa /me com o token', async () => {
    const cadastro = await request(app.getHttpServer()).post('/auth/cadastro').send(cliente);
    expect(cadastro.status).toBe(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ slug: SLUG, email: 'ANA@teste.com ', senha: cliente.senha });
    expect(login.status).toBe(200);

    const me = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ nome: 'Ana', email: 'ana@teste.com', papel: 'cliente' });
    expect(me.body).not.toHaveProperty('senhaHash');
  });

  it('a senha nunca é guardada em texto puro', async () => {
    const usuario = await prisma.usuario.findFirstOrThrow({ where: { email: cliente.email } });
    expect(usuario.senhaHash).not.toBe(cliente.senha);
    expect(usuario.senhaHash.startsWith('$argon2id$')).toBe(true);
  });

  it('recusa email repetido na mesma barbearia com 409', async () => {
    const resposta = await request(app.getHttpServer()).post('/auth/cadastro').send(cliente);
    expect(resposta.status).toBe(409);
  });

  it('senha errada e email inexistente dão a mesma resposta 401', async () => {
    const senhaErrada = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ slug: SLUG, email: cliente.email, senha: 'outra-senha-123' });
    const semConta = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ slug: SLUG, email: 'ninguem@teste.com', senha: 'outra-senha-123' });

    expect(senhaErrada.status).toBe(401);
    expect(semConta.status).toBe(401);
    expect(senhaErrada.body.message).toBe(semConta.body.message);
  });

  it('/me sem token ou com token falso responde 401', async () => {
    const semToken = await request(app.getHttpServer()).get('/me');
    const tokenFalso = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', 'Bearer isto.nao.vale');

    expect(semToken.status).toBe(401);
    expect(tokenFalso.status).toBe(401);
  });
});
