import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DisponibilidadeService } from '../disponibilidade/disponibilidade.service';
import { CriarAgendamentoDto } from './dto/criar-agendamento.dto';
import { dataLocal, diaLocal } from '../disponibilidade/fuso';
import { Prisma } from '../generated/prisma/client';

@Injectable()
export class AgendamentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly disponibilidade: DisponibilidadeService,
  ) {}

  async criar(dto: CriarAgendamentoDto) {
    //Servico e barbearia
    const servico = await this.prisma.servico.findFirst({
      where: { id: dto.servicoId, ativo: true },
      include: { barbearia: true },
    });

    if (!servico) throw new NotFoundException('Serviço não encontrado');

    const inicio = new Date(dto.inicio);
    const fim = new Date(inicio.getTime() + servico.duracaoMin * 60_000);
    const data = dataLocal(inicio, servico.barbearia.fuso);

    //O horario pedido esta entre os oferecidos
    const horarios = await this.disponibilidade.buscar({
      data,
      servicoId: servico.id,
      barbeiroId: dto.barbeiroId,
    });

    const horario = horarios.find((h) => h.inicio.getTime() === inicio.getTime());
    if (!horario) throw new UnprocessableEntityException('Horário não disponível');

    //Qual barbeiro
    const barbeiroId =
      dto.barbeiroId ??
      (await this.menosOcupado(horario.barbeiroIds, data, servico.barbearia.fuso));

    try {
      return await this.prisma.agendamento.create({
        data: {
          barbeariaId: servico.barbeariaId,
          barbeiroId,
          servicoId: servico.id,
          nomeCliente: dto.nomeCliente,
          observacao: dto.observacao,
          inicio,
          fim,
          precoCobradoCentavos: servico.precoCentavos,
        },
      });
    } catch (erro) {
      if (violouSemConflito(erro)) {
        throw new ConflictException('Horário acabou de ser ocupado');
      }
      throw erro;
    }
  }

  // "Qualquer barbeiro": quem tem menos atendimentos ativos no dia
  private async menosOcupado(ids: string[], data: string, fuso: string): Promise<string> {
    const dia = diaLocal(data, fuso);
    const contagem = await this.prisma.agendamento.groupBy({
      by: ['barbeiroId'],
      where: {
        barbeiroId: { in: ids },
        status: { in: ['pendente', 'confirmado'] },
        inicio: { gte: dia.inicio, lt: dia.fim },
      },
      _count: { _all: true },
    });
    const total = (id: string) => contagem.find((c) => c.barbeiroId === id)?._count._all ?? 0;

    return [...ids].sort((a, b) => total(a) - total(b))[0];
  }
}

// Postgres 23P01 = exclusion_violation (a restrição sem_conflito)
function violouSemConflito(erro: unknown): boolean {
  if (!(erro instanceof Prisma.PrismaClientKnownRequestError)) return false;
  const adapter = erro.meta?.driverAdapterError as
    { cause?: { originalCode?: string } } | undefined;
  return adapter?.cause?.originalCode === '23P01';
}
