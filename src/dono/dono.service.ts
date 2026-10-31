import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BarbeiroService } from '../barbeiro/barbeiro.service';
import { UsuarioToken } from '../auth/usuario-token';
import { AgendaDonoDto } from './dto/agenda-dono.dto';
import { dataLocal, diaLocal } from '../disponibilidade/fuso';

@Injectable()
export class DonoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly barbeiro: BarbeiroService,
  ) {}

  async agenda(usuario: UsuarioToken, data?: string): Promise<AgendaDonoDto> {
    const { fuso } = await this.prisma.barbearia.findUniqueOrThrow({
      where: { id: usuario.barbeariaId },
      select: { fuso: true },
    });

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
}
