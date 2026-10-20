import { Prisma } from '../generated/prisma/client';

export const agendamentoSelect = {
  id: true,
  inicio: true,
  fim: true,
  status: true,
  precoCobradoCentavos: true,
  observacao: true,
  servico: { select: { id: true, nome: true, duracaoMin: true } },
  barbeiro: { select: { id: true, nomeExibicao: true } },
} satisfies Prisma.AgendamentoSelect;
