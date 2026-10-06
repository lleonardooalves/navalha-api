import { ApiProperty } from '@nestjs/swagger';

export class HorarioDisponivelDto {
  @ApiProperty({ example: '2026-10-01T12:00:00.000Z' })
  inicio: Date;

  @ApiProperty({ type: [String], format: 'uuid', description: 'Barbeiros livres neste horario' })
  barbeiroIds: string[];
}

export class DisponibilidadeRespostaDto {
  @ApiProperty({ example: '2026-10-01' })
  data: string;

  @ApiProperty({ type: [HorarioDisponivelDto] })
  horarios: HorarioDisponivelDto[];
}
