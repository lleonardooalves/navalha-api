import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AgendamentosService } from './agendamentos.service';
import { AgendamentoRespostaDto } from './dto/agendamento-resposta.dto';
import { CriarAgendamentoDto } from './dto/criar-agendamento.dto';
import { UsuarioAtual } from '../auth/decorators';
import type { UsuarioToken } from '../auth/usuario-token';

@ApiTags('agendamentos')
@ApiBearerAuth()
@Controller('agendamentos')
export class AgendamentosController {
  constructor(private readonly agendamentos: AgendamentosService) {}

  @Post()
  @ApiCreatedResponse({ type: AgendamentoRespostaDto })
  @ApiNotFoundResponse({ description: 'Serviço não encontrado' })
  @ApiUnprocessableEntityResponse({ description: 'Horário fora da disponibilidade' })
  @ApiConflictResponse({ description: 'Horário acabou de ser ocupado' })
  @ApiUnauthorizedResponse({ description: 'Sem login' })
  criar(
    @Body() dto: CriarAgendamentoDto,
    @UsuarioAtual() cliente: UsuarioToken,
  ): Promise<AgendamentoRespostaDto> {
    return this.agendamentos.criar(dto, cliente);
  }
}
