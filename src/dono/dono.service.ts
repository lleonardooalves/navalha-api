import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BarbeiroService } from '../barbeiro/barbeiro.service';
import { UsuarioToken } from '../auth/usuario-token';
import { AgendaDonoDto } from './dto/agenda-dono.dto';
import { dataLocal, diaLocal } from '../disponibilidade/fuso';
import { AgendamentosService } from '../agendamentos/agendamentos.service';
import { CriarEncaixeDto } from './dto/criar-encaixe.dto';

@Injectable()
export class DonoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly barbeiro: BarbeiroService,
    private readonly agendamentos: AgendamentosService,
  ) {}

  async agenda(usuario: UsuarioToken, data?: string): Promise<AgendaDonoDto> {
    const fuso = await this.fusoDaBarbearia(usuario);
    const dataDia = data ?? dataLocal(new Date(), fuso);

    // a barbeariaId vem do token: o dono só vê a equipe da barbearia dele
    const barbeiros = await this.barbeiro.agendasDoDia(
      {
        barbeariaId: usuario.barbeariaId,
        ativo: true,
      },
      diaLocal(dataDia, fuso),
    );
    return { data: dataDia, barbeiros };
  }

  async encaixar(usuario: UsuarioToken, dto: CriarEncaixeDto) {
    const fuso = await this.fusoDaBarbearia(usuario);

    //encaixe é para quem chegou ou chamou agora
    if (dataLocal(new Date(dto.inicio), fuso) !== dataLocal(new Date(), fuso)) {
      throw new UnprocessableEntityException('Encaixe só para hoje');
    }

    return this.agendamentos.reservar({
      ...dto,
      barbeariaId: usuario.barbeariaId,
      semAntecedencia: true,
    });
  }

  private async fusoDaBarbearia(usuario: UsuarioToken) {
    const { fuso } = await this.prisma.barbearia.findUniqueOrThrow({
      where: { id: usuario.barbeariaId },
      select: { fuso: true },
    });
    return fuso;
  }
}
