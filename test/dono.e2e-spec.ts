import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const SLUG = 'teste-dono';
const SLUG_OUTRA = 'teste-dono-outra';
// 15/01/2030 é uma terça; 13:00Z = 10:00 em São Paulo
const DIA = '2030-01-15';
const SENHA = 'senha-forte-123';

// apaga só o que este teste cria (filhos antes da barbearia, por causa das FKs)
async function limpar(prisma: PrismaService) {
  const barbearias = await prisma.barbearia.findMany({
    where: { slug: { in: [SLUG, SLUG_OUTRA] } },
  });
  for (const barbearia of barbearias) {
    const where = { barbeariaId: barbearia.id };
    await prisma.agendamento.deleteMany({ where });
    await prisma.bloqueio.deleteMany({ where });
    await prisma.expediente.deleteMany({ where });
    await prisma.servico.deleteMany({ where });
    await prisma.barbeiro.deleteMany({ where });
    await prisma.usuario.deleteMany({ where });
    await prisma.barbearia.delete({ where: { id: barbearia.id } });
  }
}

describe('Dono (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokenDono: string;
  let tokenBarbeiro: string;

  const http = () => request(app.getHttpServer());
  const cadastrar = (nome: string) =>
    http()
      .post('/auth/cadastro')
      .send({ slug: SLUG, nome, email: `${nome}@teste.com`, senha: SENHA });
  const entrar = (nome: string) =>
    http()
      .post('/auth/login')
      .send({ slug: SLUG, email: `${nome}@teste.com`, senha: SENHA });

  // cadastra como cliente, troca o papel direto no banco e cria o registro em barbeiros
  async function criarBarbeiro(
    barbeariaId: string,
    login: string,
    nomeExibicao: string,
    papel: 'barbeiro' | 'dono',
  ) {
    await cadastrar(login);
    const usuario = await prisma.usuario.update({
      where: { barbeariaId_email: { barbeariaId, email: `${login}@teste.com` } },
      data: { papel },
    });
    return prisma.barbeiro.create({
      data: { barbeariaId, nomeExibicao, usuarioId: usuario.id },
    });
  }

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

    // o dono também corta cabelo, então ele tem uma coluna como os outros
    const ze = await criarBarbeiro(barbearia.id, 'ze', 'Zé', 'dono');
    const pedro = await criarBarbeiro(barbearia.id, 'pedro', 'Pedro', 'barbeiro');
    await prisma.barbeiro.create({
      data: { barbeariaId: barbearia.id, nomeExibicao: 'Antigo', ativo: false },
    });

    const outra = await prisma.barbearia.create({ data: { nome: 'Outra', slug: SLUG_OUTRA } });
    await prisma.barbeiro.create({ data: { barbeariaId: outra.id, nomeExibicao: 'Forasteiro' } });

    await prisma.expediente.create({
      data: {
        barbeariaId: barbearia.id,
        barbeiroId: ze.id,
        diaSemana: 2,
        inicioMin: 540,
        fimMin: 720,
      },
    });
    await prisma.bloqueio.create({
      data: {
        barbeariaId: barbearia.id,
        barbeiroId: ze.id,
        inicio: `${DIA}T17:00:00.000Z`,
        fim: `${DIA}T18:00:00.000Z`,
        motivo: 'folga',
      },
    });
    // encaixe: sem conta, só com o nome (a rota de encaixe vem no próximo passo)
    await prisma.agendamento.create({
      data: {
        barbeariaId: barbearia.id,
        barbeiroId: pedro.id,
        servicoId: servico.id,
        nomeCliente: 'Carlos',
        inicio: `${DIA}T13:00:00.000Z`,
        fim: `${DIA}T13:30:00.000Z`,
        status: 'confirmado',
        precoCobradoCentavos: 4500,
      },
    });

    // o papel vai dentro do token, então só um login novo enxerga a troca
    tokenDono = (await entrar('ze')).body.accessToken;
    tokenBarbeiro = (await entrar('pedro')).body.accessToken;
  });

  afterAll(async () => {
    await limpar(prisma);
    await app.close();
  });

  const agenda = (token: string, data = DIA) =>
    http().get(`/dono/agenda?data=${data}`).set('Authorization', `Bearer ${token}`);

  it('o dono vê uma coluna por barbeiro ativo da barbearia, em ordem de nome', async () => {
    const resposta = await agenda(tokenDono);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data).toBe(DIA);
    // sem o Antigo (inativo) e sem o Forasteiro (outra barbearia)
    expect(resposta.body.barbeiros.map((b: { nome: string }) => b.nome)).toEqual(['Pedro', 'Zé']);

    const [pedro, ze] = resposta.body.barbeiros;
    expect(pedro.turnos).toEqual([]);
    expect(pedro.atendimentos).toHaveLength(1);
    expect(pedro.atendimentos[0]).toMatchObject({
      inicio: `${DIA}T13:00:00.000Z`,
      servico: { nome: 'Corte' },
      cliente: { nome: 'Carlos', telefone: null },
    });

    expect(ze.turnos).toEqual([{ inicio: `${DIA}T12:00:00.000Z`, fim: `${DIA}T15:00:00.000Z` }]);
    expect(ze.atendimentos).toEqual([]);
    expect(ze.bloqueios).toMatchObject([
      { inicio: `${DIA}T17:00:00.000Z`, fim: `${DIA}T18:00:00.000Z`, motivo: 'folga' },
    ]);
  });

  it('barbeiro não acessa a agenda do dono (403)', async () => {
    expect((await agenda(tokenBarbeiro)).status).toBe(403);
  });

  it('sem login responde 401, e data inválida responde 400', async () => {
    expect((await http().get(`/dono/agenda?data=${DIA}`)).status).toBe(401);
    expect((await agenda(tokenDono, '15-01-2030')).status).toBe(400);
  });
});
