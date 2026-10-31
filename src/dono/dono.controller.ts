import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Papeis, UsuarioAtual } from '../auth/decorators';
import { DonoService } from './dono.service';
import { AgendaDonoDto } from './dto/agenda-dono.dto';
import { type UsuarioToken } from '../auth/usuario-token';
import { ConsultarAgendaDto } from '../barbeiro/dto/agenda-barbeiro.dto';

@ApiTags('dono')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sem login' })
@ApiForbiddenResponse({ description: 'Não é o dono' })
@Papeis('dono')
@Controller('dono')
export class DonoController {
  constructor(private readonly dono: DonoService) {}

  @Get('agenda')
  @ApiOkResponse({ type: AgendaDonoDto })
  agenda(
    @UsuarioAtual() usuario: UsuarioToken,
    @Query() consulta: ConsultarAgendaDto,
  ): Promise<AgendaDonoDto> {
    return this.dono.agenda(usuario, consulta.data);
  }
}
