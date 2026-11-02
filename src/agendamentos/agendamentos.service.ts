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
import { Prisma, type OrigemAgendamento } from '../generated/prisma/client';
import { UsuarioToken } from '../auth/usuario-token';
import { agendamentoSelect } from './agendamento.select';

export type Reserva = CriarAgendamentoDto & {
  barbeariaId: string;
  clienteId?: string;
  nomeCliente?: string;
  origem?: OrigemAgendamento;
  semAntecedencia?: boolean;
};

@Injectable()
export class AgendamentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly disponibilidade: DisponibilidadeService,
  ) {}

  async criar(dto: CriarAgendamentoDto, cliente: UsuarioToken) {
    return this.reservar({ ...dto, barbeariaId: cliente.barbeariaId, clienteId: cliente.id });
  }

  async reservar(reserva: Reserva) {
    const servico = await this.prisma.servico.findFirst({
      where: { id: reserva.servicoId, ativo: true, barbeariaId: reserva.barbeariaId },
      include: { barbearia: true },
    });

    if (!servico) throw new NotFoundException('Serviço não encontrado');

    const inicio = new Date(reserva.inicio);
    const fim = new Date(inicio.getTime() + servico.duracaoMin * 60_000);
    const data = dataLocal(inicio, servico.barbearia.fuso);

    const horarios = await this.disponibilidade.buscar({
      data,
      servicoId: servico.id,
      barbeiroId: reserva.barbeiroId,
      semAntecedencia: reserva.semAntecedencia,
    });

    const horario = horarios.find((h) => h.inicio.getTime() === inicio.getTime());
    if (!horario) throw new UnprocessableEntityException('Horário não disponível');

    const barbeiroId =
      reserva.barbeiroId ??
      (await this.menosOcupado(horario.barbeiroIds, data, servico.barbearia.fuso));

    try {
      return await this.prisma.agendamento.create({
        data: {
          barbeariaId: servico.barbeariaId,
          barbeiroId,
          servicoId: servico.id,
          clienteId: reserva.clienteId,
          nomeCliente: reserva.nomeCliente,
          origem: reserva.origem,
          observacao: reserva.observacao,
          inicio,
          fim,
          precoCobradoCentavos: servico.precoCentavos,
        },
        select: agendamentoSelect,
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

  async cancelar(id: string, cliente: UsuarioToken) {
    const agendamento = await this.prisma.agendamento.findFirst({
      where: { id, clienteId: cliente.id },
      include: { barbearia: true },
    });
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado');

    if (!['pendente', 'confirmado'].includes(agendamento.status)) {
      throw new UnprocessableEntityException('Este agendamento não pode mais ser cancelado');
    }

    const prazoMin = agendamento.barbearia.prazoCancelamentoMin;
    const limite = new Date(agendamento.inicio.getTime() - prazoMin * 60_000);

    if (new Date() > limite) {
      throw new UnprocessableEntityException(
        `Cancelamento só até ${prazoMin} minutos antes do horário`,
      );
    }

    const { count } = await this.prisma.agendamento.updateMany({
      where: { id, status: { in: ['pendente', 'confirmado'] } },
      data: { status: 'cancelado' },
    });
    if (count === 0) {
      throw new UnprocessableEntityException('Este agendamento não pode mais ser cancelado');
    }

    return this.prisma.agendamento.findUniqueOrThrow({ where: { id }, select: agendamentoSelect });
  }
}

// Dois jeitos de o Postgres recusar um horário disputado:
// 23P01 = exclusion_violation: a sem_conflito barrou porque outro já gravou
// 40P01 = deadlock_detected: vários INSERTs no mesmo horário esperaram um pelo outro,
//         e o Postgres cancelou alguns para destravar. Também quer dizer "perdeu a corrida".
const CODIGOS_DE_CONFLITO = ['23P01', '40P01'];

function violouSemConflito(erro: unknown): boolean {
  if (!(erro instanceof Prisma.PrismaClientKnownRequestError)) return false;
  const adapter = erro.meta?.driverAdapterError as
    { cause?: { originalCode?: string } } | undefined;
  return CODIGOS_DE_CONFLITO.includes(adapter?.cause?.originalCode ?? '');
}
