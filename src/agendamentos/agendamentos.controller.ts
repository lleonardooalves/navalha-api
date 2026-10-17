import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AgendamentosService } from './agendamentos.service';
import { AgendamentoRespostaDto } from './dto/agendamento-resposta.dto';
import { CriarAgendamentoDto } from './dto/criar-agendamento.dto';
import { Publico } from '../auth/decorators';

@ApiTags('agendamentos')
@Publico()
@Controller('agendamentos')
export class AgendamentosController {
  constructor(private readonly agendamentos: AgendamentosService) {}

  @Post()
  @ApiCreatedResponse({ type: AgendamentoRespostaDto })
  @ApiNotFoundResponse({ description: 'Serviço não encontrado' })
  @ApiUnprocessableEntityResponse({ description: 'Horário fora da disponibilidade' })
  @ApiConflictResponse({ description: 'Horário acabou de ser ocupado' })
  criar(@Body() dto: CriarAgendamentoDto): Promise<AgendamentoRespostaDto> {
    return this.agendamentos.criar(dto);
  }
}
