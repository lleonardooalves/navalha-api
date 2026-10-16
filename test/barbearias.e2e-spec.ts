import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const SLUG = 'teste-catalogo';

async function limpar(prisma: PrismaService) {
  const barbearia = await prisma.barbearia.findUnique({ where: { slug: SLUG } });
  if (!barbearia) return;
  const where = { barbeariaId: barbearia.id };
  await prisma.servico.deleteMany({ where });
  await prisma.barbeiro.deleteMany({ where });
  await prisma.barbearia.delete({ where: { id: barbearia.id } });
}

describe('GET /barbearias/:slug (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    await limpar(prisma);

    const barbearia = await prisma.barbearia.create({
      data: { nome: 'Catálogo Teste', slug: SLUG },
    });
    await prisma.servico.createMany({
      data: [
        { barbeariaId: barbearia.id, nome: 'Corte', duracaoMin: 30, precoCentavos: 4500 },
        { barbeariaId: barbearia.id, nome: 'Barba', duracaoMin: 20, precoCentavos: 3000 },
        {
          barbeariaId: barbearia.id,
          nome: 'Antigo',
          duracaoMin: 10,
          precoCentavos: 1000,
          ativo: false,
        },
      ],
    });
    await prisma.barbeiro.createMany({
      data: [
        { barbeariaId: barbearia.id, nomeExibicao: 'Zé' },
        { barbeariaId: barbearia.id, nomeExibicao: 'Saiu', ativo: false },
      ],
    });
  });

  afterAll(async () => {
    await limpar(prisma);
    await app.close();
  });

  it('devolve só serviços e barbeiros ativos, sem campos internos', async () => {
    const resposta = await request(app.getHttpServer()).get(`/barbearias/${SLUG}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.servicos.map((s: { nome: string }) => s.nome)).toEqual(['Barba', 'Corte']);
    expect(resposta.body.barbeiros.map((b: { nomeExibicao: string }) => b.nomeExibicao)).toEqual([
      'Zé',
    ]);
    expect(resposta.body.servicos[0]).not.toHaveProperty('ativo');
    expect(resposta.body).not.toHaveProperty('antecedenciaMinimaMin');
  });

  it('responde 404 para slug inexistente', async () => {
    const resposta = await request(app.getHttpServer()).get('/barbearias/nao-existe');
    expect(resposta.status).toBe(404);
  });
});
