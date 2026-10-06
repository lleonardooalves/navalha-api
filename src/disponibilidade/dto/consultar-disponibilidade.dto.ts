import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Matches, IsUUID, IsOptional } from 'class-validator';

export class ConsultarDisponibilidadeDto {
  @ApiProperty({ example: '2026-10-01', description: 'Dia no fuso da barbearia (YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'data deve estar no formato YYYY-MM-DD' })
  data: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  servicoId: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Vazio = qualquer barbeiro' })
  @IsOptional()
  @IsUUID()
  barbeiroId: string;
}
