import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { PerfilDto } from './dto/perfil.dto';
import { UsuarioAtual } from '../auth/decorators';
import { type UsuarioToken } from '../auth/usuario-token';
import { MeService } from './me.service';
import { AgendamentoRespostaDto } from '../agendamentos/dto/agendamento-resposta.dto';
import { ListarAgendamentosDto } from './dto/listar-agendamentos.dto';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  @ApiOkResponse({ type: PerfilDto })
  @ApiUnauthorizedResponse({ description: 'Sem token ou token inválido' })
  async perfil(@UsuarioAtual() usuario: UsuarioToken): Promise<PerfilDto> {
    return this.me.perfil(usuario.id);
  }

  @Get('agendamentos')
  @ApiOkResponse({ type: [AgendamentoRespostaDto] })
  agendamentos(
    @UsuarioAtual() usuario: UsuarioToken,
    @Query() consulta: ListarAgendamentosDto,
  ): Promise<AgendamentoRespostaDto[]> {
    return this.me.agendamentos(usuario.id, consulta.periodo ?? 'proximos');
  }
}
