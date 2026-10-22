import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const SLUG = 'teste-barbeiro';
// 15/01/2030 é uma terça; 13:00Z = 10:00 em São Paulo
const DIA = '2030-01-15';
const SENHA = 'senha-forte-123';

async function limpar(prisma: PrismaService) {
  const barbearia = await prisma.barbearia.findUnique({ where: { slug: SLUG } });
  if (!barbearia) return;
  const where = { barbeariaId: barbearia.id };
  await prisma.agendamento.deleteMany({ where });
  await prisma.expediente.deleteMany({ where });
  await prisma.servico.deleteMany({ where });
  await prisma.barbeiro.deleteMany({ where });
  await prisma.usuario.deleteMany({ where });
  await prisma.barbearia.delete({ where: { id: barbearia.id } });
}

describe('Barbeiro (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokenBarbeiro: string;
  let tokenCliente: string;

  const http = () => request(app.getHttpServer());
  const cadastrar = (nome: string) =>
    http()
      .post('/auth/cadastro')
      .send({ slug: SLUG, nome, email: `${nome}@teste.com`, senha: SENHA });
  const entrar = (nome: string) =>
    http().post('/auth/login').send({ slug: SLUG, email: `${nome}@teste.com`, senha: SENHA });

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    prisma = app.get(PrismaService);
    await limpar(prisma);

    const barbearia = await prisma.barbearia.create({ data: { nome: 'Teste', slug: SLUG } });
    const servico = await prisma.servico.create({
      data: { barbeariaId: barbearia.id, nome: 'Corte', duracaoMin: 30, precoCentavos: 4500 },
    });

    // o barbeiro se cadastra como cliente e o dono o promove (aqui, direto no banco)
    await cadastrar('pedro');
    const usuarioPedro = await prisma.usuario.update({
      where: { barbeariaId_email: { barbeariaId: barbearia.id, email: 'pedro@teste.com' } },
      data: { papel: 'barbeiro' },
    });
    const barbeiro = await prisma.barbeiro.create({
      data: { barbeariaId: barbearia.id, nomeExibicao: 'Pedro', usuarioId: usuarioPedro.id },
    });
    await prisma.expediente.createMany({
      data: [
        { barbeariaId: barbearia.id, barbeiroId: barbeiro.id, diaSemana: 2, inicioMin: 540, fimMin: 720 },
        { barbeariaId: barbearia.id, barbeiroId: barbeiro.id, diaSemana: 2, inicioMin: 810, fimMin: 1140 },
      ],
    });

    // o papel vai dentro do token, então só um login novo enxerga a promoção
    tokenBarbeiro = (await entrar('pedro')).body.accessToken;
    tokenCliente = (await cadastrar('joao')).body.accessToken;

    const agendado = await http()
      .post('/agendamentos')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({ servicoId: servico.id, inicio: `${DIA}T13:00:00.000Z`, observacao: 'Degradê' });
    expect(agendado.status).toBe(201);
  });

  afterAll(async () => {
    await limpar(prisma);
    await app.close();
  });

  const agenda = (token: string, data = DIA) =>
    http().get(`/barbeiro/agenda?data=${data}`).set('Authorization', `Bearer ${token}`);

  it('o barbeiro vê os turnos e os atendimentos do dia, com o nome do cliente', async () => {
    const resposta = await agenda(tokenBarbeiro);

    expect(resposta.status).toBe(200);
    expect(resposta.body.turnos).toEqual([
      { inicio: `${DIA}T12:00:00.000Z`, fim: `${DIA}T15:00:00.000Z` },
      { inicio: `${DIA}T16:30:00.000Z`, fim: `${DIA}T22:00:00.000Z` },
    ]);
    expect(resposta.body.atendimentos).toHaveLength(1);
    expect(resposta.body.atendimentos[0]).toMatchObject({
      inicio: `${DIA}T13:00:00.000Z`,
      observacao: 'Degradê',
      servico: { nome: 'Corte' },
      cliente: { nome: 'joao' },
    });
  });

  it('cliente não acessa a agenda do barbeiro (403)', async () => {
    expect((await agenda(tokenCliente)).status).toBe(403);
  });

  it('sem login responde 401, e data inválida responde 400', async () => {
    expect((await http().get(`/barbeiro/agenda?data=${DIA}`)).status).toBe(401);
    expect((await agenda(tokenBarbeiro, '15-01-2030')).status).toBe(400);
  });
});