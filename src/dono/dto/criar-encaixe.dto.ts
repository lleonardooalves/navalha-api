import { ApiProperty } from '@nestjs/swagger';
import { CriarAgendamentoDto } from '../../agendamentos/dto/criar-agendamento.dto';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

// a origem app fica de fora: quem agenda pelo app usa o POST /agendamentos
const ORIGENS_ENCAIXE = ['whatsapp', 'presencial'] as const;
type OrigemEncaixe = (typeof ORIGENS_ENCAIXE)[number];

//mesmo corpo do agendamento do cliente mais quem é o cliente e por onde ele chegou
export class CriarEncaixeDto extends CriarAgendamentoDto {
  @ApiProperty({ example: 'Carlos' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nomeCliente: string;

  @ApiProperty({ enum: ORIGENS_ENCAIXE })
  @IsIn(ORIGENS_ENCAIXE)
  origem: OrigemEncaixe;
}
