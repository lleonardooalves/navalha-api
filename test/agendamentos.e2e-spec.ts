import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// 15/01/2030 é uma terça; 12:00Z = 09:00 em São Paulo
const DIA = '2030-01-15';
const NOVE_HORAS = `${DIA}T12:00:00.000Z`;
const DEZ_HORAS = `${DIA}T13:00:00.000Z`;
const SLUG = 'teste-e2e';
const SLUG_OUTRA = 'teste-e2e-outra';

// apaga só o que este teste cria (filhos antes da barbearia, por causa das FKs)
async function limpar(prisma: PrismaService) {
  const barbearias = await prisma.barbearia.findMany({
    where: { slug: { in: [SLUG, SLUG_OUTRA] } },
  });
  for (const barbearia of barbearias) {
    const where = { barbeariaId: barbearia.id };
    await prisma.agendamento.deleteMany({ where });
    await prisma.expediente.deleteMany({ where });
    await prisma.servico.deleteMany({ where });
    await prisma.barbeiro.deleteMany({ where });
    await prisma.usuario.deleteMany({ where });
    await prisma.barbearia.delete({ where: { id: barbearia.id } });
  }
}

describe('Agendamentos (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let servicoId: string;
  let servicoOutraBarbeariaId: string;
  let barbeiroId: string;

  // cadastra um cliente novo e devolve o access token dele
  async function novoCliente(nome: string): Promise<string> {
    const resposta = await request(app.getHttpServer())
      .post('/auth/cadastro')
      .send({ slug: SLUG, nome, email: `${nome}@teste.com`, senha: 'senha-forte-123' });
    return resposta.body.accessToken;
  }

  const agendar = (token: string, corpo: object) =>
    request(app.getHttpServer())
      .post('/agendamentos')
      .set('Authorization', `Bearer ${token}`)
      .send(corpo);

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

    const outra = await prisma.barbearia.create({ data: { nome: 'Outra', slug: SLUG_OUTRA } });
    const servicoOutra = await prisma.servico.create({
      data: { barbeariaId: outra.id, nome: 'Corte', duracaoMin: 30, precoCentavos: 4000 },
    });

    servicoId = servico.id;
    servicoOutraBarbeariaId = servicoOutra.id;
    barbeiroId = barbeiro.id;
  });

  afterAll(async () => {
    await limpar(prisma);
    await app.close();
  });

  it('só 1 de 10 clientes simultâneos consegue o mesmo horário', async () => {
    const tokens = await Promise.all(Array.from({ length: 10 }, (_, i) => novoCliente(`c${i}`)));

    const respostas = await Promise.all(
      tokens.map((token) => agendar(token, { servicoId, barbeiroId, inicio: NOVE_HORAS })),
    );
    const status = respostas.map((r) => r.status);

    expect(status.filter((s) => s === 201)).toHaveLength(1);
    // as outras perdem a corrida: 409 (barradas pelo banco) ou 422 (já viram ocupado)
    expect(status.filter((s) => s !== 201).every((s) => s === 409 || s === 422)).toBe(true);

    const gravados = await prisma.agendamento.count({
      where: { barbeiroId, inicio: new Date(NOVE_HORAS) },
    });
    expect(gravados).toBe(1);
  });

  it('exige login', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/agendamentos')
      .send({ servicoId, inicio: DEZ_HORAS });
    expect(resposta.status).toBe(401);
  });

  it('não agenda serviço de outra barbearia', async () => {
    const token = await novoCliente('intruso');
    const resposta = await agendar(token, {
      servicoId: servicoOutraBarbeariaId,
      inicio: DEZ_HORAS,
    });
    expect(resposta.status).toBe(404);
  });

  it('recusa horário fora da grade com 422', async () => {
    const token = await novoCliente('ana');
    const resposta = await agendar(token, {
      servicoId,
      barbeiroId,
      inicio: `${DIA}T12:07:00.000Z`,
    });
    expect(resposta.status).toBe(422);
  });

  it('o agendamento aparece em /me/agendamentos só para quem agendou', async () => {
    const tokenBia = await novoCliente('bia');
    const tokenCaio = await novoCliente('caio');

    const criado = await agendar(tokenBia, {
      servicoId,
      inicio: DEZ_HORAS,
      observacao: 'Degradê baixo',
    });
    expect(criado.status).toBe(201);
    expect(criado.body).toMatchObject({
      servico: { nome: 'Corte' },
      barbeiro: { nomeExibicao: 'Zé' },
      precoCobradoCentavos: 4500,
    });
    expect(criado.body).not.toHaveProperty('barbeariaId');

    const daBia = await request(app.getHttpServer())
      .get('/me/agendamentos')
      .set('Authorization', `Bearer ${tokenBia}`);
    expect(daBia.status).toBe(200);
    expect(daBia.body.map((a: { id: string }) => a.id)).toEqual([criado.body.id]);

    const doCaio = await request(app.getHttpServer())
      .get('/me/agendamentos')
      .set('Authorization', `Bearer ${tokenCaio}`);
    expect(doCaio.body).toEqual([]);

    const passadosDaBia = await request(app.getHttpServer())
      .get('/me/agendamentos?periodo=passados')
      .set('Authorization', `Bearer ${tokenBia}`);
    expect(passadosDaBia.body).toEqual([]);
  });

  describe('cancelamento', () => {
    const cancelar = (token: string, id: string) =>
      request(app.getHttpServer())
        .post(`/agendamentos/${id}/cancelar`)
        .set('Authorization', `Bearer ${token}`);

    it('o cliente cancela o próprio agendamento e o horário volta a ficar livre', async () => {
      const tokenDani = await novoCliente('dani');
      const criado = await agendar(tokenDani, { servicoId, inicio: `${DIA}T13:30:00.000Z` });
      expect(criado.status).toBe(201);

      const cancelado = await cancelar(tokenDani, criado.body.id);
      expect(cancelado.status).toBe(200);
      expect(cancelado.body.status).toBe('cancelado');

      const proximos = await request(app.getHttpServer())
        .get('/me/agendamentos')
        .set('Authorization', `Bearer ${tokenDani}`);
      expect(proximos.body).toEqual([]);

      // a sem_conflito só olha agendamentos ativos, então outro cliente pode pegar o horário
      const tokenEdu = await novoCliente('edu');
      const deNovo = await agendar(tokenEdu, { servicoId, inicio: `${DIA}T13:30:00.000Z` });
      expect(deNovo.status).toBe(201);
    });

    it('outro cliente não cancela, e ninguém cancela duas vezes', async () => {
      const tokenFabio = await novoCliente('fabio');
      const tokenGabi = await novoCliente('gabi');
      const criado = await agendar(tokenFabio, { servicoId, inicio: `${DIA}T14:00:00.000Z` });

      const daGabi = await cancelar(tokenGabi, criado.body.id);
      expect(daGabi.status).toBe(404);

      expect((await cancelar(tokenFabio, criado.body.id)).status).toBe(200);
      expect((await cancelar(tokenFabio, criado.body.id)).status).toBe(422);
    });

    it('fora do prazo de cancelamento responde 422', async () => {
      const tokenHeitor = await novoCliente('heitor');
      const criado = await agendar(tokenHeitor, { servicoId, inicio: `${DIA}T14:30:00.000Z` });

      // prazo de 10 anos: o horário de 2030 já está "dentro do prazo"
      await prisma.barbearia.update({
        where: { slug: SLUG },
        data: { prazoCancelamentoMin: 10 * 365 * 24 * 60 },
      });
      const resposta = await cancelar(tokenHeitor, criado.body.id);
      await prisma.barbearia.update({ where: { slug: SLUG }, data: { prazoCancelamentoMin: 120 } });

      expect(resposta.status).toBe(422);
    });

    it('id que não é UUID responde 400', async () => {
      const token = await novoCliente('ivo');
      expect((await cancelar(token, 'abc')).status).toBe(400);
    });
  });
});
