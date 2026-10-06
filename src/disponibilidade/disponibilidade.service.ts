import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { diaLocal, paraInstante, paraMinutos } from './fuso';
import { horariosLivres, Intervalo } from './horarios-livres';

type Consulta = {
  data: string;
  servicoId: string;
  barbeiroId?: string;
};

export type HorarioDisponivel = {
  inicio: Date;
  barbeiroIds: string[];
};

@Injectable()
export class DisponibilidadeService {
  constructor(private readonly prisma: PrismaService) {}

  async buscar({ data, servicoId, barbeiroId }: Consulta): Promise<HorarioDisponivel[]> {
    const servico = await this.prisma.servico.findFirst({
      where: { id: servicoId, ativo: true },
      include: { barbearia: true },
    });

    if (!servico) throw new NotFoundException('Servico não encontrado');
    const { barbearia } = servico;
    const dia = diaLocal(data, barbearia.fuso);

    const barbeiros = await this.prisma.barbeiro.findMany({
      where: {
        barbeariaId: barbearia.id,
        ativo: true,
        ...(barbeiroId && { id: barbeiroId }),
      },
      select: { id: true },
    });
    if (barbeiroId && barbeiros.length === 0) {
      throw new NotFoundException('Barbeiro não encontrado');
    }
    const ids = barbeiros.map((b) => b.id);

    const doDia = { barbeiroId: { in: ids }, inicio: { lt: dia.fim }, fim: { gt: dia.inicio } };

    const [expedientes, bloqueios, agendamentos] = await Promise.all([
      this.prisma.expediente.findMany({
        where: { barbeiroId: { in: ids }, diaSemana: dia.diaSemana },
      }),
      this.prisma.bloqueio.findMany({ where: doDia }),
      this.prisma.agendamento.findMany({
        where: { ...doDia, status: { in: ['pendente', 'confirmado'] } },
      }),
    ]);

    const agoraMin = paraMinutos(new Date(), dia);
    const antesDoDia = Date.now() < dia.inicio.getTime();
    const minimoInicio = antesDoDia ? 0 : agoraMin + barbearia.antecedenciaMinimaMin;

    const intervalo = barbearia.intervaloAtendimentoMin;
    const livresPorMinuto = new Map<number, string[]>();

    for (const id of ids) {
      const expediente: Intervalo[] = expedientes
        .filter((e) => e.barbeiroId === id)
        .map((e) => ({ inicio: e.inicioMin, fim: e.fimMin }));

      const ocupados: Intervalo[] = [
        ...bloqueios
          .filter((b) => b.barbeiroId === id)
          .map((b) => ({ inicio: paraMinutos(b.inicio, dia), fim: paraMinutos(b.fim, dia) })),
        ...agendamentos
          .filter((a) => a.barbeiroId === id)
          .map((a) => ({
            inicio: paraMinutos(a.inicio, dia) - intervalo,
            fim: paraMinutos(a.fim, dia) + intervalo,
          })),
      ];

      const livres = horariosLivres({
        expediente,
        ocupados,
        duracaoMin: servico.duracaoMin,
        passoMin: barbearia.passoGradeMin,
        minimoInicio,
      });

      for (const minuto of livres) {
        livresPorMinuto.set(minuto, [...(livresPorMinuto.get(minuto) ?? []), id]);
      }
    }

    return [...livresPorMinuto.entries()]
      .sort(([a], [b]) => a - b)
      .map(([minuto, barbeiroIds]) => ({ inicio: paraInstante(minuto, dia), barbeiroIds }));
  }
}
