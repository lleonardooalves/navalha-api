import { ApiProperty } from '@nestjs/swagger';

export class ServicoDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Corte' })
  nome: string;

  @ApiProperty({ example: 30 })
  duracaoMin: number;

  @ApiProperty({ example: 4500 })
  precoCentavos: number;
}

export class BarbeiroDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Zé' })
  nomeExibicao: string;
}

export class BarbeariaRespostaDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Navalha Demo' })
  nome: string;

  @ApiProperty({ example: 'navalha-demo' })
  slug: string;

  @ApiProperty({ type: String, nullable: true, example: 'Rua Exempplo, 123' })
  endereco: string | null;

  @ApiProperty({ type: [ServicoDto] })
  servicos: ServicoDto[];

  @ApiProperty({ type: [BarbeiroDto] })
  barbeiros: BarbeiroDto[];
}
