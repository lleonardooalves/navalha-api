import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../../src/generated/prisma/client';
import { dados } from './dados';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const minutos = (hhmm: string) => {
  const [hora, min] = hhmm.split(':').map(Number);
  return hora * 60 + min;
};

// Pode rodar de novo sempre que os dados mudarem: atualiza o que existe e cria o que falta.
async function main() {
  // senha inicial de quem ainda não tem conta; quem já tem não tem a senha trocada
  const senha = process.env.CARGA_SENHA;
  if (!senha) throw new Error('Defina CARGA_SENHA com a senha inicial da equipe');
  const senhaHash = await argon2.hash(senha);

  await prisma.$transaction(async (tx) => {
    const { slug, ...barbeariaDados } = dados.barbearia;
    const { id: barbeariaId } = await tx.barbearia.upsert({
      where: { slug },
      create: { slug, ...barbeariaDados },
      update: barbeariaDados,
    });

    // o nome identifica o serviço; quem saiu da lista só fica inativo, porque agendamentos antigos apontam para ele
    for (const servico of dados.servicos) {
      const existente = await tx.servico.findFirst({ where: { barbeariaId, nome: servico.nome } });
      if (existente) {
        await tx.servico.update({ where: { id: existente.id }, data: { ...servico, ativo: true } });
      } else {
        await tx.servico.create({ data: { ...servico, barbeariaId } });
      }
    }
    await tx.servico.updateMany({
      where: { barbeariaId, nome: { notIn: dados.servicos.map((s) => s.nome) } },
      data: { ativo: false },
    });

    // o email identifica a pessoa; o expediente de cada um é refeito do zero
    const barbeiroIds: string[] = [];
    for (const { expediente, nomeExibicao, comissaoPercentual, ...pessoa } of dados.equipe) {
      const usuario = await tx.usuario.upsert({
        where: { barbeariaId_email: { barbeariaId, email: pessoa.email } },
        create: { ...pessoa, barbeariaId, senhaHash },
        update: { nome: pessoa.nome, telefone: pessoa.telefone, papel: pessoa.papel },
      });

      const barbeiro = await tx.barbeiro.upsert({
        where: { usuarioId: usuario.id },
        create: { barbeariaId, usuarioId: usuario.id, nomeExibicao, comissaoPercentual },
        update: { nomeExibicao, comissaoPercentual, ativo: true },
      });
      barbeiroIds.push(barbeiro.id);

      await tx.expediente.deleteMany({ where: { barbeiroId: barbeiro.id } });
      await tx.expediente.createMany({
        data: Object.entries(expediente).flatMap(([dia, turnos]) =>
          turnos.map((turno) => ({
            barbeariaId,
            barbeiroId: barbeiro.id,
            diaSemana: Number(dia),
            inicioMin: minutos(turno.inicio),
            fimMin: minutos(turno.fim),
          })),
        ),
      });
    }

    // quem saiu da equipe some da agenda e dos horários, mas o histórico fica
    await tx.barbeiro.updateMany({
      where: { barbeariaId, id: { notIn: barbeiroIds } },
      data: { ativo: false },
    });
  });

  console.log(
    `${dados.barbearia.nome}: ${dados.servicos.length} serviços, equipe ${dados.equipe
      .map((p) => `${p.email} (${p.papel})`)
      .join(', ')}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
