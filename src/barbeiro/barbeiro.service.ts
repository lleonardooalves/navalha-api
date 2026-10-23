import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { UsuarioToken } from '../auth/usuario-token';
import { dataLocal, diaLocal, paraInstante } from '../disponibilidade/fuso';
import { PrismaService } from '../prisma/prisma.service';
import { AgendaBarbeiroDto, BloqueioDto } from './dto/agenda-barbeiro.dto';
import { CriarBloqueioDto } from './dto/criar-bloqueio.dto';
import { bloqueioSelect } from './bloqueio.select';

@Injectable()
export class BarbeiroService {
  constructor(private readonly prisma: PrismaService) {}

  async agenda(usuario: UsuarioToken, data?: string): Promise<AgendaBarbeiroDto> {
    // o papel diz que ele PODE ser barbeiro; o registro em barbeiros diz QUAL barbeiro ele é
    const barbeiro = await this.barbeiroDoUsuario(usuario);

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

  async criarBloqueio(usuario: UsuarioToken, dto: CriarBloqueioDto): Promise<BloqueioDto> {
    const barbeiro = await this.barbeiroDoUsuario(usuario);
    const inicio = new Date(dto.inicio);
    const fim = new Date(dto.fim);

    if (fim <= inicio) {
      throw new UnprocessableEntityException('O fim do bloqueio deve ser maior que o inicio');
    }
    if (fim <= new Date()) {
      throw new UnprocessableEntityException('Este horário já passou');
    }

    const sobrepoe = { barbeiroId: barbeiro.id, inicio: { lt: fim }, fim: { gt: inicio } };

    const [agendamentos, bloqueios] = await Promise.all([
      this.prisma.agendamento.count({
        where: { ...sobrepoe, status: { in: ['pendente', 'confirmado'] } },
      }),
      this.prisma.bloqueio.count({
        where: sobrepoe,
      }),
    ]);

    if (agendamentos > 0) {
      throw new UnprocessableEntityException(
        'Há agendamentos neste horário. Cancele ou reagende antes de bloquear',
      );
    }
    if (bloqueios > 0) {
      throw new UnprocessableEntityException('Este horário já está bloqueado');
    }

    return this.prisma.bloqueio.create({
      data: {
        barbeariaId: barbeiro.barbeariaId,
        barbeiroId: barbeiro.id,
        inicio,
        fim,
        motivo: dto.motivo,
        observacao: dto.observacao,
      },
      select: bloqueioSelect,
    });
  }

  async removerBloqueio(usuario: UsuarioToken, id: string) {
    const barbeiro = await this.barbeiroDoUsuario(usuario);

    const { count } = await this.prisma.bloqueio.deleteMany({
      where: { id, barbeiroId: barbeiro.id },
    });

    if (count === 0) throw new NotFoundException('Bloqueio não econtrado');
  }

  private async barbeiroDoUsuario(usuario: UsuarioToken) {
    const barbeiro = await this.prisma.barbeiro.findFirst({
      where: { usuarioId: usuario.id, barbeariaId: usuario.barbeariaId, ativo: true },
      include: { barbearia: true },
    });

    if (!barbeiro) throw new ForbiddenException('Seu usuário não está ligado a um barbeiro');
    return barbeiro;
  }
}
