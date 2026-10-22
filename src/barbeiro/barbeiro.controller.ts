import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Papeis, UsuarioAtual } from '../auth/decorators';
import { Controller, Get, Query } from '@nestjs/common';
import { BarbeiroService } from './barbeiro.service';
import { AgendaBarbeiroDto, ConsultarAgendaDto } from './dto/agenda-barbeiro.dto';
import type { UsuarioToken } from '../auth/usuario-token';

@ApiTags('barbeiro')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sem login' })
@ApiForbiddenResponse({ description: 'Não é barbeiro' })
@Papeis('barbeiro', 'dono')
@Controller('barbeiro')
export class BarbeiroController {
  constructor(private readonly barbeiro: BarbeiroService) {}

  @Get('agenda')
  @ApiOkResponse({ type: AgendaBarbeiroDto })
  agenda(
    @UsuarioAtual() usuario: UsuarioToken,
    @Query() consulta: ConsultarAgendaDto,
  ): Promise<AgendaBarbeiroDto> {
    return this.barbeiro.agenda(usuario, consulta.data);
  }
}
