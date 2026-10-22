import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';
import { ServicoResumoDto } from '../../agendamentos/dto/agendamento-resposta.dto';

export class ConsultarAgendaDto {
  @ApiPropertyOptional({ example: '2026-10-20', description: 'Vazio = hoje' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'data deve estar no formato YYYY-MM-DD' })
  data?: string;
}

export class IntervaloDto {
  @ApiProperty()
  inicio: Date;

  @ApiProperty()
  fim: Date;
}

export class ClienteResumoDto {
  @ApiProperty({ example: 'João Silva' })
  nome: string;

  @ApiProperty({ type: String, nullable: true, example: '11999998888' })
  telefone: string | null;
}

export class AtendimentoDto extends IntervaloDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: ['pendente', 'confirmado', 'concluido', 'no_show'] })
  status: string;

  @ApiProperty({ example: 4500 })
  precoCobradoCentavos: number;

  @ApiProperty({ type: String, nullable: true })
  observacao: string | null;

  @ApiProperty({ type: ServicoResumoDto })
  servico: ServicoResumoDto;

  @ApiProperty({ type: ClienteResumoDto })
  cliente: ClienteResumoDto;
}

export class BloqueioDto extends IntervaloDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: ['almoco', 'folga', 'feriado', 'outro'] })
  motivo: string;

  @ApiProperty({ type: String, nullable: true })
  observacao: string | null;
}

export class AgendaBarbeiroDto {
  @ApiProperty({ example: '2026-10-20' })
  data: string;

  @ApiProperty({ type: [IntervaloDto], description: 'Turnos de expedientes no dia' })
  turnos: IntervaloDto[];

  @ApiProperty({ type: [AtendimentoDto] })
  atendimentos: AtendimentoDto[];

  @ApiProperty({ type: [BloqueioDto] })
  bloqueios: BloqueioDto[];
}
