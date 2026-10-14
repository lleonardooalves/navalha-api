import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// 15/01/2030 é uma terça; 12:00Z = 09:00 em São Paulo
const DIA = '2030-01-15';
const NOVE_HORAS = `${DIA}T12:00:00.000Z`;
const SLUG = 'teste-e2e';

// apaga só o que este teste cria (filhos antes da barbearia, por causa das FKs)
async function limpar(prisma: PrismaService) {
  const barbearia = await prisma.barbearia.findUnique({ where: { slug: SLUG } });
  if (!barbearia) return;
  const where = { barbeariaId: barbearia.id };
  await prisma.agendamento.deleteMany({ where });
  await prisma.expediente.deleteMany({ where });
  await prisma.servico.deleteMany({ where });
  await prisma.barbeiro.deleteMany({ where });
  await prisma.barbearia.delete({ where: { id: barbearia.id } });
}

describe('POST /agendamentos (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let servicoId: string;
  let barbeiroId: string;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    prisma = app.get(PrismaService);
    await limpar(prisma); // sobra de uma execução que quebrou no meio

    const barbearia = await prisma.barbearia.create({
      data: { nome: 'Barbearia Teste', slug: SLUG },
    });
    const barbeiro = await prisma.barbeiro.create({
      data: { barbeariaId: barbearia.id, nomeExibicao: 'Zé' },
    });
    const servico = await prisma.servico.create({
      data: { barbeariaId: barbearia.id, nome: 'Corte', duracaoMin: 30, precoCentavos: 4500 },
    });
    await prisma.expediente.create({
      data: {
        barbeariaId: barbearia.id,
        barbeiroId: barbeiro.id,
        diaSemana: 2, // terça
        inicioMin: 9 * 60,
        fimMin: 12 * 60,
      },
    });

    servicoId = servico.id;
    barbeiroId = barbeiro.id;
  });

  afterAll(async () => {
    await limpar(prisma);
    await app.close();
  });

  it('só 1 de 10 requisições simultâneas consegue o mesmo horário', async () => {
    const tentativas = Array.from({ length: 10 }, (_, i) =>
      request(app.getHttpServer())
        .post('/agendamentos')
        .send({ servicoId, barbeiroId, inicio: NOVE_HORAS, nomeCliente: `Cliente ${i}` }),
    );

    const respostas = await Promise.all(tentativas);
    const status = respostas.map((r) => r.status);

    expect(status.filter((s) => s === 201)).toHaveLength(1);
    // as outras perdem a corrida: 409 (barradas pelo banco) ou 422 (já viram ocupado)
    expect(status.filter((s) => s !== 201).every((s) => s === 409 || s === 422)).toBe(true);

    const gravados = await prisma.agendamento.count({
      where: { barbeiroId, inicio: new Date(NOVE_HORAS) },
    });
    expect(gravados).toBe(1);
  });

  it('recusa horário fora da grade com 422', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/agendamentos')
      .send({ servicoId, barbeiroId, inicio: `${DIA}T12:07:00.000Z`, nomeCliente: 'Ana' });

    expect(resposta.status).toBe(422);
  });
});
