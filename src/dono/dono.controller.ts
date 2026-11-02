import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Papeis, UsuarioAtual } from '../auth/decorators';
import { DonoService } from './dono.service';
import { AgendaDonoDto } from './dto/agenda-dono.dto';
import { type UsuarioToken } from '../auth/usuario-token';
import { ConsultarAgendaDto } from '../barbeiro/dto/agenda-barbeiro.dto';
import { AgendamentoRespostaDto } from '../agendamentos/dto/agendamento-resposta.dto';
import { CriarEncaixeDto } from './dto/criar-encaixe.dto';

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

  @Post('encaixes')
  @ApiCreatedResponse({ type: AgendamentoRespostaDto })
  @ApiNotFoundResponse({ description: 'Serviço ou barbeiro não encontrado' })
  @ApiUnprocessableEntityResponse({ description: 'Não é hoje ou o horário não está livre' })
  @ApiConflictResponse({ description: 'Horário acabou de ser ocupado' })
  encaixar(
    @UsuarioAtual() usuario: UsuarioToken,
    @Body() dto: CriarEncaixeDto,
  ): Promise<AgendamentoRespostaDto> {
    return this.dono.encaixar(usuario, dto);
  }
}
