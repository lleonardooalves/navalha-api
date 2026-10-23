import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { MotivoBloqueio } from '../../generated/prisma/enums';

export class CriarBloqueioDto {
  @ApiProperty({ example: '2026-10-20T17:00:00.000Z' })
  @IsISO8601({ strict: true })
  inicio: string;

  @ApiProperty({ example: '2026-10-20T17:00:00.000Z' })
  @IsISO8601({ strict: true })
  fim: string;

  @ApiProperty({ enum: MotivoBloqueio })
  @IsEnum(MotivoBloqueio)
  motivo: MotivoBloqueio;

  @ApiPropertyOptional({ example: 'Consulta médica' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  observacao?: string;
}
