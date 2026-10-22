import { ForbiddenException, Injectable } from '@nestjs/common';
import type { UsuarioToken } from '../auth/usuario-token';
import { dataLocal, diaLocal, paraInstante } from '../disponibilidade/fuso';
import { PrismaService } from '../prisma/prisma.service';
import { AgendaBarbeiroDto } from './dto/agenda-barbeiro.dto';

@Injectable()
export class BarbeiroService {
  constructor(private readonly prisma: PrismaService) {}

  async agenda(usuario: UsuarioToken, data?: string): Promise<AgendaBarbeiroDto> {
    // o papel diz que ele PODE ser barbeiro; o registro em barbeiros diz QUAL barbeiro ele é
    const barbeiro = await this.prisma.barbeiro.findFirst({
      where: { usuarioId: usuario.id, barbeariaId: usuario.barbeariaId, ativo: true },
      include: { barbearia: true },
    });
    if (!barbeiro) throw new ForbiddenException('Seu usuário não está ligado a um barbeiro');

    const { fuso } = barbeiro.barbearia;
    const dataDia = data ?? dataLocal(new Date(), fuso);
    const dia = diaLocal(dataDia, fuso);
    const doDia = { barbeiroId: barbeiro.id, inicio: { lt: dia.fim }, fim: { gt: dia.inicio } };

    const [expedientes, bloqueios, agendamentos] = await Promise.all([
      this.prisma.expediente.findMany({
        where: { barbeiroId: barbeiro.id, diaSemana: dia.diaSemana },
        orderBy: { inicioMin: 'asc' },
      }),
      this.prisma.bloqueio.findMany({
        where: doDia,
        select: { id: true, inicio: true, fim: true, motivo: true, observacao: true },
        orderBy: { inicio: 'asc' },
      }),
      this.prisma.agendamento.findMany({
        // tudo do dia, menos o que foi cancelado
        where: { ...doDia, status: { not: 'cancelado' } },
        select: {
          id: true,
          inicio: true,
          fim: true,
          status: true,
          precoCobradoCentavos: true,
          observacao: true,
          nomeCliente: true,
          servico: { select: { id: true, nome: true, duracaoMin: true } },
          cliente: { select: { nome: true, telefone: true } },
        },
        orderBy: { inicio: 'asc' },
      }),
    ]);

    return {
      data: dataDia,
      turnos: expedientes.map((e) => ({
        inicio: paraInstante(e.inicioMin, dia),
        fim: paraInstante(e.fimMin, dia),
      })),
      // quem agendou pelo app tem conta; quem foi encaixado só tem o nome
      atendimentos: agendamentos.map(({ nomeCliente, cliente, ...resto }) => ({
        ...resto,
        cliente: cliente ?? { nome: nomeCliente ?? 'Cliente', telefone: null },
      })),
      bloqueios,
    };
  }
}
