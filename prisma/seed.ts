import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const SLUG = 'navalha-demo';
// senha das contas de demonstração (só desenvolvimento)
const SENHA_DEMO = process.env.SEED_SENHA ?? 'senha-demo-123';

const h = (hhmm: string) => {
  const [hora, min] = hhmm.split(':').map(Number);
  return hora * 60 + min;
};

async function criarBarbearia() {
  const barbearia = await prisma.barbearia.create({
    data: { nome: 'Navalha Demo', slug: SLUG, endereco: 'Rua Exemplo, 123' },
  });

  await prisma.servico.createMany({
    data: [
      { barbeariaId: barbearia.id, nome: 'Corte', duracaoMin: 30, precoCentavos: 4500 },
      { barbeariaId: barbearia.id, nome: 'Barba', duracaoMin: 20, precoCentavos: 3000 },
      { barbeariaId: barbearia.id, nome: 'Corte + barba', duracaoMin: 50, precoCentavos: 7000 },
    ],
  });

  const barbeiros = await prisma.barbeiro.createManyAndReturn({
    data: [
      { barbeariaId: barbearia.id, nomeExibicao: 'Zé', comissaoPercentual: 100 },
      { barbeariaId: barbearia.id, nomeExibicao: 'Pedro', comissaoPercentual: 50 },
    ],
  });

  // terça (2) a sábado (6): manhã 09:00–12:00, tarde 13:30–19:00
  const expedientes = barbeiros.flatMap((b) =>
    [2, 3, 4, 5, 6].flatMap((diaSemana) => [
      {
        barbeariaId: barbearia.id,
        barbeiroId: b.id,
        diaSemana,
        inicioMin: h('09:00'),
        fimMin: h('12:00'),
      },
      {
        barbeariaId: barbearia.id,
        barbeiroId: b.id,
        diaSemana,
        inicioMin: h('13:30'),
        fimMin: h('19:00'),
      },
    ]),
  );
  await prisma.expediente.createMany({ data: expedientes });

  console.log('Barbearia criada.');
  return barbearia;
}

// Contas da equipe: o Zé é o dono (e também corta), o Pedro é barbeiro.
// Roda sempre, então também completa um banco que já tinha o seed antigo, sem usuários.
async function garantirEquipe(barbeariaId: string) {
  const equipe = [
    { nomeExibicao: 'Zé', nome: 'Zé (dono)', email: 'ze@navalha.demo', papel: 'dono' as const },
    {
      nomeExibicao: 'Pedro',
      nome: 'Pedro',
      email: 'pedro@navalha.demo',
      papel: 'barbeiro' as const,
    },
  ];
  const senhaHash = await argon2.hash(SENHA_DEMO);

  for (const pessoa of equipe) {
    const usuario = await prisma.usuario.upsert({
      where: { barbeariaId_email: { barbeariaId, email: pessoa.email } },
      create: {
        barbeariaId,
        nome: pessoa.nome,
        email: pessoa.email,
        papel: pessoa.papel,
        senhaHash,
      },
      update: {},
    });

    // liga o usuário ao perfil de barbeiro, se ainda não estiver ligado
    await prisma.barbeiro.updateMany({
      where: { barbeariaId, nomeExibicao: pessoa.nomeExibicao, usuarioId: null },
      data: { usuarioId: usuario.id },
    });
  }

  console.log(`Equipe: ${equipe.map((p) => `${p.email} (${p.papel})`).join(', ')}`);
}

async function main() {
  const barbearia =
    (await prisma.barbearia.findUnique({ where: { slug: SLUG } })) ?? (await criarBarbearia());
  await garantirEquipe(barbearia.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());