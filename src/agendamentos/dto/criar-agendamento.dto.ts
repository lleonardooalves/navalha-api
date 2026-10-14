import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CriarAgendamentoDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  servicoId: string;

  @ApiProperty({
    example: '2026-10-08T12:00:00.000Z',
    description: 'Um dos horários de GET /disponibilidade',
  })
  @IsISO8601({ strict: true })
  inicio: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Vazio = qualquer barbeiro' })
  @IsOptional()
  @IsUUID()
  barbeiroId?: string;

  @ApiProperty({ example: 'João', description: 'Temporário, até existir login' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nomeCliente: string;

  @ApiPropertyOptional({ example: 'Degradê baixo, por favor' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  observacao?: string;
}
