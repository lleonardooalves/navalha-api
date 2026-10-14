import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgendamentoRespostaDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  barbeiroId: string;

  @ApiProperty({ format: 'uuid' })
  servicoId: string;

  @ApiProperty()
  inicio: Date;

  @ApiProperty()
  fim: Date;

  @ApiProperty({ enum: ['pendente', 'confirmado', 'concluido', 'cancelado', 'no_show'] })
  status: string;

  @ApiProperty({ example: 4500 })
  precoCobradoCentavos: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  nomeCliente: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  observacao: string | null;
}
