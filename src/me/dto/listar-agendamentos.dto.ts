import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export const PERIODOS = ['proximos', 'passados'] as const;
export type Periodo = (typeof PERIODOS)[number];

export class ListarAgendamentosDto {
  @ApiPropertyOptional({ enum: PERIODOS, default: 'proximos' })
  @IsOptional()
  @IsIn(PERIODOS)
  periodo?: Periodo;
}
