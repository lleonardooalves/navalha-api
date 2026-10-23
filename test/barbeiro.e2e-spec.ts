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
  await prisma.bloqueio.deleteMany({ where });
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
  let barbeariaId: string;
  let servicoId: string;

  const http = () => request(app.getHttpServer());
  const cadastrar = (nome: string) =>
    http()
      .post('/auth/cadastro')
      .send({ slug: SLUG, nome, email: `${nome}@teste.com`, senha: SENHA });
  const entrar = (nome: string) =>
    http()
      .post('/auth/login')
      .send({ slug: SLUG, email: `${nome}@teste.com`, senha: SENHA });

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    prisma = app.get(PrismaService);
    await limpar(prisma);

    const barbearia = await prisma.barbearia.create({ data: { nome: 'Teste', slug: SLUG } });
    barbeariaId = barbearia.id;
    const servico = await prisma.servico.create({
      data: { barbeariaId: barbearia.id, nome: 'Corte', duracaoMin: 30, precoCentavos: 4500 },
    });
    servicoId = servico.id;

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
        {
          barbeariaId: barbearia.id,
          barbeiroId: barbeiro.id,
          diaSemana: 2,
          inicioMin: 540,
          fimMin: 720,
        },
        {
          barbeariaId: barbearia.id,
          barbeiroId: barbeiro.id,
          diaSemana: 2,
          inicioMin: 810,
          fimMin: 1140,
        },
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

  describe('bloqueios', () => {
    // 17:00Z às 18:00Z = 14:00 às 15:00 em São Paulo, à tarde
    const QUATORZE = `${DIA}T17:00:00.000Z`;
    const QUINZE = `${DIA}T18:00:00.000Z`;

    const bloquear = (token: string, corpo: object) =>
      http().post('/barbeiro/bloqueios').set('Authorization', `Bearer ${token}`).send(corpo);
    const desbloquear = (token: string, id: string) =>
      http().delete(`/barbeiro/bloqueios/${id}`).set('Authorization', `Bearer ${token}`);
    const livres = async () => {
      const resposta = await http().get(`/disponibilidade?data=${DIA}&servicoId=${servicoId}`);
      return resposta.body.horarios.map((h: { inicio: string }) => h.inicio);
    };

    let bloqueioId: string;

    it('o barbeiro bloqueia um horário, que some da disponibilidade', async () => {
      const resposta = await bloquear(tokenBarbeiro, {
        inicio: QUATORZE,
        fim: QUINZE,
        motivo: 'outro',
        observacao: 'Consulta médica',
      });

      expect(resposta.status).toBe(201);
      expect(resposta.body).toMatchObject({
        inicio: QUATORZE,
        fim: QUINZE,
        motivo: 'outro',
        observacao: 'Consulta médica',
      });
      bloqueioId = resposta.body.id;

      const horarios = await livres();
      expect(horarios).not.toContain(QUATORZE);
      expect(horarios).not.toContain(`${DIA}T17:30:00.000Z`);
      expect(horarios).toContain(QUINZE);

      const dia = await agenda(tokenBarbeiro);
      expect(dia.body.bloqueios).toEqual([resposta.body]);
    });

    it('recusa bloquear em cima de um agendamento ou de outro bloqueio (422)', async () => {
      // o João está marcado das 13:00Z às 13:30Z
      const sobreAgendamento = await bloquear(tokenBarbeiro, {
        inicio: `${DIA}T12:45:00.000Z`,
        fim: `${DIA}T13:15:00.000Z`,
        motivo: 'outro',
      });
      expect(sobreAgendamento.status).toBe(422);

      const sobreBloqueio = await bloquear(tokenBarbeiro, {
        inicio: `${DIA}T17:30:00.000Z`,
        fim: `${DIA}T18:30:00.000Z`,
        motivo: 'outro',
      });
      expect(sobreBloqueio.status).toBe(422);
    });

    it('recusa fim antes do início e horário que já passou (422)', async () => {
      const invertido = await bloquear(tokenBarbeiro, {
        inicio: QUINZE,
        fim: QUATORZE,
        motivo: 'outro',
      });
      expect(invertido.status).toBe(422);

      const passado = await bloquear(tokenBarbeiro, {
        inicio: '2020-01-14T17:00:00.000Z',
        fim: '2020-01-14T18:00:00.000Z',
        motivo: 'folga',
      });
      expect(passado.status).toBe(422);
    });

    it('valida o corpo (400) e barra quem não é barbeiro (403)', async () => {
      const motivoInvalido = await bloquear(tokenBarbeiro, {
        inicio: QUATORZE,
        fim: QUINZE,
        motivo: 'ferias',
      });
      expect(motivoInvalido.status).toBe(400);

      const cliente = await bloquear(tokenCliente, {
        inicio: `${DIA}T19:00:00.000Z`,
        fim: `${DIA}T20:00:00.000Z`,
        motivo: 'outro',
      });
      expect(cliente.status).toBe(403);
    });

    it('não remove o bloqueio de outro barbeiro (404)', async () => {
      const outro = await prisma.barbeiro.create({
        data: { barbeariaId, nomeExibicao: 'Outro' },
      });
      const alheio = await prisma.bloqueio.create({
        data: {
          barbeariaId,
          barbeiroId: outro.id,
          inicio: QUATORZE,
          fim: QUINZE,
          motivo: 'folga',
        },
      });

      expect((await desbloquear(tokenBarbeiro, alheio.id)).status).toBe(404);
      expect(await prisma.bloqueio.findUnique({ where: { id: alheio.id } })).not.toBeNull();
    });

    it('remover libera o horário de novo; remover outra vez responde 404', async () => {
      expect((await desbloquear(tokenBarbeiro, bloqueioId)).status).toBe(204);
      expect(await livres()).toContain(QUATORZE);

      expect((await desbloquear(tokenBarbeiro, bloqueioId)).status).toBe(404);
      expect((await desbloquear(tokenBarbeiro, 'nao-e-uuid')).status).toBe(400);
    });
  });
});
