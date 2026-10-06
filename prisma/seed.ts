import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const h = (hhmm: string) => {
  const [hora, min] = hhmm.split(':').map(Number);
  return hora * 60 + min;
};

async function main() {
  const existente = await prisma.barbearia.findUnique({ where: { slug: 'navalha-demo' } });
  if (existente) {
    console.log('Seed já aplicado, nada a fazer.');
    return;
  }

  const barbearia = await prisma.barbearia.create({
    data: { nome: 'Navalha Demo', slug: 'navalha-demo', endereco: 'Rua Exemplo, 123' },
  });

  const servicos = await prisma.servico.createManyAndReturn({
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
      { barbeariaId: barbearia.id, barbeiroId: b.id, diaSemana, inicioMin: h('09:00'), fimMin: h('12:00') },
      { barbeariaId: barbearia.id, barbeiroId: b.id, diaSemana, inicioMin: h('13:30'), fimMin: h('19:00') },
    ]),
  );
  await prisma.expediente.createMany({ data: expedientes });

  console.log('Barbearia:', barbearia.id);
  console.log('Serviços:', servicos.map((s) => `${s.nome}=${s.id}`).join('\n          '));
  console.log('Barbeiros:', barbeiros.map((b) => `${b.nomeExibicao}=${b.id}`).join('\n           '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());