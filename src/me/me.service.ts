import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PerfilDto } from './dto/perfil.dto';
import { Periodo } from './dto/listar-agendamentos.dto';
import { AgendamentoRespostaDto } from '../agendamentos/dto/agendamento-resposta.dto';
import { Prisma } from '../generated/prisma/client';
import { agendamentoSelect } from '../agendamentos/agendamento.select';

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async perfil(usuarioId: string): Promise<PerfilDto> {
    const perfil = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, nome: true, email: true, telefone: true, papel: true },
    });

    if (!perfil) throw new NotFoundException('Usuário não encontrado');
    return perfil;
  }

  agendamentos(usuarioId: string, periodo: Periodo): Promise<AgendamentoRespostaDto[]> {
    const agora = new Date();

    const where: Prisma.AgendamentoWhereInput =
      periodo === 'proximos'
        ? { clienteId: usuarioId, status: { in: ['pendente', 'confirmado'] }, fim: { gt: agora } }
        : {
            clienteId: usuarioId,
            OR: [
              { fim: { lte: agora } },
              { status: { in: ['concluido', 'cancelado', 'no_show'] } },
            ],
          };

    return this.prisma.agendamento.findMany({
      where,
      select: agendamentoSelect,
      orderBy: { inicio: periodo === 'proximos' ? 'asc' : 'desc' },
      take: 50,
    });
  }
}
