import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { PerfilDto } from '../auth/dto/perfil.dto';
import { UsuarioAtual } from '../auth/decorators';
import { type UsuarioToken } from '../auth/usuario-token';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({ type: PerfilDto })
  @ApiUnauthorizedResponse({ description: 'Sem token ou token inválido' })
  async perfil(@UsuarioAtual() usuario: UsuarioToken): Promise<PerfilDto> {
    const perfil = await this.prisma.usuario.findUnique({
      where: { id: usuario.id },
      select: { id: true, nome: true, email: true, telefone: true, papel: true },
    });
    if (!perfil) throw new NotFoundException('Usuário não encontrado');
    return perfil;
  }
}
