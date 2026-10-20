import { ApiProperty } from '@nestjs/swagger';

export class ServicoResumoDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Corte' })
  nome: string;

  @ApiProperty({ example: 30 })
  duracaoMin: number;
}

export class BarbeiroResumoDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Zé' })
  nomeExibicao: string;
}

export class AgendamentoRespostaDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  inicio: Date;

  @ApiProperty()
  fim: Date;

  @ApiProperty({ enum: ['pendente', 'confirmado', 'concluido', 'cancelado', 'no_show'] })
  status: string;

  @ApiProperty({ example: 4500 })
  precoCobradoCentavos: number;

  @ApiProperty({ type: String, nullable: true, example: 'Degradê baixo, por favor' })
  observacao: string | null;

  @ApiProperty({ type: ServicoResumoDto })
  servico: ServicoResumoDto;

  @ApiProperty({ type: BarbeiroResumoDto })
  barbeiro: BarbeiroResumoDto;
}
