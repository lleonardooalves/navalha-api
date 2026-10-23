import { Prisma } from '../generated/prisma/client';

export const bloqueioSelect = {
  id: true,
  inicio: true,
  fim: true,
  motivo: true,
  observacao: true,
} satisfies Prisma.BloqueioSelect;
